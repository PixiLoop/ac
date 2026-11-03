'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Trash2, Edit2, Check, X, AlertCircle, DollarSign, Users } from 'lucide-react';
import { api } from '../../lib/api-client';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CustomerSearchSelect } from '../common/CustomerSearchSelect';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './shared-ui';

interface Props {
  productId: string;
  retailPrice?: number | string;
  tradePrice?: number | string;
  partnerPrice?: number | string;
  agentPrice?: number | string;
}

interface CustomPriceItem {
  id: string;
  customerId: string;
  productId: string;
  customPrice: number;
  notes?: string;
  createdAt?: string;
  customer?: {
    id: string;
    customerNumber?: string;
    name: string;
    registeredName?: string;
    priceLevel?: string;
    salesFactor?: number;
  };
}

export function ProductCustomerPricingSection({
  productId,
  retailPrice = 0,
  tradePrice = 0,
  partnerPrice = 0,
  agentPrice = 0,
}: Props) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<CustomPriceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await api.get(`/inventory/items/${productId}/custom-prices`);
      const data = res.data?.data ?? res.data ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      showToast({ type: 'error', title: 'Failed to load customer prices' });
    } finally {
      setLoading(false);
    }
  }, [productId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const getDefaultPriceForCustomer = (customer?: any) => {
    const level = customer?.priceLevel || 'RETAIL';
    let base = Number(retailPrice) || 0;
    if (level === 'TRADE') base = Number(tradePrice) || 0;
    else if (level === 'SALES_PARTNER') base = Number(partnerPrice) || 0;
    else if (level === 'AGENT') base = Number(agentPrice) || 0;

    const factor = Number(customer?.salesFactor);
    const mult = Number.isFinite(factor) && factor !== 0 ? factor / 1000 : 1;
    return Number((base * mult).toFixed(2));
  };

  const handleAdd = async () => {
    if (!selectedCustomer?.id) {
      showToast({ type: 'error', title: 'Customer required', message: 'Please select a customer.' });
      return;
    }
    const val = Number(newPrice);
    if (!Number.isFinite(val) || val < 0) {
      showToast({ type: 'error', title: 'Invalid price', message: 'Price must be a valid positive number.' });
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/inventory/items/${productId}/custom-prices`, {
        customerId: selectedCustomer.id,
        customPrice: val,
        notes: newNotes.trim() || undefined,
      });
      showToast({ type: 'success', title: 'Customer price added' });
      setSelectedCustomer(null);
      setNewPrice('');
      setNewNotes('');
      setShowAdd(false);
      load();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err?.response?.data?.message || 'Could not save customer price',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, customerId: string) => {
    const val = Number(editPrice);
    if (!Number.isFinite(val) || val < 0) {
      showToast({ type: 'error', title: 'Invalid price', message: 'Price must be a valid positive number.' });
      return;
    }

    try {
      await api.post(`/inventory/items/${productId}/custom-prices`, {
        customerId,
        customPrice: val,
        notes: editNotes.trim() || undefined,
      });
      showToast({ type: 'success', title: 'Price updated' });
      setEditingId(null);
      load();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: err?.response?.data?.message || 'Could not update customer price',
      });
    }
  };

  const handleDelete = async (priceId: string) => {
    if (!confirm('Remove customer-specific price for this customer?')) return;
    try {
      await api.delete(`/inventory/items/${productId}/custom-prices/${priceId}`);
      showToast({ type: 'success', title: 'Price removed' });
      setRows(prev => prev.filter(r => r.id !== priceId));
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        message: err?.response?.data?.message || 'Could not delete price',
      });
    }
  };

  return (
    <Card className="rounded-xl border border-emerald-200 bg-white">
      <CardHeader className="bg-emerald-50/50 pb-3 border-b border-emerald-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                Customer-Specific Pricing
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  {rows.length} {rows.length === 1 ? 'Customer' : 'Customers'}
                </span>
              </CardTitle>
              <p className="text-xs text-slate-500">
                Override default inventory prices for specific customer accounts during sales orders, quotes, and invoices.
              </p>
            </div>
          </div>
          {!showAdd && (
            <Button
              size="sm"
              onClick={() => {
                setShowAdd(true);
                setNewPrice(Number(retailPrice) > 0 ? String(retailPrice) : '');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Customer Price
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* ADD FORM */}
        {showAdd && (
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                Assign Custom Price to Customer
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAdd(false);
                  setSelectedCustomer(null);
                }}
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <CustomerSearchSelect
                  label="Select Customer"
                  value={selectedCustomer}
                  onSelect={c => {
                    setSelectedCustomer(c);
                    const def = getDefaultPriceForCustomer(c);
                    if (def > 0) setNewPrice(String(def));
                  }}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Custom Price ($ AUD) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-slate-400 text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7 text-sm font-semibold text-slate-900"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes / Agreement
                </label>
                <Input
                  placeholder="e.g. Contract Q2"
                  className="text-sm"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                />
              </div>
            </div>

            {selectedCustomer && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded border border-emerald-200 flex items-center justify-between">
                <div>
                  Customer Level: <strong className="text-slate-800">{selectedCustomer.priceLevel || 'RETAIL'}</strong>
                  {selectedCustomer.salesFactor ? ` (Factor: ${selectedCustomer.salesFactor})` : ''}
                  {' · '}
                  Default Item Price:{' '}
                  <strong className="text-slate-800">${getDefaultPriceForCustomer(selectedCustomer).toFixed(2)}</strong>
                </div>
                {Number(newPrice) > 0 && (
                  <div>
                    {Number(newPrice) < getDefaultPriceForCustomer(selectedCustomer) ? (
                      <span className="text-emerald-700 font-medium">
                        Discount of ${(getDefaultPriceForCustomer(selectedCustomer) - Number(newPrice)).toFixed(2)} vs default
                      </span>
                    ) : Number(newPrice) > getDefaultPriceForCustomer(selectedCustomer) ? (
                      <span className="text-amber-700 font-medium">
                        +${(Number(newPrice) - getDefaultPriceForCustomer(selectedCustomer)).toFixed(2)} vs default
                      </span>
                    ) : (
                      <span className="text-slate-500">Same as default</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAdd(false);
                  setSelectedCustomer(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={submitting || !selectedCustomer || !newPrice}
                onClick={handleAdd}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? 'Saving…' : 'Save Custom Price'}
              </Button>
            </div>
          </div>
        )}

        {/* TABLE OF EXISTING CUSTOM PRICES */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading custom pricing…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
            <Tag className="mx-auto h-8 w-8 text-slate-300 mb-1" />
            <p className="text-sm font-medium text-slate-600">No customer-specific prices configured</p>
            <p className="text-xs text-slate-400 mt-0.5">
              All customers currently purchase this item at their default tier price.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-slate-700 text-xs">
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Tier Level</TableHead>
                  <TableHead className="text-right font-semibold">Default Price</TableHead>
                  <TableHead className="text-right font-semibold text-emerald-800">Custom Price</TableHead>
                  <TableHead className="text-right font-semibold">Difference</TableHead>
                  <TableHead className="font-semibold">Agreement / Notes</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => {
                  const isEditing = editingId === row.id;
                  const defPrice = getDefaultPriceForCustomer(row.customer);
                  const custPrice = Number(row.customPrice);
                  const diff = custPrice - defPrice;

                  return (
                    <TableRow key={row.id} className="text-sm hover:bg-slate-50/80">
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {row.customer?.name || 'Customer'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.customer?.customerNumber || row.customerId}
                          {row.customer?.registeredName ? ` · ${row.customer.registeredName}` : ''}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {row.customer?.priceLevel || 'RETAIL'}
                        </span>
                      </TableCell>

                      <TableCell className="text-right font-mono text-slate-500">
                        ${defPrice.toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 w-28 text-right font-mono text-sm ml-auto"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                          />
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-bold font-mono border border-emerald-200">
                            <Tag className="h-3 w-3 text-emerald-600" />
                            ${custPrice.toFixed(2)}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs">
                        {diff < -0.001 ? (
                          <span className="text-emerald-600 font-medium">
                            -${Math.abs(diff).toFixed(2)}
                          </span>
                        ) : diff > 0.001 ? (
                          <span className="text-amber-600 font-medium">
                            +${diff.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-slate-600 max-w-xs">
                        {isEditing ? (
                          <Input
                            className="h-8 text-xs"
                            placeholder="Notes"
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                          />
                        ) : (
                          row.notes || <span className="text-slate-300 italic">None</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleUpdate(row.id, row.customerId)}
                                title="Save changes"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-100"
                                onClick={() => setEditingId(null)}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                onClick={() => {
                                  setEditingId(row.id);
                                  setEditPrice(String(row.customPrice));
                                  setEditNotes(row.notes || '');
                                }}
                                title="Edit custom price"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => handleDelete(row.id)}
                                title="Remove custom price"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
