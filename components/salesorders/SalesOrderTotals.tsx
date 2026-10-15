'use client';

import { calcSalesOrderTotals } from './utils/salesOrderCalc';

export function SalesOrderTotals({
  items,
  freight,
  sundries = 0,
  labour = 0,
}: any) {
  const totals = calcSalesOrderTotals({
    items,
    freight,
    sundries,
    labour,
  });

  const Row = ({ label, value }: any) => (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span>${value.toFixed(2)}</span>
    </div>
  );

  return (
    <div className="mt-6 border-t pt-4 grid justify-end">
      <div className="w-72 space-y-1">
        <Row label="Parts" value={totals.parts} />
        <Row label="Sundries" value={totals.sundries} />
        <Row label="Labour" value={totals.labour} />
        <Row label="Freight" value={totals.freight} />

        <div className="border-t my-2" />

        <Row label="GST (10%)" value={totals.gst} />
        <Row label="Rounding" value={totals.rounding} />

        <div className="border-t my-2" />

        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>${totals.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
