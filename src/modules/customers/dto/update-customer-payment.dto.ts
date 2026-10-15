import { IsOptional, IsEnum, IsBoolean, IsString, IsNumber, IsIn } from 'class-validator'
import { PaymentTerms, PriceLevel } from '@prisma/client'

export class UpdateCustomerPaymentDto {
  @IsOptional()
  @IsString()
  accountType?: string

  @IsOptional()
  @IsEnum(PaymentTerms)
  paymentTerms?: PaymentTerms

  @IsOptional()
  @IsEnum(PriceLevel)
  priceLevel?: PriceLevel

  @IsOptional()
  @IsNumber()
  salesFactor?: number | null

  @IsOptional()
  @IsString()
  paymentMethod?: string

  @IsOptional()
  @IsIn(['EMAIL_PDF', 'PRINT_WITH_GOODS'])
  invoiceDelivery?: string

  @IsOptional()
  @IsBoolean()
  gstExempt?: boolean

  @IsOptional()
  @IsString()
  bankAccountName?: string

  @IsOptional()
  @IsString()
  bankAccountNo?: string

  @IsOptional()
  @IsString()
  bankBsb?: string

  @IsOptional()
  @IsString()
  bankName?: string
}
