'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';

import { SalesOrderDetailsSection } from '../../../components/salesorders/sections/SalesOrderDetailsSection';
import { SalesOrderItemsSection } from '../../../components/salesorders/sections/SalesOrderItemsSection';
import { ShippingDetailsSection } from '../../../components/salesorders/sections/ShippingDetailsSection';
import { AccountDetailsSection } from '../../../components/salesorders/sections/AccountDetailsSection';
import { SalesOrderCharges } from '../../../components/salesorders/SalesOrderCharges';
import { InvoiceListSection } from '../../../components/invoices/InvoiceListSection';
import { PickingSlipListSection } from '../../../components/salesorders/PickingSlipListSection';
import { useComments } from '../../../providers/CommentProvider'
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function EditSalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { setContext } = useComments();

  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const [orderMeta, setOrderMeta] = useState<{ id: string; orderNo: string } | null>(null);
  const [fromQuotation, setFromQuotation] = useState<{ id: string; quoteNumber: string } | null>(null);

  // ── Invoices list ──
  /*const [invoices, setInvoices] = useState<any[]>([]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const loadInvoices = async () => {
    try {
      const res = await api.get('/invoices', { params: { salesOrderId: id, take: 100 } });
      const payload = res.data?.data ?? res.data;
      setInvoices(payload.items ?? []);
    } catch { }
  };*/

  // ── Invoices list ──
  const [invoices, setInvoices] = useState<any[]>([]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const loadInvoices = async () => {
    try {
      const res = await api.get('/invoices', { params: { salesOrderId: id, take: 100 } });
      const payload = res.data?.data ?? res.data;
      setInvoices(payload.items ?? []);
    } catch { }
  };

  // ── Picking Slips list ──
  const [pickingSlips, setPickingSlips] = useState<any[]>([]);
  const [creatingPickingSlip, setCreatingPickingSlip] = useState(false);

  const loadPickingSlips = async () => {
    try {
      const res = await api.get(`/picking-slips/by-sales-order/${id}`);
      const payload = res.data?.data ?? res.data;
      setPickingSlips(Array.isArray(payload) ? payload : []);
    } catch { }
  };

  const draftPickingSlip = pickingSlips.find(s => s.status === 'DRAFT') ?? null;

  const handleCreatePickingSlip = async () => {
    // Resuming an existing draft — no confirmation needed, it's non-destructive
    if (draftPickingSlip) {
      router.push(`/picking-slips/${draftPickingSlip.id}`);
      return;
    }

    // Creating a brand-new picking slip — confirm to guard against accidental clicks
    const confirmed = window.confirm('Are you sure you want to create a new Picking Slip?');
    if (!confirmed) return;

    setCreatingPickingSlip(true);
    try {
      const res = await api.post('/picking-slips/from-salesorder', { salesOrderId: id });
      const result = res.data?.data ?? res.data;
      showToast({ type: 'success', title: 'Success', message: `Picking slip ${result.slipNumber} created` });
      router.push(`/picking-slips/${result.id}`);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err?.response?.data?.message || 'Failed to create picking slip' });
    } finally {
      setCreatingPickingSlip(false);
    }
  };

  const handleCreateInvoice = async () => {
    setCreatingInvoice(true);
    try {
      router.push(`/invoices/new?salesOrderId=${id}`);
    } finally {
      setCreatingInvoice(false);
    }
  };



  const [form, setForm] = useState<any>({
    customerId: '',
    orderType: 'STANDARD',
    priceLevel: 'RETAIL',
    actionDate: '',
    paymentTerms: '',
    salesFactor: 1,
    status: 'PENDING',
    freight: 0,
    customerPO: '',
    internalNotes: '',
    externalNotes: '',
    sundries: 0,
    labour: 0,
    rounding: 0,
    otherCharges: 0,
    sameAsCustomer: false,
    dispatchMethod: ''
  });

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [shipping, setShipping] = useState({
    shippingName: '', address1: '', address2: '', address3: '',
    city: '', state: '', postcode: '', country: '', sameAsCustomer: false,
  });
  const updateShipping = (key: string, value: any) => setShipping(prev => ({ ...prev, [key]: value }));

  const [account, setAccount] = useState({
    billingName: '', address1: '', address2: '', address3: '',
    city: '', state: '', postcode: '', country: '',
  });
  const updateAccount = (key: string, value: any) => setAccount(prev => ({ ...prev, [key]: value }));

  const [items, setItems] = useState<any[]>([]);
  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));


  const isFullyInvoiced = useMemo(() => {
    if (!invoices.length || !items.length) return false;

    // SO items total qty per product
    const soQtyMap = new Map<string, number>();
    items.forEach(i => {
      if (i.itemId) soQtyMap.set(i.itemId, (soQtyMap.get(i.itemId) ?? 0) + i.qty);
    });

    if (soQtyMap.size === 0) return false;

    // Invoiced qty (non-cancelled)
    const invoicedQtyMap = new Map<string, number>();
    invoices
      .filter(inv => inv.status !== 'CANCELLED')
      .forEach(inv => {
        (inv.items ?? []).forEach((item: any) => {
          invoicedQtyMap.set(item.productId, (invoicedQtyMap.get(item.productId) ?? 0) + item.quantity);
        });
      });

    // All SO items fully covered?
    for (const [productId, soQty] of Array.from(soQtyMap.entries())) {
      if ((invoicedQtyMap.get(productId) ?? 0) < soQty) return false;
    }

    return true;
  }, [invoices, items]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function load() {
      const res = await api.get(`/salesorders/${id}`);
      const data = res.data?.data ?? res.data;

      setOrderMeta({ id: data.id, orderNo: data.orderNumber });
      setFromQuotation(data.fromQuotation ? { id: data.fromQuotation.id, quoteNumber: data.fromQuotation.quoteNumber } : null);

      setForm({
        customerId: data.customerId,
        orderType: data.orderType,
        priceLevel: data.priceLevel,
        actionDate: data.actionDate ? data.actionDate.slice(0, 10) : '',
        paymentTerms: data.paymentTerms,
        salesFactor: data.salesFactor,
        status: data.status,
        freight: Number(data.freight ?? 0),
        sundries: Number(data.sundries ?? 0),
        labour: Number(data.labour ?? 0),
        rounding: Number(data.rounding ?? 0),
        otherCharges: Number(data.otherCharges ?? 0),
        customerPO: data.customerPO ?? '',
        internalNotes: data.internalNotes ?? '',
        externalNotes: data.externalNotes ?? '',
        sameAsCustomer: Boolean(data.sameAsCustomer),
        dispatchMethod: data.dispatchMethod ?? '',
      });

      setShipping({
        shippingName: data.shippingName ?? '',
        address1: data.shippingAddress1 ?? '',
        address2: data.shippingAddress2 ?? '',
        address3: data.shippingAddress3 ?? '',
        city: data.shippingCity ?? '',
        state: data.shippingState ?? '',
        postcode: data.shippingPostcode ?? '',
        country: data.shippingCountry ?? '',
        sameAsCustomer: Boolean(data.sameAsCustomer),
      });

      setAccount({
        billingName: data.billingName ?? '',
        address1: data.billingAddress1 ?? '',
        address2: data.billingAddress2 ?? '',
        address3: data.billingAddress3 ?? '',
        city: data.billingCity ?? '',
        state: data.billingState ?? '',
        postcode: data.billingPostcode ?? '',
        country: data.billingCountry ?? '',
      });

      if (data.customerId) {
        try {
          const custRes = await api.get(`/customers/${data.customerId}`);
          setSelectedCustomer(custRes.data?.data ?? custRes.data);
        } catch { }
      }

      setItems(data.items.map((i: any) => ({
        id: i.id,
        itemId: i.productId,
        description: i.description,
        qty: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discountPct: Number(i.discountPct) || 0,
        availableQty: Number(i.product?.onHand ?? null),
        backOrderQty: Number(i.backOrderQty ?? 0),
        landedCost: Number(i.landedCost ?? 0),
        retailPrice: Number(i.retailPrice ?? 0),
        tradePrice: Number(i.tradePrice ?? 0),
        salesPartnerPrice: Number(i.salesPartnerPrice ?? 0),
        agentPrice: Number(i.agentPrice ?? 0)
      })));

      setLoading(false);
    }

    load();
    loadInvoices();
    loadPickingSlips();

  }, [id]);

  useEffect(() => {
    if (!orderMeta) return;
    setContext({ entityType: 'salesOrder', entityId: orderMeta.id, title: `Sales Order #${orderMeta.orderNo}` });
  }, [orderMeta, setContext]);

  const validateAddresses = () => {
    if (!form.customerId) return 'Customer is required';
    if (!form.orderType) return 'Order Type is required';
    if (!form.status) return 'Status is required';
    if (!form.actionDate) return form.orderType === 'FORWARD' ? 'Action Date is required for a Forward order' : 'Action Date is required';
    if (!form.priceLevel) return 'Price Level is required';
    if (!form.paymentTerms) return 'Payment Terms is required';
    if (form.salesFactor === '' || form.salesFactor === null) return 'Sales Factor is required';
    if (form.freight === '' || form.freight === null) return 'Freight is required';
    if (!shipping.shippingName.trim()) return 'Shipping Name is required';
    if (!shipping.address1.trim()) return 'Shipping Address 1 is required';
    if (!shipping.city.trim()) return 'Shipping City is required';
    if (!shipping.state.trim()) return 'Shipping State is required';
    // if (!account.billingName.trim()) return 'Account Name is required';
    // if (!account.address1.trim()) return 'Account Address 1 is required';
    // if (!account.city.trim()) return 'Account City is required';
    // if (!account.state.trim()) return 'Account State is required';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateAddresses();
    if (error) { showToast({ type: 'error', title: 'Validation Error', message: error }); return; }

    const selectedItems = items.filter(i => i.itemId);
    if (!selectedItems.length) { showToast({ type: 'error', title: 'Validation Error', message: 'At least one item must be selected.' }); return; }
    //if (selectedItems.some(i => !i.qty || i.qty == 0)) { showToast({ type: 'error', title: 'Validation Error', message: 'Quantity must be not equal 0.' }); return; }

    try {
      await api.patch(`/salesorders/${id}`, {
        ...form,
        shippingName: shipping.shippingName,
        shippingAddress1: shipping.address1,
        shippingAddress2: shipping.address2,
        shippingAddress3: shipping.address3,
        shippingCity: shipping.city,
        shippingState: shipping.state,
        shippingPostcode: shipping.postcode,
        shippingCountry: shipping.country,
        sameAsCustomer: shipping.sameAsCustomer,
        billingName: account.billingName,
        billingAddress1: account.address1,
        billingAddress2: account.address2,
        billingAddress3: account.address3,
        billingCity: account.city,
        billingState: account.state,
        billingPostcode: account.postcode,
        billingCountry: account.country,
        actionDate: form.actionDate ? new Date(form.actionDate) : null,
      });

      const cleanItems = items.filter(i => i.itemId && i.qty != null).map(i => ({
        id: i.id, productId: i.itemId, description: i.description,
        //quantity: Math.max(1, Number(i.qty) || 1),
        quantity: Number.isFinite(Number(i.qty)) ? Number(i.qty) : 1,
        unitPrice: Number(i.unitPrice) || 0,
        discountPct: Number(i.discountPct) || 0,
        landedCost: Number(i.landedCost) || 0,
        retailPrice: Number(i.retailPrice ?? 0),
        tradePrice: Number(i.tradePrice ?? 0),
        salesPartnerPrice: Number(i.salesPartnerPrice ?? 0),
        agentPrice: Number(i.agentPrice ?? 0)
      }));

      if (cleanItems.length) {
        await api.patch(`/salesorders/${id}/items`, { items: cleanItems });
      }

      showToast({ type: 'success', title: 'Success', message: 'Sales order updated successfully' });
      router.push('/salesorders');
    } catch (err: any) {
      showToast({ type: 'error', title: 'Update failed', message: err?.response?.data?.message || 'Unexpected error' });
    }
  };

  if (loading) {
    return <AdminShell title="Edit Sales Order"><div className="p-6 text-sm text-slate-500">Loading…</div></AdminShell>;
  }

  return (
    <AdminShell title={`Edit Sales Order: ${orderMeta?.orderNo ?? ''}`}>
      <div className="flex justify-end gap-2 mb-1">
        {/* Quote link — shown only if this SO was created from a Quote */}
        {fromQuotation && (
          <button
            type="button"
            onClick={() => router.push(`/quotations/${fromQuotation.id}`)}
            className="text-sm text-blue-600 hover:underline border rounded-lg px-4 py-2 bg-muted/40"
          >
            ← Quote {fromQuotation.quoteNumber}
          </button>
        )}
        {/* Invoice button or Invoiced label */}
        {isFullyInvoiced ? (
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 border border-green-200">
            ✓ Fully Invoiced
          </span>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={creatingInvoice}
            onClick={handleCreateInvoice}
          >
            + Create Invoice
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={creatingPickingSlip}
          onClick={handleCreatePickingSlip}
        >
          {creatingPickingSlip
            ? 'Creating…'
            : draftPickingSlip
              ? `Continue Picking Slip (${draftPickingSlip.slipNumber})`
              : '+ Create Picking Slip'}
        </Button>
        <Button variant="outline" type="button" onClick={() => router.push('/salesorders')}>Cancel</Button>
        <Button type="submit" form="sales-order-form">Save</Button>
      </div>

      <form id="sales-order-form" className="space-y-0" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            <SalesOrderDetailsSection
              value={form}
              update={(key, val) => {
                update(key, val);
                if (key === 'customerId' && val) {
                  setSelectedCustomer(null);
                  api.get(`/customers/${val}`).then(res => {
                    const data = res.data?.data ?? res.data;
                    setSelectedCustomer(data);
                    if (data.priceLevel) update('priceLevel', data.priceLevel);
                    if (data.paymentTerms) update('paymentTerms', data.paymentTerms);
                    if (data.salesFactor != null) update('salesFactor', data.salesFactor);
                    const addresses = data.addresses || [];
                    const shippingAddr = addresses.find((a: any) => a.type === 'SHIPPING' && a.isDefault) || addresses.find((a: any) => a.type === 'SHIPPING');
                    if (shippingAddr) {
                      setShipping(prev => ({ ...prev, shippingName: data.name ?? '', address1: shippingAddr.address1 ?? '', address2: shippingAddr.address2 ?? '', city: shippingAddr.city ?? '', state: shippingAddr.state ?? '', postcode: shippingAddr.postcode ?? '', country: shippingAddr.country ?? '' }));
                    }
                    const statementAddr = addresses.find((a: any) => a.type === 'CHARGE' && a.isDefault) || addresses.find((a: any) => a.type === 'CHARGE');

                    if (statementAddr) {
                      setAccount({ billingName: data.name ?? '', address1: statementAddr.address1 ?? '', address2: statementAddr.address2 ?? '', address3: statementAddr.address3 ?? '', city: statementAddr.city ?? '', state: statementAddr.state ?? '', postcode: statementAddr.postcode ?? '', country: statementAddr.country ?? '' });
                    } else {
                      setAccount({
                        address1: '',
                        address2: '',
                        address3: '',
                        billingName: '',
                        city: '',
                        country: '',
                        postcode: '',
                        state: ''
                      });
                    }
                  }).catch(() => { });
                }
              }}
              defaultOpen
              selectedCustomer={selectedCustomer}
            />
          </div>

          <div className="lg:col-span-4">
            <ShippingDetailsSection value={shipping} update={updateShipping} defaultOpen />
          </div>

          <div className="lg:col-span-3">
            <AccountDetailsSection
              value={account}
              update={(key, val) => {
                const map: Record<string, string> = { shippingName: 'billingName', billingName: 'billingName', address1: 'address1', address2: 'address2', city: 'city', state: 'state', postcode: 'postcode' };
                updateAccount(map[key] ?? key, val);
              }}
              defaultOpen
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-10">
            <SalesOrderItemsSection form={form} items={items} setItems={setItems} freight={form.freight} defaultOpen />
            <div className="border rounded p-4 mt-4">
              <h3 className="font-semibold mb-2">Additional Notes</h3>
              <textarea
                value={form.externalNotes}
                onChange={e => update('externalNotes', e.target.value)}
                rows={4}
                className="w-full border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-2">
            <SalesOrderCharges items={items} freight={form.freight} sundries={form.sundries} labour={form.labour} rounding={form.rounding} otherCharges={form.otherCharges} update={update} />
          </div>
        </div>
      </form>

      {/* ── INVOICES SECTION ── */}
      <InvoiceListSection invoices={invoices} mode="edit" />

      {/* ── PICKING SLIPS SECTION ── */}
      <PickingSlipListSection pickingSlips={pickingSlips} mode="edit" />

    </AdminShell>
  );
}
