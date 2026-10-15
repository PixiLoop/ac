'use client';

import { Input } from "../ui/input";
import { Card, CardContent } from "./shared-ui";
import type { InventoryItem } from "./types";

type Props = {
  item: InventoryItem;
};

// 12 monthly rows of movement data (stub — replace with real data)
const movementRows = Array.from({ length: 12 }, (_, i) => ({
  month: i,
  sales: i === 0 ? 7 : 0,
  buy: 0,
  stock: i === 0 ? -2 : 0,
  backOrders: i === 0 ? 0 : 0,
  supplyOrders: i === 0 ? 45 : 0,
  committed: i === 0 ? 38 : 0,
}));

function ReadonlyField({ label, value, className = "" }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <span className="text-[12px] text-slate-600 text-right">{label}</span>
      <Input
        readOnly
        defaultValue={String(value)}
        className="h-7 w-28 px-2 text-[12px] text-center bg-white"
      />
    </div>
  );
}

export function SalesData({ item }: Props) {
  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="rounded-lg border bg-white px-4 py-3 space-y-1">
        <p className="text-[13px] font-bold text-slate-800 px-1 inline-block">{item.id}</p>
        <p className="text-[13px] font-semibold text-slate-800 px-1">{item.desc}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[12px] text-slate-500">Item Status</span>
          <span className="text-[12px] font-medium text-slate-700 px-2 py-0.5 rounded border">{item.status}</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_1fr]">
        {/* ── Left: summary fields ── */}
        <div className="space-y-2">
          <ReadonlyField label="Current Stock" value={item.currentStock} />
          <ReadonlyField label="Committed" value={item.committed} />
          <ReadonlyField label="Back Ordered" value={0} />
          <ReadonlyField label="Max Stock" value={item.fixedMax} />
          <ReadonlyField label="Supplier Stock" value={0} />
        </div>

        {/* ── Right: movement grid ── */}
        <div className="rounded-lg border overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] bg-slate-100 border-b text-[11px] font-semibold text-slate-600 text-center">
            <div className="px-1 py-1.5 border-r">Sales</div>
            <div className="px-1 py-1.5 border-r">Buy</div>
            <div className="px-1 py-1.5 border-r">Stock</div>
            <div className="px-1 py-1.5 border-r">B/Ord</div>
            <div className="px-1 py-1.5 border-r">S/Ord</div>
            <div className="px-1 py-1.5">Comtd</div>
          </div>

          {/* Top totals row */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] border-b bg-sky-50">
            {[item.salesYear, 0, item.currentStock, 0, item.totalOrders, item.committed].map((val, i) => (
              <div key={i} className={`px-1 py-0.5 ${i < 5 ? "border-r" : ""}`}>
                <Input
                  readOnly
                  defaultValue={String(val)}
                  className="h-6 w-full px-1 text-[11px] text-center bg-sky-50 border-0 focus:ring-0"
                />
              </div>
            ))}
          </div>

          {/* Monthly rows */}
          {movementRows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] border-b last:border-b-0">
              {[row.sales, row.buy, row.stock, row.backOrders, row.supplyOrders, row.committed].map((val, j) => (
                <div key={j} className={`px-1 py-0.5 ${j < 5 ? "border-r" : ""}`}>
                  <Input
                    readOnly
                    defaultValue={String(val)}
                    className="h-6 w-full px-1 text-[11px] text-center bg-white border-0 focus:ring-0"
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Bottom totals row */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] border-t bg-sky-100">
            {[movementRows.reduce((s, r) => s + r.sales, 0), movementRows.reduce((s, r) => s + r.buy, 0), "", "", "", ""].map((val, i) => (
              <div key={i} className={`px-1 py-0.5 ${i < 5 ? "border-r" : ""}`}>
                {i < 2 ? (
                  <Input
                    readOnly
                    defaultValue={String(val)}
                    className="h-6 w-full px-1 text-[11px] text-center bg-sky-100 border-0 focus:ring-0"
                  />
                ) : (
                  <div className="h-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom detail fields ── */}
      <div className="grid gap-4 md:grid-cols-2 rounded-lg border bg-white p-4">
        <div className="space-y-2">
          <ReadonlyField label="Last Supply Order Number" value={item.lastSupply} />
          <ReadonlyField label="Last Supply Record" value={item.lastOrder} />
          <ReadonlyField label="Last Sales Invoice" value={item.lastSalesInvoice} />
        </div>
        <div className="space-y-2">
          <ReadonlyField label="Stocktake Qty" value={item.currentStock + 4} />
          <ReadonlyField label="Stocktake Date" value="25-02-2026" />
          <ReadonlyField label="Sales Since Stocktake" value={item.salesYear} />
          <ReadonlyField label="Purchases Since Stocktake" value={0} />
          <ReadonlyField label="Stocktake Balance" value={item.currentStock} />
        </div>
      </div>
    </div>
  );
}
