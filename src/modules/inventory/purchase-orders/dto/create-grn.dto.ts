import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGrnLineDto {
  @IsString()
  productId!: string;

  @IsString()
  description!: string;

  @Type(() => Number) @IsNumber()
  receivedQty!: number;

  @Type(() => Number) @IsNumber()
  unitCost!: number;

  @IsOptional() @IsString()
  locationId?: string;
}

export class CreateGrnDto {
  @IsOptional() @IsString()
  reference?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateGrnLineDto)
  lines!: CreateGrnLineDto[];
}