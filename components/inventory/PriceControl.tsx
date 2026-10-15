'use client';

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { InventoryItem } from "./types";
import {
  Card, CardHeader, CardTitle, CardContent, Badge, Checkbox,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "./shared-ui";

type Props = {
  item: InventoryItem;
};

export function PriceControl({ item }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Price Control & Update</CardTitle>
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Landed Factor Change for this Supplier</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-xl border p-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2"><Label>Item</Label><Input defaultValue={item.id} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input defaultValue={item.desc} /></div>
                <div className="space-y-2"><Label>Status</Label><Input defaultValue={item.status} /></div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="space-y-2"><Label>Supplier No</Label><Input defaultValue={item.supplierNo} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Supplier</Label><Input defaultValue={item.supplier} /></div>
                <div className="space-y-2"><Label>Order Qty</Label><Input defaultValue={String(item.orderQty)} /></div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="space-y-2"><Label>Net Buy Price</Label><Input defaultValue={item.basePrice.toFixed(2)} /></div>
                <div className="space-y-2"><Label>Average Cost</Label><Input defaultValue={item.itemCost.toFixed(2)} /></div>
                <div className="space-y-2"><Label>Current Stock</Label><Input defaultValue={String(item.currentStock)} /></div>
                <div className="space-y-2"><Label>Stock Value</Label><Input defaultValue={item.stockCost.toFixed(2)} /></div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>Import Duty %</Label><Input defaultValue={item.importDuty.toFixed(3)} /></div>
                <div className="space-y-2"><Label>Landed Factor</Label><Input defaultValue={(item.landedFactor / 1000).toFixed(3)} /></div>
                <div className="space-y-2"><Label>Landed Cost</Label><Input defaultValue={item.landedCost.toFixed(2)} /></div>
              </div>
            </div>








            

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <h3 className="mb-3 font-medium">Fixed Margins</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Layer</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Factor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Agent</TableCell><TableCell className="text-right">{item.agentPrice.toFixed(2)}</TableCell><TableCell className="text-right">{item.agentFactor.toFixed(3)}</TableCell></TableRow>
                    <TableRow><TableCell>Sales Partner</TableCell><TableCell className="text-right">{item.partnerPrice.toFixed(2)}</TableCell><TableCell className="text-right">{item.partnerFactor.toFixed(3)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-xl border p-4">
                <h3 className="mb-3 font-medium">Variable Margins</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Layer</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Factor</TableHead>
                      <TableHead className="text-right">Margin on Landed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Trade</TableCell><TableCell className="text-right">{item.tradePrice.toFixed(2)}</TableCell><TableCell className="text-right">{item.tradeFactor.toFixed(3)}</TableCell><TableCell className="text-right">1.642</TableCell></TableRow>
                    <TableRow><TableCell>Retail</TableCell><TableCell className="text-right">{item.retailPrice.toFixed(2)}</TableCell><TableCell className="text-right">{item.retailFactor.toFixed(3)}</TableCell><TableCell className="text-right">1.985</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Card><CardContent className="p-4"><div className="mb-2 text-sm text-muted-foreground">Last Item Edit</div><div className="text-xl font-semibold">{item.lastEditDate}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="mb-2 text-sm text-muted-foreground">Last Cost Price</div><div className="text-xl font-semibold">01/06/2024</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="mb-2 text-sm text-muted-foreground">Last Sale Date</div><div className="text-xl font-semibold">{item.lastSalesInvoice}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="mb-2 text-sm text-muted-foreground">Last Supply Record</div><div className="text-xl font-semibold">{item.lastSupply}</div></CardContent></Card>
            <div className="rounded-xl border p-4">
              <h3 className="mb-3 font-medium">Factor Locked</h3>
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2"><Checkbox /> Agent Price</label>
                <label className="flex items-center gap-2"><Checkbox /> Sales Partner</label>
                <label className="flex items-center gap-2"><Checkbox /> Trade Price</label>
                <label className="flex items-center gap-2"><Checkbox /> Retail Price</label>
              </div>
            </div>
            <div className="grid gap-2">
              <Button variant="outline">Reset In Store</Button>
              <Button variant="outline">Reset Fixed</Button>
              <Button variant="outline">Reset Variable</Button>
              <Button>Save Price Control</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
