import { Injectable } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

export type AzureContainer = 'media' | 'invoices' | 'receipts' | 'contracts' | 'avatars';

@Injectable()
export class AzureStorageService {
  private readonly blobServiceClient: BlobServiceClient;
  private readonly accountName = 'aimsaircostorage';

  constructor() {
    const url = `https://${this.accountName}.blob.core.windows.net`;
    this.blobServiceClient = new BlobServiceClient(url, new DefaultAzureCredential());
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
}
