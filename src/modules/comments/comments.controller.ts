import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common'
import { CommentsService } from './comments.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../../prisma/prisma.service'

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {

  constructor(
    private readonly service: CommentsService,
    private readonly prisma: PrismaService,
  ) { }

  @Get(':entityType/:entityId')
  async getComments(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return {
      data: await this.service.getComments(entityType, entityId),
    }
  }

  @Post()
  async addComment(
    @Body()
    body: {
      entityType: string
      entityId: string
      message: string
    },
    @Req() req: any,
  ) {

    const dbUser = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        displayName: true,
        firstName: true,
        lastName: true,
      },
    })

    const user = {
      id: req.user.id,
      name:
        dbUser?.displayName ||
        `${dbUser?.firstName ?? ''} ${dbUser?.lastName ?? ''}`.trim() ||
        'User',
    }

    return {
      data: await this.service.addComment(
        body.entityType,
        body.entityId,
        body.message,
        user,
      ),
    }
  }
}