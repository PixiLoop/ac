import { IsString, IsOptional, IsNumber, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertFMPreinstallItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  productId: string;

  @IsString()
  description: string;

  @IsString()
  partNumber: string;

  @Type(() => Number)
  @IsInt()
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  discountPct?: number;

  @IsOptional() @IsString()
  address1?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsString()
  state?: string;
}