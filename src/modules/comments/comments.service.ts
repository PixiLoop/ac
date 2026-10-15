import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CommentsGateway } from './comments.gateway'

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private gateway: CommentsGateway,
  ) { }

  async getOrCreateThread(entityType: string, entityId: string) {
    let thread = await this.prisma.commentThread.findFirst({
      where: { entityType, entityId },
    })

    if (!thread) {
      thread = await this.prisma.commentThread.create({
        data: { entityType, entityId },
      })
    }

    return thread
  }

  async getComments(entityType: string, entityId: string) {
    const thread = await this.getOrCreateThread(entityType, entityId)

    return this.prisma.comment.findMany({
      where: {
        threadId: thread.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  async addComment(
    entityType: string,
    entityId: string,
    message: string,
    user: { id: string; name: string },
  ) {
    const thread = await this.getOrCreateThread(entityType, entityId)

    const comment = await this.prisma.comment.create({
      data: {
        threadId: thread.id,
        message,
        createdBy: user.id,
        createdByName: user.name,
        type: 'COMMENT',
      },
    })

    this.gateway.emitNewComment(
      `${entityType}:${entityId}`,
      comment,
    )

    return comment
  }
}
