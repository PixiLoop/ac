import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { InstallStatus } from '@prisma/client';

export class UpdateInstallDetailDto {
  @IsOptional() @IsString()
  installType?: string;

  @IsOptional() @IsString()
  fmUnitType?: string;

  @IsOptional() @IsString()
  fmUnitCode?: string;

  @IsOptional() @IsBoolean()
  modem4G?: boolean;

  @IsOptional() @IsString()
  serviceCode?: string;

  @IsOptional() @IsString()
  mixCode?: string;

  @IsOptional() @IsString()
  mixOrgId?: string;

  // MONITOR
  @IsOptional() @IsString()
  monitorDetails?: string;

  @IsOptional() @IsString()
  unitSim?: string;

  @IsOptional() @IsString()
  unitSerial?: string;

  @IsOptional() @IsString()
  unitIMEI?: string;

  // VEHICLE
  @IsOptional() @IsString()
  vehicleMake?: string;

  @IsOptional() @IsString()
  vehicleModel?: string;

  @IsOptional() @IsString()
  yearVariant?: string;

  @IsOptional() @IsString()
  vinNumber?: string;

  @IsOptional() @IsString()
  regoNumber?: string;

  // INSTALL
  @IsOptional() @IsString()
  installLocation?: string;

  @IsOptional() @IsString()
  installer?: string;

  @IsOptional()
  @Type(() => Date)
  installDate?: Date;

  @IsOptional()
  installStatus?: InstallStatus;
}