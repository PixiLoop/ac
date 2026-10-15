export function calcPartsTotal(items: any[]) {
  return items.reduce(
    (sum, i) =>
      sum +
      (i.qty || i.quantity || 0) *
        (i.unitPrice || i.rate || 0) *
        (1 - (i.discountPct || 0) / 100),
    0,
  );
}

export function round(n: number) {
  return Math.round(n * 100) / 100;
}
