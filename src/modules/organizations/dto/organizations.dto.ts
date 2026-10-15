import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrganizationsDto {
  @IsString() code: string;
  @IsString() label: string;
  @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number;
}

export class UpdateOrganizationsDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number;
}