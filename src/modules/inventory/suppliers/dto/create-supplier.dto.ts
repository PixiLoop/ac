import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum OrderMethod {
  POST = 'POST',
  FAX = 'FAX',
  EMAIL = 'EMAIL',
}

export enum DispatchMethod {
  SUPPLIER_CARRIER = 'SUPPLIER_CARRIER',
  SUPPLIER_AIR_BAG = 'SUPPLIER_AIR_BAG',
  AIRCO_CARRIER = 'AIRCO_CARRIER',
}

export enum PoAttachmentType {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  BOTH = 'BOTH',
}

export class CreateSupplierDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @IsOptional()
  @IsString()
  abn?: string;

  // Delivery address
  @IsOptional()
  @IsString()
  deliveryAddress1?: string;

  @IsOptional()
  @IsString()
  deliveryAddress2?: string;

  @IsOptional()
  @IsString()
  deliveryAddress3?: string;

  // Postal address
  @IsOptional()
  @IsString()
  postalAddress1?: string;

  @IsOptional()
  @IsString()
  postalAddress2?: string;

  @IsOptional()
  @IsString()
  postalAddress3?: string;

  // Ordering details
  @IsOptional()
  @IsString()
  serviceRep?: string;

  @IsOptional()
  @IsString()
  orderPhone?: string;

  @IsOptional()
  @IsString()
  orderEmail?: string;

  @IsOptional()
  @IsString()
  ordersClose?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minOrderValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freightCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freightCutsAt?: number;

  @IsOptional()
  @IsString()
  airBagClose?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  airBagCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderLandedFactor?: number;

  @IsOptional()
  @IsEnum(OrderMethod)
  orderMethod?: OrderMethod;

  @IsOptional()
  @IsEnum(PoAttachmentType)
  poAttachmentType?: PoAttachmentType;

  @IsOptional()
  @IsEnum(DispatchMethod)
  dispatchMethod?: DispatchMethod;

  @IsOptional()
  @IsBoolean()
  useSupplierPartNumber?: boolean;

  // AAI / Expense
  @IsOptional()
  @IsBoolean()
  activeSupplierForAai?: boolean;

  @IsOptional()
  @IsString()
  expenseTypeCode?: string;

  @IsOptional()
  @IsString()
  expenseTypeKey?: string;

  // Representative contact
  @IsOptional()
  @IsString()
  repContactName?: string;

  @IsOptional()
  @IsString()
  repContactPhone?: string;

  @IsOptional()
  @IsString()
  repContactMobile?: string;

  @IsOptional()
  @IsString()
  repContactEmail?: string;

  // Accounts Dept contact
  @IsOptional()
  @IsString()
  accContactName?: string;

  @IsOptional()
  @IsString()
  accContactPhone?: string;

  @IsOptional()
  @IsString()
  accContactFax?: string;

  @IsOptional()
  @IsString()
  accContactEmail?: string;

  // Warranty Dept contact
  @IsOptional()
  @IsString()
  warContactName?: string;

  @IsOptional()
  @IsString()
  warContactPhone?: string;

  @IsOptional()
  @IsString()
  warContactFax?: string;

  @IsOptional()
  @IsString()
  warContactEmail?: string;

  // Account status
  @IsOptional()
  @IsString()
  tradingTerms?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  billerCodeBsb?: string;

  @IsOptional()
  @IsString()
  accountReference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  creditLimit?: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
