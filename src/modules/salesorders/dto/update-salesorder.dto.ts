import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsString()
  orderType?: string;

  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsString()
  dispatchMethod?: string;

  @IsOptional()
  @Type(() => Date)
  actionDate?: Date;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  priceLevel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salesFactor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sundries?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  labour?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rounding?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  otherCharges?: number;

  @IsOptional()
  @IsString()
  customerPO?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  externalNotes?: string;

  @IsOptional() @IsString()
  shippingName?: string;

  @IsOptional() @IsString()
  shippingAddress1?: string;

  @IsOptional() @IsString()
  shippingAddress2?: string;

  @IsOptional() @IsString()
  shippingAddress3?: string;

  @IsOptional() @IsString()
  shippingCity?: string;

  @IsOptional() @IsString()
  shippingState?: string;

  @IsOptional() @IsString()
  shippingPostcode?: string;

  @IsOptional() @IsString()
  shippingCountry?: string;

  @IsOptional() @IsBoolean()
  sameAsCustomer?: boolean;

  @IsOptional() @IsString()
  billingName?: string;

  @IsOptional() @IsString()
  billingAddress1?: string;

  @IsOptional() @IsString()
  billingAddress2?: string;

  @IsOptional() @IsString()
  billingAddress3?: string;

  @IsOptional() @IsString()
  billingCity?: string;

  @IsOptional() @IsString()
  billingState?: string;

  @IsOptional() @IsString()
  billingPostcode?: string;

  @IsOptional() @IsString()
  billingCountry?: string;
}
