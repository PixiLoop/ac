import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { FMInstallService } from './fm-install.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fm-install')
export class FMInstallController {
  constructor(private readonly svc: FMInstallService) { }

  @Get()
  @Permissions('fminstall.view')
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('preinstall/:preinstallId')
  @Permissions('fminstall.view')
  findByPreinstall(@Param('preinstallId') id: string) {
    return this.svc.findByPreinstallId(id);
  }

  @Get(':id')
  @Permissions('fminstall.view')
  findById(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Post()
  @Permissions('fminstall.create')
  create(@Body() dto: any) {
    return this.svc.create(dto);
  }

  @Post('from-preinstall/:preinstallId')
  @Permissions('fminstall.create')
  async createFromPreinstall(@Param('preinstallId') preinstallId: string) {
    return this.svc.createFromPreinstall(preinstallId);
  }

  @Put(':id')
  @Permissions('fminstall.edit')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Put(':id/detail')
  @Permissions('fminstall.edit')
  updateDetail(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateDetail(id, dto);
  }

  @Get(':id/comments')
  @Permissions('fminstall.view')
  getComments(@Param('id') id: string) {
    return this.svc.getComments(id);
  }

  @Post(':id/comments')
  @Permissions('fminstall.edit')
  addComment(@Param('id') id: string, @Body() body: { message: string }, @Request() req: any) {
    return this.svc.addComment(
      id,
      body.message,
      req.user?.id ?? 'SYSTEM',
      req.user?.displayName ?? req.user?.email,
    );
  }

  @Post('comments/:commentId/delete')
  @Permissions('fminstall.edit')
  deleteComment(@Param('commentId') commentId: string) {
    return this.svc.deleteComment(commentId);
  }

}