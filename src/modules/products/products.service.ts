import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as XLSX from 'xlsx'
import { PriceLevel } from '@prisma/client'


const ALLOWED_STATUSES = [
    'Valid Item',
    'Sundry',
    'Airco Kit',
    'FM Service',
    'Replaced',
    'N.L.A',
] as const;

// Helper to validate and normalize status (case-insensitive option optional)
function parseStatus(rawStatus: any): string | null {
    if (!rawStatus) return null;
    const str = String(rawStatus).trim();

    // Exact match validation
    const matched = ALLOWED_STATUSES.find(
        (s) => s.toLowerCase() === str.toLowerCase()
    );

    return matched ?? null;
}

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    /*async importExcel(file: Express.Multer.File) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(sheet)

        for (const row of rows) {
            await this.prisma.product.upsert({
                where: { productCode: row['Product ID'] },

                create: {
                    // BASIC
                    name: row['Name'],
                    productCode: row['Product ID'],
                    parentProductId: row['Parent Product(Replacement Item)'] || null,
                    productCategory: row['Product Category'],
                    status: row['Status'] || null,
                    replacedBy: row['Replaced / Alternate'] || null,

                    // STRUCTURE
                    billOfGoods: !!row['Bill Of Goods'],
                    fieldServiceType: row['Field Service Product Type'] || null,
                    decimalsSupported: !!row['Decimals Supported'],
                    defaultUnit: row['Default Unit'] || null,
                    unitGroup: row['Unit Group'] || null,

                    // VENDOR
                    vendorName: row['Vendor Name'] || null,
                    vendorNumber: row['Vendor Number'] || null,
                    vendorWeb: row['Vendor Web'] || null,
                    vendorPartNumber: row['Vendor Part Number'] || null,

                    // REORDER
                    reorderLogic: row['Reorder Logic'] || null,
                    automaticMaxQty: Number(row['Automatic Max Qty']) || null,
                    automaticMinQty: Number(row['Automatic Min Qty']) || null,
                    fixedMinQty: Number(row['Fixed Min Qty']) || null,
                    fixedMaxQty: Number(row['Fixed Max Qty']) || null,

                    // FM ATTRIBUTES
                    isFmHardware: !!row['FM Service Hardware (Check box for FM Attribute)'],
                    isMonitor: !!row['Is Monitor'],
                    fmUnitType: row['FM Unit Type'] || null,
                    fmUnitCode: row['FM Unit Code'] || null,
                    fourGUnitModem: !!row['4G Unit Modem'],
                    mixUnitSim: !!row['Mix Unit Sim'],
                    fuelRebate: !!row['Fuel Rebate'],
                    internSim: !!row['Intern SIM'],
                    rimOption: !!row['RIM Option'],
                    nrcOption: !!row['NRC Option'],
                    tmaOption: !!row['TMA Option'],

                    // VISION
                    isVision: !!row['Is Vision'],
                    vision4GDevice: !!row['4G Vision Device'],
                    standardVision: !!row['Standard Vision'],
                    highDefinition: !!row['High Definition'],
                    aiOption: !!row['AI Option'],
                    cameraCount: Number(row['Camera Count2']) || null,
                    mixVisSim: !!row['MiX Vis SIM'],
                    vision4GModem: !!row['4G Vision Modem'],

                    // COSTING
                    netSupplierBuyPrice: Number(row['Net Supplier Buy Price']) || null,
                    importDuty: Number(row['Import Duty']) || null,
                    importMarkup: Number(row['Import Markup']) || null,
                    landedCost: Number(row['Landed Cost']) || null,
                    aircoMarkupGroup: row['Airco Fixed Markup Group'] || null,

                    // SELLING
                    agentPrice: Number(row['Agent Price']) || null,
                    salesPartnerPrice: Number(row['Sales Partner Price']) || null,
                    tradePrice: Number(row['Trade Price']) || null,
                    retailPrice: Number(row['Retail Price']) || null,
                    salesMargin: Number(row['Sales Margin']) || null,
                    sellingPrice: Number(row['Selling Price']) || null,
                    gstPercent: Number(row['GST %']) || null,
                },

                update: {
                    name: row['Name'],
                    productCategory: row['Product Category'],
                    status: row['Status'] || null,
                    replacedBy: row['Replaced / Alternate'] || null,

                    defaultUnit: row['Default Unit'] || null,
                    unitGroup: row['Unit Group'] || null,

                    vendorName: row['Vendor Name'] || null,
                    vendorNumber: row['Vendor Number'] || null,
                    vendorWeb: row['Vendor Web'] || null,
                    vendorPartNumber: row['Vendor Part Number'] || null,

                    agentPrice: Number(row['Agent Price']) || null,
                    salesPartnerPrice: Number(row['Sales Partner Price']) || null,
                    tradePrice: Number(row['Trade Price']) || null,
                    retailPrice: Number(row['Retail Price']) || null,
                    sellingPrice: Number(row['Selling Price']) || null,
                    gstPercent: Number(row['GST %']) || null,
                },
            })
        }

        return { success: true }
    }*/

    // Helper function to normalize percentage inputs
    parsePercentage(val: any): number | null {
        if (val === null || val === undefined || val === '') return null;

        // Convert string inputs (e.g. "9.1%")
        if (typeof val === 'string') {
            const cleaned = val.replace('%', '').trim();
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
        }

        if (typeof val === 'number') {
            if (isNaN(val)) return null;
            // Excel percentage cells store values like 9.1% as 0.091 (less than 1 but non-zero)
            // Convert decimal values to standard percentage values
            if (val > 0 && val < 1) {
                return Number((val * 100).toFixed(4));
            }
            return val;
        }

        return null;
    }

    async importExcel(
        file: Express.Multer.File,
        opts: {
            ignoreExisting?: string | boolean;
            updateExisting?: string | boolean;
            validateSuppliers?: string | boolean;
        } = {},
    ) {
        // 1. Normalize boolean options
        const ignoreExisting = opts.ignoreExisting === true || opts.ignoreExisting === 'true';
        const updateExisting = opts.updateExisting === true || opts.updateExisting === 'true';
        const validateSuppliers = opts.validateSuppliers === true || opts.validateSuppliers === 'true';

        // 2. Fetch all valid category names from the database once for O(1) validation
        // Adjust 'prisma.category' or 'name' based on your exact Prisma schema model name/field
        const existingCategories = await this.prisma.invCategory.findMany();

        // Store lowercased category names in a Set for case-insensitive validation
        const validCategoryMap = new Map<string, string>(
            existingCategories.map((c) => [c.code.toLowerCase(), c.code])
        );

        // 3. Parse file buffer safely for CSV or Excel
        const isCsv = file.originalname?.toLowerCase().endsWith('.csv') || file.mimetype === 'text/csv';
        const workbook = isCsv
            ? XLSX.read(file.buffer.toString('utf-8'), { type: 'string', raw: true })
            : XLSX.read(file.buffer, { type: 'buffer' });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const report: {
            rowNo: number;
            partNo: string;
            result: 'Imported' | 'Skipped Existing' | 'Failed' | 'Warning';
            message: string;
        }[] = [];

        let imported = 0, skippedExisting = 0, failed = 0, warnings = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNo = i + 2;
            const partNo = String(row['Product ID'] ?? '').trim();

            if (!partNo) {
                failed++;
                report.push({ rowNo, partNo: '—', result: 'Failed', message: 'Missing Product ID.' });
                continue;
            }

            if (validateSuppliers) {
                const vendorName = row['Vendor Name'] ? String(row['Vendor Name']).trim() : '';
                if (!vendorName) {
                    failed++;
                    report.push({
                        rowNo,
                        partNo,
                        result: 'Failed',
                        message: 'Supplier validation failed: Missing Vendor Name.',
                    });
                    continue;
                }
            }

            // ── Status Validation ──────────────────────────────────────────────────────
            const rawStatus = row['Status'] ? String(row['Status']).trim() : '';
            const validStatus = parseStatus(rawStatus);

            if (rawStatus && !validStatus) {
                failed++;
                report.push({
                    rowNo,
                    partNo,
                    result: 'Failed',
                    message: `Invalid Status: '${rawStatus}'. Allowed values are: ${ALLOWED_STATUSES.join(', ')}.`,
                });
                continue;
            }

            // ── Product Category Validation ────────────────────────────────────────────
            const rawCategory = row['Product Category'] ? String(row['Product Category']).trim() : '';
            let validCategory: string | null = null;

            if (rawCategory) {
                const matchedCategory = validCategoryMap.get(rawCategory.toLowerCase());
                if (!matchedCategory) {
                    failed++;
                    report.push({
                        rowNo,
                        partNo,
                        result: 'Failed',
                        message: `Invalid Category: '${rawCategory}' does not exist in Inventory > Categories.`,
                    });
                    continue;
                }
                validCategory = matchedCategory; // Standardizes casing to database casing
            }

            try {
                // Check if already exists
                const existing = await this.prisma.product.findUnique({
                    where: { productCode: partNo },
                    select: { id: true },
                });

                if (existing) {
                    if (opts.ignoreExisting && !opts.updateExisting) {
                        skippedExisting++;
                        report.push({ rowNo, partNo, result: 'Skipped Existing', message: 'Part number already exists. Ignored as selected.' });
                        continue;
                    }

                    if (opts.updateExisting) {
                        await this.prisma.product.update({
                            where: { productCode: partNo },
                            data: {
                                name: row['Name'],
                                productCategory: validCategory,
                                status: validStatus,
                                replacedBy: row['Replaced / Alternate'] || null,
                                defaultUnit: row['Default Unit'] || null,
                                unitGroup: row['Unit Group'] || null,
                                vendorName: row['Vendor Name'] || null,
                                vendorNumber: row['Vendor Number'] || null,
                                vendorWeb: row['Vendor Web'] || null,
                                vendorPartNumber: row['Vendor Part Number'] || null,
                                agentPrice: Number(row['Agent Price']) || null,
                                salesPartnerPrice: Number(row['Sales Partner Price']) || null,
                                tradePrice: Number(row['Trade Price']) || null,
                                retailPrice: Number(row['Retail Price']) || null,
                                sellingPrice: Number(row['Selling Price']) || null,
                                gstPercent: Number(row['GST %']) || null,
                            },
                        });
                        imported++;
                        report.push({ rowNo, partNo, result: 'Imported', message: 'Updated successfully.' });
                        continue;
                    }
                }

                // Create new product
                await this.prisma.product.create({
                    data: {
                        name: row['Name'],
                        productCode: partNo,
                        parentProductId: row['Parent Product(Replacement Item)'] || null,
                        productCategory: validCategory,
                        status: validStatus,
                        replacedBy: row['Replaced / Alternate'] || null,
                        billOfGoods: !!row['Bill Of Goods'],
                        fieldServiceType: row['Field Service Product Type'] || null,
                        decimalsSupported: !!row['Decimals Supported'],
                        defaultUnit: row['Default Unit'] || null,
                        unitGroup: row['Unit Group'] || null,
                        vendorName: row['Vendor Name'] || null,
                        vendorNumber: row['Vendor Number'] || null,
                        vendorWeb: row['Vendor Web'] || null,
                        vendorPartNumber: row['Vendor Part Number'] || null,
                        reorderLogic: row['Reorder Logic'] || null,
                        automaticMaxQty: Number(row['Automatic Max Qty']) || null,
                        automaticMinQty: Number(row['Automatic Min Qty']) || null,
                        fixedMinQty: Number(row['Fixed Min Qty']) || null,
                        fixedMaxQty: Number(row['Fixed Max Qty']) || null,
                        isFmHardware: !!row['FM Service Hardware (Check box for FM Attribute)'],
                        isMonitor: !!row['Is Monitor'],
                        fmUnitCode: row['FM Unit Code'] || null,
                        fourGUnitModem: !!row['4G Unit Modem'],
                        mixUnitSim: !!row['Mix Unit Sim'],
                        fuelRebate: !!row['Fuel Rebate'],
                        internSim: !!row['Intern SIM'],
                        rimOption: !!row['RIM Option'],
                        nrcOption: !!row['NRC Option'],
                        tmaOption: !!row['TMA Option'],
                        isVision: !!row['Is Vision'],
                        vision4GDevice: !!row['4G Vision Device'],
                        standardVision: !!row['Standard Vision'],
                        highDefinition: !!row['High Definition'],
                        aiOption: !!row['AI Option'],
                        cameraCount: Number(row['Camera Count2']) || null,
                        mixVisSim: !!row['MiX Vis SIM'],
                        vision4GModem: !!row['4G Vision Modem'],
                        netSupplierBuyPrice: Number(row['Net Supplier Buy Price']) || null,
                        importDuty: this.parsePercentage(row['Import Duty']),
                        importMarkup: this.parsePercentage(row['Import Markup']),
                        landedCost: Number(row['Landed Cost']) || null,
                        aircoMarkupGroup: row['Airco Fixed Markup Group'] || null,
                        agentPrice: Number(row['Agent Price']) || null,
                        salesPartnerPrice: Number(row['Sales Partner Price']) || null,
                        tradePrice: Number(row['Trade Price']) || null,
                        retailPrice: Number(row['Retail Price']) || null,
                        salesMargin: Number(row['Sales Margin']) || null,
                        sellingPrice: Number(row['Selling Price']) || null,
                        gstPercent: this.parsePercentage(row['GST %']),
                    },
                });

                const hasWarning = !validCategory;
                if (hasWarning) {
                    warnings++;
                    report.push({ rowNo, partNo, result: 'Warning', message: 'Imported but Product Category is missing.' });
                } else {
                    imported++;
                    report.push({ rowNo, partNo, result: 'Imported', message: 'Created successfully.' });
                }
            } catch (err: any) {
                failed++;
                report.push({
                    rowNo,
                    partNo,
                    result: 'Failed',
                    message: err?.message?.slice(0, 120) ?? 'Unexpected error.',
                });
            }
        }

        return { imported, skippedExisting, failed, warnings, rows: report };
    }

    async list(category?: string, search?: string) {
        return this.prisma.product.findMany({
            where: {
                ...(category && { productCategory: category }),
                ...(search && {
                    name: {
                        contains: search,
                        mode: 'insensitive',
                    },
                }),
            },
            orderBy: {
                productCode: 'asc',
            },
        })
    }

    async getById(id: string) {
        return this.prisma.product.findUnique({
            where: { id },
        })
    }
}