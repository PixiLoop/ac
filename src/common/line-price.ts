export function sellingUnitPrice(item: any): number {
  if (!item) return 0;
  if (typeof item.unitPrice === 'number') return item.unitPrice;
  if (typeof item.unitPrice?.toNumber === 'function') return item.unitPrice.toNumber();
  if (typeof item.price === 'number') return item.price;
  if (typeof item.price?.toNumber === 'function') return item.price.toNumber();
  return Number(item.unitPrice || item.price || 0);
}
