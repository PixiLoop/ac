import {
    Controller,
    Get,
    Post,
    Query,
    Param,
    UseInterceptors,
    UploadedFile,
    Body,
    UseGuards
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ProductsService } from './products.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../common/rbac/permissions.guard'
import { Permissions } from '../../common/rbac/permissions.decorator'

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post('upload')
    @Permissions('inventory.import')
    @UseInterceptors(FileInterceptor('file'))
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Body('ignoreExisting') ignoreExisting?: string,
        @Body('updateExisting') updateExisting?: string,
        @Body('validateSuppliers') validateSuppliers?: string,
    ) {
        if (!file) throw new Error('No file uploaded')

        return this.productsService.importExcel(file, {
            ignoreExisting,
            updateExisting,
            validateSuppliers,
        })
    }

    @Get()
    @Permissions('inventory.view')
    async list(
        @Query('category') category?: string,
        @Query('search') search?: string,
    ) {
        return this.productsService.list(category, search)
    }

    @Get(':id')
    @Permissions('inventory.view')
    getById(@Param('id') id: string) {
        return this.productsService.getById(id)
    }

}