'use client';

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { InventoryItem } from "./types";
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "./shared-ui";

type Props = {
  item: InventoryItem;
};

export function StockRecount({ item }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Stock Recount & Adjustment</CardTitle>
          <Button>Post Recount</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2"><Label>Part Number</Label><Input defaultValue={item.id} /></div>
          <div className="space-y-2"><Label>Description</Label><Input defaultValue={item.desc} /></div>
          <div className="space-y-2"><Label>Location</Label><Input defaultValue="Main Warehouse" /></div>
          <div className="space-y-2"><Label>System Qty</Label><Input defaultValue={String(item.currentStock)} /></div>
          <div className="space-y-2"><Label>Counted Qty</Label><Input defaultValue="6" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4"><div className="mb-1 text-sm text-muted-foreground">Variance</div><div className="text-2xl font-semibold">+4</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="mb-1 text-sm text-muted-foreground">Reason</div><div className="text-lg font-semibold">Cycle Count Correction</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="mb-1 text-sm text-muted-foreground">Counted By</div><div className="text-lg font-semibold">Warehouse User</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="mb-1 text-sm text-muted-foreground">Approval</div><div className="text-lg font-semibold">Pending</div></CardContent></Card>
        </div>
        <div className="overflow-hidden rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part No</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">System</TableHead>
                <TableHead className="text-right">Counted</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.desc}</TableCell>
                <TableCell>Main Warehouse</TableCell>
                <TableCell className="text-right">{item.currentStock}</TableCell>
                <TableCell className="text-right">6</TableCell>
                <TableCell className="text-right">+4</TableCell>
                <TableCell>Cycle count adjustment</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
