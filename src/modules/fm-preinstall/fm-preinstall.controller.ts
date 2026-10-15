import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    Req,
    UseGuards
} from '@nestjs/common';

import { CreateFMPreinstallDto } from './dto/create-fm-preinstall.dto';
import { UpdateFMPreinstallDto } from './dto/update-fm-preinstall.dto';
import { FMPreinstallService } from './fm-preinstall.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';

@Controller('fm-preinstall')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FMPreinstallController {
    constructor(private readonly service: FMPreinstallService) { }

    @Get('filters/customers')
    @Permissions('fmpreinstalls.view')
    getCustomers(@Query('q') q: string) {
        return this.service.getCustomerOptions(q);
    }

    @Get('filters/service-codes')
    @Permissions('fmpreinstalls.view')
    getServiceCodes(@Query('q') q: string) {
        return this.service.getServiceCodeOptions(q);
    }

    @Get('filters/unit-codes')
    @Permissions('fmpreinstalls.view')
    getUnitCodes() {
        return this.service.getUnitCodeOptions();
    }

    @Get('target-install/search')
    @Permissions('fmpreinstalls.view')
    searchTargetInstalls(@Query('q') q: string) {
        return this.service.searchTargetInstalls(q);
    }

    @Get('target-install/:id')
    @Permissions('fmpreinstalls.view')
    getTargetInstall(@Param('id') id: string) {
        return this.service.getTargetInstall(id);
    }

    @Get()
    @Permissions('fmpreinstalls.view')
    list(@Query() query: any) {
        return this.service.list(query);
    }

    @Patch(':id/status')
    @Permissions('fmpreinstalls.edit')
    updateStatus(
        @Param('id') id: string,
        @Body() body: { status: string },
    ) {
        return this.service.update(id, { status: body.status });
    }

    @Get('by-card/:cardId')
    @Permissions('fmpreinstalls.view')
    findByCard(@Param('cardId') cardId: string) {
        return this.service.findByJobId(cardId);
    }

    @Get('by-invoice/:invoiceId')
    @Permissions('fmpreinstalls.view')
    findByInvoice(@Param('invoiceId') invoiceId: string) {
        return this.service.findByInvoiceId(invoiceId);
    }

    @Get(':id')
    @Permissions('fmpreinstalls.view')
    find(@Param('id') id: string) {
        return this.service.findById(id);
    }

    @Post()
    @Permissions('fmpreinstalls.create')
    create(
        @Body() dto: CreateFMPreinstallDto,
        @Req() req: any,
    ) {
        const userId = req.user?.id || 'SYSTEM'; // fallback

        return this.service.create(dto, userId);
    }

    @Patch(':id')
    @Permissions('fmpreinstalls.edit')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateFMPreinstallDto,
    ) {
        return this.service.update(id, dto);
    }

    @Patch(':id/items')
    @Permissions('fmpreinstalls.edit')
    updateItems(@Param('id') id: string, @Body() body: any) {
        return this.service.updateItems(id, body.items);
    }

    @Patch('item/:itemId/install-detail')
    @Permissions('fmpreinstalls.edit')
    updateInstall(
        @Param('itemId') itemId: string,
        @Body() dto: any,
    ) {
        return this.service.updateInstallDetail(itemId, dto);
    }

    @Delete(':id')
    @Permissions('fmpreinstalls.delete')
    delete(@Param('id') id: string) {
        return this.service.delete(id);
    }
}