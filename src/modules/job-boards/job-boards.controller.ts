import { Controller, Get, Post, Body, Param, Delete, UseInterceptors, UploadedFile, Res, Query } from '@nestjs/common'
import { JobBoardsService } from './job-boards.service'
import { Patch, Req, UseGuards } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../common/rbac/permissions.guard'
import { Permissions } from '../../common/rbac/permissions.decorator'
import type { Response } from 'express'

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

  // Static path routes BEFORE :id so Nest does not treat "cards"/"attachments" as ids
  @Get('checklists/search')
  @Permissions('jobboards.view')
  searchChecklists(
    @Query('q') q?: string,
    @Query('boardId') boardId?: string,
  ) {
    return this.service.searchChecklistSources(q, boardId)
  }

  @Get('cards/:cardId/cover/file')
  @Permissions('jobboards.view')
  async getCardCoverFile(
    @Param('cardId') cardId: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.service.getCardCoverFile(cardId)
    res.setHeader('Content-Type', contentType || 'image/jpeg')
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.setHeader('Content-Length', String(buffer.length))
    res.end(buffer)
  }

  @Get('attachments/:attachmentId/file')
  @Permissions('jobboards.view')
  async getAttachmentFile(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.service.getAttachmentFile(attachmentId)
    res.setHeader('Content-Type', contentType || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.setHeader('Content-Length', String(buffer.length))
    res.end(buffer)
  }

  @Delete('attachments/:attachmentId')
  @Permissions('jobboards.manage')
  deleteAttachment(@Param('attachmentId') attachmentId: string) {
    return this.service.deleteAttachment(attachmentId)
  }

  @Get(':id/background/file')
  @Permissions('jobboards.view')
  async getBackgroundFile(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.service.getBackgroundFile(id, req.user.id)
    res.setHeader('Content-Type', contentType || 'image/jpeg')
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.setHeader('Content-Length', String(buffer.length))
    res.end(buffer)
  }

  @Post(':id/background')
  @Permissions('jobboards.edit')
  @UseInterceptors(FileInterceptor('file'))
  uploadBackground(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.service.uploadBackground(id, file, req.user.id)
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
    @Body()
    body: {
      title: string
      copyFromChecklistId?: string
      copyFromTemplateId?: string
    },
    @Req() req: any,
  ) {
    return this.service.addChecklist(cardId, body.title, req.user.id, {
      copyFromChecklistId: body.copyFromChecklistId,
      copyFromTemplateId: body.copyFromTemplateId,
    })
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

  @Delete('checklists/:checklistId')
  @Permissions('jobboards.manage')
  deleteChecklist(@Param('checklistId') checklistId: string) {
    return this.service.deleteChecklist(checklistId)
  }

  @Delete('checklist-items/:itemId')
  @Permissions('jobboards.manage')
  deleteChecklistItem(@Param('itemId') itemId: string) {
    return this.service.deleteChecklistItem(itemId)
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

  @Post('cards/:cardId/cover')
  @Permissions('jobboards.manage')
  @UseInterceptors(FileInterceptor('file'))
  setCover(
    @Param('cardId') cardId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.setCoverImage(cardId, file)
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
    @Body() body: { message: string; parentId?: string },
    @Req() req: any,
  ) {
    return this.service.addComment(cardId, body.message, req.user.id, body.parentId)
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
