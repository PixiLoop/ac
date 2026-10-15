import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePoLineDto {
  @IsString()
  productId!: string;

  @IsString()
  description!: string;

  @Type(() => Number) @IsNumber()
  orderedQty!: number;

  @Type(() => Number) @IsNumber()
  unitCost!: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId!: string;

  @IsOptional() @IsString()
  expectedDate?: string;

  @IsOptional() @IsString()
  reference?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsString()
  orderType?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePoLineDto)
  lines!: CreatePoLineDto[];
}

export class UpdatePurchaseOrderDto {
  @IsOptional() @IsString()
  expectedDate?: string;

  @IsOptional() @IsString()
  reference?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsString()
  orderType?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePoLineDto)
  lines?: CreatePoLineDto[];
}