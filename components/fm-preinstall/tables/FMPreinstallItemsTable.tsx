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
  installDetail,
  setInstallDetail,
}: any) {
  const [productOptions, setProductOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);

  useEffect(() => {
    const loadHardware = async () => {
      try {
        const [prodRes, itemsRes, allItemsRes, segRes] = await Promise.allSettled([
          api.get('/products?isFmHardware=true'),
          api.get('/inventory/items', { params: { isFmHardware: 'true', take: 500 } }),
          api.get('/inventory/items', { params: { take: 500 } }),
          api.get('/fm-segments'),
        ]);

        const prodList = prodRes.status === 'fulfilled' ? (prodRes.value.data?.data ?? prodRes.value.data ?? []) : [];
        const itemsList = itemsRes.status === 'fulfilled' ? (itemsRes.value.data?.data?.items ?? itemsRes.value.data?.items ?? itemsRes.value.data ?? []) : [];
        const allItemsList = allItemsRes.status === 'fulfilled' ? (allItemsRes.value.data?.data?.items ?? allItemsRes.value.data?.items ?? allItemsRes.value.data ?? []) : [];
        const segList = segRes.status === 'fulfilled' ? (segRes.value.data?.data ?? segRes.value.data ?? []) : [];

        // Combine products uniquely by id
        const map = new Map<string, any>();

        // 1. Add segments from fmsegments table
        for (const s of (Array.isArray(segList) ? segList : [])) {
          if (s.Product) {
            map.set(s.Product.id, {
              ...s.Product,
              isFmHardware: true,
              fmUnitCode: s.code || s.Product.fmUnitCode || s.Product.productCode,
              fmMixCode: s.mixCode || s.Product.fmMixCode,
              source: 'fm-segments',
            });
          } else if (s.code && s.type !== 'BASE_UNIT') {
            map.set(s.id || s.code, {
              id: s.productId || s.id,
              productCode: s.code,
              name: s.label || s.code,
              retailPrice: 0,
              onHand: 10,
              committed: 0,
              isFmHardware: true,
              fmUnitCode: s.code,
              fmMixCode: s.mixCode,
              source: 'fm-segments',
            });
          }
        }

        // 2. Add inventory items marked as FM Hardware
        const combinedItems = [
          ...(Array.isArray(itemsList) ? itemsList : []),
          ...(Array.isArray(allItemsList) ? allItemsList : []),
        ];
        for (const item of combinedItems) {
          if (item && (item.isFmHardware || item.status === 'FM Service')) {
            const existing = map.get(item.id) || {};
            map.set(item.id, {
              ...existing,
              ...item,
              isFmHardware: true,
              fmUnitCode: item.fmUnitCode || existing.fmUnitCode || item.productCode,
              fmMixCode: item.fmMixCode || existing.fmMixCode,
            });
          }
        }

        // 3. Add products from /products?isFmHardware=true
        for (const p of (Array.isArray(prodList) ? prodList : [])) {
          if (p && (p.isFmHardware || p.status === 'FM Service')) {
            const existing = map.get(p.id) || {};
            map.set(p.id, {
              ...existing,
              ...p,
              isFmHardware: true,
              fmUnitCode: p.fmUnitCode || existing.fmUnitCode || p.productCode,
              fmMixCode: p.fmMixCode || existing.fmMixCode,
            });
          }
        }

        const combined = Array.from(map.values());
        setRawProducts(combined);

        const options = [
          { label: 'Select hardware item…', value: '' },
          ...combined.map((p: any) => ({
            label: p.name ? `${p.productCode} — ${p.name}` : `${p.productCode} (FM Hardware)`,
            value: p.id,
          })),
        ];
        setProductOptions(options);
      } catch (err) {
        console.warn('Failed loading FM hardware items:', err);
      }
    };

    loadHardware();
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
              {/* Part Number */}
              <div onClick={e => e.stopPropagation()}>
                <SearchSelect
                  placeholder={i === 0 ? 'Select hardware item' : ''}
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

                    updateRow(i, {
                      productId: product.id,
                      partNumber: product.productCode,
                      description: product.name,
                      unitPrice: Number(product.retailPrice ?? 0),
                      discountPct: 0,
                      cost: Number(product.netSupplierBuyPrice || 0),
                      availQty,
                    });

                    // Sync hardware attributes with installDetail
                    if (setInstallDetail) {
                      setInstallDetail((prev: any) => ({
                        ...prev,
                        fmUnitCode: prev?.fmUnitCode || product.fmUnitCode || product.productCode,
                        mixCode: prev?.mixCode || product.fmMixCode || null,
                        modem4G: prev?.modem4G ?? product.fourGUnitModem ?? false,
                        mixSim1: prev?.mixSim1 ?? product.mixUnitSim ?? false,
                        visionType: prev?.visionType || (product.isVision ? 'STD' : null),
                      }));
                    }

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