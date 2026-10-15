'use client';

import { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import type { InventoryItem, OrderRank } from "./types";
import {
  Card, CardHeader, CardTitle, CardContent, Checkbox,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "./shared-ui";

type Props = {
  item: InventoryItem;
};


const HISTORY_ROWS = [
  [0, 1, 0, 3, 0], [3, 5, 0, 3, 0], [2, 7, 0, 1, 0], [0, 2, 5, 8, 0],
  [1, 1, 0, 5, 0], [4, 9, 9, 9, 5], [3, 9, 0, 9, 0], [3, 8, 11, 9, 2],
  [0, 0, 0, 6, 0], [1, 7, 13, 6, 3], [3, 8, 0, 0, 8], [2, 2, 10, 8, 0],
];

export function InventoryControl({ item }: Props) {
  const [orderRank, setOrderRank] = useState<OrderRank>(item.orderRank);

  return (
    <div className="space-y-4">

      {/* ── Header card: dates ── */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Last Edit</Label>
              <Input defaultValue={item.lastEditDate || "03/08/2022"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Last Price</Label>
              <Input defaultValue="01/06/2024" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Last Supply Order</Label>
              <Input defaultValue={item.lastSupplyOrder || "19/02/2026"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Last Sales Invoice</Label>
              <Input defaultValue={item.lastSalesInvoice || "10/03/2026"} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_1.2fr]">

        {/* ── Col 1: Ordering Controls + Order Ranking + Last Supply/Order/Sale + Inventory Status ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Ordering Controls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Auto Max</Label><Input defaultValue={String(item.autoMax)} /></div>
                <div className="space-y-1"><Label>Auto Min</Label><Input defaultValue={String(item.autoMin)} /></div>
                <div className="space-y-1"><Label>Fixed Max</Label><Input defaultValue={String(item.fixedMax)} /></div>
                <div className="space-y-1"><Label>Fixed Min</Label><Input defaultValue={String(item.fixedMin)} /></div>
                <div className="space-y-1"><Label>Order Qty</Label><Input defaultValue={String(item.orderQty)} /></div>
                <div className="space-y-1"><Label>Pack Size</Label><Input defaultValue={String(item.packSize)} /></div>
              </div>

              {/* Order Ranking */}
              <div className="space-y-1">
                <Label>Order Ranking</Label>
                <Select
                  value={orderRank}
                  onChange={(v) => setOrderRank(v as OrderRank)}
                  options={[
                    { label: "Automatic Levels", value: "Full Auto" },
                    { label: "Auto >> Fixed Level", value: "Auto >> Fixed" },
                    { label: "Fixed Levels", value: "Fixed Stock" },
                    { label: "Committed Only", value: "Committed Only" },
                    { label: "Do Not Order", value: "do_not_order" },
                  ]}
                />
              </div>

              {/* Last Supply / Order / Sale */}
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1"><Label>Last Supply</Label><Input defaultValue={item.lastSupply || "13091"} /></div>
                <div className="space-y-1"><Label>Last Order</Label><Input defaultValue={item.lastOrder || "6973"} /></div>
                <div className="space-y-1"><Label>Last Sale</Label><Input defaultValue={item.lastSale || "10-03-2026"} /></div>
              </div>

              {/* Inventory Status */}
              <div className="flex items-center gap-3 rounded-lg border bg-blue-50 px-3 py-2">
                <Checkbox checked={item.inventoryStatus} />
                <span className="font-semibold text-blue-700">Inventory_Status</span>
                <Input className="w-16" defaultValue={item.inventoryStatus ? "YES" : "NO"} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Col 2: Stock Snapshot + Sales Summary + Store Transfers + Lead Time/Grade ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Stock Snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Item Cost</Label><Input className="" defaultValue={item.itemCost.toFixed(2)} /></div>
                <div className="space-y-1"><Label>Stock Cost</Label><Input className="" defaultValue={item.stockCost.toFixed(2)} /></div>
                <div className="space-y-1"><Label>Current Stock</Label><Input defaultValue={String(item.currentStock)} /></div>
                <div className="space-y-1"><Label>Committed</Label><Input defaultValue={String(item.committed)} /></div>
                <div className="space-y-1"><Label>Total Orders</Label><Input defaultValue={String(item.totalOrders)} /></div>
                <div className="space-y-1"><Label>Future Orders</Label><Input defaultValue={String(item.futureOrders)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Year Sales</Label><Input className="" defaultValue={String(item.salesYear)} /></div>
                <div className="space-y-1"><Label>Last Year</Label><Input className="" defaultValue={String(item.salesLastYear)} /></div>
                <div className="space-y-1"><Label>Aver Y2+Y3</Label><Input className="" defaultValue={String(item.salesAverageY2Y3)} /></div>
                <div className="space-y-1"><Label>Total Sales</Label><Input className="" defaultValue={String(item.salesTotal)} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Store Transfers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2"><Label>Stock Take Date</Label><Input defaultValue="27-06-2025" /></div>
                <div className="space-y-1"><Label>Stock Take Count</Label><Input defaultValue="6" /></div>
                <div className="space-y-1"><Label>Purchase Since</Label><Input defaultValue="37" /></div>
                <div className="space-y-1"><Label>Sales Since S/T</Label><Input defaultValue="41" /></div>
                <div className="space-y-1"><Label>WorkShop Transfer</Label><Input defaultValue="0" /></div>
                <div className="space-y-1"><Label>Audit Stock S/Take</Label><Input defaultValue="2" /></div>
                <div className="space-y-1"><Label>Lost Stock Since</Label><Input defaultValue="0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Lead Time</Label>
                  <div className="flex items-center gap-2">
                    <Input defaultValue={String(item.leadTime)} />
                    <span className="shrink-0 text-sm text-muted-foreground">/255</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Grade</Label>
                  <div className="flex items-center gap-2">
                    <Input defaultValue={String(item.grade)} />
                    <span className="shrink-0 text-sm text-muted-foreground">/255</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Col 3: Sales History grid + Credit fields ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Sales History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["Orders", "Sold", "Buy", "Stock", "Un-St"].map((h) => (
                        <TableHead key={h} className="text-center text-xs">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {HISTORY_ROWS.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className={`text-center text-xs py-1 ${j === 2 && cell > 0 ? "bg-orange-100" : ""}`}>
                            {cell || ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Credits</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Purchase Credit Req</Label><Input defaultValue="1" /></div>
                <div className="space-y-1"><Label>Purchase Credit Rec</Label><Input defaultValue="2" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Warranty Credit Held</Label><Input defaultValue="0" /></div>
                <div className="space-y-1"><Label>Warranty Claimed</Label><Input defaultValue="0" /></div>
                <div className="space-y-1 col-span-2"><Label>Warranty Received</Label><Input defaultValue="0" /></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Footer buttons ── */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">Close</Button>
        <Button>Save</Button>
      </div>
    </div>
  );
}
