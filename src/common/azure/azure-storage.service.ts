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

export type AzureContainer = 'media' | 'invoices' | 'receipts' | 'contracts' | 'avatars';

@Injectable()
export class AzureStorageService {
  private readonly logger = new Logger(AzureStorageService.name);
  private readonly blobServiceClient: BlobServiceClient;
  private readonly accountName: string;
  private readonly sharedKeyCredential?: StorageSharedKeyCredential;
  private cachedDelegation?: { key: UserDelegationKey; expiresOn: Date };

  constructor() {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
    let accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim() || 'aimsaircostorage';

    if (conn) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(conn);
      const nameMatch = /AccountName=([^;]+)/i.exec(conn);
      const keyMatch = /AccountKey=([^;]+)/i.exec(conn);
      if (nameMatch?.[1]) accountName = nameMatch[1];
      if (nameMatch?.[1] && keyMatch?.[1]) {
        this.sharedKeyCredential = new StorageSharedKeyCredential(nameMatch[1], keyMatch[1]);
      }
    } else if (accountKey) {
      this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        this.sharedKeyCredential,
      );
    } else {
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        new DefaultAzureCredential(),
      );
    }

    this.accountName = accountName;
  }

  private container(name: AzureContainer): ContainerClient {
    return this.blobServiceClient.getContainerClient(name);
  }

  async upload(
    container: AzureContainer,
    blobName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const client = this.container(container).getBlockBlobClient(blobName);
    await client.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return client.url;
  }

  async delete(container: AzureContainer, blobName: string): Promise<void> {
    await this.container(container).getBlockBlobClient(blobName).deleteIfExists();
  }

  async download(
    container: AzureContainer,
    blobName: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const client = this.container(container).getBlockBlobClient(blobName);
    try {
      const download = await client.download(0);
      const chunks: Buffer[] = [];
      if (!download.readableStreamBody) {
        throw new NotFoundException('Blob stream unavailable');
      }
      for await (const chunk of download.readableStreamBody as AsyncIterable<Buffer | string>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return {
        buffer: Buffer.concat(chunks),
        contentType: download.contentType || 'application/octet-stream',
      };
    } catch (err: any) {
      if (err?.statusCode === 404 || err instanceof NotFoundException) {
        throw new NotFoundException(`Blob not found: ${blobName}`);
      }
      this.logger.error(`Failed to download blob ${blobName}: ${err?.message || err}`);
      throw err;
    }
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
