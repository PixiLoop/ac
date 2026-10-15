// apps/api/src/modules/notifications/graph-mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GraphMailService {
  private readonly logger = new Logger(GraphMailService.name);

  private token: string | null = null;
  private tokenExpiresAt = 0;

  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private sender: string;
  private scope: string;

  constructor() {
    this.logger.log('process.env.API_BASE_URL test ' + process.env.M365_SENDER);
    this.tenantId = process.env.M365_TENANT_ID ?? '';
    this.clientId = process.env.M365_CLIENT_ID ?? '';
    this.clientSecret = process.env.M365_CLIENT_SECRET ?? '';
    this.sender = process.env.M365_SENDER ?? '';
    this.scope = process.env.M365_SCOPES ?? 'https://graph.microsoft.com/.default';


    const missing = [];
    if (!this.tenantId) missing.push('M365_TENANT_ID');
    if (!this.clientId) missing.push('M365_CLIENT_ID');
    if (!this.clientSecret) missing.push('M365_CLIENT_SECRET');
    if (!this.sender) missing.push('M365_SENDER');
    if (missing.length) {
      this.logger.warn(
        `GraphMailService missing environment variables: ${missing.join(
          ', ',
        )}. Mail sending will fail until configured.`,
      );
    } else {
      this.logger.log('GraphMailService configured with M365 sender ' + this.sender);
    }
  }

  private tokenUrl(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
  }

  private async fetchToken(): Promise<string> {
    const now = Date.now();
    // reuse token if still valid (10s safety)
    if (this.token && now + 10_000 < this.tokenExpiresAt) {
      return this.token;
    }

    if (!this.tenantId || !this.clientId || !this.clientSecret) {
      this.logger.error('Cannot fetch token: tenant/client/secret not configured');
      throw new Error('Microsoft Graph credentials not configured');
    }

    //URLSearchParams 
    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('scope', this.scope);
    params.append('grant_type', 'client_credentials');

    try {
      const res = await axios.post(this.tokenUrl(), params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10_000,
      });

      const accessToken = res.data.access_token as string;
      const expiresIn = Number(res.data.expires_in) || 3600;

      this.token = accessToken;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
      this.logger.debug(`Fetched Graph token (expires in ${expiresIn}s)`);
      return accessToken;
    } catch (err: any) {
      this.logger.error(
        'Failed to fetch Graph token',
        err?.response?.data ?? err?.message ?? err,
      );
      throw new Error('Failed to obtain Microsoft Graph token');
    }
  }

  /**
   * Send mail via Graph using configured sender mailbox
   */
  async sendMail(options: {
    to: string | string[];
    subject: string;
    html: string;
    fromDisplayName?: string;
    saveToSentItems?: boolean;
    attachments?: Array<{
      name: string;
      contentType: string;
      contentBytes: string;     // base64
    }>;
  }): Promise<void> {
    if (!this.sender) {
      this.logger.error('M365_SENDER not configured');
      throw new Error('M365_SENDER not configured');
    }

    const token = await this.fetchToken();

    const toArray = Array.isArray(options.to) ? options.to : [options.to];
    const toRecipients = toArray.map((a) => ({ emailAddress: { address: a } }));

    const message: any = {
      subject: options.subject,
      body: { contentType: 'HTML', content: options.html },
      toRecipients,
      from: {
        emailAddress: {
          address: this.sender,
          name: options.fromDisplayName ?? this.sender,
        },
      },
    };

    //Attachments if present
    if (options.attachments?.length) {
      message.attachments = options.attachments.map(a => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: a.name,
        contentType: a.contentType,
        contentBytes: a.contentBytes,
      }));
    }

    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
      this.sender,
    )}/sendMail`;

    try {
      await axios.post(
        url,
        { message, saveToSentItems: options.saveToSentItems ?? true },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
        },
      );

      this.logger.log('process.env.M365_TENANT_ID test123 ' + process.env.M365_TENANT_ID);


      this.logger.log(
        `Sent mail subject="${options.subject}" to=${JSON.stringify(toArray)}`,
      );
    } catch (err: any) {
      this.logger.error(
        'Graph sendMail failed',
        err?.response?.data ?? err?.message ?? err,
      );
      throw new Error(
        `Graph sendMail failed: ${JSON.stringify(err?.response?.data ?? err?.message)}`,
      );
    }
  }
}
