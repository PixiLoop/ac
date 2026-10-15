export function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function calcLineTotal(item: any) {
  const qty = toNumber(item.qty);
  const unit = toNumber(item.unitPrice);
  const disc = toNumber(item.discountPct);

  return qty * unit * (1 - disc / 100);
}

export function calcSalesOrderTotals({
  items,
  freight,
  sundries,
  labour,
}: {
  items: any[];
  freight: any;
  sundries: any;
  labour: any;
}) {
  const parts = items.reduce(
    (sum, i) => sum + calcLineTotal(i),
    0,
  );

  const freightVal = toNumber(freight);
  const sundriesVal = toNumber(sundries);
  const labourVal = toNumber(labour);

  const subBeforeGst =
    parts + freightVal + sundriesVal + labourVal;

  const gst = subBeforeGst * 0.1;

  const rawTotal = subBeforeGst + gst;
  const rounded = Math.round(rawTotal * 100) / 100;
  const rounding = rounded - rawTotal;

  return {
    parts,
    sundries: sundriesVal,
    labour: labourVal,
    freight: freightVal,
    gst,
    rounding,
    total: rounded,
  };
}

