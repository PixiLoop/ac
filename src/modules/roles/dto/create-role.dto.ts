import { IsNotEmpty, IsOptional, IsString, ArrayUnique, IsArray } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  isTechnician?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  permissionIds?: string[];
}
