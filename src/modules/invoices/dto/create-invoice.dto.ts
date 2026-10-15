// dto/create-invoice.dto.ts
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  productId: string;

  @IsString()
  description: string;

  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  backorderQty?: number;

  @IsNumber()
  @Type(() => Number)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountPct?: number;
}

export class CreateInvoiceDto {
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @IsOptional() @IsString() invoiceType?: string;

  @IsOptional() @IsString() status?: string;

  @IsOptional()
  @Type(() => Date)
  issuedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  dispatchId?: string;

  @IsOptional()
  @IsString()
  reversalOfInvoiceId?: string;

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


  // Shipping
  @IsOptional() @IsString() shippingName?: string;
  @IsOptional() @IsString() shippingAddress1?: string;
  @IsOptional() @IsString() shippingAddress2?: string;
  @IsOptional() @IsString() shippingAddress3?: string;
  @IsOptional() @IsString() shippingCity?: string;
  @IsOptional() @IsString() shippingState?: string;
  @IsOptional() @IsString() shippingPostcode?: string;

  // Billing
  @IsOptional() @IsString() billingName?: string;
  @IsOptional() @IsString() billingAddress1?: string;
  @IsOptional() @IsString() billingAddress2?: string;
  @IsOptional() @IsString() billingAddress3?: string;
  @IsOptional() @IsString() billingCity?: string;
  @IsOptional() @IsString() billingState?: string;
  @IsOptional() @IsString() billingPostcode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];
}