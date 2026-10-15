import { IsArray, ArrayUnique } from 'class-validator';

export class SetPermissionsDto {
  @IsArray()
  @ArrayUnique()
  permissionIds: string[];
}