// dto/create-invoice.dto.ts
import { IsString, IsOptional, IsArray } from 'class-validator';

export class DispatchDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  customerId: string;

  @IsString()
  dispatchDate: string;

  @IsString()
  dispatchMethod: string;

  @IsString()
  conNote: string;

  @IsString()
  freightCost: string;

  @IsString()
  freightCharge: string;

  @IsArray()
  invoices: { id: string; dispatchCode: string; salesPersonId?: string }[];

  @IsString()
  shippingAddress: string;
}
