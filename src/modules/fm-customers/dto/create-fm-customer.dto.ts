import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  ValidateNested,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { PriceLevel } from '@prisma/client'

class FMCustomerOptionDto {

  @IsString()
  optionId: string

  @IsOptional()
  enabled?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  charge?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vehicleCount?: number

}

class FMCustomerServiceDto {
  @IsString()
  productId: string

  @Type(() => Number)
  @IsNumber()
  numItems: number

  @Type(() => Number)
  @IsNumber()
  price: number

  @IsOptional()
  active?: number

  @IsOptional()
  charge?: number

  @IsOptional()
  monthlyCharge?: number

  @IsOptional()
  isActive?: boolean

}

export class CreateFMCustomerDto {
  @IsString()
  customerId: string

  @IsOptional()
  @IsString()
  fmCustomerId?: string

  @Transform(({ value }) => value as PriceLevel)
  @IsEnum(PriceLevel)
  priceLevel: PriceLevel

  @Type(() => Number)
  @IsNumber()
  priceFactor: number

  @IsOptional() @IsString()
  depots?: string

  @IsOptional() @IsString()
  invPeriod?: string

  @IsOptional() @IsString()
  volOffset?: string

  @IsOptional() @IsString()
  invoiceBy?: string

  @IsOptional() @IsString()
  sortBy?: string

  @IsOptional() @IsString()
  listBy?: string

  @IsOptional() @IsString()
  fmWebNumber?: string

  @IsOptional() @IsString()
  fleetName?: string

  @IsOptional() @IsString()
  mixOrgId?: string

  @IsOptional() @IsString()
  mixDBase?: string

  @IsOptional()
  organizations?: any[]

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FMCustomerOptionDto)
  options?: FMCustomerOptionDto[]

  /* ===== SERVICES ===== */
  @ValidateNested({ each: true })
  @Type(() => FMCustomerServiceDto)
  services: FMCustomerServiceDto[]
}
