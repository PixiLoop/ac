import { IsString, IsOptional, IsInt, IsBoolean, IsIn, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { invoice_by, list_by, report_target } from '@prisma/client';

export class CreateSubscriptionReportDto {
  @IsString()
  fmCustomerId: string;

  @IsOptional() @IsString()
  name?: string;

  @Type(() => Number) @IsInt()
  invoicePeriodMonths: number;

  @IsIn(['SERVICE', 'SERVICE_OPTION', 'INTERN_SIM', 'AI_OPTION', 'TMA_OPTION', 'RIM_OPTION', 'NRC_OPTION', 'SAFE_GUARD'])
  reportType: string;

  @IsOptional()
  reportTarget?: report_target;

  @IsOptional() @IsString()
  filterServiceCode?: string;

  @IsOptional() @IsString()
  filterOptionCode?: string;

  @IsOptional() @IsString()
  sortBy?: string;

  @IsOptional()
  listBy?: list_by;

  @IsOptional() @Type(() => Number) @IsInt()
  volumeOffsetMonths?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  invoiceBy?: invoice_by

  @IsOptional()
  listSpace?: number

  @IsOptional()
  listVol?: number

  @IsOptional()
  startDate?: string

  @IsOptional()
  priceIncludesGst?: boolean
}