import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { GroupsController } from './groups/groups.controller';
import { GroupsService } from './groups/groups.service';
import { ItemsController } from './items/items.controller';
import { ItemsService } from './items/items.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';

import { LocationsModule } from './locations/locations.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ProductLocationsController } from './product-locations/product-locations.controller';
import { ProductLocationsService } from './product-locations/product-locations.service';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, LocationsModule, AuthModule, PurchaseOrdersModule],
  controllers: [SuppliersController, GroupsController, ItemsController, CategoriesController, ProductLocationsController],
  providers: [SuppliersService, GroupsService, ItemsService, CategoriesService, ProductLocationsService, PermissionsGuard],
  exports: [SuppliersService, GroupsService, ItemsService, CategoriesService],
})
export class InventoryModule {}
