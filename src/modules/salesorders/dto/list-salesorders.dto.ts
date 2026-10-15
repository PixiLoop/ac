import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ListSalesOrdersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

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

  @IsOptional()
  @IsString()
  filter_orderNumber?: string;

  @IsOptional()
  @IsString()
  filter_status?: string;

  @IsOptional()
  @IsString()
  filter_orderType?: string;

  @IsOptional()
  @IsString()
  filter_priceLevel?: string;

  @IsOptional()
  @IsString()
  filter_customer?: string;

  @IsOptional()
  @IsString()
  filter_actionDate?: string;

  @IsOptional()
  @IsString()
  quotationId?: string;

  @IsOptional()
  @IsString()
  quotationNumber?: string;

  @IsOptional()
  @IsString()
  filter_createdAt?: string;
  
  @IsOptional()
  @IsString()
  customerId?: string
}
