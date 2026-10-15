import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpsertSalesOrderItemDto } from './upsert-salesorder-item.dto';

export class UpdateSalesOrderItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertSalesOrderItemDto)
  items: UpsertSalesOrderItemDto[];
}
