/** Free-to-promise stock: on hand less committed, never below zero. */
export function availableStock(
  product?: { onHand?: unknown; committed?: unknown } | null,
): number | null {
  if (product?.onHand == null) return null;
  return Math.max(0, Number(product.onHand) - Number(product.committed ?? 0));
}
