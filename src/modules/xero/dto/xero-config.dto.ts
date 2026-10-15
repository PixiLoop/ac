import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpsertXeroConfigDto {
  @IsString()
  clientId: string;

  @IsString()
  clientSecret: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}