import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AzureStorageService } from '../../common/azure/azure-storage.service'
import { extname } from 'path'
import { randomUUID } from 'crypto'

@Injectable()
export class JobBoardsService {
  constructor(
    private prisma: PrismaService,
    private azure: AzureStorageService,
  ) { }

  async list(userId: string) {
    const boards = await this.prisma.jobBoard.findMany({
      where: {
        deletedAt: null,
        userId,
      },
      orderBy: { createdAt: 'desc' },
    })
    return boards.map(b => this.withProxyUrls(b))
  }

  /** Extract media blob path from a stored Azure URL (or return as-is if already a path). */
  private mediaBlobName(url?: string | null): string | null {
    if (!url) return null
    if (!url.includes('://')) {
      return url.replace(/^\/?media\//, '')
    }
    try {
      const parsed = new URL(url.split('?')[0])
      const parts = parsed.pathname.replace(/^\//, '').split('/')
      if (parts[0] !== 'media' || parts.length < 2) return null
      return decodeURIComponent(parts.slice(1).join('/'))
    } catch {
      return null
    }
  }

  /** True Azure blob URL — never persist API proxy paths into DB. */
  private isPersistableBackgroundUrl(url?: string | null): boolean {
    if (!url) return false
    if (url.includes('/job-boards/') && url.includes('/background/file')) return false
    if (url.startsWith('data:')) return false
    return url.includes('.blob.core.windows.net/') || /^https?:\/\//i.test(url)
  }

  /**
   * Private Azure containers block public URLs (same as checklist photos).
   * Return authenticated API proxy paths for the browser.
   */
  private withProxyUrls<T extends { id: string; backgroundImage?: string | null; lists?: any[] }>(
    board: T,
  ): T & { hasBackgroundImage?: boolean } {
    if (!board) return board

    const hasBackgroundImage = !!board.backgroundImage && !!this.mediaBlobName(board.backgroundImage)
    const backgroundImage = board.backgroundImage
      ? `/job-boards/${board.id}/background/file`
      : board.backgroundImage

    if (!board.lists?.length) {
      return { ...board, backgroundImage, hasBackgroundImage }
    }

    const lists = board.lists.map((list: any) => ({
      ...list,
      cards: (list.cards || []).map((card: any) => ({
        ...card,
        coverImageUrl: card.coverImageUrl
          ? `/job-boards/cards/${card.id}/cover/file`
          : card.coverImageUrl,
        attachments: (card.attachments || []).map((a: any) => ({
          ...a,
          fileUrl: `/job-boards/attachments/${a.id}/file`,
        })),
      })),
    }))

    return { ...board, backgroundImage, hasBackgroundImage, lists }
  }

  async getBackgroundFile(boardId: string, userId: string) {
    const board = await this.prisma.jobBoard.findFirst({
      where: { id: boardId, userId, deletedAt: null },
      select: { backgroundImage: true },
    })
    if (!board?.backgroundImage) throw new NotFoundException('Background not found')

    const blobName = this.mediaBlobName(board.backgroundImage)
    if (!blobName) throw new NotFoundException('Invalid background path')
    return this.azure.download('media', blobName)
  }

  async getCardCoverFile(cardId: string) {
    const card = await this.prisma.jobCard.findFirst({
      where: { id: cardId, deletedAt: null },
      select: { coverImageUrl: true },
    })
    if (!card?.coverImageUrl) throw new NotFoundException('Cover not found')
    const blobName = this.mediaBlobName(card.coverImageUrl)
    if (!blobName) throw new NotFoundException('Invalid cover path')
    return this.azure.download('media', blobName)
  }

  async getAttachmentFile(attachmentId: string) {
    const attachment = await this.prisma.cardAttachment.findUnique({
      where: { id: attachmentId },
    })
    if (!attachment?.fileUrl) throw new NotFoundException('Attachment not found')
    const blobName = this.mediaBlobName(attachment.fileUrl)
    if (!blobName) throw new NotFoundException('Invalid attachment path')
    return this.azure.download('media', blobName)
  }

  async deleteAttachment(attachmentId: string) {
    const attachment = await this.prisma.cardAttachment.findUnique({
      where: { id: attachmentId },
    })
    if (!attachment) throw new NotFoundException('Attachment not found')

    const blobName = this.mediaBlobName(attachment.fileUrl)
    if (blobName) {
      try {
        await this.azure.delete('media', blobName)
      } catch {
        /* blob may already be gone */
      }
    }

    // Clear cover if this attachment URL was used as cover
    const card = await this.prisma.jobCard.findUnique({
      where: { id: attachment.cardId },
      select: { id: true, coverImageUrl: true },
    })
    if (card?.coverImageUrl && attachment.fileUrl && card.coverImageUrl === attachment.fileUrl) {
      await this.prisma.jobCard.update({
        where: { id: card.id },
        data: { coverImageUrl: null },
      })
    }

    await this.prisma.cardAttachment.delete({ where: { id: attachmentId } })
    return { ok: true }
  }

  async create(dto: any, userId: string) {
    const sourceType = this.normalizeSourceType(dto.sourceType)

    const board = await this.prisma.jobBoard.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        backgroundImage: this.isPersistableBackgroundUrl(dto.backgroundImage)
          ? dto.backgroundImage
          : null,
        sourceType,
        userId,
        lists: {
          create: [
            { name: 'To Do', sortOrder: 1 },
            { name: 'In Progress', sortOrder: 2 },
          ],
        },
      },
      include: {
        lists: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (sourceType !== 'MANUAL') {
      await this.syncSourceCards(board.id, sourceType)
    }

    return this.get(board.id, userId)
  }

  async get(id: string, userId: string) {
    const board = await this.prisma.jobBoard.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        lists: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            cards: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
              include: {
                attachments: true,
                labels: true,
                checklists: { include: { items: true } },
                _count: {
                  select: {
                    activities: true,
                    attachments: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (board && board.sourceType !== 'MANUAL') {
      await this.syncSourceCards(board.id, board.sourceType)
      const refreshed = await this.prisma.jobBoard.findFirst({
        where: { id, userId, deletedAt: null },
        include: {
          lists: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
            include: {
              cards: {
                where: { deletedAt: null },
                orderBy: { sortOrder: 'asc' },
                include: {
                  attachments: true,
                  labels: true,
                  checklists: { include: { items: true } },
                  _count: {
                    select: {
                      activities: true,
                      attachments: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
      return refreshed ? this.withProxyUrls(refreshed) : refreshed
    }

    return board ? this.withProxyUrls(board) : board
  }

  async update(id: string, dto: any, userId: string) {
    const sourceType =
      dto.sourceType !== undefined
        ? this.normalizeSourceType(dto.sourceType)
        : undefined

    await this.prisma.jobBoard.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        ...(dto.backgroundImage !== undefined &&
          (dto.backgroundImage === null || dto.backgroundImage === ''
            ? { backgroundImage: null }
            : this.isPersistableBackgroundUrl(dto.backgroundImage)
              ? { backgroundImage: dto.backgroundImage }
              : {})),
        ...(sourceType !== undefined && { sourceType }),
      },
    })

    if (sourceType && sourceType !== 'MANUAL') {
      await this.ensureDefaultLists(id)
      await this.syncSourceCards(id, sourceType)
    }

    return this.get(id, userId)
  }

  async uploadBackground(boardId: string, file: Express.Multer.File, userId: string) {
    const board = await this.prisma.jobBoard.findFirst({
      where: { id: boardId, userId, deletedAt: null },
    })
    if (!board) throw new Error('Board not found')

    const ext = extname(file.originalname)
    const blobName = `job-boards/backgrounds/${boardId}/${randomUUID()}${ext}`
    const fileUrl = await this.azure.upload('media', blobName, file.buffer, file.mimetype)

    await this.prisma.jobBoard.update({
      where: { id: boardId },
      data: { backgroundImage: fileUrl },
    })

    return { backgroundImage: `/job-boards/${boardId}/background/file` }
  }

  private normalizeSourceType(value?: string) {
    if (value === 'JOB_BOOK_ENTRY' || value === 'FM_INSTALL') return value
    return 'MANUAL' as const
  }

  private async ensureDefaultLists(boardId: string) {
    const lists = await this.prisma.jobList.findMany({
      where: { boardId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    })

    if (lists.length === 0) {
      await this.prisma.jobList.createMany({
        data: [
          { boardId, name: 'To Do', sortOrder: 1 },
          { boardId, name: 'In Progress', sortOrder: 2 },
        ],
      })
    } else if (lists.length === 1) {
      await this.prisma.jobList.create({
        data: { boardId, name: 'In Progress', sortOrder: lists[0].sortOrder + 1 },
      })
    }
  }

  /** Seed / refresh cards from Job Book Entry or FM Install into the first list. */
  private async syncSourceCards(
    boardId: string,
    sourceType: 'JOB_BOOK_ENTRY' | 'FM_INSTALL',
  ) {
    await this.ensureDefaultLists(boardId)

    const firstList = await this.prisma.jobList.findFirst({
      where: { boardId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    })
    if (!firstList) return

    const existing = await this.prisma.jobCard.findMany({
      where: {
        sourceType,
        sourceRefId: { not: null },
        deletedAt: null,
        list: { boardId, deletedAt: null },
      },
      select: { sourceRefId: true },
    })
    const existingIds = new Set(existing.map(c => c.sourceRefId).filter(Boolean))

    let items: Array<{ id: string; title: string; description?: string | null }> = []

    if (sourceType === 'JOB_BOOK_ENTRY') {
      const rows = await this.prisma.jobBookEntry.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      items = rows.map(r => ({
        id: r.id,
        title: [
          r.jobNumber || r.entryNumber,
          r.accountName || r.customerNumber,
          r.itemDetails,
        ]
          .filter(Boolean)
          .join(' - '),
        description: [
          r.contactName && `Contact: ${r.contactName}`,
          r.phoneNumber && `Phone: ${r.phoneNumber}`,
          r.serviceDetails,
        ]
          .filter(Boolean)
          .join('\n'),
      }))
    } else {
      const rows = await this.prisma.fMInstall.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      items = rows.map(r => ({
        id: r.id,
        title: [
          r.fiNumber || r.installInvoice || r.id.slice(0, 8),
          [r.vehicleMake, r.vehicleModel, r.vehicleYear].filter(Boolean).join(' '),
          r.rego,
        ]
          .filter(Boolean)
          .join(' - '),
        description: [
          r.depot && `Depot: ${r.depot}`,
          r.site && `Site: ${r.site}`,
          r.installBy && `Install by: ${r.installBy}`,
          r.status && `Status: ${r.status}`,
        ]
          .filter(Boolean)
          .join('\n'),
      }))
    }

    const toCreate = items.filter(i => !existingIds.has(i.id))
    if (toCreate.length === 0) return

    const last = await this.prisma.jobCard.findFirst({
      where: { listId: firstList.id, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
    })
    let nextOrder = last ? last.sortOrder + 1 : 1

    await this.prisma.jobCard.createMany({
      data: toCreate.map(item => ({
        listId: firstList.id,
        title: item.title || 'Untitled',
        description: item.description || null,
        sortOrder: nextOrder++,
        sourceType,
        sourceRefId: item.id,
      })),
    })
  }

  async delete(id: string) {
    return this.prisma.jobBoard.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async createList(boardId: string, dto: any) {
    const last = await this.prisma.jobList.findFirst({
      where: { boardId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
    })

    const nextOrder = last ? last.sortOrder + 1 : 1

    return this.prisma.jobList.create({
      data: {
        boardId,
        name: dto.name,
        sortOrder: nextOrder,
      },
    })
  }

  async reorderLists(boardId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.jobList.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    )

    return this.prisma.$transaction(updates)
  }

  async deleteList(listId: string) {
    return this.prisma.jobList.update({
      where: { id: listId },
      data: { deletedAt: new Date() },
    })
  }

  async createCard(listId: string, dto: any) {
    const last = await this.prisma.jobCard.findFirst({
      where: { listId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
    })

    const nextOrder = last ? last.sortOrder + 1 : 1

    return this.prisma.jobCard.create({
      data: {
        listId,
        title: dto.title,
        sortOrder: nextOrder,
      },
    })
  }

  async reorderCards(body: {
    cardId: string
    sourceListId: string
    destinationListId: string
    orderedIds: string[]
  }) {
    const { cardId, sourceListId, destinationListId, orderedIds } = body

    return this.prisma.$transaction(async tx => {
      // If moved to different list
      if (sourceListId !== destinationListId) {
        await tx.jobCard.update({
          where: { id: cardId },
          data: { listId: destinationListId },
        })
      }

      // Update order in destination list
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.jobCard.update({
          where: { id: orderedIds[i] },
          data: { sortOrder: i + 1 },
        })
      }
    })
  }

  async deleteCard(cardId: string) {
    return this.prisma.jobCard.update({
      where: { id: cardId },
      data: { deletedAt: new Date() },
    })
  }

  async updateCard(
    id: string,
    dto: any,
    currentUserId: string,
  ) {
    const card = await this.prisma.jobCard.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? dto.dueDate : null }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl || null }),
      },
    })

    if (dto.dueDate) {
      await this.logActivity(
        id,
        currentUserId,
        'DUE_DATE_SET',
        'set due date'
      )
    } else {
      await this.logActivity(
        id,
        currentUserId,
        'CARD_UPDATE',
        'updated this card'
      )
    }
    return card
  }


  async addMember(cardId: string, userId: string, currentUserId: string) {
    await this.prisma.cardMember.create({
      data: { cardId, userId },
    })

    await this.logActivity(
      cardId,
      currentUserId,
      'MEMBER_ADD',
      'added a member to this card'
    )
  }

  async removeMember(cardId: string, userId: string, currentUserId: string) {
    await this.prisma.cardMember.delete({
      where: {
        cardId_userId: { cardId, userId },
      },
    })

    await this.logActivity(
      cardId,
      currentUserId,
      'MEMBER_REMOVE',
      'removed a member from this card'
    )
  }

  //ACTIVITY HELPER

  private async logActivity(
    cardId: string,
    userId: string,
    type: string,
    message: string
  ) {
    await this.prisma.cardActivity.create({
      data: {
        cardId,
        userId,
        type,
        message,
      },
    })
  }


  /**
   * Sources for Trello-style "Copy items from...":
   * - ChecklistTemplate library (shown first)
   * - existing card checklists across boards
   */
  async searchChecklistSources(query?: string, boardId?: string) {
    const q = (query || '').trim()
    type Row = {
      id: string
      sourceType: 'CARD' | 'TEMPLATE'
      title: string
      subtitle: string
      itemCount: number
    }
    const templatesOut: Row[] = []
    const cardsOut: Row[] = []

    // Templates first — ACTIVE + DRAFT (ARCHIVED excluded)
    const templateWhere: any = {
      status: { in: ['ACTIVE', 'DRAFT'] },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { hardwareType: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const templates = await this.prisma.checklistTemplate.findMany({
      where: templateWhere,
      take: 30,
      orderBy: { name: 'asc' },
      include: {
        sections: {
          include: { items: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    })

    for (const t of templates) {
      const itemCount = (t.sections || []).reduce(
        (n, s) => n + (s.items?.length || 0),
        0,
      )
      templatesOut.push({
        id: t.id,
        sourceType: 'TEMPLATE',
        title: t.name,
        subtitle: `Template · ${itemCount} items`,
        itemCount,
      })
    }

    // Card checklists (optional board filter; default = all boards)
    const cardWhere: any = {
      deletedAt: null,
      checklists: { some: {} },
    }
    if (boardId) {
      cardWhere.list = { boardId, deletedAt: null }
    }
    if (q) {
      cardWhere.AND = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { checklists: { some: { title: { contains: q, mode: 'insensitive' } } } },
          ],
        },
      ]
    }

    const cards = await this.prisma.jobCard.findMany({
      where: cardWhere,
      take: 30,
      orderBy: { updatedAt: 'desc' },
      include: {
        checklists: {
          include: { items: true },
        },
      },
    })

    for (const card of cards) {
      for (const cl of card.checklists) {
        if (q) {
          const hay = `${card.title} ${cl.title}`.toLowerCase()
          if (!hay.includes(q.toLowerCase())) continue
        }
        cardsOut.push({
          id: cl.id,
          sourceType: 'CARD',
          title: card.title,
          subtitle: `${cl.title || 'Checklist'} · ${cl.items?.length || 0} items`,
          itemCount: cl.items?.length || 0,
        })
      }
    }

    // Templates first so they are never sliced away by card noise
    return [...templatesOut, ...cardsOut].slice(0, 60)
  }

  async addChecklist(
    cardId: string,
    title: string,
    userId: string,
    opts?: {
      copyFromChecklistId?: string
      copyFromTemplateId?: string
    },
  ) {
    const checklist = await this.prisma.cardChecklist.create({
      data: { cardId, title: title || 'Checklist' },
    })

    const itemContents: string[] = []

    if (opts?.copyFromChecklistId) {
      const source = await this.prisma.cardChecklist.findUnique({
        where: { id: opts.copyFromChecklistId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      })
      for (const item of source?.items || []) {
        itemContents.push(item.content)
      }
    } else if (opts?.copyFromTemplateId) {
      const template = await this.prisma.checklistTemplate.findUnique({
        where: { id: opts.copyFromTemplateId },
        include: {
          sections: {
            orderBy: { displayOrder: 'asc' },
            include: { items: { orderBy: { displayOrder: 'asc' } } },
          },
        },
      })
      for (const section of template?.sections || []) {
        // Keep section heading when template has multiple sections
        if ((template?.sections?.length || 0) > 1 && section.title) {
          itemContents.push(`— ${section.title} —`)
        }
        for (const item of section.items || []) {
          const line = [item.title, item.description].filter(Boolean).join(': ')
          if (line.trim()) itemContents.push(line.trim())
        }
      }
    }

    if (itemContents.length > 0) {
      await this.prisma.cardChecklistItem.createMany({
        data: itemContents.map((content, index) => ({
          checklistId: checklist.id,
          content,
          sortOrder: index + 1,
          isCompleted: false,
        })),
      })
    }

    await this.logActivity(
      cardId,
      userId,
      'CHECKLIST_ADD',
      itemContents.length
        ? `added a checklist with ${itemContents.length} items`
        : 'added a checklist',
    )

    return this.prisma.cardChecklist.findUnique({
      where: { id: checklist.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
  }

  async addChecklistItem(checklistId: string, content: string) {

    const last = await this.prisma.cardChecklistItem.findFirst({
      where: { checklistId },
      orderBy: { sortOrder: 'desc' },
    })

    const nextOrder = last ? last.sortOrder + 1 : 1

    return this.prisma.cardChecklistItem.create({
      data: {
        checklistId,
        content,
        sortOrder: nextOrder,
      },
    })
  }

  async deleteChecklist(checklistId: string) {
    await this.prisma.cardChecklistItem.deleteMany({ where: { checklistId } })
    return this.prisma.cardChecklist.delete({ where: { id: checklistId } })
  }

  async deleteChecklistItem(itemId: string) {
    return this.prisma.cardChecklistItem.delete({ where: { id: itemId } })
  }

  async toggleChecklistItem(itemId: string, isCompleted: boolean) {
    return this.prisma.cardChecklistItem.update({
      where: { id: itemId },
      data: { isCompleted },
    })
  }

  async addLabel(cardId: string, name: string, color: string) {
    return this.prisma.cardLabel.create({
      data: { cardId, name, color },
    })
  }

  async addAttachment(cardId: string, file: Express.Multer.File) {
    const ext = extname(file.originalname);
    const blobName = `job-boards/${cardId}/${randomUUID()}${ext}`;
    const fileUrl = await this.azure.upload('media', blobName, file.buffer, file.mimetype);
    const attachment = await this.prisma.cardAttachment.create({
      data: { cardId, fileName: file.originalname, fileUrl },
    });

    if (file.mimetype?.startsWith('image/')) {
      const card = await this.prisma.jobCard.findUnique({ where: { id: cardId } })
      if (card && !card.coverImageUrl) {
        await this.prisma.jobCard.update({
          where: { id: cardId },
          data: { coverImageUrl: fileUrl },
        })
      }
    }

    return {
      ...attachment,
      fileUrl: `/job-boards/attachments/${attachment.id}/file`,
    }
  }

  async setCoverImage(cardId: string, file: Express.Multer.File) {
    const ext = extname(file.originalname)
    const blobName = `job-boards/${cardId}/cover/${randomUUID()}${ext}`
    const fileUrl = await this.azure.upload('media', blobName, file.buffer, file.mimetype)

    await this.prisma.cardAttachment.create({
      data: { cardId, fileName: file.originalname, fileUrl },
    })

    const card = await this.prisma.jobCard.update({
      where: { id: cardId },
      data: { coverImageUrl: fileUrl },
    })
    return {
      ...card,
      coverImageUrl: `/job-boards/cards/${cardId}/cover/file`,
    }
  }

  async getCard(id: string) {
    const card = await this.prisma.jobCard.findUnique({
      where: { id },
      include: {
        list: {
          include: { board: true },
        },
        members: {
          include: { user: true },
        },
        labels: true,
        checklists: {
          include: {
            items: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
        customFieldValues: {
          include: { field: true },
        },
        activities: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        attachments: true,
      },
    })

    if (!card) return card

    const board = card.list?.board
      ? this.withProxyUrls(card.list.board)
      : card.list?.board

    return {
      ...card,
      coverImageUrl: card.coverImageUrl
        ? `/job-boards/cards/${card.id}/cover/file`
        : card.coverImageUrl,
      attachments: (card.attachments || []).map(a => ({
        ...a,
        fileUrl: `/job-boards/attachments/${a.id}/file`,
      })),
      list: card.list ? { ...card.list, board } : card.list,
    }
  }

  async removeLabel(labelId: string) {
    return this.prisma.cardLabel.delete({
      where: { id: labelId },
    })
  }

  async addComment(
    cardId: string,
    message: string,
    userId: string,
    parentId?: string | null,
  ) {
    if (parentId) {
      const parent = await this.prisma.cardActivity.findFirst({
        where: { id: parentId, cardId, type: 'COMMENT' },
      })
      if (!parent) throw new NotFoundException('Parent comment not found')
    }

    return this.prisma.cardActivity.create({
      data: {
        cardId,
        userId,
        type: 'COMMENT',
        message,
        parentId: parentId || null,
      },
      include: { user: true },
    })
  }

  async updateComment(activityId: string, message: string) {
    return this.prisma.cardActivity.update({
      where: { id: activityId },
      data: { message },
    })
  }

  async deleteComment(activityId: string) {
    return this.prisma.cardActivity.delete({
      where: { id: activityId },
    })
  }

  async updateList(id: string, dto: any) {
    return this.prisma.jobList.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        color: dto.color ?? undefined,
      },
    })
  }


}
