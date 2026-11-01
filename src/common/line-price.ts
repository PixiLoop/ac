/** Selling price stored on the line. Older rows kept the list price in unitPrice and the discount in lineTotal. */
export function sellingUnitPrice(item: {
  unitPrice?: unknown;
  discountPct?: unknown;
  quantity?: unknown;
  lineTotal?: unknown;
}): number {
  const unit = Number(item?.unitPrice) || 0;
  const disc = Number(item?.discountPct) || 0;
  const qty = Math.abs(Number(item?.quantity) || 0);
  const stored = Math.abs(Number(item?.lineTotal));
  const gross = qty * unit;
  const discounted = gross * (1 - disc / 100);
  if (
    qty &&
    Number.isFinite(stored) &&
    Math.abs(stored - discounted) < 0.05 &&
    Math.abs(stored - gross) > 0.05
  ) {
    return stored / qty;
  }
  return unit;
}
