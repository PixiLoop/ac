'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package2 } from 'lucide-react';

import { AdminShell } from '../../../../components/layout/AdminShell';
import { Button } from '../../../../components/ui/button';
import { api } from '../../../../lib/api-client';
import {
  Badge, Card, CardHeader, CardTitle, CardContent,
  ItemStatusBadge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '../../../../components/inventory/shared-ui';
import { SalesHistory } from '../../../../components/inventory/SalesHistory';
import { BackOrderList } from '../../../../components/inventory/BackOrderList';
import { StockRecount } from '../../../../components/inventory/StockRecount';
import { SalesData } from '../../../../components/inventory/SalesData';
import { InventoryList } from '../../../../components/inventory/InventoryList'; // Import InventoryList component
import { PurchaseOrderList } from '../../../../components/inventory/PurchaseOrderList';

// ── Read-only field display ────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value ?? <span className="text-slate-400">—</span>}</p>
    </div>
  );
}

function BoolField({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] ${value ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Item = {
  id: string;
  productCode: string;
  name: string;
  description?: string;
  extendedDescription?: string;
  productCategory?: string;
  vendorNumber?: string;
  vendorName?: string;
  vendorPartNumber?: string;
  status: string;
  orderRank?: string;
  aircoMarkupGroup?: string;
  xGroup?: string;
  isActive: boolean;
  replacedBy?: string;
  billOfGoods: boolean;
  onHand: number;
  location1?: number;
  location2?: number;
  bin?: string;
  packSize?: number;
  grade?: number;
  leadTimeDays?: number;
  automaticMaxQty?: number;
  automaticMinQty?: number;
  fixedMaxQty?: number;
  fixedMinQty?: number;
  itemType?: string;
  netSupplierBuyPrice?: number;
  isTaxable: boolean;
  landedFactor?: number;
  importDuty?: number;
  inStoreCost?: number;
  landedCost?: number;
  agentFactor?: number;
  agentPrice?: number;
  partnerFactor?: number;
  salesPartnerPrice?: number;
  tradeFactor?: number;
  tradePrice?: number;
  retailFactor?: number;
  retailPrice?: number;
  isFmHardware: boolean;
  fmUnitType?: string;
  fmUnitCode?: string;
  fourGUnitModem: boolean;
  mixUnitSim: boolean;
  isMonitor: boolean;
  isVision: boolean;
  fmRuleCode?: string;
  bogLines?: {
    id: string;
    componentId: string;
    quantity: number;
    uom: string;
    sortOrder: number;
    notes?: string;
    componentProduct: { id: string; productCode: string; name: string };
  }[];
  InvCategory: {
    id: string
    code: string
    name: string
    description: string
    isActive: boolean
    createdAt: string
    updatedAt: string
    deletedAt: string
  } | null;
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryItemViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = React.useState<Item | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get(`/inventory/items/${id}`)
      .then((res) => setItem(res.data?.data ?? res.data))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AdminShell title="Inventory Item">
        <p className="text-sm text-slate-500">Loading…</p>
      </AdminShell>
    );
  }

  if (!item) {
    return (
      <AdminShell title="Inventory Item">
        <p className="text-sm text-slate-600">Item not found.</p>
      </AdminShell>
    );
  }

  const fmt = (v?: number | null, dp = 2) =>
    v != null ? Number(v).toFixed(dp) : '—';

  const showFm = item.isFmHardware || item.status === 'FM Service';

  return (
    <AdminShell title={`${item.productCode} — ${item.name}`}>
      <div className="space-y-4">

        {/* ── Action bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ItemStatusBadge status={item.status as any} />
            <Badge variant={item.isActive ? undefined : 'secondary'} className={item.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {item.billOfGoods && (
              <Badge className="border-orange-200 bg-orange-50 text-orange-700">Bill of Goods</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/inventory/${id}`)}>Edit Item</Button>
            <Button variant="outline" onClick={() => router.push('/inventory')}>Back to List</Button>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 gap-2 md:grid-cols-7">
            <TabsTrigger value="details">Item Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="sales-history">Sales History</TabsTrigger>
            {/* <TabsTrigger value="sales-data">Sales Data</TabsTrigger> */}
            <TabsTrigger value="back-orders">Back Orders</TabsTrigger>
            <TabsTrigger value="stock-recount">Stock Recount</TabsTrigger>
            <TabsTrigger value="supplier-order">Supplier Order</TabsTrigger>
          </TabsList>

          {/* ── Details tab ────────────────────────────────────────────────── */}
          <TabsContent value="details" className="space-y-4">

            {/* General */}
            <SectionCard title="General Information">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Field label="Part Number" value={item.productCode} />
                <Field label="Item Description" value={item.name} />
                <Field label="Invoice Details" value={item.extendedDescription} />
                <Field label="Category" value={item.InvCategory ? item.InvCategory.name : null} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Field label="Status" value={item.status} />
                <Field label="Item Type" value={item.itemType} />
                <Field label="Order Rank" value={item.orderRank} />
                <Field label="Similar Item" value={item.replacedBy} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Field label="Airco Group" value={item.aircoMarkupGroup} />
                <Field label="X Group" value={item.xGroup} />
                <BoolField label="Bill of Goods" value={item.billOfGoods} />
                <BoolField label="Taxable" value={item.isTaxable} />
              </div>
            </SectionCard>

            {/* Supplier */}
            <SectionCard title="Supplier">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Supplier Number" value={item.vendorNumber} />
                <Field label="Supplier Name" value={item.vendorName} />
                <Field label="Supplier Part" value={item.vendorPartNumber} />
              </div>
            </SectionCard>

            {/* Stock & Location */}
            <SectionCard title="Stock &amp; Location">
              <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-6">
                <Field label="On Hand" value={fmt(item.onHand, 3)} />
                <Field label="Location 1" value={item.location1} />
                <Field label="Location 2" value={item.location2} />
                <Field label="Bin" value={item.bin} />
                <Field label="Pack Size" value={item.packSize} />
                <Field label="Grade" value={item.grade} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Field label="Lead Time (days)" value={item.leadTimeDays} />
                <Field label="Auto Min Qty" value={item.automaticMinQty} />
                <Field label="Auto Max Qty" value={item.automaticMaxQty} />
                <Field label="Fixed Min Qty" value={item.fixedMinQty} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Field label="Fixed Max Qty" value={item.fixedMaxQty} />
              </div>
            </SectionCard>

            {/* Bill of Goods — conditional */}
            {item.bogLines && item.bogLines.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/20">
                <CardHeader>
                  <CardTitle className="text-orange-800">Bill of Goods Components</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Part Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.bogLines.map((line, i) => (
                        <TableRow key={line.id}>
                          <TableCell className="text-slate-400 text-xs">{i + 1}</TableCell>
                          <TableCell className="font-mono text-xs font-medium">{line.componentProduct.productCode}</TableCell>
                          <TableCell className="text-sm">{line.componentProduct.name}</TableCell>
                          <TableCell className="text-right text-sm">{Number(line.quantity).toFixed(3)}</TableCell>
                          <TableCell className="text-sm text-slate-600">{line.uom}</TableCell>
                          <TableCell className="text-sm text-slate-500">{line.notes ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* FM Hardware — conditional */}
            {showFm && (
              <Card className="border-sky-200 bg-sky-50/30">
                <CardHeader className="border-sky-100">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4 text-sky-700" />
                    <CardTitle className="text-sky-800">FM Service Hardware</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="FM Unit Type" value={item.fmUnitType} />
                    <Field label="FM Unit Code" value={item.fmUnitCode} />
                    <Field label="FM Rule Code" value={item.fmRuleCode} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <BoolField label="Unit Modem / 4G" value={item.fourGUnitModem} />
                    <BoolField label="Mix Unit SIM" value={item.mixUnitSim} />
                    <BoolField label="Is Monitor" value={item.isMonitor} />
                    <BoolField label="Is Vision" value={item.isVision} />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Pricing tab ────────────────────────────────────────────────── */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">

              {/* Base price */}
              <SectionCard title="Base Price Calculator">
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-500">Supplier Base Price</span>
                    <span className="text-sm font-medium">${fmt(item.netSupplierBuyPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Landed Factor</span>
                    <span className="text-sm">{item.landedFactor ?? 1000}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Import Duty %</span>
                    <span className="text-sm">{fmt(item.importDuty)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">In Store Cost</span>
                    <span className="text-sm">${fmt(item.inStoreCost)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-semibold">Landed Cost</span>
                    <span className="text-sm font-semibold">${fmt(item.landedCost, 4)}</span>
                  </div>
                </div>
              </SectionCard>

              {/* Price matrix */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Airco Price Matrix</CardTitle>
                    <Badge variant="outline">
                      {item.aircoMarkupGroup ? `Group ${item.aircoMarkupGroup}` : item.xGroup ? `X Group ${item.xGroup}` : 'No Group'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Price Layer</TableHead>
                        <TableHead className="text-right">Factor</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Landed Cost</TableCell>
                        <TableCell className="text-right">{item.landedFactor ? (item.landedFactor / 1000).toFixed(3) : '—'}</TableCell>
                        <TableCell className="text-right font-medium">${fmt(item.landedCost, 4)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Agent Price</TableCell>
                        <TableCell className="text-right">{fmt(item.agentFactor, 3)}</TableCell>
                        <TableCell className="text-right font-medium">${fmt(item.agentPrice)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sales / Partner Price</TableCell>
                        <TableCell className="text-right">{fmt(item.partnerFactor, 3)}</TableCell>
                        <TableCell className="text-right font-medium">${fmt(item.salesPartnerPrice)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Trade Price</TableCell>
                        <TableCell className="text-right">{fmt(item.tradeFactor, 4)}</TableCell>
                        <TableCell className="text-right font-medium">${fmt(item.tradePrice)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Retail Price</TableCell>
                        <TableCell className="text-right">{fmt(item.retailFactor, 4)}</TableCell>
                        <TableCell className="text-right font-medium">${fmt(item.retailPrice)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Operational tabs (use existing components with item stub) ──── */}
          <TabsContent value="sales-history">
            <SalesHistory productId={id} />
          </TabsContent>

          {/* <TabsContent value="sales-data">
            <SalesData item={{ id: item.productCode, desc: item.name } as any} />
          </TabsContent> */}

          <TabsContent value="back-orders">
            <BackOrderList productId={id} />
          </TabsContent>

          <TabsContent value="stock-recount">
            <StockRecount item={{ id: item.productCode, desc: item.name } as any} />
          </TabsContent>

          {/* ── Supplier Order tab ────────────────────────────────────────── */}
          <TabsContent value="supplier-order">
            <PurchaseOrderList productId={id}/>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}