'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, AlertCircle, DollarSign, Check } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { SearchSelect } from '../../ui/SearchSelect';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';
import { catalogSlot } from '../../../lib/line-pricing';

export interface CustomerCustomPriceRow {
  id?: string;
  productId: string;
  productCode?: string;
  productName?: string;
  defaultPrice?: number;
  customPrice: number | string;
  notes?: string;
  product?: any;
}

interface Props {
  customerId?: string;
  customerPriceLevel?: string;
  customerSalesFactor?: number | string;
  customPrices: CustomerCustomPriceRow[];
  onChange: (prices: CustomerCustomPriceRow[]) => void;
  readOnly?: boolean;
}

export function CustomerPricingSection({
  customerId,
  customerPriceLevel = 'RETAIL',
  customerSalesFactor = 1,
  customPrices,
  onChange,
  readOnly = false,
}: Props) {
  const { showToast } = useToast();
  const [productOptions, setProductOptions] = useState<{ label: string; value: string }[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, any>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);

  // New item state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    setLoadingProducts(true);
    api.get('/products')
      .then(res => {
        const raw = res.data?.data ?? res.data ?? [];
        const items = Array.isArray(raw) ? raw : raw?.items ?? [];
        const map: Record<string, any> = {};
        const opts = items.map((p: any) => {
          map[p.id] = p;
          const code = p.productCode || '—';
          const name = p.name || '';
          return {
            label: `${code} — ${name}`,
            value: p.id,
          };
        });
        setProductsMap(map);
        setProductOptions(opts);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  const getDefaultPrice = (product: any): number => {
    if (!product) return 0;
    const base = catalogSlot(product, customerPriceLevel);
    const factor = Number(customerSalesFactor);
    const mult = Number.isFinite(factor) && factor !== 0 ? factor / 1000 : 1;
    return Number((base * mult).toFixed(2));
  };

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = productsMap[id];
    if (prod) {
      const def = getDefaultPrice(prod);
      // Pre-fill with default price for quick adjustment
      setNewPrice(def ? def.toString() : '');
    }
  };

  const handleAddCustomPrice = () => {
    if (!selectedProductId) {
      showToast({ type: 'error', title: 'Product required', message: 'Please select an inventory item.' });
      return;
    }
    const parsedPrice = Number(newPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      showToast({ type: 'error', title: 'Invalid price', message: 'Price must be a valid positive number.' });
      return;
    }

    // Check duplicate
    if (customPrices.some(cp => cp.productId === selectedProductId)) {
      showToast({
        type: 'error',
        title: 'Duplicate product',
        message: 'A custom price is already configured for this product. Edit the existing row instead.',
      });
      return;
    }

    const prod = productsMap[selectedProductId];
    const def = getDefaultPrice(prod);

    const newRow: CustomerCustomPriceRow = {
      id: `temp-${Date.now()}`,
      productId: selectedProductId,
      productCode: prod?.productCode || '—',
      productName: prod?.name || 'Selected Item',
      defaultPrice: def,
      customPrice: parsedPrice,
      notes: newNotes.trim() || undefined,
      product: prod,
    };

    const nextList = [...customPrices, newRow];
    onChange(nextList);

    // Reset add form
    setSelectedProductId('');
    setNewPrice('');
    setNewNotes('');
    setShowAddForm(false);
    showToast({ type: 'success', title: 'Added', message: 'Custom price added to customer pricing list.' });
  };

  const handleUpdatePrice = (index: number, val: string) => {
    const copy = [...customPrices];
    copy[index] = { ...copy[index], customPrice: val };
    onChange(copy);
  };

  const handleUpdateNotes = (index: number, val: string) => {
    const copy = [...customPrices];
    copy[index] = { ...copy[index], notes: val };
    onChange(copy);
  };

  const handleRemove = async (index: number) => {
    const item = customPrices[index];
    const confirmed = window.confirm(`Remove custom price for ${item.productCode || 'this item'}?`);
    if (!confirmed) return;

    if (customerId && item.id && !item.id.startsWith('temp-')) {
      try {
        await api.delete(`/customers/${customerId}/custom-prices/${item.id}`);
      } catch (err) {
        console.warn('Backend delete sync note:', err);
      }
    }

    const nextList = customPrices.filter((_, i) => i !== index);
    onChange(nextList);
    showToast({ type: 'success', title: 'Removed', message: 'Custom price entry removed.' });
  };

  const selectedProductObj = productsMap[selectedProductId];
  const selectedProductDefaultPrice = selectedProductObj ? getDefaultPrice(selectedProductObj) : 0;

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-semibold text-slate-800">Customer-Specific Pricing Overrides</h4>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
              {customPrices.length} {customPrices.length === 1 ? 'custom item' : 'custom items'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Prices assigned here automatically override default catalog prices across Quotations, Sales Orders, and Invoices.
          </p>
        </div>

        {!readOnly && (
          <Button
            size="sm"
            type="button"
            variant={showAddForm ? 'outline' : 'primary'}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel Add' : (
              <>
                <Plus className="h-4 w-4 mr-1" /> Add Custom Price
              </>
            )}
          </Button>
        )}
      </div>

      {/* Inline Add Box */}
      {showAddForm && !readOnly && (
        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Configure New Item Price Override
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Select Inventory Item <span className="text-rose-500">*</span>
              </label>
              <SearchSelect
                placeholder="Search by part number or description..."
                value={selectedProductId}
                options={productOptions}
                onChange={handleProductSelect}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-500 block mb-1">Default Price</label>
              <div className="h-10 px-3 flex items-center border rounded-md bg-slate-100 text-xs text-slate-600 font-mono">
                {selectedProductId ? `$${selectedProductDefaultPrice.toFixed(2)}` : '—'}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Custom Price ($) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-medium text-slate-700 block mb-1">Notes / Terms (Optional)</label>
              <Input
                placeholder="e.g. Contract rate 2026"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button size="sm" type="button" onClick={handleAddCustomPrice} disabled={!selectedProductId || newPrice === ''}>
              <Check className="w-3.5 h-3.5 mr-1" /> Save Custom Price
            </Button>
          </div>
        </div>
      )}

      {/* Custom Prices Table */}
      {customPrices.length === 0 ? (
        <div className="p-6 text-center border rounded-lg bg-slate-50 text-slate-500 space-y-1">
          <p className="text-sm font-medium text-slate-700">No custom item prices assigned.</p>
          <p className="text-xs text-slate-500">
            This customer will receive standard pricing according to their assigned account price level ({customerPriceLevel}).
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 border-b text-slate-600 uppercase font-medium text-[11px]">
                <tr>
                  <th className="px-4 py-2.5 text-left">Part No.</th>
                  <th className="px-4 py-2.5 text-left">Description</th>
                  <th className="px-4 py-2.5 text-right">Default Catalog</th>
                  <th className="px-4 py-2.5 text-right w-36">Customer Price</th>
                  <th className="px-4 py-2.5 text-center">Price Status</th>
                  <th className="px-4 py-2.5 text-left">Notes / Reference</th>
                  {!readOnly && <th className="px-3 py-2.5 text-center w-16">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customPrices.map((cp, idx) => {
                  const prod = productsMap[cp.productId] || cp.product;
                  const code = cp.productCode || prod?.productCode || '—';
                  const name = cp.productName || prod?.name || 'Item';
                  const defPrice = cp.defaultPrice != null ? Number(cp.defaultPrice) : getDefaultPrice(prod);
                  const custPrice = Number(cp.customPrice);
                  const diff = Number.isFinite(custPrice) && defPrice ? custPrice - defPrice : 0;
                  const diffPct = defPrice > 0 ? (diff / defPrice) * 100 : 0;

                  return (
                    <tr key={cp.id || `${cp.productId}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2 font-mono font-medium text-slate-800">{code}</td>
                      <td className="px-4 py-2 text-slate-700 font-medium max-w-xs truncate" title={name}>
                        {name}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-500">
                        ${defPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {readOnly ? (
                          <span className="font-mono font-semibold text-emerald-700">
                            ${Number(custPrice || 0).toFixed(2)}
                          </span>
                        ) : (
                          <div className="relative inline-block w-full max-w-[120px]">
                            <span className="absolute left-2.5 top-2 text-slate-400 font-mono text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-full text-right font-mono text-xs font-semibold text-emerald-700 border rounded py-1 px-2 pl-5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              value={cp.customPrice}
                              onChange={e => handleUpdatePrice(idx, e.target.value)}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Tag className="w-2.5 h-2.5" />
                          Customer-Specific
                          {diff !== 0 && (
                            <span className={`ml-1 text-[10px] font-mono ${diff < 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                              ({diff < 0 ? '-' : '+'}${Math.abs(diff).toFixed(2)})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {readOnly ? (
                          <span className="text-slate-500 text-xs italic">{cp.notes || '—'}</span>
                        ) : (
                          <input
                            type="text"
                            placeholder="Optional notes"
                            className="w-full text-xs text-slate-600 border rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            value={cp.notes || ''}
                            onChange={e => handleUpdateNotes(idx, e.target.value)}
                          />
                        )}
                      </td>
                      {!readOnly && (
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemove(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove custom price"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
