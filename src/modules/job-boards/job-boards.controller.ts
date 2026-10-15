import { Controller, Get, Post, Body, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common'
import { JobBoardsService } from './job-boards.service'
import { Patch, Req, UseGuards } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../common/rbac/permissions.guard'
import { Permissions } from '../../common/rbac/permissions.decorator'

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('job-boards')
export class JobBoardsController {
  constructor(private service: JobBoardsService) { }

  @Get()
  @Permissions('jobboards.view')
  list(@Req() req: any) {
    return this.service.list(req.user.id)
  }

  @Post()
  @Permissions('jobboards.create')
  create(@Body() body: any, @Req() req: any) {
    return this.service.create(body, req.user.id)
  }

  @Get(':id')
  @Permissions('jobboards.view')
  get(@Param('id') id: string, @Req() req: any) {
    return this.service.get(id, req.user.id)
  }

  @Patch(':id')
  @Permissions('jobboards.edit')
  update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.service.update(id, body, req.user.id)
  }

  @Delete(':id')
  @Permissions('jobboards.delete')
  delete(@Param('id') id: string) {
    return this.service.delete(id)
  }

  @Post(':boardId/lists')
  @Permissions('jobboards.manage')
  createList(@Param('boardId') boardId: string, @Body() body: any) {
    return this.service.createList(boardId, body)
  }

  @Patch(':boardId/lists/reorder')
  @Permissions('jobboards.manage')
  reorderLists(
    @Param('boardId') boardId: string,
    @Body() body: { orderedIds: string[] },
  ) {
    return this.service.reorderLists(boardId, body.orderedIds)
  }

  @Delete('lists/:listId')
  @Permissions('jobboards.manage')
  deleteList(@Param('listId') listId: string) {
    return this.service.deleteList(listId)
  }

  @Post('lists/:listId/cards')
  @Permissions('jobboards.manage')
  createCard(
    @Param('listId') listId: string,
    @Body() body: any,
  ) {
    return this.service.createCard(listId, body)
  }

  @Patch('cards/reorder')
  @Permissions('jobboards.manage')
  reorderCards(
    @Body()
    body: {
      cardId: string
      sourceListId: string
      destinationListId: string
      orderedIds: string[]
    },
  ) {
    return this.service.reorderCards(body)
  }

  @Get('cards/:id')
  @Permissions('jobboards.view')
  async getCard(@Param('id') id: string) {
    return this.service.getCard(id)
  }

  @Patch('cards/:id')
  @Permissions('jobboards.manage')
  async updateCard(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    return this.service.updateCard(id, dto, req.user.id)
  }

  @Delete('cards/:cardId')
  @Permissions('jobboards.manage')
  deleteCard(@Param('cardId') cardId: string) {
    return this.service.deleteCard(cardId)
  }

  @Post('cards/:cardId/members/:userId')
  @Permissions('jobboards.manage')
  addMember(
    @Param('cardId') cardId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.service.addMember(cardId, userId, req.user.id)
  }
  @Delete('cards/:cardId/members/:userId')
  @Permissions('jobboards.manage')
  removeMember(
    @Param('cardId') cardId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.service.removeMember(cardId, userId, req.user.id)
  }

  @Post('cards/:cardId/checklists')
  @Permissions('jobboards.manage')
  addChecklist(
    @Param('cardId') cardId: string,
    @Body() body: { title: string },
    @Req() req: any,
  ) {
    return this.service.addChecklist(cardId, body.title, req.user.id)
  }

  @Post('checklists/:checklistId/items')
  @Permissions('jobboards.manage')
  addChecklistItem(
    @Param('checklistId') checklistId: string,
    @Body() body: { content: string },
  ) {
    return this.service.addChecklistItem(checklistId, body.content)
  }

  @Patch('checklist-items/:itemId')
  @Permissions('jobboards.manage')
  toggleChecklistItem(
    @Param('itemId') itemId: string,
    @Body() body: { isCompleted: boolean },
  ) {
    return this.service.toggleChecklistItem(itemId, body.isCompleted)
  }

  @Post('cards/:cardId/labels')
  @Permissions('jobboards.manage')
  addLabel(
    @Param('cardId') cardId: string,
    @Body() body: { name: string; color: string },
  ) {
    return this.service.addLabel(cardId, body.name, body.color)
  }

  @Post('cards/:cardId/attachments')
  @Permissions('jobboards.manage')
  @UseInterceptors(FileInterceptor('file'))
  addAttachment(
    @Param('cardId') cardId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.addAttachment(cardId, file)
  }

  @Delete('cards/:cardId/labels/:labelId')
  @Permissions('jobboards.manage')
  removeLabel(
    @Param('labelId') labelId: string,
  ) {
    return this.service.removeLabel(labelId)
  }

  @Post('cards/:cardId/comments')
  @Permissions('jobboards.manage')
  addComment(
    @Param('cardId') cardId: string,
    @Body() body: { message: string },
    @Req() req: any,
  ) {
    return this.service.addComment(cardId, body.message, req.user.id)
  }

  @Patch('comments/:id')
  @Permissions('jobboards.manage')
  updateComment(
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.service.updateComment(id, body.message)
  }

  @Delete('comments/:id')
  @Permissions('jobboards.manage')
  deleteComment(@Param('id') id: string) {
    return this.service.deleteComment(id)
  }

  @Patch('lists/:id')
  @Permissions('jobboards.manage')
  async updateList(
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.service.updateList(id, dto)
  }

}
