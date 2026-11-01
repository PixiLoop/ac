'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { SearchSelect } from '../../../components/ui/SearchSelect';
import { api } from '../../../lib/api-client';
import { availableStock } from '../../../lib/available-stock';

const GRID =
  'grid gap-3 items-center grid-cols-[minmax(12rem,2fr)_4.5rem_4.5rem_minmax(10rem,3fr)_5.5rem_6rem_4.5rem_4.5rem_2.5rem]';

export function FMPreinstallItemsTable({
  items,
  setItems,
  onSelectItem,
  activeItemIndex,
}: any) {
  const [productOptions, setProductOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);

  useEffect(() => {
    // Only load items where FM Hardware is checked (FM Preinstall is for hardware)
    api.get('/products?isFmHardware=true').then(res => {
      const list = res.data?.data ?? res.data ?? [];
      setRawProducts(list);
      const options = [
        { label: 'Select hardware item', value: '' },
        ...list.map((p: any) => ({
          label: p.name ? `${p.productCode} — ${p.name}` : `${p.productCode} (FM Hardware)`,
          value: p.id,
        })),
      ];
      setProductOptions(options);
    });
  }, []);

  const updateRow = (i: number, patch: any) => {
    const copy = [...items];
    copy[i] = { ...copy[i], ...patch };
    // Recalculate line total
    const qty = Number(copy[i].quantity ?? 1);
    const price = Number(copy[i].unitPrice ?? 0);
    const disc = Number(copy[i].discountPct ?? 0);
    copy[i].lineTotal = parseFloat((qty * price * (1 - disc / 100)).toFixed(2));
    setItems(copy);
  };

  const removeRow = (i: number) => {
    const copy = [...items];
    copy.splice(i, 1);
    setItems(copy);
  };

  // ── Derived margin % ────────────────────────────────────────────────────
  const marginPct = (row: any) => {
    const price = Number(row.unitPrice ?? 0);
    const cost = Number(row.cost ?? 0);
    if (!price || price === 0) return '';
    return ((price - cost) / price * 100).toFixed(1);
  };

  return (
    <div className="space-y-2 overflow-visible">
      {items.length === 0 && (
        <div className="text-slate-400 text-center py-3 text-sm">No items</div>
      )}

      {items.length > 0 && (
        <div className={`${GRID} px-0`}>
          <div className="text-sm font-medium text-slate-700">Select item</div>
          <div className="text-sm font-medium text-slate-700 text-right">Qty</div>
          <div className="text-sm font-medium text-slate-700 text-right">Available</div>
          <div className="text-sm font-medium text-slate-700">Description</div>
          <div className="text-sm font-medium text-slate-700 text-right">Price</div>
          <div className="text-sm font-medium text-slate-700 text-right">Total</div>
          <div className="text-sm font-medium text-slate-700 text-right">Dis%</div>
          <div className="text-sm font-medium text-slate-700 text-right">MargF</div>
          <div />
        </div>
      )}

      {items.map((row: any, i: number) => {
        const currentMargin = Number(marginPct(row));
        const listed = rawProducts.find(p => p.id === row.productId);
        const shownAvail = row.availQty != null && row.availQty !== ''
          ? Number(row.availQty)
          : availableStock(listed ?? row.product);

        return (
          <div
            key={i}
            className="rounded border border-transparent transition-colors"
            onClick={() => onSelectItem({ ...row, index: i })}
          >
            <div className={GRID}>
              {/* Part Number */}
              <div onClick={e => e.stopPropagation()}>
                <SearchSelect
                  value={row.productId || ''}
                  options={productOptions}
                  onChange={id => {
                    if (!id) {
                      updateRow(i, {
                        productId: '',
                        partNumber: '',
                        description: '',
                        unitPrice: 0,
                        discountPct: 0,
                        availQty: undefined,
                        lineTotal: 0,
                      });
                      return;
                    }

                    const product = rawProducts.find(p => p.id === id);
                    if (!product) return;

                    const availQty = availableStock(product);

                    updateRow(i, {
                      productId: product.id,
                      partNumber: product.productCode,
                      description: product.name,
                      unitPrice: Number(product.retailPrice ?? 0),
                      discountPct: 0,
                      cost: Number(product.netSupplierBuyPrice || 0),
                      availQty,
                    });
                    onSelectItem({ ...row, productId: product.id, product, index: i });

                    // Auto-add next row only if this was the last row
                    if (i === items.length - 1) {
                      setItems((prev: any[]) => {
                        const last = prev[prev.length - 1];
                        if (last?.productId) {
                          return [
                            ...prev,
                            {
                              productId: '',
                              quantity: 1,
                              unitPrice: 0,
                              discountPct: 0,
                              lineTotal: 0,
                              installDetail: {},
                            },
                          ];
                        }
                        return prev;
                      });
                    }
                  }}
                />
              </div>

              {/* Qty */}
              <div onClick={e => e.stopPropagation()}>
                <Input
                  type="number"
                  min={1}
                  className="text-right"
                  value={row.quantity ?? 1}
                  onChange={e => updateRow(i, { quantity: Number(e.target.value) })}
                />
              </div>

              {/* Available */}
              <div
                className={`h-9 px-3 flex items-center justify-end border rounded-md text-sm font-medium ${
                  shownAvail == null || Number.isNaN(shownAvail)
                    ? 'bg-slate-50 text-slate-400'
                    : shownAvail <= 0
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
              >
                {shownAvail == null || Number.isNaN(shownAvail) ? '—' : shownAvail}
              </div>

              {/* Description */}
              <div className="h-9 px-3 flex items-center border rounded-md bg-slate-50 text-sm text-slate-700 truncate">
                {row.description || '—'}
              </div>

              {/* Price */}
              <div onClick={e => e.stopPropagation()}>
                <Input
                  type="number"
                  step="0.01"
                  className="text-right"
                  value={row.unitPrice ?? 0}
                  onChange={e => updateRow(i, { unitPrice: Number(e.target.value) })}
                />
              </div>

              {/* Total */}
              <div className="h-9 px-3 flex items-center justify-end border rounded-md bg-slate-50 text-sm font-medium text-slate-700 tabular-nums">
                ${Number(row.lineTotal ?? 0).toFixed(2)}
              </div>

              {/* Dis% */}
              <div onClick={e => e.stopPropagation()}>
                <Input
                  type="number"
                  step="0.1"
                  className="text-right"
                  value={row.discountPct ?? 0}
                  onChange={e => updateRow(i, { discountPct: Number(e.target.value) })}
                />
              </div>

              {/* MargF */}
              <div
                className={`h-9 px-3 flex items-center justify-end border rounded-md text-sm font-medium tabular-nums ${
                  currentMargin < 0
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-slate-50 text-slate-700'
                }`}
              >
                {marginPct(row) ? `${marginPct(row)}%` : '—'}
              </div>

              {/* Delete */}
              <div className="flex items-center justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={e => {
                    e.stopPropagation();
                    removeRow(i);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
