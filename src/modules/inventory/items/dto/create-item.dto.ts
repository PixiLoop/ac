import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, ValidateNested, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BogLineDto {
  @IsString()
  componentId!: string;

  @Type(() => Number) @IsNumber()
  quantity!: number;

  @IsOptional() @IsString()
  uom?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  sortOrder?: number;
}

export class CreateItemDto {
  @IsString()
  productCode!: string;

  @IsString()
  name!: string;

  @IsOptional() @IsString()
  productCategory?: string;

  @IsOptional() @IsString()
  extendedDescription?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  vendorNumber?: string;

  @IsOptional() @IsString()
  vendorName?: string;

  @IsOptional() @IsString()
  vendorPartNumber?: string;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  orderRank?: string;

  @IsOptional() @IsString()
  itemType?: string;

  @IsOptional() @IsString()
  aircoMarkupGroup?: string;

  @IsOptional() @IsString()
  xGroup?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsBoolean()
  billOfGoods?: boolean;

  @IsOptional() @IsString()
  replacedBy?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  onHand?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  location1?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  location2?: number;

  @IsOptional() @IsString()
  bin?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  packSize?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  grade?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  leadTimeDays?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  automaticMaxQty?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  automaticMinQty?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  fixedMaxQty?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  fixedMinQty?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  netSupplierBuyPrice?: number;

  @IsOptional() @IsBoolean()
  isTaxable?: boolean;

  @IsOptional() @Type(() => Number) @IsInt()
  landedFactor?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  importDuty?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  inStoreCost?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  landedCost?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  agentFactor?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  agentPrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  partnerFactor?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  salesPartnerPrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  tradeFactor?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  tradePrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  retailFactor?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  retailPrice?: number;

  @IsOptional() @IsBoolean()
  agentFactorLocked?: boolean;

  @IsOptional() @IsBoolean()
  partnerFactorLocked?: boolean;

  @IsOptional() @IsBoolean()
  tradeFactorLocked?: boolean;

  @IsOptional() @IsBoolean()
  retailFactorLocked?: boolean;

  @IsOptional() @IsBoolean()
  isFmHardware?: boolean;

  @IsOptional() @IsString()
  fmMixCode?: string;

  @IsOptional() @IsString()
  fmUnitCode?: string;

  @IsOptional() @IsBoolean()
  fourGUnitModem?: boolean;

  @IsOptional() @IsBoolean()
  mixUnitSim?: boolean;

  @IsOptional() @IsBoolean()
  isMonitor?: boolean;

  @IsOptional() @IsBoolean()
  isVision?: boolean;

  @IsOptional() @IsString()
  fmRuleCode?: string;

  @IsOptional() @IsString()
  primarySupplierId?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStock?: number;

  @IsOptional()
  @IsString()
  aliasAction?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BogLineDto)
  bogLines?: BogLineDto[];
}
