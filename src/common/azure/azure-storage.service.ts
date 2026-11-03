import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
  UserDelegationKey,
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import * as fs from 'fs';
import * as path from 'path';

export type AzureContainer = 'media' | 'invoices' | 'receipts' | 'contracts' | 'avatars';

@Injectable()
export class AzureStorageService {
  private readonly logger = new Logger(AzureStorageService.name);
  private readonly blobServiceClient?: BlobServiceClient;
  private readonly accountName: string;
  private readonly sharedKeyCredential?: StorageSharedKeyCredential;
  private cachedDelegation?: { key: UserDelegationKey; expiresOn: Date };
  private readonly hasAzureConfig: boolean = false;
  private readonly localCache = new Map<string, { buffer: Buffer; contentType: string }>();

  constructor() {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
    let accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim() || 'aimsaircostorage';

    if (conn) {
      try {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(conn);
        const nameMatch = /AccountName=([^;]+)/i.exec(conn);
        const keyMatch = /AccountKey=([^;]+)/i.exec(conn);
        if (nameMatch?.[1]) accountName = nameMatch[1];
        if (nameMatch?.[1] && keyMatch?.[1]) {
          this.sharedKeyCredential = new StorageSharedKeyCredential(nameMatch[1], keyMatch[1]);
        }
        this.hasAzureConfig = true;
      } catch (err: any) {
        this.logger.warn(`Failed to init Azure BlobServiceClient from connection string: ${err?.message}`);
      }
    } else if (accountKey) {
      try {
        this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
        this.blobServiceClient = new BlobServiceClient(
          `https://${accountName}.blob.core.windows.net`,
          this.sharedKeyCredential,
        );
        this.hasAzureConfig = true;
      } catch (err: any) {
        this.logger.warn(`Failed to init Azure BlobServiceClient from account key: ${err?.message}`);
      }
    } else {
      try {
        this.blobServiceClient = new BlobServiceClient(
          `https://${accountName}.blob.core.windows.net`,
          new DefaultAzureCredential(),
        );
      } catch (err: any) {
        this.logger.warn(`Azure DefaultAzureCredential not available, using local storage: ${err?.message}`);
      }
    }

    this.accountName = accountName;
  }

  private getLocalFilePath(container: string, blobName: string): string {
    const sanitized = blobName.replace(/\.\./g, '');
    return path.join(process.cwd(), 'uploads', container, sanitized);
  }

  private container(name: AzureContainer): ContainerClient | null {
    if (!this.blobServiceClient) return null;
    return this.blobServiceClient.getContainerClient(name);
  }

  async upload(
    container: AzureContainer,
    blobName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    // 1. Always save locally first so file is immediately available on disk and in memory
    try {
      const filePath = this.getLocalFilePath(container, blobName);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, buffer);
    } catch (fsErr: any) {
      this.logger.warn(`Local disk write fallback warning: ${fsErr?.message}`);
    }
    this.localCache.set(`${container}:${blobName}`, { buffer, contentType });

    // 2. If Azure credentials configured, attempt Azure upload
    if (this.hasAzureConfig && this.blobServiceClient) {
      try {
        const client = this.container(container)?.getBlockBlobClient(blobName);
        if (client) {
          await client.uploadData(buffer, {
            blobHTTPHeaders: { blobContentType: contentType },
          });
          return client.url;
        }
      } catch (err: any) {
        this.logger.warn(`Azure upload failed, using local storage URL: ${err?.message}`);
      }
    }

    return `/uploads/${container}/${blobName}`;
  }

  async delete(container: AzureContainer, blobName: string): Promise<void> {
    this.localCache.delete(`${container}:${blobName}`);
    try {
      const filePath = this.getLocalFilePath(container, blobName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (fsErr: any) {
      this.logger.warn(`Failed to delete local file: ${fsErr?.message}`);
    }

    if (this.hasAzureConfig && this.blobServiceClient) {
      try {
        await this.container(container)?.getBlockBlobClient(blobName).deleteIfExists();
      } catch (err: any) {
        this.logger.warn(`Azure delete warning: ${err?.message}`);
      }
    }
  }

  async download(
    container: AzureContainer,
    blobName: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    // 1. Check in-memory cache
    const cached = this.localCache.get(`${container}:${blobName}`);
    if (cached) {
      return cached;
    }

    // 2. Check local disk
    try {
      const filePath = this.getLocalFilePath(container, blobName);
      if (fs.existsSync(filePath)) {
        const buffer = await fs.promises.readFile(filePath);
        const ext = path.extname(blobName).toLowerCase();
        const mimeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.gif': 'image/gif',
          '.pdf': 'application/pdf',
        };
        const contentType = mimeMap[ext] || 'application/octet-stream';
        this.localCache.set(`${container}:${blobName}`, { buffer, contentType });
        return { buffer, contentType };
      }
    } catch (fsErr: any) {
      this.logger.warn(`Local file read check error: ${fsErr?.message}`);
    }

    // 3. Fallback to Azure if configured
    if (this.blobServiceClient) {
      try {
        const client = this.container(container)?.getBlockBlobClient(blobName);
        if (!client) throw new NotFoundException('Azure client unavailable');
        const download = await client.download(0);
        const chunks: Buffer[] = [];
        if (!download.readableStreamBody) {
          throw new NotFoundException('Blob stream unavailable');
        }
        for await (const chunk of download.readableStreamBody as AsyncIterable<Buffer | string>) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const contentType = download.contentType || 'application/octet-stream';
        this.localCache.set(`${container}:${blobName}`, { buffer, contentType });
        return {
          buffer,
          contentType,
        };
      } catch (err: any) {
        if (err?.statusCode === 404 || err instanceof NotFoundException) {
          throw new NotFoundException(`Blob not found: ${blobName}`);
        }
        this.logger.error(`Failed to download blob ${blobName}: ${err?.message || err}`);
        throw err;
      }
    }

    throw new NotFoundException(`File not found: ${blobName}`);
  }

  /**
   * Short-lived read URL for private containers (account key or user-delegation SAS).
   * Prefer API proxy when SAS cannot be issued (e.g. missing Storage Blob Delegator).
   */
  async getSignedReadUrl(
    container: AzureContainer,
    blobName: string,
    ttlMinutes = 120,
  ): Promise<string | null> {
    const client = this.container(container).getBlockBlobClient(blobName);
    const startsOn = new Date(Date.now() - 60_000);
    const expiresOn = new Date(Date.now() + ttlMinutes * 60_000);

    try {
      if (this.sharedKeyCredential) {
        const sas = generateBlobSASQueryParameters(
          {
            containerName: container,
            blobName,
            permissions: BlobSASPermissions.parse('r'),
            startsOn,
            expiresOn,
            protocol: SASProtocol.Https,
          },
          this.sharedKeyCredential,
        ).toString();
        return `${client.url}?${sas}`;
      }

      const now = Date.now();
      if (!this.cachedDelegation || this.cachedDelegation.expiresOn.getTime() - now < 5 * 60_000) {
        const keyExpires = new Date(now + 55 * 60_000);
        const key = await this.blobServiceClient.getUserDelegationKey(
          new Date(now - 60_000),
          keyExpires,
        );
        this.cachedDelegation = { key, expiresOn: keyExpires };
      }

      const sas = generateBlobSASQueryParameters(
        {
          containerName: container,
          blobName,
          permissions: BlobSASPermissions.parse('r'),
          startsOn,
          expiresOn,
          protocol: SASProtocol.Https,
        },
        this.cachedDelegation.key,
        this.accountName,
      ).toString();
      return `${client.url}?${sas}`;
    } catch (err: any) {
      this.logger.warn(
        `Could not issue SAS for ${container}/${blobName}: ${err?.message || err}. Use API proxy.`,
      );
      return null;
    }
  }
}
