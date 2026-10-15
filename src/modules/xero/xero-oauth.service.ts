import { Injectable, NotFoundException } from '@nestjs/common';
import { XeroClient } from 'xero-node';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class XeroOAuthService {
    constructor(private readonly prisma: PrismaService) { }

    private async getClient(): Promise<XeroClient> {
        const config = await this.prisma.xeroConfig.findFirst();
        if (!config) throw new NotFoundException('Xero config not found');

        const redirectUri = process.env.XERO_REDIRECT_URI
            ?? config.redirectUri
            ?? `${process.env.API_URL ?? 'http://localhost:4000/api'}/admin/xero-config/callback`;

        const xero = new XeroClient({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            redirectUris: [redirectUri],
            scopes: [
                'openid', 'profile', 'email',
                'accounting.invoices',
                'accounting.contacts',
                'accounting.settings',
                'offline_access',
            ],
        });

        await xero.initialize();
        return xero;
    }
    async getAuthUrl(): Promise<string> {
        const xero = await this.getClient();
        const url = await xero.buildConsentUrl();
        return url;
    }

    async handleCallback(callbackUrl: string) {
        const config = await this.prisma.xeroConfig.findFirst();
        if (!config) throw new NotFoundException('Xero config not found');

        const xero = await this.getClient();
        const tokenSet = await xero.apiCallback(callbackUrl);
        await xero.updateTenants();

        const tenants = xero.tenants;
        const tenantId = tenants?.[0]?.tenantId ?? config.tenantId ?? '';

        await this.prisma.xeroConfig.update({
            where: { id: config.id },
            data: {
                accessToken: tokenSet.access_token,
                refreshToken: tokenSet.refresh_token,
                tokenExpiry: tokenSet.expires_at
                    ? new Date(Number(tokenSet.expires_at) * 1000)
                    : null,
                tenantId,
                isAuthorized: true,
                isActive: true,
            },
        });

        return { success: true, tenantId };
    }

    async getValidClient(): Promise<{ xero: XeroClient; tenantId: string }> {
        const config = await this.prisma.xeroConfig.findFirst();
        if (!config || !config.isAuthorized) {
            throw new NotFoundException('Xero not authorized');
        }

        const xero = await this.getClient();

        xero.setTokenSet({
            access_token: config.accessToken ?? '',
            refresh_token: config.refreshToken ?? '',
            expires_at: config.tokenExpiry
                ? Math.floor(config.tokenExpiry.getTime() / 1000)
                : undefined,
        });

        const isExpired = config.tokenExpiry
            ? new Date() >= config.tokenExpiry
            : true;

        if (isExpired && config.refreshToken) {
            const newTokenSet = await xero.refreshToken();
            await this.prisma.xeroConfig.update({
                where: { id: config.id },
                data: {
                    accessToken: newTokenSet.access_token,
                    refreshToken: newTokenSet.refresh_token,
                    tokenExpiry: newTokenSet.expires_at
                        ? new Date(Number(newTokenSet.expires_at) * 1000)
                        : null,
                },
            });
            xero.setTokenSet(newTokenSet);
        }

        return { xero, tenantId: config.tenantId ?? '' };
    }

    async disconnect() {
        const config = await this.prisma.xeroConfig.findFirst();
        if (!config) return;

        await this.prisma.xeroConfig.update({
            where: { id: config.id },
            data: {
                accessToken: null,
                refreshToken: null,
                tokenExpiry: null,
                isAuthorized: false,
                isActive: false,
            },
        });
        return { success: true };
    }

    async getStatus() {
        const config = await this.prisma.xeroConfig.findFirst();
        if (!config) return { configured: false, authorized: false };

        return {
            configured: true,
            authorized: config.isAuthorized,
            isActive: config.isActive,
            tenantId: config.tenantId,
            tokenExpiry: config.tokenExpiry,
            isExpired: config.tokenExpiry
                ? new Date() >= config.tokenExpiry
                : true,
        };
    }
}