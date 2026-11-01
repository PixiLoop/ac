'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { SearchSelect } from '../../../components/ui/SearchSelect';
import { api } from '../../../lib/api-client'
import { calcLineTotal } from '../utils/salesOrderCalc';
import { useToast } from '../../ui/toast';
import { useAuth } from '../../../providers/auth-provider';
import {
  clampPriceAdjustment,
  isDoNotOrder,
  isFmPricedProduct,
  marginRatio,
  marginTone,
  netUnit,
  pricedList,
} from '../../../lib/line-pricing';
import { availableStock } from '../../../lib/available-stock';

/** Stock shortfall on Sales Order: max(0, Qty − max(0, Available)). */
function stockBackOrderQty(qty: number, availableQty: unknown) {
  if (availableQty == null || availableQty === '') return 0;
  const avail = Math.max(0, Number(availableQty));
  if (!Number.isFinite(avail)) return 0;
  return Math.max(0, Number(qty) - avail);
}

/** Shared Available / B/Ord cell colours from free stock vs qty. */
function stockCellTone(availableQty: unknown, qty: number) {
  if (availableQty == null || availableQty === '') {
    return 'bg-slate-50 text-slate-400';
  }
  const avail = Number(availableQty);
  if (!Number.isFinite(avail) || avail <= 0) {
    return 'bg-red-50 text-red-600 border-red-200';
  }
  if (avail < qty) {
    return 'bg-amber-50 text-amber-600 border-amber-200';
  }
  return 'bg-emerald-50 text-emerald-600 border-emerald-200';
}

type Props = {
  items: any[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  mode?: 'edit' | 'view';
  category?: string;
  showBackorderQty?: boolean;
  lockedReduceOnly?: boolean;
  useAvailableStock?: boolean;
  form: any
};

export function SalesOrderItemsTable({
  items,
  setItems,
  mode = 'edit',
  category,
  showBackorderQty = true,
  lockedReduceOnly = false,
  useAvailableStock = false,
  form
}: Props) {
  const { showToast } = useToast();
  const { isSystem, roles } = useAuth();
  const canEditPrice = !!isSystem || (roles ?? []).some((role: any) => /admin/i.test(String(role?.name ?? role ?? '')));
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const discRefs = useRef<(HTMLInputElement | null)[]>([]);

  const createEmptyRow = () => ({
    itemId: '',
    partNo: '',
    description: '',
    availableQty: null,
    backOrderQty: 0,
    unitPrice: 0,
    listPrice: 0,
    qty: 1,
    discountPct: 0,
  });

  const resolveReplacement = async (replacedBy: string) => {
    try {
      const byId = await api.get(`/products/${replacedBy}`);
      const product = byId.data?.data ?? byId.data;
      if (product?.id) return product;
    } catch {
      /* replacedBy may be a product code */
    }
    try {
      const res = await api.get('/products', { params: { search: replacedBy } });
      const list = res.data?.data ?? res.data ?? [];
      return (Array.isArray(list) ? list : []).find(
        (p: any) => p.productCode?.toLowerCase() === replacedBy.toLowerCase(),
      ) ?? null;
    } catch {
      return null;
    }
  };

  const updateRow = (index: number, patch: any) => {
    setItems(
      items.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      )
    );
  };

  const removeRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const [itemOptions, setItemOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [soOutstanding, setSoOutstanding] = useState<Record<string, number>>({})
  const [soBackOrder, setSoBackOrder] = useState<Record<string, number>>({})
  const outstandingRef = useRef<Record<string, number>>({})
  outstandingRef.current = {
    ...soOutstanding,
    ...(form?._uninvoicedByProduct ?? {}),
  }

  const qtyOfProduct = (rows: any[], productId: string) =>
    rows.reduce((sum, row) => {
      if (row.itemId !== productId) return sum
      const q = Number(row.qty)
      return sum + (Number.isFinite(q) ? Math.max(0, q) : 0)
    }, 0)

  const fromSalesOrder = form?.invoiceType === 'SALESORDER' && !!form?.salesOrderId
  const soBackOrderRef = useRef<Record<string, number>>({})

  const applyOutstanding = (rows: any[]) => {
    const map = outstandingRef.current
    return rows.map(row => {
      if (!row.itemId || map[row.itemId] == null) return row
      return { ...row, uninvoicedQty: Number(map[row.itemId]) }
    })
  }

  useEffect(() => {
    api
      .get('/products', {
        //params: { category: 'K3' },
        params: { category },
      })
      .then(res => {
        const list = res.data?.data ?? res.data ?? []

        const options = [
          { label: 'Select item', value: '' },
          ...list.map((p: any) => ({
            label: `${p.productCode}`,
            value: p.id,
          })),
        ]

        setItemOptions(options)
      })
      .catch(err => {
        console.error('Failed to load products', err)
      })
  }, [])

  useEffect(() => {
    if (form?.invoiceType !== 'SALESORDER' || !form?.salesOrderId) {
      setSoOutstanding(prev => (Object.keys(prev).length ? {} : prev));
      return;
    }
    let cancelled = false;
    api.get(`/invoices/uninvoiced-items/${form.salesOrderId}`)
      .then(res => {
        const d = res.data?.data ?? res.data;
        const map: Record<string, number> = {};
        const backOrders: Record<string, number> = {};
        for (const [productId, qty] of Object.entries(d?.salesOrderBackOrder ?? {})) {
          backOrders[productId] = Number(qty);
        }
        for (const line of d?.uninvoicedItems ?? []) {
          if (!line?.productId) continue;
          // Repeated on every sales-order line for this product. Do not add them.
          map[line.productId] = Number(line.uninvoicedQty ?? line.quantity ?? 0);
          if (backOrders[line.productId] == null) {
            backOrders[line.productId] = Number(line.notInvoicedQty ?? line.quantity ?? 0);
          }
        }
        if (!cancelled) {
          soBackOrderRef.current = backOrders;
          setSoBackOrder(backOrders);
          setSoOutstanding(map);
          setItems(prev => prev.map(row => {
            if (!row.itemId || backOrders[row.itemId] == null) return row;
            const notInvoicedQty = backOrders[row.itemId];
            return {
              ...row,
              uninvoicedQty: map[row.itemId] ?? row.uninvoicedQty,
              notInvoicedQty,
              backOrderQty: notInvoicedQty,
              backorderQty: notInvoicedQty,
            };
          }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [form?.invoiceType, form?.salesOrderId]);

  useEffect(() => {
    const map = outstandingRef.current;
    if (!map || !Object.keys(map).length) return;
    setItems(prev => {
      const next = applyOutstanding(prev);
      const changed = next.some((row, i) =>
        row.uninvoicedQty !== prev[i]?.uninvoicedQty ||
        row.backOrderQty !== prev[i]?.backOrderQty
      );
      return changed ? next : prev;
    });
  }, [form?._uninvoicedByProduct, soOutstanding, setItems]);

  useEffect(() => {
    if (!form?.priceLevel && !form?.fmPriceLevel) return;

    setItems(prev =>
      prev.map(item => {
        if (!item.itemId || item.priceOverridden || item.replacedNote) return item;
        if (item.retailPrice == null && item.tradePrice == null && item.agentPrice == null) return item;
        const listPrice = pricedList(item, form);
        const discountPct = Number(item.discountPct) || 0;
        return {
          ...item,
          listPrice,
          unitPrice: netUnit(listPrice, discountPct),
        };
      })
    );
  }, [form?.priceLevel, form?.salesFactor, form?.fmPriceLevel, form?.fmPriceFactor]);

  return (
    <div className="space-y-4 overflow-visible">
      {items.map((item: any, i: number) => {
        //const safeQty = Number(item.qty) || 1;
        const safeQty = Number.isFinite(Number(item.qty)) ? Number(item.qty) : 1;
        const safePrice = Number(item.unitPrice) || 0;
        const safeDisc = Number(item.discountPct) || 0;
        const safeCost = Number(item.landedCost) || 0;

        // Invoice-from-SO: remaining to send from SO.
        // Sales Order form: stock shortfall max(0, Qty − Available).
        const salesOrderRemaining = fromSalesOrder && item.itemId
          ? soBackOrder[item.itemId]
          : undefined;
        const backOrderShown = fromSalesOrder
          ? (salesOrderRemaining != null
            ? Number(salesOrderRemaining)
            : Number(item.notInvoicedQty ?? item.backOrderQty ?? item.backorderQty ?? 0))
          : stockBackOrderQty(safeQty, item.availableQty);

        const lineTotal = calcLineTotal({
          qty: safeQty,
          unitPrice: safePrice,
          discountPct: safeDisc,
          listPrice: item.listPrice,
          priceOverridden: item.priceOverridden,
        });
        const ratio = marginRatio(safePrice, safeCost);
        const tone = marginTone(ratio);
        const rowTone = tone === 'red'
          ? 'bg-red-50'
          : tone === 'yellow'
            ? 'bg-yellow-50'
            : tone === 'green'
              ? 'bg-green-50'
              : '';
        return (
          <div key={i} className={`flex flex-col gap-1 rounded ${rowTone}`}>
            <div
              className={`grid gap-3 items-end ${showBackorderQty
                ? 'grid-cols-[2fr_1fr_3fr_1fr_1fr_1fr_1fr_1fr_auto]'
                : 'grid-cols-[2fr_1fr_3fr_1fr_1fr_1fr_1fr_auto]'
                }`}
            >
              <SearchSelect
                disabled={mode === 'view' || lockedReduceOnly}
                placeholder={i === 0 ? 'Select item' : ''}
                value={item.itemId || ''}
                options={itemOptions}
                onChange={async id => {
                  if (!id) {
                    updateRow(i, createEmptyRow());
                    return;
                  }

                  try {
                    const res = await api.get(`/products/${id}`);
                    const data = res.data?.data ?? res.data;

                    if (isDoNotOrder(data.status)) {
                      showToast({
                        type: 'error',
                        title: 'Item Marked DO NOT ORDER',
                        message: 'Item Marked DO NOT ORDER',
                      });
                      return;
                    }

                    const makeLine = (product: any, qtyValue: number, extra: any = {}) => {
                      const onHand = Number(product.onHand ?? 0);
                      const listPrice = pricedList({ ...product, isFmPriced: isFmPricedProduct(product) }, form);
                      const avail = useAvailableStock ? availableStock(product) : onHand;
                      const notInvoicedQty = fromSalesOrder
                        ? Number(soBackOrderRef.current[product.id] ?? qtyValue)
                        : Math.max(0, qtyValue - Number(extra.invoicedQty ?? 0));
                      const backOrderQty = fromSalesOrder
                        ? notInvoicedQty
                        : stockBackOrderQty(qtyValue, avail);
                      return {
                        itemId: product.id,
                        partNo: product.productCode,
                        description: product.name,
                        availableQty: avail,
                        uninvoicedQty: outstandingRef.current[product.id] != null
                          ? Number(outstandingRef.current[product.id])
                          : null,
                        notInvoicedQty,
                        backOrderQty,
                        backorderQty: backOrderQty,
                        retailPrice: Number(product.retailPrice ?? 0),
                        tradePrice: Number(product.tradePrice ?? 0),
                        salesPartnerPrice: Number(product.salesPartnerPrice ?? 0),
                        agentPrice: Number(product.agentPrice ?? 0),
                        isFmHardware: product.isFmHardware,
                        fieldServiceType: product.fieldServiceType,
                        status: product.status,
                        listPrice,
                        unitPrice: listPrice,
                        landedCost: Number(product.landedCost ?? 0),
                        qty: qtyValue,
                        discountPct: 0,
                        ...extra,
                      };
                    };

                    if (data.replacedBy) {
                      const replacement = await resolveReplacement(String(data.replacedBy));
                      if (!replacement?.id) {
                        showToast({
                          type: 'error',
                          title: 'Replacement',
                          message: `Replacement item ${data.replacedBy} was not found`,
                        });
                        return;
                      }
                      if (isDoNotOrder(replacement.status)) {
                        showToast({
                          type: 'error',
                          title: 'Item Marked DO NOT ORDER',
                          message: 'Item Marked DO NOT ORDER',
                        });
                        return;
                      }
                      const note = {
                        ...makeLine(data, 0),
                        description: ` Replaced by > ${replacement.productCode}`,
                        unitPrice: 0,
                        listPrice: 0,
                        replacedNote: true,
                      };
                      const replacementLine = makeLine(replacement, 1);
                      const updated = items.map((row, index) => (index === i ? note : row));
                      updated.splice(i + 1, 0, replacementLine);
                      if (!updated.some(row => !row.itemId)) updated.push(createEmptyRow());
                      setItems(applyOutstanding(updated));
                      return;
                    }

                    const onHand = Number(data.onHand ?? 0);
                    const sameProduct = item.itemId === data.id;
                    const uninvoicedQty = outstandingRef.current[data.id] != null
                      ? Number(outstandingRef.current[data.id])
                      : (sameProduct && item.uninvoicedQty != null ? Number(item.uninvoicedQty) : null);
                    const alreadyOnForm = qtyOfProduct(
                      items.filter((_: any, index: number) => index !== i),
                      data.id,
                    );
                    const room = uninvoicedQty != null ? Math.max(0, uninvoicedQty - alreadyOnForm) : null;
                    const qty = sameProduct
                      ? (Number.isFinite(Number(item.qty)) ? Number(item.qty) : 0)
                      : (room != null ? Math.min(Math.max(onHand, 0), room) : 1);
                    const line = makeLine(data, qty);
                    line.uninvoicedQty = uninvoicedQty;
                    if (sameProduct && Number(item.unitPrice) && item.priceOverridden) {
                      line.unitPrice = Number(item.unitPrice);
                      line.priceOverridden = true;
                    }

                    const updated = items.map((row, index) => (index === i ? line : row));

                    if (i === items.length - 1) {
                      updated.push(createEmptyRow());
                    }

                    setItems(applyOutstanding(updated));

                    setTimeout(() => {
                      qtyRefs.current[i]?.focus();
                    }, 0);
                  } catch (err) {
                    console.error('Failed to load product', err);
                  }
                }}
              />

              {/* <Input
              label={i === 0 ? 'Avail' : undefined}
              value={item.availableQty ?? '-'}
              disabled
            /> */}


              <div>
                {i === 0 && <label className="text-sm font-medium">{useAvailableStock ? 'Available' : 'Current Stock'}</label>}
                <div className={`h-10 px-3 flex items-center border rounded text-sm font-medium ${stockCellTone(item.availableQty, safeQty)}`}>
                  {item.availableQty === null ? '—' : item.availableQty}
                </div>
              </div>


              <Input
                label={i === 0 ? 'Qty' : undefined}
                type="number"
                ref={el => {
                  qtyRefs.current[i] = el;
                }}
                value={safeQty}
                onChange={e => {
                  const raw = e.target.value;
                  const parsed = raw === '' ? 0 : Number(raw);
                  let newQty = Number.isFinite(parsed) ? parsed : 0;

                  // Reduce-only: quantity can only go down from its original value, never up
                  if (lockedReduceOnly && item.originalQty != null) {
                    newQty = Math.min(newQty, Number(item.originalQty));
                  }

                  const prevQty = Number(item.qty) || 0;

                  if (fromSalesOrder && item.uninvoicedQty != null) {
                    const alreadyOnForm = qtyOfProduct(
                      items.filter((_: any, index: number) => index !== i),
                      item.itemId,
                    );
                    const room = Math.max(0, Number(item.uninvoicedQty) - alreadyOnForm);
                    if (newQty > room) {
                      // Toast once when first exceeding order room, not on every keystroke
                      if (prevQty <= room) {
                        const label = item.partNo || item.description || 'Item';
                        showToast({
                          type: 'error',
                          title: 'Supply Exceeds Order',
                          message: `${label}: qty ${newQty} exceeds remaining order qty ${room}`,
                        });
                      }
                      newQty = room;
                    }
                  }

                  const stock = item.availableQty == null ? null : Number(item.availableQty);
                  if (stock != null && newQty > stock) {
                    // Toast once when qty first goes over stock, not on every keystroke while still over
                    if (prevQty <= stock) {
                      const label = item.partNo || item.description || 'Item';
                      const stockTitle = useAvailableStock
                        ? 'Supply Exceeds Available Stock'
                        : 'Supply Exceeds Stock on Hand';
                      showToast({
                        type: 'error',
                        title: stockTitle,
                        message: `${label}: qty ${newQty} exceeds stock ${stock}`,
                      });
                    }
                  }

                  if (fromSalesOrder) {
                    updateRow(i, { qty: newQty });
                    return;
                  }

                  const invoiced = Number(item.invoicedQty ?? 0);
                  const notInvoicedQty = Math.max(0, newQty - invoiced);
                  const backOrderQty = stockBackOrderQty(newQty, item.availableQty);
                  updateRow(i, {
                    qty: newQty,
                    notInvoicedQty,
                    backOrderQty,
                    backorderQty: backOrderQty,
                  });
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    discRefs.current[i]?.focus();
                  }
                }}
                disabled={mode === 'view'}
              />
              {showBackorderQty && (
                <div>
                  {i === 0 && (
                    <label className={`text-sm font-medium ${item.availableQty == null
                      ? 'text-slate-500'
                      : item.availableQty <= 0
                        ? 'text-red-600'
                        : item.availableQty < safeQty
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}>
                      B/Ord
                    </label>
                  )}
                  <div className={`h-10 px-3 flex items-center border rounded text-sm font-medium ${stockCellTone(item.availableQty, safeQty)}`}>
                    {backOrderShown > 0 ? backOrderShown : '—'}
                  </div>
                </div>
              )}


              <Input
                label={i === 0 ? 'Unit' : undefined}
                type="number"
                value={safePrice}
                disabled={mode === 'view' || !canEditPrice}
                onChange={e => {
                  const price = Number(e.target.value);
                  updateRow(i, {
                    unitPrice: Number.isFinite(price) ? price : 0,
                    priceOverridden: true,
                    discountPct: 0,
                  });
                }}
              />

              <Input
                label={i === 0 ? 'Disc %' : undefined}
                type="number"
                tabIndex={-1}
                ref={el => {
                  discRefs.current[i] = el;
                }}
                value={safeDisc}
                onChange={e => {
                  const rawDisc = Number(e.target.value);
                  const { value, message } = clampPriceAdjustment(
                    Number.isFinite(rawDisc) ? rawDisc : 0,
                    canEditPrice,
                  );
                  if (message) {
                    showToast({ type: 'error', title: message, message });
                  }
                  const listPrice = Number(item.listPrice ?? item.unitPrice) || 0;
                  updateRow(i, {
                    discountPct: Number(value.toFixed(2)),
                    listPrice,
                    unitPrice: netUnit(listPrice, value),
                    priceOverridden: false,
                  });
                }}
                disabled={mode === 'view' || lockedReduceOnly}
              />

              <div>
                {i === 0 && (
                  <label className="text-sm font-medium">Line Total</label>
                )}
                <div className="h-10 px-3 flex items-center border rounded bg-slate-50">
                  ${lineTotal.toFixed(2)}
                </div>
              </div>
              {/* MARGIN COLUMN */}
              <div>
                {i === 0 && <label className="text-sm font-medium">Margin</label>}
                <div className="h-10 px-3 flex items-center border rounded font-medium bg-white/70">
                  {ratio == null ? '—' : ratio.toFixed(3)}
                </div>
              </div>

              <div className="flex items-center">
                {mode === 'edit' && !lockedReduceOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeRow(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

              </div>


            </div>
          </div>
        );
      })}
    </div >
  );
}
