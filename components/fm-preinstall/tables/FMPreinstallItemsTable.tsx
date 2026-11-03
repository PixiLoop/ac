'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { SearchSelect } from '../../../components/ui/SearchSelect';
import { api } from '../../../lib/api-client';
import { availableStock } from '../../../lib/available-stock';
import { pricedList } from '../../../lib/line-pricing';

function unwrapProductList(res: { data?: any }) {
  const payload = res.data?.data ?? res.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function FMPreinstallItemsTable({
  items,
  setItems,
  onSelectItem,
  activeItemIndex,
  pricingContext,
}: any) {
  const [productOptions, setProductOptions] = useState<{ label: string; value: string }[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);

  useEffect(() => {
    api
      .get('/products')
      .then((res) => {
        const list = unwrapProductList(res);
        setRawProducts(list);
        setProductOptions([
          { label: 'Select item', value: '' },
          ...list.map((p: any) => ({
            label: p.name ? `${p.productCode} — ${p.name}` : String(p.productCode ?? p.id),
            value: p.id,
          })),
        ]);
      })
      .catch(() => {
        setRawProducts([]);
        setProductOptions([{ label: 'Select item', value: '' }]);
      });
  }, []);

  const updateRow = (i: number, patch: any) => {
    setItems((prev: any[]) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], ...patch };
      const qty = Number(copy[i].quantity ?? 1);
      const price = Number(copy[i].unitPrice ?? 0);
      const disc = Number(copy[i].discountPct ?? 0);
      copy[i].lineTotal = parseFloat((qty * price * (1 - disc / 100)).toFixed(2));
      return copy;
    });
  };

  const removeRow = (i: number) => {
    setItems((prev: any[]) => prev.filter((_: any, idx: number) => idx !== i));
  };

  const marginPct = (row: any) => {
    const price = Number(row.unitPrice ?? 0);
    const cost = Number(row.cost ?? 0);
    if (!price) return '';
    return (((price - cost) / price) * 100).toFixed(1);
  };

  const applyProduct = async (i: number, id: string) => {
    if (!id) {
      updateRow(i, {
        productId: '',
        partNumber: '',
        description: '',
        unitPrice: 0,
        discountPct: 0,
        availQty: undefined,
        billOfGoods: false,
        lineTotal: 0,
        product: undefined,
      });
      return;
    }

    let product = rawProducts.find((p) => p.id === id);
    if (!product) {
      try {
        const res = await api.get(`/products/${id}`);
        product = res.data?.data ?? res.data;
      } catch {
        return;
      }
    }
    if (!product?.id) return;

    const availQty = availableStock(product);
    const unitPrice = Number(pricedList(product, pricingContext) || product.retailPrice || 0);
    const bog = !!product.billOfGoods;
    const qty = Number(items[i]?.quantity ?? 1);
    const lineTotal = parseFloat((qty * unitPrice).toFixed(2));

    const next = {
      productId: product.id,
      partNumber: product.productCode,
      description: product.name,
      unitPrice,
      discountPct: 0,
      cost: Number(product.netSupplierBuyPrice || product.landedCost || 0),
      availQty,
      billOfGoods: bog,
      product,
      lineTotal,
      quantity: qty || 1,
    };

    setItems((prev: any[]) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], ...next };
      if (i === copy.length - 1 && copy[i]?.productId) {
        copy.push({
          productId: '',
          quantity: 1,
          unitPrice: 0,
          discountPct: 0,
          lineTotal: 0,
          installDetail: {},
        });
      }
      return copy;
    });

    onSelectItem?.({ ...items[i], ...next, index: i });
  };

  if (!items.length) {
    return (
      <div className="text-slate-400 text-center py-6 text-sm">
        Click Add Item to add catalogue items, labour, or charges.
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-visible">
      <div className="hidden md:grid grid-cols-[minmax(14rem,2fr)_4.5rem_5.5rem_minmax(8rem,1.5fr)_5.5rem_5.5rem_4.5rem_4.5rem_2.5rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        <div>Select item</div>
        <div className="text-right">Qty</div>
        <div className="text-right">Available</div>
        <div>Description</div>
        <div className="text-right">Price</div>
        <div className="text-right">Total</div>
        <div className="text-right">Dis%</div>
        <div className="text-right">MargF</div>
        <div />
      </div>

      {items.map((row: any, i: number) => {
        const currentMargin = Number(marginPct(row));
        const listed = rawProducts.find((p) => p.id === row.productId) ?? row.product;
        const isBog = !!(row.billOfGoods ?? listed?.billOfGoods);
        const shownAvail =
          row.availQty != null && row.availQty !== ''
            ? Number(row.availQty)
            : availableStock(listed);
        const descLabel = isBog
          ? `${row.description || '—'} (BoG)`
          : row.description || '—';

        return (
          <div
            key={i}
            className={`rounded-md border border-slate-100 p-2 ${
              activeItemIndex === i ? 'bg-sky-50/60' : 'bg-white hover:bg-slate-50/80'
            }`}
            onClick={() => onSelectItem?.({ ...row, product: listed, index: i })}
          >
            <div
              className="grid grid-cols-1 md:grid-cols-[minmax(14rem,2fr)_4.5rem_5.5rem_minmax(8rem,1.5fr)_5.5rem_5.5rem_4.5rem_4.5rem_2.5rem] gap-2 items-end"
              onClick={(e) => e.stopPropagation()}
            >
              <SearchSelect
                placeholder=""
                value={row.productId || ''}
                options={productOptions}
                onChange={(id) => {
                  void applyProduct(i, id);
                }}
              />

              <Input
                type="number"
                min={1}
                className="h-9 text-right"
                value={row.quantity ?? 1}
                onChange={(e) => updateRow(i, { quantity: Number(e.target.value) })}
              />

              <div
                className={`h-9 px-2 flex items-center justify-end border rounded-md text-sm font-medium ${
                  shownAvail == null || Number.isNaN(shownAvail)
                    ? 'bg-slate-50 text-slate-400'
                    : shownAvail <= 0
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
              >
                {shownAvail == null || Number.isNaN(shownAvail) ? '—' : shownAvail}
              </div>

              <div className="h-9 px-2 flex items-center border rounded-md bg-slate-50 text-sm text-slate-700 truncate">
                {descLabel}
              </div>

              <Input
                type="number"
                step="0.01"
                className="h-9 text-right"
                value={row.unitPrice ?? 0}
                onChange={(e) => updateRow(i, { unitPrice: Number(e.target.value) })}
              />

              <div className="h-9 px-2 flex items-center justify-end border rounded-md bg-slate-50 text-sm font-medium text-slate-700 tabular-nums">
                ${Number(row.lineTotal ?? 0).toFixed(2)}
              </div>

              <Input
                type="number"
                step="0.1"
                className="h-9 text-right"
                value={row.discountPct ?? 0}
                onChange={(e) => updateRow(i, { discountPct: Number(e.target.value) })}
              />

              <div
                className={`h-9 px-2 flex items-center justify-end border rounded-md text-sm font-medium tabular-nums ${
                  currentMargin < 0
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-slate-50 text-slate-700'
                }`}
              >
                {marginPct(row) ? `${marginPct(row)}%` : '—'}
              </div>

              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => removeRow(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
