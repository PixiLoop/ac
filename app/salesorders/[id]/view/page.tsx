'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { AdminShell } from '../../../../components/layout/AdminShell';
import { Button } from '../../../../components/ui/button';

import { SalesOrderDetailsSection } from '../../../../components/salesorders/sections/SalesOrderDetailsSection';
import { SalesOrderItemsSection } from '../../../../components/salesorders/sections/SalesOrderItemsSection';
import { ShippingDetailsSection } from '../../../../components/salesorders/sections/ShippingDetailsSection';
import { AccountDetailsSection } from '../../../../components/salesorders/sections/AccountDetailsSection';
import { SalesOrderCharges } from '../../../../components/salesorders/SalesOrderCharges';
import { InvoiceListSection } from '../../../../components/invoices/InvoiceListSection';
import { api } from '../../../../lib/api-client';

export default function ViewSalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [orderNo, setOrderNo] = useState('');
  const [fromQuotation, setFromQuotation] = useState<{ id: string; quoteNumber: string } | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  //HEADER
  const [form, setForm] = useState<any>({
    customerId: '',
    orderType: '',
    priceLevel: '',
    actionDate: '',
    paymentTerms: '',
    salesFactor: 0,
    status: '',
    freight: 0,
    customerPO: '',
    internalNotes: '',
    externalNotes: '',
    customerName: "",
    customerNumber: ""
  });

  //SHIPPING
  const [shipping, setShipping] = useState<any>({
    shippingName: '',
    address1: '',
    address2: '',
    address3: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
    sameAsCustomer: false,
  });

  const [account, setAccount] = useState({
    shippingName: '',
    address1: '',
    address2: '',
    address3: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
  });

  const [items, setItems] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/salesorders/${id}`);
        const data = res.data?.data ?? res.data;

        setForm({
          customerId: data.customerId,
          orderType: data.orderType,
          priceLevel: data.priceLevel,
          actionDate: data.actionDate
            ? data.actionDate.slice(0, 10)
            : '',
          paymentTerms: data.paymentTerms,
          salesFactor: Number(data.salesFactor ?? 0),
          status: data.status,
          freight: Number(data.freight ?? 0),
          customerPO: data.customerPO ?? '',
          internalNotes: data.internalNotes ?? '',
          externalNotes: data.externalNotes ?? '',

          shippingName: data.shippingName ?? '',
          shippingAddress1: data.shippingAddress1 ?? '',
          shippingAddress2: data.shippingAddress2 ?? '',
          shippingAddress3: data.shippingAddress3 ?? '',
          shippingCity: data.shippingCity ?? '',
          shippingState: data.shippingState ?? '',
          shippingPostcode: data.shippingPostcode ?? '',
          shippingCountry: data.shippingCountry ?? '',
          sameAsCustomer: Boolean(data.sameAsCustomer),

          billingName: data.billingName ?? '',
          billingAddress1: data.billingAddress1 ?? '',
          billingAddress2: data.billingAddress2 ?? '',
          billingAddress3: data.billingAddress3 ?? '',
          billingCity: data.billingCity ?? '',
          billingState: data.billingState ?? '',
          billingPostcode: data.billingPostcode ?? '',
          billingCountry: data.billingCountry ?? '',
          customerName: data.customer.name,
          customerNumber: data.customer.customerNumber
        });

        setOrderNo(data.orderNumber ?? '');
        setFromQuotation(data.fromQuotation ? { id: data.fromQuotation.id, quoteNumber: data.fromQuotation.quoteNumber } : null);

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
          shippingName: data.billingName ?? '',
          address1: data.billingAddress1 ?? '',
          address2: data.billingAddress2 ?? '',
          address3: data.billingAddress3 ?? '',
          city: data.billingCity ?? '',
          state: data.billingState ?? '',
          postcode: data.billingPostcode ?? '',
          country: data.billingCountry ?? '',
        });

        setItems(
          data.items.map((i: any) => ({
            id: i.id,
            itemId: i.productId,
            partNo: i.partNumber,
            description: i.description,
            qty: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            discountPct: Number(i.discountPct) || 0,
            availableQty: Number(i.product?.onHand ?? null),
            backOrderQty: Number(i.backOrderQty ?? 0),
          })),
        );

        const invRes = await api.get('/invoices', { params: { salesOrderId: id, take: 100 } });
        const invPayload = invRes.data?.data ?? invRes.data;
        setInvoices(invPayload.items ?? []);

        setLoading(false);

      } catch (err) {
        console.error(err);
        router.push('/salesorders');
      }
    }

    load();
  }, [id, router]);

  const noop = () => { };

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

  const handleCreateInvoice = async () => {
    setCreatingInvoice(true);
    try {
      router.push(`/invoices/new?salesOrderId=${id}`);
    } finally {
      setCreatingInvoice(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Sales Order">
        <div className="p-6 text-sm text-slate-500">Loading…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={`Sales Order: ${orderNo}`}>
      {/* ACTION BAR */}
      <div className="flex justify-end mb-4 gap-2">
        {fromQuotation && (
          <button
            type="button"
            onClick={() => router.push(`/quotations/${fromQuotation.id}`)}
            className="text-sm text-blue-600 hover:underline border rounded-lg px-4 py-2 bg-muted/40"
          >
            ← Quote {fromQuotation.quoteNumber}
          </button>
        )}
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
        <Button onClick={() => router.push(`/salesorders/${id}`)}>
          Edit
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push('/admin/salesorders')}>
          Back
        </Button>
      </div>

      <form className="space-y-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* SALES ORDER DETAILS */}
          <div className="lg:col-span-5">
            <SalesOrderDetailsSection
              value={form}
              readOnly
              defaultOpen
            />

          </div>
          <div className="lg:col-span-4">
            {/* SHIPPING */}
            <ShippingDetailsSection
              value={shipping}
              update={noop}
              readOnly
              defaultOpen
            /></div>
          <div className="lg:col-span-3">

            <AccountDetailsSection
              value={account}
              update={noop}
              readOnly
              defaultOpen
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* ITEMS – 75% */}
          <div className="col-span-12 lg:col-span-9">
            <SalesOrderItemsSection
              items={items}
              freight={form.freight}
              disabled
              defaultOpen
            />
          </div>

          {/* CHARGES – 25% */}
          <div className="col-span-12 lg:col-span-3">
            <SalesOrderCharges
              items={items}
              freight={form.freight}
              sundries={0}
              labour={0}
              rounding={0}
              update={noop}
              readOnly
            />
          </div>
        </div>
      </form>
      {/* ── INVOICES SECTION ── */}
      <InvoiceListSection invoices={invoices} mode="view" />
    </AdminShell>
  );
}
