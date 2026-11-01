'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Package, Plus, X } from 'lucide-react';
import { SearchSelect } from '../../ui/SearchSelect';
import { Input } from '../../ui/input';
import { api } from '../../../lib/api-client';
import { formatJobBookError } from '../../../lib/job-book-client';
import { availableStock } from '../../../lib/available-stock';
import { useToast } from '../../ui/toast';
import { InstallationLineItem } from '../types/installation';
import { useOperations } from '../../../providers/OperationsContext';

type Props = {
  jobId: string;
  lineItems: InstallationLineItem[];
};

export function InstallationLineItems({ jobId, lineItems }: Props) {
  const { showToast } = useToast();
  const { addLineItemToJob, updateJobLineItem, removeLineItemFromJob } = useOperations();
  const [showModal, setShowModal] = useState(false);
  const [productOptions, setProductOptions] = useState<{ label: string; value: string }[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/products', { params: { take: 500 } })
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        const rows = Array.isArray(list) ? list : list?.items ?? [];
        setRawProducts(rows);
        setProductOptions(
          rows.map((p: any) => ({
            label: p.name ? `${p.productCode} — ${p.name}` : String(p.productCode),
            value: p.id,
          })),
        );
      })
      .catch(() => setProductOptions([]));
  }, []);

  const selectedProduct = useMemo(
    () => rawProducts.find((p) => p.id === selectedProductId) ?? null,
    [rawProducts, selectedProductId],
  );

  const stock = selectedProduct ? availableStock(selectedProduct) : null;
  const lineTotal = Number((qty * unitPrice * (1 - (discountPct || 0) / 100)).toFixed(2));

  const openModal = () => {
    setSelectedProductId('');
    setQty(1);
    setUnitPrice(0);
    setDiscountPct(0);
    setShowModal(true);
  };

  const onPickProduct = (id: string) => {
    setSelectedProductId(id);
    const product = rawProducts.find((p) => p.id === id);
    if (!product) return;
    setUnitPrice(Number(product.retailPrice ?? 0));
    setDiscountPct(0);
    setQty(1);
  };

  const handleAdd = async () => {
    if (!selectedProductId || busy) return;
    const product = rawProducts.find((p) => p.id === selectedProductId);
    if (!product?.id) {
      showToast({
        type: 'error',
        title: 'Add failed',
        message: 'Select a valid product from the list.',
      });
      return;
    }
    setBusy(true);
    try {
      await addLineItemToJob(jobId, {
        productId: product.id,
        partNo: product.productCode,
        productCode: product.productCode,
        description: product.name || product.productCode,
        quantity: Math.max(1, qty),
        unitPrice,
        discountPct,
        landedCost: Number(product.landedCost ?? 0),
      });
      setShowModal(false);
      showToast({ type: 'success', title: 'Line item added' });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Add failed',
        message: formatJobBookError(err, 'Could not add line item'),
      });
    } finally {
      setBusy(false);
    }
  };

  const bumpQty = async (item: InstallationLineItem, nextQty: number) => {
    const quantity = Math.max(1, nextQty);
    try {
      await updateJobLineItem(jobId, item.id, { quantity });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: formatJobBookError(err, 'Could not update quantity'),
      });
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await removeLineItemFromJob(jobId, itemId);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Remove failed',
        message: formatJobBookError(err, 'Could not remove line item'),
      });
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Line Items</h3>
            <p className="text-[11px] text-slate-500">
              Parts and materials for this installation job.
            </p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Line Item
          </button>
        </div>

        <div className="space-y-2">
          {lineItems.length === 0 && (
            <p className="text-xs text-slate-400 py-1">No line items yet.</p>
          )}
          {lineItems.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                  <Package className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {item.partNo || '—'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                      Qty {item.quantity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">{item.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    ${Number(item.unitPrice).toFixed(2)} · Total ${Number(item.lineTotal).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  className="h-7 w-7 rounded-md border border-slate-200 text-slate-500 hover:bg-white text-sm"
                  onClick={() => void bumpQty(item, Number(item.quantity) - 1)}
                  title="Decrease qty"
                >
                  −
                </button>
                <button
                  type="button"
                  className="h-7 w-7 rounded-md border border-slate-200 text-slate-500 hover:bg-white text-sm"
                  onClick={() => void bumpQty(item, Number(item.quantity) + 1)}
                  title="Increase qty"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => void removeItem(item.id)}
                  className="text-slate-400 hover:text-rose-600 text-xs p-1"
                  title="Remove line item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Line Item</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Search and select a product, then set quantity and price.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <SearchSelect
                placeholder="Search / select item"
                value={selectedProductId}
                options={productOptions}
                onChange={onPickProduct}
              />
            </div>

            {selectedProduct && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 font-medium">Stock</label>
                  <div
                    className={`h-9 px-3 flex items-center border rounded-md font-medium ${
                      stock == null
                        ? 'bg-slate-50 text-slate-400'
                        : stock <= 0
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}
                  >
                    {stock == null ? '—' : stock}
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 font-medium">Qty</label>
                  <Input
                    type="number"
                    min={1}
                    className="text-right"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-medium">Unit price</label>
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-medium">Disc %</label>
                  <Input
                    type="number"
                    step="0.1"
                    className="text-right"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-500 font-medium">Line total</label>
                  <div className="h-9 px-3 flex items-center justify-end border rounded-md bg-slate-50 font-semibold tabular-nums">
                    ${lineTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedProductId || busy}
                onClick={() => void handleAdd()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Adding…' : 'Add Line Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
