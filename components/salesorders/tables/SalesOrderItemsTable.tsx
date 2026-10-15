'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { SearchSelect } from '../../../components/ui/SearchSelect';
import { api } from '../../../lib/api-client'
import { calcLineTotal } from '../utils/salesOrderCalc';
import { useToast } from '../../ui/toast';

type Props = {
  items: any[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  mode?: 'edit' | 'view';
  category?: string;
  showBackorderQty?: boolean;
  lockedReduceOnly?: boolean;
  form: any
};

export function SalesOrderItemsTable({
  items,
  setItems,
  mode = 'edit',
  category,
  showBackorderQty = true,
  lockedReduceOnly = false,
  form
}: Props) {
  const { showToast } = useToast();
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const discRefs = useRef<(HTMLInputElement | null)[]>([]);

  const createEmptyRow = () => ({
    itemId: '',
    partNo: '',
    description: '',
    availableQty: null,
    backOrderQty: 0,
    unitPrice: 0,
    qty: 1,
    discountPct: 0,
  });

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
        for (const line of d?.uninvoicedItems ?? []) {
          if (!line?.productId) continue;
          // Repeated on every sales-order line for this product. Do not add them.
          map[line.productId] = Number(line.uninvoicedQty ?? line.quantity ?? 0);
          backOrders[line.productId] = Number(line.backOrderQty ?? 0);
        }
        if (!cancelled) {
          soBackOrderRef.current = backOrders;
          setSoOutstanding(map);
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
    if (!form?.priceLevel) return;

    const getPriceByLevel = (item: any, level: string) => {
      switch (level) {
        case 'RETAIL':
          return item.retailPrice ?? item.unitPrice;
        case 'TRADE':
          return item.tradePrice ?? item.unitPrice;
        case 'SALES_PARTNER':
          return item.salesPartnerPrice ?? item.unitPrice;
        case 'AGENT':
          return item.agentPrice ?? item.unitPrice;
        default:
          return item.unitPrice;
      }
    };

    // Compute current multiplier factor
    const factorMultiplier = form.salesFactor
      ? Number(form.salesFactor) / 1000
      : 1;

    setItems(prev =>
      prev.map(item => {
        if (!item.itemId) return item;

        const rawPrice = getPriceByLevel(item, form.priceLevel);
        const parsedPrice = Number(rawPrice);
        const basePrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;

        // Calculate marked up price using salesFactor
        const markedUpPrice = basePrice * factorMultiplier;

        return {
          ...item,
          unitPrice: markedUpPrice,
        };
      })
    );
  }, [form?.priceLevel, form?.salesFactor]); // <-- Added form?.salesFactor here

  return (
    <div className="space-y-4 overflow-visible">
      {items.map((item: any, i: number) => {
        //const safeQty = Number(item.qty) || 1;
        const safeQty = Number.isFinite(Number(item.qty)) ? Number(item.qty) : 1;
        const safePrice = Number(item.unitPrice) || 0;
        const safeDisc = Number(item.discountPct) || 0;
        const safeCost = Number(item.landedCost) || 0;

        const backOrderShown = Number(item.backOrderQty ?? item.backorderQty ?? 0);

        const lineTotal = calcLineTotal({
          qty: safeQty,
          unitPrice: safePrice,
          discountPct: safeDisc,
        });
        const effectivePrice = safePrice * (1 - safeDisc / 100);
        const totalMargin = (effectivePrice - safeCost) * safeQty;
        return (
          <div key={i} className="flex flex-col gap-1">
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
                    // 1. Fetch initial product data
                    const res = await api.get(`/products/${id}`);
                    let data = res.data?.data ?? res.data;

                    let isReplacement = false;
                    let originalItemName = '';

                    // 2. Check if product should be replaced (e.g. description matches another product ID)
                    if (data.description && data.description.trim() !== '') {
                      try {
                        // Attempt to fetch replacement product using description as product ID
                        const replacementRes = await api.get(`/products/${data.description.trim()}`);
                        const replacementData = replacementRes.data?.data ?? replacementRes.data;

                        if (replacementData && replacementData.id) {
                          originalItemName = `${data.productCode} - ${data.name}`;
                          data = replacementData; // Swap data to replacement item
                          isReplacement = true;
                        }
                      } catch {
                        // If description is not a valid product ID, retain original item
                      }
                    }

                    // 3. Calculate stock and line parameters for the active item
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
                    const backOrderQty = fromSalesOrder
                      ? (sameProduct
                        ? Number(item.backOrderQty ?? item.backorderQty ?? 0)
                        : Number(soBackOrderRef.current[data.id] ?? 0))
                      : Math.max(0, qty - onHand);
                    const landedCost = Number(data.landedCost ?? 0);

                    // Get base unit price according to selected price level
                    const baseUnitPrice = Number(
                      (form?.priceLevel === 'TRADE' ? data.tradePrice :
                        form?.priceLevel === 'SALES_PARTNER' ? data.salesPartnerPrice :
                          form?.priceLevel === 'AGENT' ? data.agentPrice :
                            data.retailPrice) ?? 0
                    );

                    // Apply 1.2 multiplier to unit price
                    const markedUpUnitPrice = baseUnitPrice * (form.salesFactor ? (Number(form.salesFactor || 0) / 1000) : 1);

                    const updated = items.map((row, index) =>
                      index === i
                        ? {
                          itemId: data.id,
                          partNo: data.productCode,
                          description: data.name,
                          availableQty: onHand,
                          uninvoicedQty,
                          backOrderQty,
                          backorderQty: backOrderQty,
                          // Store all price tiers for level switching
                          retailPrice: Number(data.retailPrice ?? 0),
                          tradePrice: Number(data.tradePrice ?? 0),
                          salesPartnerPrice: Number(data.salesPartnerPrice ?? 0),
                          agentPrice: Number(data.agentPrice ?? 0),
                          // Set initial unitPrice matching active priceLevel
                          unitPrice: sameProduct && Number(item.unitPrice)
                            ? Number(item.unitPrice)
                            : markedUpUnitPrice,
                          landedCost,
                          qty,
                          discountPct: 0,
                          isReplacement,
                          originalItemName,
                        }
                        : row
                    );

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
                {i === 0 && <label className="text-sm font-medium">Current Stock</label>}
                <div className={`h-10 px-3 flex items-center border rounded text-sm font-medium
    ${item.availableQty === null
                    ? 'bg-slate-50 text-slate-400'
                    : item.availableQty <= 0
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : item.availableQty < (Number(item.qty) || 1)
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
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

                  if (fromSalesOrder) {
                    updateRow(i, { qty: newQty });
                    return;
                  }

                  const newBackOrder = newQty > 0
                    ? Math.max(0, newQty - Number(item.availableQty ?? 0))
                    : 0;
                  updateRow(i, {
                    qty: newQty,
                    backOrderQty: newBackOrder,
                    backorderQty: newBackOrder,
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
                  {i === 0 && <label className="text-sm font-medium text-amber-600">B/Ord</label>}
                  <div className={`h-10 px-3 flex items-center border rounded text-sm font-medium
    ${backOrderShown > 0
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-slate-50 text-slate-400'
                    }`}>
                    {backOrderShown > 0 ? backOrderShown : '—'}
                  </div>
                </div>
              )}


              <Input
                label={i === 0 ? 'Unit' : undefined}
                value={safePrice}
                disabled
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
                  const rawDisc = Number(e.target.value) || 0;

                  // Calculate maximum allowable discount percentage based on landedCost
                  let maxDisc = 100;
                  if (safePrice > 0 && safeCost > 0) {
                    const calculatedMax = ((safePrice - safeCost) / safePrice) * 100;
                    maxDisc = Math.max(0, calculatedMax);
                  }

                  if (rawDisc > maxDisc) {
                    showToast({
                      type: "error",
                      title: 'Discount Limit Reached',
                      message: `Discount cannot reduce item cost below landed price ($${safeCost.toFixed(2)}). Max allowed discount is ${maxDisc.toFixed(2)}%.`,
                    });
                  }

                  const cappedDisc = Math.min(maxDisc, Math.max(0, rawDisc));

                  updateRow(i, {
                    discountPct: Number(cappedDisc.toFixed(2)),
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
                <div
                  className={`h-10 px-3 flex items-center border rounded font-medium ${totalMargin < 0
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                  ${totalMargin.toFixed(2)}
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
            {
              item.isReplacement && (
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 font-medium w-fit">
                  * Replacement item for: <span className="font-semibold">{item.originalItemName}</span>
                </div>
              )
            }
          </div>
        );
      })}
    </div >
  );
}
