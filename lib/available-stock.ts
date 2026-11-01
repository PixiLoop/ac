export function availableStock(product: any): number {
  if (!product) return 0;
  const onHand = Number(product.onHand ?? product.quantityOnHand ?? product.stock ?? 0);
  const allocated = Number(product.allocatedQty ?? product.allocated ?? 0);
  return Math.max(0, onHand - allocated);
}
