'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { SalesOrderDetailsSection } from '../../../components/salesorders/sections/SalesOrderDetailsSection';
import { SalesOrderItemsSection } from '../../../components/salesorders/sections/SalesOrderItemsSection';
import { ShippingDetailsSection } from '../../../components/salesorders/sections/ShippingDetailsSection';
import { AccountDetailsSection } from '../../../components/salesorders/sections/AccountDetailsSection';
import { SalesOrderCharges } from '../../../components/salesorders/SalesOrderCharges';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client'

export default function NewSalesOrderPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<any>({
    customerId: '',
    orderType: 'STANDARD',
    priceLevel: 'RETAIL',
    actionDate: new Date().toISOString().split('T')[0],
    terms: 'DAYS_30',
    salesFactor: 1,
    status: 'PENDING',
    freight: 0,
    customerPO: '',
    internalNotes: '',
    externalNotes: '',
    dispatchMethod: '',

    //CHARGES
    sundries: 0,
    labour: 0,
    rounding: 0,
    otherCharges: 0,
  });


  const searchParams = useSearchParams();
  const fromQuotationId = searchParams.get('quotationId');
  const [fromQuotation, setFromQuotation] = useState(false);

  useEffect(() => {
    if (!fromQuotationId) return;

    api.get(`/quotations/${fromQuotationId}`).then(res => {
      const q = res.data?.data ?? res.data;

      setFromQuotation(true); // block customer useEffect

      //Form fields
      setForm(prev => ({
        ...prev,
        customerId: q.customerId,
        priceLevel: q.priceLevel ?? 'RETAIL',
        paymentTerms: q.paymentTerms ?? 'DAYS_30',
        salesFactor: q.salesFactor ?? 1,
        quotationId: q.id,
      }));

      api.get(`/customers/${q.customerId}`).then(custRes => {
        const customer = custRes.data?.data ?? custRes.data;
        setSelectedCustomer(customer);
      });

      //Shipping
      setShipping({
        shippingName: q.shippingName ?? '',
        address1: q.shippingAddress1 ?? '',
        address2: q.shippingAddress2 ?? '',
        address3: '',
        city: q.shippingCity ?? '',
        state: q.shippingState ?? '',
        postcode: q.shippingPostcode ?? '',
        country: '',
        sameAsCustomer: false,
      });

      //Account/Billing
      setAccount({
        billingName: q.billingName ?? '',
        address1: q.billingAddress1 ?? '',
        address2: q.billingAddress2 ?? '',
        address3: '',
        city: q.billingCity ?? '',
        state: q.billingState ?? '',
        postcode: q.billingPostcode ?? '',
        country: '',
      });

      //Items — all groups flatten
      const allItems = (q.groups ?? []).flatMap((g: any) =>
        (g.items ?? []).map((i: any) => ({
          itemId: i.productId,
          partNo: '',
          description: i.description,
          qty: i.quantity,
          unitPrice: Number(i.unitPrice),
          discountPct: Number(i.discountPct ?? 0),
          availableQty: null,
        }))
      );

      if (allItems.length) {
        setItems([
          ...allItems,
          // empty row at end
          { itemId: '', partNo: '', description: '', qty: 1, unitPrice: 0, discountPct: 0, availableQty: null },
        ]);
      }
    });
  }, [fromQuotationId]);

  const update = (key: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [shipping, setShipping] = useState({
    shippingName: '',
    address1: '',
    address2: '',
    address3: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
    sameAsCustomer: true,
  });

  const updateShipping = (key: string, value: any) => {
    setShipping(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  /* ================= ACCOUNT (POSTAL) ================= */

  const [account, setAccount] = useState({
    billingName: '',
    address1: '',
    address2: '',
    address3: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
  });

  const updateAccount = (key: string, value: any) => {
    setAccount(prev => ({
      ...prev,
      [key]: value,
    }));
  };


  //Auto-fill shipping from customer
  useEffect(() => {
    if (fromQuotation) return;
    if (!form.customerId) {
      setSelectedCustomer(null);
      // clear everything if no customer selected
      setShipping({
        shippingName: '',
        address1: '',
        address2: '',
        address3: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
        sameAsCustomer: true,
      });

      setAccount({
        billingName: '',
        address1: '',
        address2: '',
        address3: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
      });

      return;
    }

    async function loadCustomerAddresses() {
      try {
        const res = await api.get(`/customers/${form.customerId}`);
        const data = res.data?.data ?? res.data;

        setSelectedCustomer(data);

        //Populate price/payment fields from customer master
        if (data.priceLevel) update('priceLevel', data.priceLevel);
        if (data.paymentTerms) update('paymentTerms', data.paymentTerms);
        if (data.salesFactor != null) update('salesFactor', data.salesFactor);

        const addresses = data.addresses || [];

        const shippingAddress =
          addresses.find((a: any) => a.type === 'SHIPPING' && a.isDefault) ||
          addresses.find((a: any) => a.type === 'SHIPPING');

        if (shippingAddress) {
          setShipping(prev => ({
            ...prev,
            shippingName: shippingAddress.name ?? data.name ?? '',
            address1: shippingAddress.address1 ?? '',
            address2: shippingAddress.address2 ?? '',
            address3: shippingAddress.address3 ?? '',
            city: shippingAddress.city ?? '',
            state: shippingAddress.state ?? '',
            postcode: shippingAddress.postcode ?? '',
            country: shippingAddress.country ?? '',
          }));
        } else {
          setShipping(prev => ({
            ...prev,
            shippingName: '',
            address1: '',
            address2: '',
            address3: '',
            city: '',
            state: '',
            postcode: '',
            country: '',
          }));
        }

        const postalAddress =
          addresses.find((a: any) => a.type === 'CHARGE' && a.isDefault) ||
          addresses.find((a: any) => a.type === 'CHARGE');

        if (postalAddress) {
          setAccount({
            billingName: postalAddress.name ?? data.name ?? '',
            address1: postalAddress.address1 ?? '',
            address2: postalAddress.address2 ?? '',
            address3: postalAddress.address3 ?? '',
            city: postalAddress.city ?? '',
            state: postalAddress.state ?? '',
            postcode: postalAddress.postcode ?? '',
            country: postalAddress.country ?? '',
          });
        } else {
          setAccount({
            billingName: '',
            address1: '',
            address2: '',
            address3: '',
            city: '',
            state: '',
            postcode: '',
            country: '',
          });
        }

      } catch (err) {
        console.error('Failed to load customer addresses', err);
      }
    }

    loadCustomerAddresses();
  }, [form.customerId]);


  //DEFAULT ROW MUST EXIST
  const [items, setItems] = useState<any[]>([
    {
      itemId: '',
      partNo: '',
      description: '',
      qty: 1,
      unitPrice: 0,
      discountPct: 0,
      availableQty: null,
    },
  ]);

  const validateAddresses = () => {
    if (!form.customerId)
      return 'Customer is required';

    if (!form.orderType)
      return 'Order Type is required';

    if (!form.status)
      return 'Status is required';

    if (!form.actionDate)
      return form.orderType === 'FORWARD'
        ? 'Action Date is required for a Forward order'
        : 'Action Date is required';

    if (!form.priceLevel)
      return 'Price Level is required';

    if (!form.terms)
      return 'Payment Terms is required';

    if (form.salesFactor === '' || form.salesFactor === null)
      return 'Sales Factor is required';

    if (form.freight === '' || form.freight === null)
      return 'Freight is required';

    if (!shipping.shippingName.trim())
      return 'Shipping Name is required';

    if (!shipping.address1.trim())
      return 'Shipping Address 1 is required';

    if (!shipping.city.trim())
      return 'Shipping City is required';

    if (!shipping.state.trim())
      return 'Shipping State is required';

    // if (!account.billingName.trim())
    //   return 'Account Name is required';

    // if (!account.address1.trim())
    //   return 'Account Address 1 is required';

    // if (!account.city.trim())
    //   return 'Account City is required';

    // if (!account.state.trim())
    //   return 'Account State is required';

    return null;
  };


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateAddresses();
    if (error) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: error,
      });
      return;
    }

    const selectedItems = items.filter(i => i.itemId);
    if (selectedItems.length === 0) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'At least one item must be selected.',
      });
      return;
    }

    /*if (selectedItems.some(i => !i.qty || i.qty == 0)) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Quantity must be not equal 0.',
      });
      return;
    }*/

    try {
      // 1️⃣ CREATE SALES ORDER
      const res = await api.post('/salesorders', {
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

        actionDate: form.actionDate
          ? new Date(form.actionDate)
          : null,
        externalNotes: form.externalNotes || null,
      });

      const salesOrderId = res.data?.data?.id ?? res.data.id;

      // 2️⃣ PREPARE ITEMS
      const cleanItems = items
        .filter(i => i.itemId && i.qty)
        .map(i => ({
          productId: i.itemId,
          description: i.description,
          quantity: Math.max(1, Number(i.qty)),
          unitPrice: Number(i.unitPrice) || 0,
          discountPct: Number(i.discountPct) || 0,
          landedCost: Number(i.landedCost ?? 0),
          retailPrice: Number(i.retailPrice ?? 0),
          tradePrice: Number(i.tradePrice ?? 0),
          salesPartnerPrice: Number(i.salesPartnerPrice ?? 0),
          agentPrice: Number(i.agentPrice ?? 0)
        }));

      // 3️⃣ PATCH ITEMS
      if (cleanItems.length) {
        await api.patch(`/salesorders/${salesOrderId}/items`, {
          items: cleanItems,
        });
      }

      router.push('/salesorders');

    } catch (err: any) {
      console.error(err);

      showToast({
        type: 'error',
        title: 'Save failed',
        message:
          err?.response?.data?.message ||
          'Unexpected error while saving sales order',
      });
    }
  };

  return (
    <AdminShell title="Create Sales Order">
      <div className="flex justify-end gap-2 mb-1">
        <Button
          variant="outline"
          type="button"
          onClick={() => router.push('/salesorders')}
        >
          Cancel
        </Button>

        <Button type="submit" form="sales-order-form">
          Save
        </Button>
      </div>

      <form
        id="sales-order-form"
        className="space-y-0"
        onSubmit={onSubmit}
        noValidate
      >
        {/* ================= TOP HEADER ROW ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* SALES ORDER DETAILS */}
          <div className="lg:col-span-5">
            <SalesOrderDetailsSection
              value={form}
              update={update}
              defaultOpen
              selectedCustomer={selectedCustomer}
            />
          </div>

          {/* SHIPPING DETAILS */}
          <div className="lg:col-span-4">
            <ShippingDetailsSection
              value={shipping}
              update={updateShipping}
              defaultOpen
            />
          </div>

          {/* ACCOUNT DETAILS */}
          <div className="lg:col-span-3">
            <AccountDetailsSection
              value={account}
              update={updateAccount}
              defaultOpen
            />
          </div>
        </div>


        {/* ================= ITEMS + SUMMARY ================= */}
        <div className="grid grid-cols-12 gap-4">
          {/* ITEMS – LEFT */}
          <div className="col-span-12 lg:col-span-9">
            <SalesOrderItemsSection
              items={items}
              setItems={setItems}
              form={form}
              freight={form.freight}
              defaultOpen
            />


            {/* Additional Notes */}
            <div className="border rounded p-4 mt-4">
              <h3 className="font-semibold mb-2">Additional Notes</h3>
              <textarea
                value={form.externalNotes}
                onChange={(e) => update('externalNotes', e.target.value)}
                placeholder="Enter any additional notes..."
                rows={8}
                style={{ minHeight: '100px' }}
                className="w-full border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>


          </div>

          {/* SUMMARY – RIGHT */}
          <div className="col-span-12 lg:col-span-3">
            <SalesOrderCharges
              items={items}
              freight={form.freight}
              sundries={form.sundries}
              labour={form.labour}
              rounding={form.rounding}
              otherCharges={form.otherCharges}
              update={update}
            />
          </div>
        </div>
      </form>

    </AdminShell>
  );
}
