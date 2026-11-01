import { IsOptional, IsString, ArrayUnique, IsArray } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  isTechnician?: boolean;
  

  @IsOptional()
  isContractor?: boolean

  @IsOptional()
  isSubContractor?: boolean

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  permissionIds?: string[];
}
