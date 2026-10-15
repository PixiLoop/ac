import { UpsertSalesOrderItemDto } from './dto/upsert-salesorder-item.dto';

export class SalesOrdersRules {
  static normalizeItems(items: UpsertSalesOrderItemDto[]) {
    return items.map(i => ({
      ...i,
      discountPct: i.discountPct ?? 0,
    }));
  }
}
