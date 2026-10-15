import { IsOptional, IsString, IsNumber, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';

export class UpsertSalesOrderItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  productId: string;

  @IsString()
  description: string;

  @Transform(({ value, obj }) => value ?? obj.qty)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
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
