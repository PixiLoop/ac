'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { SearchSelect } from '../../../components/ui/SearchSelect';
import { api } from '../../../lib/api-client';

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
    <div className="space-y-4 overflow-visible">
      {items.length === 0 && (
        <div className="text-slate-400 text-center py-3 text-sm">No items</div>
      )}
      {items.map((row: any, i: number) => {
        const isActive = activeItemIndex === i;
        const currentMargin = Number(marginPct(row));

        return (
          <div
            key={i}
            className={`flex flex-col gap-1 rounded border transition-colors border-transparent`}
            onClick={() => onSelectItem({ ...row, index: i })}
          >
            <div className="grid gap-3 items-end grid-cols-[2fr_1fr_1fr_3fr_1fr_1fr_1fr_1fr_auto]">
              {/* Item # */}
              {/* <div className="h-10 flex items-center justify-center text-sm font-medium text-slate-500">
                {i + 1}
              </div> */}

              {/* Part Number */}
              <div onClick={e => e.stopPropagation()}>
                {/* {i === 0 && <label className="text-sm font-medium">Part Number</label>} */}
                <SearchSelect
                  placeholder={i === 0 ? 'Select item' : ''}
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

                    const onHand = Number(product.onHand ?? 0);
                    const committed = Number(product.committed ?? 0);
                    const availQty = Math.max(0, onHand - committed);

                    console.log(product, 'prd');
                    
                    updateRow(i, {
                      productId: product.id,
                      partNumber: product.productCode,
                      description: product.name,
                      unitPrice: Number(product.retailPrice ?? 0),
                      discountPct: 0,
                      cost: Number(product.netSupplierBuyPrice || 0),
                      availQty,
                    });
                    onSelectItem({ ...row, productId: product.id, index: i });

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
                  label={i === 0 ? 'Qty' : undefined}
                  type="number"
                  min={1}
                  value={row.quantity ?? 1}
                  onChange={e => updateRow(i, { quantity: Number(e.target.value) })}
                />
              </div>

              {/* Avail */}
              <div>
                {i === 0 && <label className="text-sm font-medium">Avail</label>}
                <div
                  className={`h-10 px-3 flex items-center border rounded text-sm font-medium ${
                    row.availQty === undefined || row.availQty === null || row.availQty === ''
                      ? 'bg-slate-50 text-slate-400'
                      : Number(row.availQty) <= 0
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
                >
                  {row.availQty ?? '—'}
                </div>
              </div>

              {/* Description */}
              <div>
                {i === 0 && <label className="text-sm font-medium">Description</label>}
                <div className="h-10 px-3 flex items-center border rounded bg-slate-50 text-sm text-slate-700 truncate">
                  {row.description || '—'}
                </div>
              </div>

              {/* Price */}
              <div onClick={e => e.stopPropagation()}>
                <Input
                  label={i === 0 ? 'Price' : undefined}
                  type="number"
                  step="0.01"
                  value={row.unitPrice ?? 0}
                  onChange={e => updateRow(i, { unitPrice: Number(e.target.value) })}
                />
              </div>

              {/* Total */}
              <div>
                {i === 0 && <label className="text-sm font-medium">Total</label>}
                <div className="h-10 px-3 flex items-center justify-end border rounded bg-slate-50 text-sm font-medium text-slate-700">
                  ${Number(row.lineTotal ?? 0).toFixed(2)}
                </div>
              </div>

              {/* Dis% */}
              <div onClick={e => e.stopPropagation()}>
                <Input
                  label={i === 0 ? 'Dis%' : undefined}
                  type="number"
                  step="0.1"
                  value={row.discountPct ?? 0}
                  onChange={e => updateRow(i, { discountPct: Number(e.target.value) })}
                />
              </div>

              {/* MargF */}
              <div>
                {i === 0 && <label className="text-sm font-medium">MargF</label>}
                <div
                  className={`h-10 px-3 flex items-center justify-end border rounded text-sm font-medium ${
                    currentMargin < 0
                      ? 'bg-red-500 text-white border-red-600'
                      : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  {marginPct(row) ? `${marginPct(row)}%` : '—'}
                </div>
              </div>

              {/* Delete */}
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"
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