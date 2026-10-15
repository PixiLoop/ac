import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDispatchMethodDto {
  @IsString() code: string;
  @IsString() label: string;
  @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number;
}

export class UpdateDispatchMethodDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number;
}