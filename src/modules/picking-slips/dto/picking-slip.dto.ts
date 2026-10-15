import { IsString, IsOptional, IsNumber, IsInt, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePickingSlipDto {
  @IsString()
  salesOrderId: string;

  @IsOptional()
  @IsString()
  pickedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PickingSlipLineDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  productId: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  onHandQty: number;

  @Type(() => Number)
  @IsInt()
  orderedQty: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  pickedQty: number;
}

export class UpdatePickingSlipDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  pickedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePickingSlipLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickingSlipLineDto)
  lines: PickingSlipLineDto[];
}

export class ListPickingSlipsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @IsOptional()
  @IsString()
  filter_status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  take?: number;

  @IsOptional()
  @IsString()
  sortKey?: string;

  @IsOptional()
  @IsString()
  sortDir?: 'asc' | 'desc';
}

export class GeneratePickingSlipDto {
  @IsOptional()
  @IsString()
  customerIds?: string; // comma-separated

  @IsOptional()
  @IsString()
  salesOrderIds?: string; // comma-separated

  @IsOptional()
  @IsString()
  includeOnSite?: string; // 'true' | 'false'
}