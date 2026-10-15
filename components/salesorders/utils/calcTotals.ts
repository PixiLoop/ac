export function calcTotals({
  items,
  freight = 0,
  sundries = 0,
  labour = 0,
}: {
  items: any[];
  freight?: number;
  sundries?: number;
  labour?: number;
}) {
  const partsSubtotal = items.reduce((sum, i) => {
    const line =
      Number(i.quantity) *
      Number(i.unitPrice) *
      (1 - (Number(i.discountPct ?? 0) / 100));
    return sum + (isNaN(line) ? 0 : line);
  }, 0);

  const subTotal =
    partsSubtotal +
    Number(sundries || 0) +
    Number(labour || 0) +
    Number(freight || 0);

  const gst = subTotal * 0.1;

  // ERP-style rounding
  const total = Math.round((subTotal + gst) * 100) / 100;

  return {
    partsSubtotal,
    sundries,
    labour,
    freight,
    gst,
    total,
  };
}
