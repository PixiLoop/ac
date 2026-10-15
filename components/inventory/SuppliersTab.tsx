'use client';

import { FilePlus2, ShoppingCart, Store, Truck, Warehouse } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { suppliers, supplierOrders, stockReceipts } from "./data";
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  SupplierStatusBadge, SupplierOrderStatusBadge, StockReceiptStatusBadge,
} from "./shared-ui";

function SupplierManagement() {
  const selectedSupplier = suppliers[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Suppliers</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">List, add, edit, activate, hold, and connect suppliers to price and procurement flows.</p>
            </div>
            <Button>Add Supplier</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Input placeholder="Search supplier, code, suburb..." />
            <Input placeholder="Status" defaultValue="All" />
            <Input placeholder="Payment Terms" defaultValue="All" />
            <Input placeholder="Suburb / Region" />
          </div>
          <div className="overflow-hidden rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.code}</TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.contact}</TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell><SupplierStatusBadge status={supplier.status} /></TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline">Edit</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add / Edit Supplier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Supplier Code</Label><Input defaultValue={selectedSupplier.code} /></div>
            <div className="space-y-2"><Label>Supplier Name</Label><Input defaultValue={selectedSupplier.name} /></div>
            <div className="space-y-2"><Label>Primary Contact</Label><Input defaultValue={selectedSupplier.contact} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input defaultValue={selectedSupplier.phone} /></div>
            <div className="space-y-2"><Label>Email</Label><Input defaultValue={selectedSupplier.email} /></div>
            <div className="space-y-2"><Label>Payment Terms</Label><Input defaultValue={selectedSupplier.paymentTerms} /></div>
            <div className="space-y-2"><Label>Suburb / City</Label><Input defaultValue={selectedSupplier.suburb} /></div>
            <div className="space-y-2"><Label>Status</Label><Input defaultValue={selectedSupplier.status} /></div>
          </div>
          <div className="space-y-2"><Label>Address</Label><Input defaultValue="15 Industrial Ave, Sydney NSW" /></div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Supplier</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProcurementFlow() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="mb-2 flex items-center gap-2 font-medium"><ShoppingCart className="h-4 w-4" /> Supplier Orders</div><p className="text-sm text-muted-foreground">Create manually, from reorder rules, from backorders, or from demand.</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="mb-2 flex items-center gap-2 font-medium"><Truck className="h-4 w-4" /> Receipts</div><p className="text-sm text-muted-foreground">Receive full or partial quantities against supplier orders.</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="mb-2 flex items-center gap-2 font-medium"><Warehouse className="h-4 w-4" /> Stock Posting</div><p className="text-sm text-muted-foreground">Post accepted quantity into stock by location and bin.</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="mb-2 flex items-center gap-2 font-medium"><Store className="h-4 w-4" /> Cost Update</div><p className="text-sm text-muted-foreground">Update last cost, supplier cost, and valuation from receipt.</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Supplier Orders</CardTitle>
              <Button><FilePlus2 className="mr-2 h-4 w-4" />Create Order</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Input placeholder="Order No / Supplier" />
              <Input placeholder="Status" defaultValue="All" />
              <Input placeholder="From Date" defaultValue="2026-03-01" />
              <Input placeholder="To Date" defaultValue="2026-03-31" />
            </div>
            <div className="overflow-hidden rounded-xl border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO No</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.supplier}</TableCell>
                      <TableCell>{order.orderDate}</TableCell>
                      <TableCell>{order.expectedDate}</TableCell>
                      <TableCell><SupplierOrderStatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Stock Receipts / GRN</CardTitle>
              <Button><FilePlus2 className="mr-2 h-4 w-4" />Create Receipt</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-xl border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN No</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>PO No</TableHead>
                    <TableHead>Receipt Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.id}</TableCell>
                      <TableCell>{receipt.supplier}</TableCell>
                      <TableCell>{receipt.orderNo}</TableCell>
                      <TableCell>{receipt.receiptDate}</TableCell>
                      <TableCell><StockReceiptStatusBadge status={receipt.status} /></TableCell>
                      <TableCell className="text-right">{receipt.lines}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
              Posting a receipt should update on-hand stock, supplier order line receipt balances, last cost, and stock movement history.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportsScreen() {
  const reports = [
    "Inventory Valuation Report",
    "Stock on Hand by Location",
    "Reorder / Below Minimum Report",
    "Back Order Report",
    "Supplier Purchase History",
    "Supplier Order Outstanding Report",
    "Stock Movement Ledger",
    "Stock Recount Variance Report",
    "Price Matrix Audit Report",
    "Sales by Item / Group / Supplier",
    "FM Service Hardware Item Report",
    "BOG Component Usage Report",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {reports.map((name) => (
            <Card key={name}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-sm text-muted-foreground">Preview / export / schedule</div>
                </div>
                <Button size="sm" variant="outline">Open</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SuppliersTab() {
  return (
    <div className="space-y-6">
      <SupplierManagement />
      <ProcurementFlow />
      <ReportsScreen />
    </div>
  );
}
