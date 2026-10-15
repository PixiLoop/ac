'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Send, Save, CheckCircle, Plus, Package } from 'lucide-react';

import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';
import { SearchSelect } from '../ui/SearchSelect';
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge,
} from '../inventory/shared-ui';


// ── Types ─────────────────────────────────────────────────────────────────────

type PoLine = {
  productId: string;
  productCode: string;
  description: string;
  onHand: number;
  onOrder: number;
  backOrderQty: number;
  minQty: number;
  maxQty: number;
  orderedQty: number;
  unitCost: number;
  lineTotal: number;
};

/** Still to order: back order + minimum stock, less quantity already on order. */
function suggestedOrderQty(backOrderQty: number, minQty: number, onOrder: number) {
  return Math.max(0, backOrderQty + minQty - onOrder);
}

type GrnLine = {
  productId: string;
  productCode: string;
  description: string;
  orderedQty: number;
  alreadyReceived: number;
  receivedQty: number;
  unitCost: number;
  locationId: string;
};

type PoStatus = 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

const STATUS_BADGE: Record<PoStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700 border-amber-200',
  RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PurchaseOrderForm({ poId }: { poId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const userEditedLinesRef = React.useRef(false);

  // Header state
  const [supplierId, setSupplierId] = React.useState(searchParams?.get('supplierId') ?? '');
  const [supplier, setSupplier] = React.useState<any>(null);
  const today = new Date().toISOString().split('T')[0];
  const [expectedDate, setExpectedDate] = React.useState(today);
  const [reference, setReference] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState<PoStatus>('DRAFT');
  const [orderNumber, setOrderNumber] = React.useState('');

  const [orderType, setOrderType] = React.useState<'DAILY' | 'MONTHLY'>('DAILY');

  // Lines
  const [lines, setLines] = React.useState<PoLine[]>([]);

  // GRN
  const [showGrn, setShowGrn] = React.useState(false);
  const [grnLines, setGrnLines] = React.useState<GrnLine[]>([]);
  const [grnNotes, setGrnNotes] = React.useState('');
  const [existingGrns, setExistingGrns] = React.useState<any[]>([]);

  // Reference data
  const [supplierOptions, setSupplierOptions] = React.useState<{ label: string; value: string }[]>([]);
  const [productOptions, setProductOptions] = React.useState<{ label: string; value: string }[]>([]);
  const [productMap, setProductMap] = React.useState<Record<string, any>>({});
  const [supplierItems, setSupplierItems] = React.useState<any[]>([]);

  // UI state
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [committingGrn, setCommittingGrn] = React.useState(false);
  const [loadingItems, setLoadingItems] = React.useState(false);

  const isEdit = !!poId;
  const isReadOnly = ['SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].includes(status);
  const canGrn = ['SUBMITTED', 'PARTIALLY_RECEIVED'].includes(status);
  const isLocked = status === 'RECEIVED' || status === 'CANCELLED';

  const [expandedGrn, setExpandedGrn] = React.useState<string | null>(null);

  // ── Load reference data

  const supplierProductOptions = React.useMemo(() => {
    return supplierItems.map((p: any) => ({
      label: `${p.productCode} — ${p.name}`,
      value: p.id,
    }));
  }, [supplierItems]);

  React.useEffect(() => {
    api.get('/inventory/suppliers', { params: { take: 500 } }).then((res) => {
      const list = res.data?.data?.items ?? res.data?.items ?? [];
      setSupplierOptions(list.map((s: any) => ({
        label: `${s.code} — ${s.name}`,
        value: s.id,
      })));
    }).catch(() => { });

    api.get('/inventory/items', { params: { take: 2000, sortKey: 'productCode' } }).then((res) => {
      const list = res.data?.data?.items ?? [];
      setProductOptions(list.map((p: any) => ({
        label: `${p.productCode} — ${p.name}`,
        value: p.id,
      })));
      setProductMap(Object.fromEntries(list.map((p: any) => [p.id, p])));
    }).catch(() => { });
  }, []);

  // ── Load supplier info + supplier items when supplierId changes 
  React.useEffect(() => {
    if (!supplierId) {
      setSupplier(null);
      setSupplierItems([]);
      return;
    }

    //userEditedLinesRef.current = false;
    if (!isEdit) {
      userEditedLinesRef.current = false;
    }

    api.get(`/inventory/suppliers/${supplierId}`).then((res) => {
      setSupplier(res.data?.data ?? res.data);
    }).catch(() => { });

    setLoadingItems(true);
    api.get(`/inventory/purchase-orders/supplier/${supplierId}/items`).then((res) => {
      const d = res.data?.data ?? res.data;
      const items = d?.items ?? [];
      setSupplierItems(items);

      setProductMap(prev => ({
        ...prev,
        ...Object.fromEntries(items.map((p: any) => [p.id, p])),
      }));

      //if (userEditedLinesRef.current) return;
      if (isEdit || userEditedLinesRef.current) return;

      const filtered = items.filter((p: any) => {
        const backOrdered = Number(p.backOrdered ?? 0);
        const onOrder = Number(p.onOrder ?? 0);
        const available = Number(p.onHand ?? 0) - Number(p.committed ?? 0);
        const minStock = Number(p.minStock ?? 0);
        return backOrdered > 0 || onOrder > 0 || (minStock > 0 && available < minStock);
      });
      const toLoad = filtered.length > 0 ? filtered : items;

      setLines(toLoad.map((p: any) => {
        const backOrderQty = Number(p.backOrdered ?? 0);
        const minQty = Number(p.minStock ?? 0);
        const onOrder = Number(p.onOrder ?? 0);
        const suggestedQty = suggestedOrderQty(backOrderQty, minQty, onOrder);
        const orderedQty = suggestedQty;
        const unitCost = Number(p.netSupplierBuyPrice ?? p.landedCost ?? 0);
        return {
          productId: p.id,
          productCode: p.productCode,
          description: p.name,
          onHand: Number(p.onHand ?? 0) - Number(p.committed ?? 0),
          onOrder: Number(p.onOrder ?? 0),
          backOrderQty,
          minQty,
          maxQty: Number(p.maxStock ?? 0),
          orderedQty,
          unitCost,
          lineTotal: +(orderedQty * unitCost).toFixed(4),
        };
      }));   // ← closes .map() AND setLines()

    }).catch(() => { })
      .finally(() => setLoadingItems(false));
  }, [supplierId]);

  // ── Load existing PO

  // ── Load existing PO

  const loadPo = React.useCallback(() => {
    if (!poId) return Promise.resolve();
    return api.get(`/inventory/purchase-orders/${poId}`).then((res) => {
      const d = res.data?.data ?? res.data;
      setSupplierId(d.supplierId);
      setSupplier(d.supplier);
      setExpectedDate(d.expectedDate ? d.expectedDate.split('T')[0] : '');
      setReference(d.reference ?? '');
      setNotes(d.notes ?? '');
      setStatus(d.status as PoStatus);
      setOrderNumber(d.orderNumber);
      setExistingGrns(d.goodsReceipts ?? []);
      setOrderType(d.orderType ?? 'DAILY');

      const mappedLines: PoLine[] = d.lines.map((l: any) => ({
        productId: l.productId,
        productCode: l.product.productCode,
        description: l.description,
        //onHand: Number(l.product.onHand),
        onHand: Number(l.product.onHand) - Number(l.product.committed ?? 0),
        onOrder: Number(l.product.onOrder ?? 0),
        backOrderQty: Number(l.product.backOrdered ?? 0),
        minQty: Number(l.product.minStock ?? 0),
        maxQty: Number(l.product.maxStock ?? 0),
        orderedQty: Number(l.orderedQty),
        unitCost: Number(l.unitCost),
        lineTotal: Number(l.lineTotal),
      }));
      setLines(mappedLines);
      userEditedLinesRef.current = true;
      // Build GRN lines — remaining qty per product
      const grnMapped: GrnLine[] = d.lines.map((l: any) => {
        const alreadyReceived = Number(l.receivedQty ?? 0);
        const remaining = Math.max(0, Number(l.orderedQty) - alreadyReceived);
        return {
          productId: l.productId,
          productCode: l.product.productCode,
          description: l.description,
          orderedQty: Number(l.orderedQty),
          alreadyReceived,
          receivedQty: remaining,
          unitCost: Number(l.unitCost),
          locationId: '',
        };
      });
      setGrnLines(grnMapped);
    }).catch(() => { });
  }, [poId]);

  React.useEffect(() => {
    loadPo();
  }, [loadPo]);

  // ── Load supplier items into PO lines

  function loadSupplierItemsAsLines() {
    if (!supplierItems.length) return;
    // const filtered = supplierItems.filter((p: any) =>
    //   Number(p.backOrdered ?? 0) > 0 || Number(p.onOrder ?? 0) > 0
    // );

    const filtered = supplierItems.filter((p: any) => {   // ← supplierItems, not items
      const backOrdered = Number(p.backOrdered ?? 0);
      const onOrder = Number(p.onOrder ?? 0);
      const available = Number(p.onHand ?? 0) - Number(p.committed ?? 0);
      const minStock = Number(p.minStock ?? 0);
      return backOrdered > 0 || onOrder > 0 || (minStock > 0 && available < minStock);
    });

    const toLoad = filtered.length > 0 ? filtered : supplierItems;
    setLines(toLoad.map((p: any) => {
      const backOrderQty = Number(p.backOrdered ?? 0);
      const minQty = Number(p.minStock ?? 0);
      const onOrder = Number(p.onOrder ?? 0);
      const suggestedQty = suggestedOrderQty(backOrderQty, minQty, onOrder);
      const orderedQty = suggestedQty;
      const unitCost = Number(p.netSupplierBuyPrice ?? p.landedCost ?? 0);
      return {
        productId: p.id,
        productCode: p.productCode,
        description: p.name,
        onHand: Number(p.onHand ?? 0) - Number(p.committed ?? 0),
        onOrder: Number(p.onOrder ?? 0),
        backOrderQty,
        minQty,
        maxQty: Number(p.maxStock ?? 0),
        orderedQty,
        unitCost,
        lineTotal: +(orderedQty * unitCost).toFixed(4),
      };
    }));
  }

  function loadAllSupplierItems() {
    if (!supplierItems.length) return;
    setLines(supplierItems.map((p: any) => {
      const backOrderQty = Number(p.backOrdered ?? 0);
      const minQty = Number(p.minStock ?? 0);
      const onOrder = Number(p.onOrder ?? 0);
      const suggestedQty = suggestedOrderQty(backOrderQty, minQty, onOrder);
      const orderedQty = suggestedQty;
      const unitCost = Number(p.netSupplierBuyPrice ?? p.landedCost ?? 0);
      return {
        productId: p.id,
        productCode: p.productCode,
        description: p.name,
        onHand: Number(p.onHand ?? 0) - Number(p.committed ?? 0),
        onOrder: Number(p.onOrder ?? 0),
        backOrderQty,
        minQty,
        maxQty: Number(p.maxStock ?? 0),
        orderedQty,
        unitCost,
        lineTotal: +(orderedQty * unitCost).toFixed(4),
      };
    }));
  }

  // ── Line helpers

  function addEmptyLine() {
    userEditedLinesRef.current = true;
    setLines(prev => [...prev, {
      productId: '', productCode: '', description: '',
      onHand: 0,
      backOrderQty: 0,
      minQty: 0,
      maxQty: 0,
      onOrder: 0,
      orderedQty: 1,
      unitCost: 0,
      lineTotal: 0,
    }]);
  }

  function updateLine(i: number, patch: Partial<PoLine>) {
    userEditedLinesRef.current = true;
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, ...patch };
      updated.lineTotal = +(updated.orderedQty * updated.unitCost).toFixed(4);
      return updated;
    }));
  }

  function selectProduct(i: number, productId: string) {
    userEditedLinesRef.current = true;
    const p = productMap[productId];
    console.log("==", productMap["cmp6humio00027lqzocts3u0b"])
    if (!p) return;

    const backOrderQty = Number(p.backOrdered ?? 0);
    const minQty = Number(p.minStock ?? 0);
    const maxQty = Number(p.maxStock ?? 0);

    const onOrder = Number(p.onOrder ?? 0);
    const suggestedQty = suggestedOrderQty(backOrderQty, minQty, onOrder);
    const orderedQty = suggestedQty;

    // Warn if exceeds max (daily)
    if (orderType === 'DAILY' && maxQty > 0 && orderedQty > maxQty) {
      showToast({
        type: 'error',
        title: `Warning: Suggested qty (${orderedQty}) exceeds daily max (${maxQty}) for ${p.productCode}`
      });
    }

    updateLine(i, {
      productId,
      productCode: p.productCode,
      description: p.name,
      //onHand: Number(p.onHand ?? 0),
      onHand: Number(p.onHand ?? 0) - Number(p.committed ?? 0),
      onOrder: Number(p.onOrder ?? 0),
      backOrderQty,
      minQty,
      maxQty,
      unitCost: Number(p.netSupplierBuyPrice ?? p.landedCost ?? 0),
      orderedQty,     // ← auto-set suggested qty
    });
  }

  function removeLine(i: number) {
    userEditedLinesRef.current = true;
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  // ── Totals

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const gst = +(subtotal * 0.1).toFixed(2);
  const total = +(subtotal + gst).toFixed(2);

  // ── Save draft

  React.useEffect(() => {
    if (!lines.length) return;
    setLines(prev => prev.map(l => {
      if (!l.productId) return l;
      const suggestedQty = suggestedOrderQty(l.backOrderQty, l.minQty, l.onOrder);
      return { ...l, orderedQty: suggestedQty, lineTotal: +(suggestedQty * l.unitCost).toFixed(4) };
    }));
  }, [orderType]);

  async function handleSave() {
    if (!supplierId) { showToast({ type: 'error', title: 'Select a supplier' }); return; }
    if (!lines.some(l => l.productId)) { showToast({ type: 'error', title: 'Add at least one line' }); return; }

    // ── Qty validation — toast + block ──────────────────────────────────────
    for (const line of lines.filter(l => l.productId)) {
      /*if (orderType === 'DAILY' && line.maxQty > 0 && line.orderedQty > line.maxQty) {
        showToast({
          type: 'error',
          title: `${line.productCode}: Exceeds daily max`,
          message: `Ordered ${line.orderedQty}, daily max is ${line.maxQty}`,
        });
        return; // ← block save
      }*/

      const requiredQty = suggestedOrderQty(line.backOrderQty, line.minQty, line.onOrder);
      if (requiredQty > 0 && line.orderedQty < requiredQty) {
        showToast({
          type: 'error',
          title: `${line.productCode}: Qty too low`,
          message: `Suggested: ${requiredQty} (backorder ${line.backOrderQty} + min ${line.minQty} − on order ${line.onOrder}), ordered: ${line.orderedQty}`,
        });
        //return; // ← block save
      }
    }

    setSaving(true);
    try {
      const payload = {
        supplierId,
        expectedDate: expectedDate || null,
        reference: reference || null,
        notes: notes || null,
        orderType,
        lines: lines
          .filter(l => l.productId)
          .map(l => ({
            productId: l.productId,
            description: l.description,
            orderedQty: l.orderedQty,
            unitCost: l.unitCost,
          })),
      };

      if (isEdit) {
        await api.patch(`/inventory/purchase-orders/${poId}`, payload);
        showToast({ type: 'success', title: 'Purchase order saved' });
      } else {
        const res = await api.post('/inventory/purchase-orders', payload);
        const created = res.data?.data ?? res.data;
        showToast({ type: 'success', title: `${created.orderNumber} created` });
        router.replace(`/inventory/purchase-orders/${created.id}`);
      }
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  // ── Submit

  /*async function handleSubmit() {
    if (!confirm(`Submit ${orderNumber} and send to supplier?`)) return;
    setSubmitting(true);
    try {
      await api.post(`/inventory/purchase-orders/${poId}/submit`);
      showToast({ type: 'success', title: 'PO submitted. Email will be sent to supplier.' });
      setStatus('SUBMITTED');
      //router.push(`/inventory/purchase-orders/${poId}`);
 
      // router.refresh();
      //window.location.reload();
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to submit' });
    } finally {
      setSubmitting(false);
    }
  }*/

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.post(`/inventory/purchase-orders/${poId}/submit`);
      showToast({ type: 'success', title: 'PO submitted. Email sent to supplier.' });
      setStatus('SUBMITTED');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to submit';
      showToast({ type: 'error', title: typeof msg === 'string' ? msg : JSON.stringify(msg) });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Commit GRN

  async function handleCommitGrn() {
    const validLines = grnLines.filter(l => l.receivedQty > 0);
    if (!validLines.length) {
      showToast({ type: 'error', title: 'Enter received quantities' });
      return;
    }
    if (!confirm('Commit GRN? Stock levels will be updated. This cannot be undone.')) return;

    setCommittingGrn(true);
    try {
      // Step 1: Create GRN
      const grnRes = await api.post(`/inventory/purchase-orders/${poId}/grn`, {
        notes: grnNotes || null,
        lines: validLines.map(l => ({
          productId: l.productId,
          description: l.description,
          receivedQty: l.receivedQty,
          unitCost: l.unitCost,
          locationId: l.locationId || null,
        })),
      });
      const grn = grnRes.data?.data ?? grnRes.data;

      // Step 2: Commit GRN (posts stock)
      await api.post(`/inventory/purchase-orders/${poId}/grn/${grn.id}/commit`);

      showToast({ type: 'success', title: `${grn.receiptNumber} committed. Stock updated.` });
      setShowGrn(false);
      await loadPo();
      //router.push(`/inventory/purchase-orders/${poId}`);
      //window.location.reload();
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to commit GRN' });
    } finally {
      setCommittingGrn(false);
    }
  }

  // ── Render

  return (
    <div className="space-y-4">

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {orderNumber && (
            <span className="font-mono text-sm font-semibold text-slate-700">{orderNumber}</span>
          )}
          {status && (
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${STATUS_BADGE[status]}`}>
              {status.replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
          {!isReadOnly && (
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save Draft'}
            </Button>
          )}
          {isEdit && status === 'DRAFT' && (
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {submitting ? 'Sending…' : 'Submit & Send to Supplier'}
            </Button>
          )}
          {canGrn && !showGrn && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              onClick={() => setShowGrn(true)}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Receive Goods (GRN)
            </Button>
          )}
        </div>
      </div>

      {/* ── Header cards ── */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Supplier */}
        <Card>
          <CardHeader><CardTitle>Supplier</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!isReadOnly ? (
              <SearchSelect
                value={supplierId}
                options={supplierOptions}
                placeholder="Select supplier…"
                onChange={setSupplierId}
              />
            ) : (
              <p className="font-medium text-sm">{supplier?.name}</p>
            )}
            {supplier && (
              <div className="space-y-1 text-xs text-slate-500 border-t pt-2">
                <p>Code: <span className="text-slate-700 font-medium">{supplier.code}</span></p>
                <p>Order Email: <span className="text-slate-700">{supplier.orderEmail ?? '—'}</span></p>
                <p>Phone: <span className="text-slate-700">{supplier.orderPhone ?? '—'}</span></p>
                <p>Terms: <span className="text-slate-700">{supplier.tradingTerms ?? '—'}</span></p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order details */}
        <Card>
          <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Order Type</p>
              <select
                className="flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                value={orderType}
                onChange={e => setOrderType(e.target.value as 'DAILY' | 'MONTHLY')}
                disabled={isReadOnly}
              >
                <option value="DAILY">Daily</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Expected Date</p>
              <Input
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Reference / Invoice No</p>
              <Input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Optional"
                disabled={isReadOnly}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm h-[90px] resize-none focus:outline-none focus:ring-1 focus:ring-slate-300"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isReadOnly}
              placeholder="Internal notes…"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Supplier items quick-load (new PO only) ── */}
      {!isEdit && supplierId && supplierItems.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5">
          <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <span className="font-medium">{supplierItems.length} items</span> linked to this supplier.
          </p>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={loadSupplierItemsAsLines}
            >
              Needing Order
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={loadAllSupplierItems}
            >
              Load All Supplier Items
            </Button>
          </div>
        </div>
      )}

      {/* ── Order Lines ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Lines</CardTitle>
            {!isReadOnly && (
              <Button size="sm" onClick={addEmptyLine}>
                <Plus className="mr-1 h-3.5 w-3.5" />Add Line
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4 w-56">Product</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-20">On Hand</TableHead>
                <TableHead className="text-right w-20">On Order</TableHead>
                <TableHead className="text-right w-20">B/Ord</TableHead>
                <TableHead className="text-right w-20">Min</TableHead>
                <TableHead className="text-right w-20">Max</TableHead>
                <TableHead className="text-right w-24">Qty</TableHead>
                <TableHead className="text-right w-28">Unit Cost</TableHead>
                <TableHead className="text-right w-28">Line Total</TableHead>
                {!isReadOnly && <TableHead className="w-10">{''}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-slate-400 text-sm">
                    No lines added.{!isReadOnly && ' Click "Add Line" or load supplier items.'}
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4">
                      {!isReadOnly ? (
                        <SearchSelect
                          value={line.productId}
                          options={supplierProductOptions}
                          placeholder="Select product…"
                          onChange={id => selectProduct(i, id)}
                        />
                      ) : (
                        <span className="font-mono text-xs font-medium">{line.productCode}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {line.description || '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-500">
                      {line.onHand}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-500">
                      {line.onOrder}
                    </TableCell>
                    <TableCell className="text-right text-xs text-amber-600 font-medium">
                      {line.backOrderQty > 0 ? line.backOrderQty : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-400">
                      {line.minQty > 0 ? line.minQty : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-400">
                      {line.maxQty > 0 ? line.maxQty : '—'}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0}
                        className={`text-right h-8 ${isReadOnly && `font-bold text-black disabled:font-bold disabled:text-black`}`}
                        value={line.orderedQty}
                        onChange={e => updateLine(i, { orderedQty: Math.max(0, +e.target.value || 0) })}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} step="0.0001"
                        className="text-right h-8"
                        value={line.unitCost}
                        onChange={e => updateLine(i, { unitCost: +e.target.value || 0 })}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      ${line.lineTotal.toFixed(2)}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell>
                        <button
                          onClick={() => removeLine(i)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Totals */}
          {lines.length > 0 && (
            <div className="flex justify-end px-4 pb-4 pt-3 border-t">
              <div className="w-52 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GST (10%)</span>
                  <span>${gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Existing GRNs ── */}

      {existingGrns.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Goods Receipts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 w-8">{''}</TableHead>
                  <TableHead>GRN No</TableHead>
                  <TableHead>Receipt Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Posted By</TableHead>
                  <TableHead className="text-right pr-4">Lines</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingGrns.map((grn: any) => (
                  <React.Fragment key={grn.id}>
                    {/* ── Summary row ── */}
                    <TableRow
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedGrn(expandedGrn === grn.id ? null : grn.id)}
                    >
                      <TableCell className="pl-4">
                        <span className="text-slate-400 text-xs">
                          {expandedGrn === grn.id ? '▼' : '▶'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {grn.receiptNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(grn.receiptDate).toLocaleDateString('en-AU')}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${grn.status === 'POSTED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                          {grn.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{grn.notes ?? '—'}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {grn.postedByName ?? grn.postedBy ?? '—'}
                      </TableCell>
                      <TableCell className="text-right pr-4 text-sm">
                        {grn.lines?.length ?? 0}
                      </TableCell>
                    </TableRow>

                    {/* ── Expanded lines ── */}
                    {expandedGrn === grn.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0 bg-slate-50/60">
                          <div className="px-8 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b text-slate-500">
                                  <th className="text-left pb-1.5 font-medium">Product</th>
                                  <th className="text-left pb-1.5 font-medium">Description</th>
                                  <th className="text-right pb-1.5 font-medium">Received Qty</th>
                                  <th className="text-right pb-1.5 font-medium">Unit Cost</th>
                                  <th className="text-right pb-1.5 font-medium">Line Total</th>
                                  <th className="text-left pb-1.5 font-medium pl-4">Location</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(grn.lines ?? []).length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="py-2 text-slate-400 text-center">
                                      No lines
                                    </td>
                                  </tr>
                                ) : (
                                  (grn.lines ?? []).map((line: any, i: number) => (
                                    <tr key={i} className="border-b last:border-0">
                                      <td className="py-1.5 font-mono font-medium">
                                        {line.product?.productCode ?? '—'}
                                      </td>
                                      <td className="py-1.5 text-slate-600">{line.description}</td>
                                      <td className="py-1.5 text-right font-medium">
                                        {Number(line.receivedQty).toFixed(2)}
                                      </td>
                                      <td className="py-1.5 text-right text-slate-600">
                                        ${Number(line.unitCost).toFixed(4)}
                                      </td>
                                      <td className="py-1.5 text-right font-medium">
                                        ${Number(line.lineTotal).toFixed(2)}
                                      </td>
                                      <td className="py-1.5 pl-4 text-slate-500">
                                        {line.locationId ?? '—'}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="border-t">
                                  <td colSpan={4} className="pt-2 text-right text-slate-500 font-medium">
                                    Total Received Value
                                  </td>
                                  <td className="pt-2 text-right font-semibold">
                                    ${(grn.lines ?? []).reduce((s: number, l: any) =>
                                      s + Number(l.lineTotal ?? 0), 0).toFixed(2)}
                                  </td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── GRN Panel ── */}
      {showGrn && (
        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-emerald-800">Receive Goods (GRN)</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adjust quantities. Commit to post stock — irreversible.
                </p>
              </div>
              <button
                onClick={() => setShowGrn(false)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Already Received</TableHead>
                  <TableHead className="text-right w-28">Receiving Now</TableHead>
                  <TableHead className="text-right w-28">Unit Cost</TableHead>
                  <TableHead className="w-36">Location (opt)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grnLines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs font-medium">{line.productCode}</TableCell>
                    <TableCell className="text-sm">{line.description}</TableCell>
                    <TableCell className="text-right text-sm text-slate-500">{line.orderedQty}</TableCell>
                    <TableCell className="text-right text-sm text-slate-500">{line.alreadyReceived}</TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0}
                        className="text-right h-8"
                        value={line.receivedQty}
                        onChange={e => setGrnLines(grnLines.map((l, j) =>
                          j === i ? { ...l, receivedQty: Math.max(0, +e.target.value || 0) } : l
                        ))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} step="0.0001"
                        className="text-right h-8"
                        value={line.unitCost}
                        onChange={e => setGrnLines(grnLines.map((l, j) =>
                          j === i ? { ...l, unitCost: +e.target.value || 0 } : l
                        ))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="e.g. A01-B02"
                        className="h-8 text-xs"
                        value={line.locationId}
                        onChange={e => setGrnLines(grnLines.map((l, j) =>
                          j === i ? { ...l, locationId: e.target.value } : l
                        ))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid gap-3 md:grid-cols-2 items-end">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">GRN Notes</p>
                <Input
                  value={grnNotes}
                  onChange={e => setGrnNotes(e.target.value)}
                  placeholder="e.g. partial delivery, damaged goods…"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowGrn(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                  onClick={handleCommitGrn}
                  disabled={committingGrn}
                >
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  {committingGrn ? 'Committing…' : 'Commit & Receive Stock'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
