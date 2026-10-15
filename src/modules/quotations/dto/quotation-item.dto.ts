import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QuotationItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  productId: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  discountPct?: number;


  @IsOptional()
  @IsNumber()
  landedCost?: number;

  @IsNumber()
  retailPrice: number

  @IsNumber()
  tradePrice: number

  @IsNumber()
  salesPartnerPrice: number

  @IsNumber()
  agentPrice: number
}