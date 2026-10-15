import {
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PreinstallStatus, PreinstallType } from '@prisma/client';

export class CreateFMPreinstallDto {
  @IsString()
  customerId: string;

  @IsString()
  fmCustomerId: string;

  @IsEnum(PreinstallType)
  type: PreinstallType;

  @IsOptional()
  @IsEnum(PreinstallStatus)
  status?: PreinstallStatus;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional() @IsString()
  depotId?: string;

  // HEADER
  @IsOptional() @IsString()
  orderNumber?: string;

  @IsOptional() @IsString()
  abnEntry?: string;

  @IsOptional() @IsString()
  termsOfTrade?: string;

  // PRICING
  @IsOptional()
  @Type(() => Number)
  generalSalesFactor?: number;

  @IsOptional()
  @Type(() => Number)
  retailPrice?: number;

  // SHIPPING
  @IsOptional() @IsString()
  shippingName?: string;

  @IsOptional() @IsString()
  shippingAddress1?: string;

  @IsOptional() @IsString()
  shippingAddress2?: string;

  @IsOptional() @IsString()
  shippingAddress3?: string;

  // BILLING
  @IsOptional() @IsString()
  billingName?: string;

  @IsOptional() @IsString()
  billingAddress1?: string;

  @IsOptional() @IsString()
  billingAddress2?: string;

  @IsOptional() @IsString()
  billingAddress3?: string;

  @IsOptional() @IsString()
  address1?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsString()
  state?: string;

  @IsOptional() @IsString()
  targetInstallId?: string;

  @IsOptional()
  installDetail?: any;

  @IsOptional()
  notes?: string;
}