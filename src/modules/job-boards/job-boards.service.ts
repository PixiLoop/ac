import { Injectable } from '@nestjs/common'
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
    return this.prisma.jobBoard.findMany({
      where: {
        deletedAt: null,
        userId,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(dto: any, userId: string) {
    return this.prisma.jobBoard.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        userId,
      },
    })
  }

  async get(id: string, userId: string) {
    return this.prisma.jobBoard.findFirst({
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
            },
          },
        },
      },
    })
  }

  async update(id: string, dto: any, userId: string) {
    return this.prisma.jobBoard.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
      },
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


  async getCard(id: string) {
    return this.prisma.jobCard.findUnique({
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
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ?dto.dueDate : null }),
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


  async addChecklist(cardId: string, title: string, userId: string) {
    const checklist = await this.prisma.cardChecklist.create({
      data: { cardId, title },
    })

    await this.logActivity(
      cardId,
      userId,
      'CHECKLIST_ADD',
      'added a checklist'
    )

    return checklist
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
    return this.prisma.cardAttachment.create({
      data: { cardId, fileName: file.originalname, fileUrl },
    });
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
  ) {
    return this.prisma.cardActivity.create({
      data: {
        cardId,
        userId,
        type: 'COMMENT',
        message,
      },
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
