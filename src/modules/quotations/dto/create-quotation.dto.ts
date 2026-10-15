import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDate
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuotationDto {

  @IsString()
  customerId: string;

  @IsString()
  priceLevel: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  quotationDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;

  @IsOptional()
  @IsString()
  requestNumber?: string;

  @IsOptional()
  @IsNumber()
  salesFactor?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;


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
  dispatchMethod?: string;

}