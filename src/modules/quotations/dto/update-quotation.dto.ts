import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber
} from 'class-validator';

import { Type } from 'class-transformer';

export class UpdateQuotationDto {

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priceLevel?: string;
  @IsOptional()
  @IsString()
  dispatchMethod?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @Type(() => Date)
  quotationDate?: Date;

  @IsOptional()
  @Type(() => Date)
  expiryDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salesFactor?: number;

  @IsOptional()
  @IsBoolean()
  hasGeneral?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  hasEssential?: boolean;

  @IsOptional()
  @IsBoolean()
  hasOngoing?: boolean;

  // Shipping
  @IsOptional()
  @IsString()
  shippingName?: string;

  @IsOptional()
  @IsString()
  shippingAddress1?: string;

  @IsOptional()
  @IsString()
  shippingCity?: string;

  @IsOptional()
  @IsString()
  shippingState?: string;

  @IsOptional()
  @IsString()
  shippingPostcode?: string;

  // Billing
  @IsOptional()
  @IsString()
  billingName?: string;

  @IsOptional()
  @IsString()
  billingAddress1?: string;

  @IsOptional()
  @IsString()
  billingCity?: string;

  @IsOptional()
  @IsString()
  billingState?: string;

  @IsOptional()
  @IsString()
  billingPostcode?: string;

  @IsOptional()
  @IsString()
  requestNumber?: string;

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

}