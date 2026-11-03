import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards  } from '@nestjs/common';
import { ProductLocationsService, AddProductLocationDto } from './product-locations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/rbac/permissions.guard';
import { Permissions } from '../../../common/rbac/permissions.decorator';

@Controller('inventory/items/:productId/locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductLocationsController {
  constructor(private readonly service: ProductLocationsService) {}

  @Get()
  @Permissions('inventory.view')
  list(@Param('productId') productId: string) {
    return this.service.listForProduct(productId);
  }

  @Post()
  @Permissions('inventory.edit')
  add(@Param('productId') productId: string, @Body() dto: AddProductLocationDto) {
    return this.service.addToProduct(productId, dto);
  }

  @Patch(':locationId')
  @Permissions('inventory.edit')
  update(
    @Param('productId') productId: string,
    @Param('locationId') locationId: string,
    @Body() data: { isPrimary?: boolean; binCode?: string },
  ) {
    return this.service.updateProductLocation(productId, locationId, data);
  }

  @Patch(':locationId/set-primary')
  @Permissions('inventory.edit')
  setPrimary(
    @Param('productId') productId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.service.setPrimary(productId, locationId);
  }

  @Delete(':locationId')
  @Permissions('inventory.delete')
  remove(
    @Param('productId') productId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.service.removeFromProduct(productId, locationId);
  }
}