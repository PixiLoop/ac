import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AddProductLocationDto {
  locationId: string;
  isPrimary?: boolean;
  binCode?: string;
}

@Injectable()
export class ProductLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return (this.prisma as any).productLocation;
  }

  async listForProduct(productId: string) {
    return this.db.findMany({
      where: { productId },
      include: {
        location: {
          select: { id: true, code: true, name: true, aisle: true, bay: true, level: true, isActive: true },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async addToProduct(productId: string, dto: AddProductLocationDto) {
    // Check product exists
    const product = await (this.prisma as any).product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Check location exists and active
    const location = await (this.prisma as any).invLocation.findFirst({
      where: { id: dto.locationId, deletedAt: null, isActive: true },
    });
    if (!location) throw new NotFoundException('Location not found or inactive');

    // Check not already linked
    const exists = await this.db.findFirst({ where: { productId, locationId: dto.locationId } });
    if (exists) throw new ConflictException('Product already linked to this location');

    // If isPrimary, clear existing primary first
    if (dto.isPrimary) {
      await this.db.updateMany({ where: { productId, isPrimary: true }, data: { isPrimary: false } });
    }

    return this.db.create({
      data: { productId, locationId: dto.locationId, isPrimary: dto.isPrimary ?? false, binCode: dto.binCode },
      include: {
        location: { select: { id: true, code: true, name: true, aisle: true, bay: true, level: true } },
      },
    });
  }

  async updateProductLocation(productId: string, locationId: string, data: { isPrimary?: boolean; binCode?: string }) {
    const link = await this.db.findFirst({ where: { productId, locationId } });
    if (!link) throw new NotFoundException('Link not found');

    if (data.isPrimary) {
      await this.db.updateMany({ where: { productId, isPrimary: true }, data: { isPrimary: false } });
    }

    return this.db.update({ where: { id: link.id }, data });
  }

  async removeFromProduct(productId: string, locationId: string) {
    const link = await this.db.findFirst({ where: { productId, locationId } });
    if (!link) throw new NotFoundException('Link not found');
    return this.db.delete({ where: { id: link.id } });
  }

  async setPrimary(productId: string, locationId: string) {
    return this.updateProductLocation(productId, locationId, { isPrimary: true });
  }
}