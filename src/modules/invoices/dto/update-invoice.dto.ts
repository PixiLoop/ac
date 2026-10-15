// dto/update-invoice.dto.ts
import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceItemDto } from './create-invoice.dto';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  abnNumber?: string;

  @IsOptional()
  @IsString()
  dispatchId?: string;

  @IsOptional()
  @Type(() => Date)
  issuedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  freight?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sundries?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  labour?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rounding?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  otherCharges?: number;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  externalNotes?: string;

  @IsOptional() @IsString() shippingName?: string;
  @IsOptional() @IsString() shippingAddress1?: string;
  @IsOptional() @IsString() shippingAddress2?: string;
  @IsOptional() @IsString() shippingAddress3?: string;
  @IsOptional() @IsString() shippingCity?: string;
  @IsOptional() @IsString() shippingState?: string;
  @IsOptional() @IsString() shippingPostcode?: string;

  @IsOptional() @IsString() billingName?: string;
  @IsOptional() @IsString() billingAddress1?: string;
  @IsOptional() @IsString() billingAddress2?: string;
  @IsOptional() @IsString() billingAddress3?: string;
  @IsOptional() @IsString() billingCity?: string;
  @IsOptional() @IsString() billingState?: string;
  @IsOptional() @IsString() billingPostcode?: string;
}

// dto/update-invoice-items.dto.ts
export class UpdateInvoiceItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional()
  @IsBoolean()
  issueCredit?: boolean;
}

// dto/list-invoices.dto.ts
export class ListInvoicesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  take?: number;

  @IsOptional()
  @IsString()
  sortKey?: string;

  @IsOptional()
  @IsString()
  sortDir?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  filter_status?: string;

  @IsOptional()
  @IsString()
  filter_customer?: string;

  @IsOptional()
  @IsString()
  filter_invoiceNumber?: string;

  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @IsOptional()
  @IsString()
  customerId?: string
}