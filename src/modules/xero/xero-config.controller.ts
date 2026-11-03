import { Controller, Get, Post, Body, Req, Res, Param, UseGuards  } from '@nestjs/common';
import { Request, Response } from 'express';
import { XeroConfigService } from './xero-config.service';
import { XeroOAuthService } from './xero-oauth.service';
import { UpsertXeroConfigDto } from './dto/xero-config.dto';
import { XeroInvoiceService } from './xero-invoice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('admin/xero-config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class XeroConfigController {
  constructor(
    private readonly configService: XeroConfigService,
    private readonly oauthService: XeroOAuthService,
    private readonly invoiceService: XeroInvoiceService,
  ) { }

  @Get()
  @Permissions('integrations.view')
  get() {
    return this.configService.get();
  }

  @Post()
  @Permissions('integrations.xero')
  upsert(@Body() dto: UpsertXeroConfigDto) {
    return this.configService.upsert(dto);
  }

  @Get('status')
  @Permissions('integrations.view')
  status() {
    return this.oauthService.getStatus();
  }

  @Get('auth-url')
  @Permissions('integrations.xero')
  async getAuthUrl() {
    const url = await this.oauthService.getAuthUrl();
    return { url };
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    try {
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      console.log('Xero callback URL:', fullUrl);
      await this.oauthService.handleCallback(fullUrl);
      res.redirect(`${frontendUrl}/admin/xero?authorized=true`);
    } catch (err) {
      console.error('Xero callback error:', err?.message ?? err);
      res.redirect(`${frontendUrl}/admin/xero?error=${encodeURIComponent(err?.message ?? 'callback_failed')}`);
    }
  }

  @Post('disconnect')
  @Permissions('integrations.xero')
  disconnect() {
    return this.oauthService.disconnect();
  }

  @Post('push-invoice/:invoiceId')
  @Permissions('integrations.xero')
  async pushInvoice(@Param('invoiceId') invoiceId: string) {
    try {
      return await this.invoiceService.pushInvoice(invoiceId);
    } catch (err) {
      console.error('Push invoice error:', err?.message, err?.response?.body ?? err);
      throw err;
    }
  }

  @Get('invoice-status/:invoiceId')
  @Permissions('integrations.view')
  async invoiceStatus(@Param('invoiceId') invoiceId: string) {
    return this.invoiceService.getXeroStatus(invoiceId);
  }
}