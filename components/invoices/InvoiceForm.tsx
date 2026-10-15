'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { FormSection } from '../forms/FormSection';
import { SalesOrderItemsSection } from '../salesorders/sections/SalesOrderItemsSection';
import { SalesOrderCharges } from '../salesorders/SalesOrderCharges';
import { ShippingDetailsSection } from '../salesorders/sections/ShippingDetailsSection';
import { AccountDetailsSection } from '../salesorders/sections/AccountDetailsSection';
import { useToast } from '../ui/toast';
import { api } from '../../lib/api-client';
import { fetchDispatchMethodOptions } from '../customers/forms/CustomerDispatchForm';
import DataTable from '../common/DataTable';
import ConfirmModal from '../ui/ConfirmModal';


const INVOICE_TYPES = [
  { label: 'Free Hand', value: 'FREEHAND' },
  { label: 'Job Book', value: 'JOBBOOK' },
  { label: 'Sales Order', value: 'SALESORDER' },
  { label: 'Credit', value: 'CREDIT' },
  { label: 'Reversal', value: 'REVERSAL' },
  { label: 'Subscription', value: 'SUBSCRIPTION' },
  { label: 'FM Preinstall', value: 'FMPREINSTALL' },
];

// Types that need parent record lookup
const PARENT_TYPES = ['SALESORDER', 'JOBBOOK', 'CREDIT', 'REVERSAL', 'SUBSCRIPTION'];

function apiErrorMessage(err: any, fallback: string) {
  const raw = err?.response?.data?.message ?? err?.response?.data?.details?.message;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object') {
    if (typeof raw.message === 'string' && raw.message.trim()) return raw.message;
    if (Array.isArray(raw.message)) return raw.message.filter((part) => typeof part === 'string').join(', ');
  }
  return fallback;
}

const INVOICE_TYPE_COLORS: Record<string, string> = {
  FREEHAND: 'bg-slate-100 text-slate-700',
  JOBBOOK: 'bg-purple-100 text-purple-700',
  SALESORDER: 'bg-blue-100 text-blue-700',
  CREDIT: 'bg-amber-100 text-amber-700',
  REVERSAL: 'bg-red-100 text-red-700',
  SUBSCRIPTION: 'bg-teal-100 text-teal-700',
  FMPREINSTALL: 'bg-cyan-100 text-cyan-800',
};

export function InvoiceForm({ mode = 'create', initialData, onEdit }: any) {
  const { showToast } = useToast();
  const router = useRouter();
  const isView = mode === 'view';
  const isLocked = !!initialData?.isLocked;
  const isFromPreinstall = !!initialData?._fromPreinstallId || initialData?.invoiceType === 'FMPREINSTALL';
  const formInitialized = useRef(false);
  const [orderRequired, setOrderRequired] = useState(false);

  const customerLabel = (customer: any) =>
    customer?.name
      ? `${customer.name}${customer.isGeneric ? ' (Generic)' : ''}${customer.customerNumber ? ` — ${customer.customerNumber}` : ''}`
      : '';
  // Invoice type state
  const [invoiceType, setInvoiceType] = useState(initialData?.invoiceType ?? 'FREEHAND');

  // SO/Parent search
  const [parentSearch, setParentSearch] = useState(initialData?.salesOrder?.orderNumber ?? '');
  const [parentSearchLoading, setParentSearchLoading] = useState(false);
  const [parentRecord, setParentRecord] = useState<any>(initialData?.salesOrder ?? null);
  const [parentError, setParentError] = useState('');

  const [xeroStatus, setXeroStatus] = useState<any>(null);
  const [pushingToXero, setPushingToXero] = useState(false);

  // Shipping Account (CustomerDispatch)
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [dispatchMethodOptions, setDispatchMethodOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    fetchDispatchMethodOptions().then(setDispatchMethodOptions);
  }, []);

  const methodLabel = (code: string) =>
    dispatchMethodOptions.find(o => o.value === code)?.label ?? code;

  // FREEHAND — customer picker
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [genericCustomers, setGenericCustomers] = useState<any[]>([]);
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState(customerLabel(initialData?.customer));
  const [deliveryPrompt, setDeliveryPrompt] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    printInvoiceId?: string;
    resolve?: (accepted: boolean) => void;
  }>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  });

  const [form, setForm] = useState<any>({
    customerId: initialData?.customerId ?? '',
    salesOrderId: initialData?.salesOrderId ?? '',
    invoiceType: initialData?.invoiceType ?? 'FREEHAND',
    status: 'ISSUED',
    reference: '',
    issuedAt: '',
    dueDate: '',
    freight: 0,
    sundries: 0,
    labour: 0,
    rounding: 0,
    internalNotes: '',
    externalNotes: '',
    otherCharges: 0,
  });

  const update = (key: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  const [shipping, setShipping] = useState({
    shippingName: '', address1: '', address2: '', city: '', state: '', postcode: '', country: '',
  });

  const [account, setAccount] = useState({
    billingName: '', address1: '', address2: '', city: '', state: '', postcode: '', country: '',
  });

  const EMPTY_ROW = { itemId: '', description: '', qty: 1, backorderQty: 0, unitPrice: 0, discountPct: 0, availableQty: null };
  const [items, setItems] = useState<any[]>([{ ...EMPTY_ROW }]);

  // Load xero status
  // Load xero status
  useEffect(() => {
    if (!initialData?.id) return;
    api.get(`/admin/xero-config/invoice-status/${initialData.id}`)
      .then(res => setXeroStatus(res.data?.data ?? res.data))
      .catch(() => { });
  }, [initialData?.id]);

  const [sourcePreinstall, setSourcePreinstall] = useState<any>(null);
  useEffect(() => {
    if (!initialData?.id) return;
    api.get(`/fm-preinstall/by-invoice/${initialData.id}`)
      .then(res => {
        setSourcePreinstall(res.data?.data)
      })
      .catch(() => setSourcePreinstall(null));
  }, [initialData?.id]);


  // FREEHAND — load Generic Customers (pinned at top of picker)
  useEffect(() => {
    if (invoiceType !== 'FREEHAND') return;
    api.get('/customers', { params: { filter_isGeneric: 'true', take: 50 } })
      .then(res => setGenericCustomers(res.data?.data ?? []))
      .catch(() => setGenericCustomers([]));
  }, [invoiceType]);

  // FREEHAND — debounced customer search
  useEffect(() => {
    if (invoiceType !== 'FREEHAND' || !customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    setCustomerSearchLoading(true);
    const t = setTimeout(() => {
      api.get('/customers', { params: { search: customerSearch.trim(), take: 20 } })
        .then(res => setCustomerResults(res.data?.data ?? []))
        .catch(() => setCustomerResults([]))
        .finally(() => setCustomerSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch, invoiceType]);

  // Shipping Account + ABN — load full customer record whenever customer changes.
  // Dispatch default auto-selects only if none chosen yet.
  // ABN auto-populates from the customer record only if the field is currently empty
  useEffect(() => {
    if (!form.customerId) {
      setDispatches([]);
      return;
    }
    api.get(`/customers/${form.customerId}`)
      .then(res => {
        const customer = res.data?.data ?? res.data;
        const list = customer?.dispatches ?? [];
        setDispatches(list);

        if (!form.dispatchId) {
          const def = list.find((d: any) => d.isDefault);
          if (def) update('dispatchId', def.id);
        }

        if (!form.abnNumber && customer?.abn) {
          update('abnNumber', customer.abn);
        }


        const shipping = customer?.addresses?.find(add => add.type === "SHIPPING")
        const charge = customer?.addresses?.find(add => add.type === "CHARGE")
        // Populate Shipping Details
        setShipping({
          shippingName: shipping?.name || '',
          address1: shipping?.address1 || '',
          address2: shipping?.address2 || '',
          city: shipping?.city || '',
          state: shipping?.state || '',
          postcode: shipping?.postcode || '',
          country: shipping?.country || '',
        });

        // Populate Account Details
        setAccount({
          billingName: charge?.name || '',
          address1: charge?.address1 || '',
          address2: charge?.address2 || '',
          city: charge?.city || '',
          state: charge?.state || '',
          postcode: charge?.postcode || '',
          country: charge?.country || '',
        });
      })
      .catch(() => setDispatches([]));
  }, [form.customerId]);


  useEffect(() => {
    if (form.customerId && form.dispatchId) {
      const dispatch = dispatches.find(item => item.id === form.dispatchId)
      const freight = Number(dispatch?.charge || 0)
      update('freight', freight)
    } else {
      update('freight', 0)
    }
  }, [form.customerId, form.dispatchId, dispatches])


  // Populate from initialData
  useEffect(() => {
    if (!initialData || formInitialized.current) return;
    formInitialized.current = true;

    const detectedType = initialData?.invoiceType ?? 'FREEHAND';
    setInvoiceType(detectedType);

    const uninvoicedByProduct: Record<string, number> = {};
    for (const line of initialData.items ?? []) {
      if (line?.productId && line.uninvoicedQty != null) {
        uninvoicedByProduct[line.productId] = Number(line.uninvoicedQty);
      }
    }

    setForm({
      customerId: initialData.customerId ?? '',
      salesOrderId: initialData.salesOrderId ?? '',
      invoiceType: detectedType,
      _uninvoicedByProduct: uninvoicedByProduct,
      status: initialData.status ?? (mode === 'create' ? 'ISSUED' : 'DRAFT'),
      reference: initialData.reference ?? '',
      abnNumber: initialData.abnNumber ?? '',
      dispatchId: initialData.dispatchId ?? '',
      issuedAt: initialData.issuedAt ? initialData.issuedAt.substring(0, 10) : '',
      dueDate: initialData.dueDate ? initialData.dueDate.substring(0, 10) : '',
      freight: Number(initialData.freight ?? 0),
      sundries: Number(initialData.sundries ?? 0),
      labour: Number(initialData.labour ?? 0),
      rounding: Number(initialData.rounding ?? 0),
      otherCharges: Number(initialData.otherCharges ?? 0),
      internalNotes: initialData.internalNotes ?? '',
      externalNotes: initialData.externalNotes ?? '',
    });

    if (initialData.salesOrder) {
      setParentSearch(initialData.salesOrder.orderNumber);
      setParentRecord(initialData.salesOrder);
    }

    if (initialData.customer) {
      setSelectedCustomerLabel(customerLabel(initialData.customer));
    }

    // Restore generic-account flags on edit so re-saving an existing invoice
    // still enforces the same Account Name / Shipping validation as on create.
    update('_selectedCustomerIsGeneric', !!initialData.customer?.isGeneric);
    update('_selectedCustomerRequiresShipping', !!initialData.customer?.requiresShippingDetails);

    setShipping({
      shippingName: initialData.shippingName ?? '',
      address1: initialData.shippingAddress1 ?? '',
      address2: initialData.shippingAddress2 ?? '',
      city: initialData.shippingCity ?? '',
      state: initialData.shippingState ?? '',
      postcode: initialData.shippingPostcode ?? '',
      country: '',
    });

    setAccount({
      billingName: initialData.billingName ?? '',
      address1: initialData.billingAddress1 ?? '',
      address2: initialData.billingAddress2 ?? '',
      city: initialData.billingCity ?? '',
      state: initialData.billingState ?? '',
      postcode: initialData.billingPostcode ?? '',
      country: '',
    });

    if (initialData.items?.length) {
      setItems([
        ...initialData.items.map((i: any) => {
          const qty = Number(i.quantity);
          const onHand = i.onHandQty != null
            ? Number(i.onHandQty)
            : (i.product?.onHand != null ? Number(i.product.onHand) : null);
          const uninvoicedQty = i.uninvoicedQty != null ? Number(i.uninvoicedQty) : null;
          const backOrderQty = i.soBackOrderQty != null
            ? Number(i.soBackOrderQty)
            : (i.backOrderQty != null ? Number(i.backOrderQty) : Number(i.backorderQty ?? 0));
          return {
            id: i.id,
            itemId: i.productId,
            description: i.description,
            qty,
            originalQty: qty,
            backOrderQty,
            backorderQty: backOrderQty,
            uninvoicedQty,
            unitPrice: Number(i.unitPrice),
            discountPct: Number(i.discountPct ?? 0),
            availableQty: onHand,
          };
        }),
        { ...EMPTY_ROW },
      ]);
    }
  }, [initialData]);

  // Parent record search (SO number typed)
  const handleParentSearch = async (value: string) => {
    setParentSearch(value);
    setParentError('');
    setParentRecord(null);

    if (!value.trim()) {
      clearParentData();
      return;
    }
  };

  const handleParentSearchConfirm = async () => {
    if (!parentSearch.trim()) return;
    setParentSearchLoading(true);
    setParentError('');

    try {
      let searchValue = parentSearch.trim().toUpperCase();
      if (invoiceType === 'SALESORDER' && !searchValue.toUpperCase().startsWith('SO-')) {
        searchValue = `SO-${searchValue}`;
      } else if (invoiceType === 'JOBBOOK' && !searchValue.toUpperCase().startsWith('JOB-')) {
        searchValue = `JOB-${searchValue}`;
      }

      let endpoint = '';
      if (invoiceType === 'SALESORDER') {
        endpoint = `/invoices/uninvoiced-items-by-number/${searchValue}`;
      } else if (invoiceType === 'JOBBOOK') {
        endpoint = `/jobs/by-number/${searchValue}`;
      } else if (invoiceType === 'REVERSAL') {
        // Reversal looks up by Invoice Number, not SO/Job number — use the raw input as-is
        endpoint = `/invoices/for-reversal/${parentSearch.trim().toUpperCase()}`;
      } else if (invoiceType === 'CREDIT') {
        let creditNumber = parentSearch.trim().toUpperCase();
        if (!creditNumber.startsWith('INV-') && !creditNumber.startsWith('PINV-')) {
          creditNumber = `INV-${creditNumber}`;
        }
        endpoint = `/invoices/for-credit/${creditNumber}`;
      }

      const res = await api.get(endpoint);
      const d = res.data?.data ?? res.data;

      if (invoiceType === 'REVERSAL') {
        if (!d.invoice) {
          setParentError(`Invoice "${parentSearch}" not found`);
          return;
        }

        const original = d.invoice;
        setParentRecord({ id: original.id, orderNumber: original.invoiceNumber }); // reuse parentRecord shape for the "Loaded" UI
        update('customerId', original.customerId);
        update('reversalOfInvoiceId', original.id);
        update('reference', original.invoiceNumber);
        update('abnNumber', original.abnNumber ?? '');

        setShipping({
          shippingName: original.shippingName ?? '',
          address1: original.shippingAddress1 ?? '',
          address2: original.shippingAddress2 ?? '',
          city: original.shippingCity ?? '',
          state: original.shippingState ?? '',
          postcode: original.shippingPostcode ?? '',
          country: '',
        });
        setAccount({
          billingName: original.billingName ?? '',
          address1: original.billingAddress1 ?? '',
          address2: original.billingAddress2 ?? '',
          city: original.billingCity ?? '',
          state: original.billingState ?? '',
          postcode: original.billingPostcode ?? '',
          country: '',
        });

        if (d.reversalItems?.length) {
          setItems([
            ...d.reversalItems.map((i: any) => ({
              itemId: i.productId,
              description: i.description,
              qty: i.quantity, // already negative
              backorderQty: 0,
              unitPrice: Number(i.unitPrice),
              discountPct: Number(i.discountPct ?? 0),
              availableQty: null,
            })),
          ]);
        }
        setParentSearchLoading(false);
        return;
      }

      if (invoiceType === 'CREDIT') {
        if (!d.invoice) {
          setParentError(`Invoice "${parentSearch}" not found`);
          return;
        }

        const original = d.invoice;
        setParentRecord({ id: original.id, orderNumber: original.invoiceNumber });
        update('customerId', original.customerId);
        update('reference', original.invoiceNumber);
        update('abnNumber', original.abnNumber ?? '');

        setShipping({
          shippingName: original.shippingName ?? '',
          address1: original.shippingAddress1 ?? '',
          address2: original.shippingAddress2 ?? '',
          city: original.shippingCity ?? '',
          state: original.shippingState ?? '',
          postcode: original.shippingPostcode ?? '',
          country: '',
        });
        setAccount({
          billingName: original.billingName ?? '',
          address1: original.billingAddress1 ?? '',
          address2: original.billingAddress2 ?? '',
          city: original.billingCity ?? '',
          state: original.billingState ?? '',
          postcode: original.billingPostcode ?? '',
          country: '',
        });

        if (d.creditItems?.length) {
          setItems(
            d.creditItems.map((i: any) => ({
              itemId: i.productId,
              description: i.description,
              qty: i.quantity,
              backorderQty: 0,
              unitPrice: Number(i.unitPrice),
              discountPct: Number(i.discountPct ?? 0),
              availableQty: null,
            })),
          );
        }
        setParentSearchLoading(false);
        return;
      }

      if (invoiceType === 'SALESORDER') {
        if (!d.so) {
          setParentError(`Sales Order "${parentSearch}" not found`);
          return;
        }

        if (!d.hasUninvoiced) {
          setParentError(`Sales Order "${parentSearch}" is fully invoiced`);
          return;
        }

        const so = d.so;
        setParentRecord(so);
        update('salesOrderId', so.id);
        update('customerId', so.customerId);
        update('invoiceType', 'SALESORDER');
        update('freight', Number(so.freight ?? 0));
        update('sundries', Number(so.sundries ?? 0));
        update('labour', Number(so.labour ?? 0));
        update('rounding', Number(so.rounding ?? 0));
        update('reference', so.customerPO);

        setShipping({
          shippingName: so.shippingName ?? '',
          address1: so.shippingAddress1 ?? '',
          address2: so.shippingAddress2 ?? '',
          city: so.shippingCity ?? '',
          state: so.shippingState ?? '',
          postcode: so.shippingPostcode ?? '',
          country: '',
        });
        setAccount({
          billingName: so.billingName ?? '',
          address1: so.billingAddress1 ?? '',
          address2: so.billingAddress2 ?? '',
          city: so.billingCity ?? '',
          state: so.billingState ?? '',
          postcode: so.billingPostcode ?? '',
          country: '',
        });

        if (d.uninvoicedItems?.length) {
          const uninvoicedByProduct: Record<string, number> = {};
          for (const line of d.uninvoicedItems) {
            uninvoicedByProduct[line.productId] = Number(line.uninvoicedQty ?? line.quantity ?? 0);
          }
          update('_uninvoicedByProduct', uninvoicedByProduct);
          const rows = d.uninvoicedItems.map((i: any) => {
            const onHand = Number(i.onHandQty ?? 0);
            const lineQty = Number(i.quantity ?? 0);
            const productOutstanding = Number(i.uninvoicedQty ?? i.quantity ?? 0);
            const defaultQty = Math.min(Math.max(onHand, 0), lineQty);
            const backOrderQty = Number(i.backOrderQty ?? 0);
            return {
              itemId: i.productId,
              description: i.description,
              qty: defaultQty,
              uninvoicedQty: productOutstanding,
              backOrderQty,
              backorderQty: backOrderQty,
              unitPrice: Number(i.unitPrice),
              discountPct: Number(i.discountPct ?? 0),
              availableQty: onHand,
            };
          });
          setItems([...rows, { ...EMPTY_ROW }]);
        }
      }
    } catch (err: any) {
      setParentError(apiErrorMessage(err, `"${parentSearch}" not found or invalid`));
    } finally {
      setParentSearchLoading(false);
    }
  };

  const clearParentData = () => {
    setParentRecord(null);
    setParentSearch('');
    setParentError('');
    setItems([{ ...EMPTY_ROW }]);
    setShipping({ shippingName: '', address1: '', address2: '', city: '', state: '', postcode: '', country: '' });
    setAccount({ billingName: '', address1: '', address2: '', city: '', state: '', postcode: '', country: '' });
    setForm((prev: any) => ({ ...prev, customerId: '', salesOrderId: '', freight: 0, sundries: 0, labour: 0, rounding: 0, abnNumber: '', reference: '', _uninvoicedByProduct: {} }));
    setSelectedCustomerLabel('');
    setCustomerSearch('');
  };

  const selectCustomer = (c: any) => {
    console.log(c, "custom");
    setOrderRequired(c.orderRequired)
    update('customerId', c.id);
    update('_selectedCustomerIsGeneric', !!c.isGeneric);
    update('_selectedCustomerRequiresShipping', !!c.requiresShippingDetails);
    setSelectedCustomerLabel(`${c.name}${c.isGeneric ? ' (Generic)' : ''} — ${c.customerNumber}`);
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCustomerDropdown(false);
  };

  const clearSelectedCustomer = () => {
    update('customerId', '');
    setSelectedCustomerLabel('');
  };

  const handlePushToXero = async () => {
    setPushingToXero(true);
    try {
      const res = await api.post(`/admin/xero-config/push-invoice/${initialData.id}`, {});
      const result = res.data?.data ?? res.data;
      showToast({ type: 'success', title: 'Xero Sync', message: 'Invoice pushed to Xero successfully!' });
      setXeroStatus({ synced: true, xeroInvoiceId: result.xeroInvoiceId, xeroSyncedAt: new Date() });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Xero Error', message: apiErrorMessage(err, 'Failed to push to Xero') });
    } finally {
      setPushingToXero(false);
    }
  };

  const handleSubmit = async () => {
    // Customer is required for every invoice type, including FREEHAND
    if (!form.customerId) {
      showToast({ type: 'error', title: 'Validation', message: 'Customer is required' });
      return;
    }

    // Generic accounts (Account 12 "Counter Sales" / Account 13 "Postal") need
    // extra mandatory fields entered on THIS invoice, since the account itself
    // carries no per-customer identity.
    if (invoiceType === 'FREEHAND' && form._selectedCustomerIsGeneric) {
      if (!account.billingName?.trim()) {
        showToast({ type: 'error', title: 'Validation', message: 'Account Name is required for this generic account' });
        return;
      }
      if (form._selectedCustomerRequiresShipping) {
        if (!shipping.shippingName?.trim() || !shipping.address1?.trim()) {
          showToast({ type: 'error', title: 'Validation', message: 'Shipping Name and Address are required for this generic account' });
          return;
        }
      }
    }

    // Parent record required for non-freehand
    // if (PARENT_TYPES.includes(invoiceType) && !parentRecord && mode === 'create') {
    //   showToast({ type: 'error', title: 'Validation', message: `Please enter a valid ${invoiceType} number` });
    //   return;
    // }

    if (PARENT_TYPES.includes(invoiceType) && !parentRecord && mode === 'create' && !isFromPreinstall) {
      showToast({ type: 'error', title: 'Validation', message: `Please enter a valid ${invoiceType} number` });
      return;
    }

    const realItems = items.filter(i => i.itemId);
    /*if (!realItems.length) {
      showToast({ type: 'error', title: 'Validation', message: 'At least one item is required' });
      return;
    }*/

    if (!realItems.length && invoiceType !== 'JOBBOOK' && invoiceType !== 'FMPREINSTALL' && invoiceType !== 'SUBSCRIPTION') {
      showToast({ type: 'error', title: 'Validation', message: 'At least one item is required' });
      return;
    }

    if (orderRequired && !form.reference) {
      showToast({ type: 'error', title: 'Validation', message: 'Order number is required.' });
      return;
    }
    // Qty + backorder validation for parent types
    /*if (PARENT_TYPES.includes(invoiceType)) {
      for (const item of realItems) {
        const total = Number(item.qty) + Number(item.backorderQty ?? 0);
        if (item.availableQty !== null && total > item.availableQty) {
          showToast({
            type: 'error',
            title: 'Qty Exceeded',
            message: `Item qty (${item.qty}) + backorder (${item.backorderQty ?? 0}) = ${total} exceeds available (${item.availableQty})`,
          });
          return;
        }
      }
    }*/

    try {
      const payload = {
        ...form,
        invoiceType,
        shippingName: shipping.shippingName,
        shippingAddress1: shipping.address1,
        shippingAddress2: shipping.address2,
        shippingCity: shipping.city,
        shippingState: shipping.state,
        shippingPostcode: shipping.postcode,
        billingName: account.billingName,
        billingAddress1: account.address1,
        billingAddress2: account.address2,
        billingCity: account.city,
        billingState: account.state,
        billingPostcode: account.postcode,
        issuedAt: form.issuedAt ? new Date(form.issuedAt) : null,
        dueDate: form.dueDate ? new Date(form.dueDate) : null,
      };

      const res = mode === 'create'
        ? await api.post('/invoices', payload)
        : await api.patch(`/invoices/${initialData.id}`, payload);

      const invoiceId = res.data?.data?.id ?? res.data?.id ?? initialData?.id;

      const cleanItems = realItems.map(i => {
        const backorderQty = Number(i.backorderQty ?? i.backOrderQty ?? 0);
        return {
          id: i.id,
          productId: i.itemId,
          description: i.description,
          quantity: Number(i.qty),
          backorderQty,
          unitPrice: Number(i.unitPrice),
          discountPct: Number(i.discountPct ?? 0),
        };
      });

      // Detect quantity reductions on existing lines to decide whether to prompt
      let hasReduction = false;
      if (initialData?.items?.length && initialData?.status !== 'DRAFT') {
        for (const newItem of cleanItems) {
          if (!newItem.id) continue;
          const oldItem = initialData.items.find((i: any) => i.id === newItem.id);
          if (oldItem && Number(newItem.quantity) < Number(oldItem.quantity)) {
            hasReduction = true;
            break;
          }
        }
      }

      const issueCredit = hasReduction
        ? window.confirm('Issue Credit Invoice NOW?')
        : true;

      let creditInvoiceNumbers: string[] = [];
      if (invoiceType !== 'SUBSCRIPTION' || realItems.length) {
        const itemsRes = await api.patch(`/invoices/${invoiceId}/items`, { items: cleanItems, issueCredit });
        const itemsResult = itemsRes.data?.data ?? itemsRes.data;
        creditInvoiceNumbers = itemsResult?.creditInvoiceNumbers ?? [];
      }

      // Preinstall link — _fromPreinstallId
      if (initialData?._fromPreinstallId) {
        await api.post(
          `/invoices/link-preinstall/${invoiceId}/${initialData._fromPreinstallId}`
        );

        const addToLog = window.confirm('Invoice saved. Add this to the FM Install Log now?');
        if (addToLog) {
          try {
            await api.post(`/fm-install/from-preinstall/${initialData._fromPreinstallId}`);
            showToast({ type: 'success', title: 'Added to FM Log' });
          } catch (err: any) {
            showToast({
              type: 'error',
              title: 'Could not add to FM Log',
              message: apiErrorMessage(err, 'Please add manually from the preinstall page'),
            });
          }
        }
      }
      // let emailed = false;
      // let printed = false;
      // let emailError = '';
      // const canDeliver = form.status !== 'DRAFT' && form.status !== 'CANCELLED' && form.status !== 'REVERSED';
      // if (canDeliver && form.customerId && invoiceId) {
      //   const custRes = await api.get(`/customers/${form.customerId}`);
      //   const customer = custRes.data?.data ?? custRes.data;
      //   const ask = (prompt: { title: string; message: string; confirmText: string; cancelText: string; printInvoiceId?: string }) =>
      //     new Promise<boolean>((resolve) => {
      //       setDeliveryPrompt({ open: true, ...prompt, resolve });
      //     });
      //   if (customer?.invoiceDelivery === 'EMAIL_PDF') {
      //     const contacts = (customer.contacts ?? []).filter((contact: any) => contact.email?.trim());
      //     const contact = contacts.find((item: any) => item.role === 'INVOICE')
      //       ?? contacts.find((item: any) => item.category === 'ACCOUNT')
      //       ?? contacts.find((item: any) => item.isPrimary)
      //       ?? contacts[0];
      //     const address = contact?.email?.trim();
      //     const sendEmail = await ask({
      //       title: 'Email invoice',
      //       message: address
      //         ? `Send this invoice as a PDF to ${address}?`
      //         : 'This customer has no invoice email address.',
      //       confirmText: 'Send email',
      //       cancelText: "Don't email",
      //     });
      //     if (sendEmail && address) {
      //       try {
      //         await api.post(`/invoices/${invoiceId}/email`);
      //         emailed = true;
      //       } catch (err: any) {
      //         emailError = apiErrorMessage(err, 'The invoice was saved. The email was not sent.');
      //       }
      //     } else if (sendEmail && !address) {
      //       emailError = 'The invoice was saved. Add an email on the customer contact, then send it again.';
      //     }
      //   } else {
      //     printed = await ask({
      //       title: 'Print invoice',
      //       message: 'Print this invoice to send with the goods?',
      //       confirmText: 'Print',
      //       cancelText: "Don't print",
      //       printInvoiceId: invoiceId,
      //     });
      //   }
      // }

      // if (emailError) {
      //   showToast({ type: 'error', title: 'Email failed', message: emailError });
      // } else if (creditInvoiceNumbers.length) {
      //   showToast({
      //     type: 'success',
      //     title: 'Invoice saved',
      //     message: `Quantity reduced — Credit invoice(s) created: ${creditInvoiceNumbers.join(', ')}`,
      //   });
      // } else if (emailed) {
      //   showToast({ type: 'success', title: 'Invoice saved', message: 'The PDF was emailed to the customer.' });
      // } else if (printed) {
      //   showToast({ type: 'success', title: 'Invoice saved', message: 'The print page was opened.' });
      // } else {
      //   showToast({ type: 'success', title: 'Success', message: 'Invoice saved successfully' });
      // }

      router.push('/invoices');

    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: apiErrorMessage(err, 'Save failed') });
    }
  };

  const isFreehand = invoiceType === 'FREEHAND';

  //const needsParent = PARENT_TYPES.includes(invoiceType);
  //const isFromPreinstall = !!initialData?._fromPreinstallId;
  const needsParent = PARENT_TYPES.includes(invoiceType) && !isFromPreinstall;

  const closeDeliveryPrompt = (accepted: boolean) => {
    if (accepted && deliveryPrompt.printInvoiceId) {
      window.open(`/invoices/${deliveryPrompt.printInvoiceId}/print`, '_blank', 'noopener');
    }
    deliveryPrompt.resolve?.(accepted);
    setDeliveryPrompt((prev) => ({ ...prev, open: false, printInvoiceId: undefined, resolve: undefined }));
  };

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={deliveryPrompt.open}
        title={deliveryPrompt.title}
        message={deliveryPrompt.message}
        confirmText={deliveryPrompt.confirmText}
        cancelText={deliveryPrompt.cancelText}
        danger={false}
        onConfirm={() => closeDeliveryPrompt(true)}
        onCancel={() => closeDeliveryPrompt(false)}
      />
      {/* ACTION BAR */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {initialData?.salesOrder && (
          <button
            type="button"
            onClick={() => router.push(`/salesorders/${initialData.salesOrder.id}`)}
            className="text-sm text-blue-600 hover:underline border rounded-lg px-4 py-2 bg-muted/40"
          >
            ← {initialData.salesOrder.orderNumber}
          </button>
        )}
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
        {isView && onEdit && <Button variant="outline" onClick={onEdit}>Edit</Button>}
        {initialData?.id && initialData?.status !== 'DRAFT' && (
          <Button variant="outline" onClick={() => window.open(`/invoices/${initialData.id}/print`, '_blank')}>
            🖨️ Print
          </Button>
        )}
        {initialData?.id && initialData?.status !== 'DRAFT' && initialData?.salesOrder?.orderType === 'DIRECT_TO_CUSTOMER' && (
          <Button variant="outline" onClick={() => window.open(`/invoices/${initialData.id}/print?docket=1`, '_blank')}>
            🖨️ Delivery Docket
          </Button>
        )}
        {sourcePreinstall && (
          <Button
            variant="outline"
            onClick={() => router.push(`/fm-preinstall/${sourcePreinstall.id}`)}
          >
            🔗 View FM Pre-Install {sourcePreinstall.preinstallNo}
          </Button>
        )}
        {initialData?.invoiceType === "SUBSCRIPTION" && (
          <Button
            variant="outline"
            onClick={() => router.push(`/web-reports/${initialData.subscriptionReport.id}/view`)}
          >
            🔗 View Web Report {initialData.subscriptionReport.subscriptionNumber}
          </Button>
        )}
        {initialData?.id && initialData?.status !== 'DRAFT' && (
          <Button
            variant="outline"
            onClick={handlePushToXero}
            disabled={pushingToXero}
            className={xeroStatus?.synced ? 'text-green-600 border-green-300' : ''}
          >
            {pushingToXero ? 'Syncing...' : xeroStatus?.synced ? '✓ Synced to Xero' : 'Push to Xero'}
          </Button>
        )}
        {!isView && <Button onClick={handleSubmit}>Save</Button>}
      </div>

      {/* INVOICE SOURCE — create mode only */}
      {mode === 'create' && !isFromPreinstall && (
        <div className="border rounded p-4 bg-muted/30">
          <h3 className="font-semibold mb-3 text-sm">Invoice Source</h3>
          <div className="flex items-end gap-4 flex-wrap">

            {/* Invoice Type */}
            <div className="w-48">
              <Select
                label="Invoice Type"
                value={invoiceType}
                options={INVOICE_TYPES}
                disabled={isView || !!initialData?.salesOrderId}
                onChange={v => {
                  setInvoiceType(v);
                  update('invoiceType', v);
                  clearParentData();
                }}
              />
            </div>

            {/* Parent record search — SO/Job number textbox */}
            {needsParent && (
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {invoiceType === 'SALESORDER' ? <div className='flex gap-2'>Sales Order Number
                    {parentRecord && (
                      <p className="text-xs text-green-600">
                        ✅ Loaded — Customer: {selectedCustomerLabel || parentRecord.customer?.name || 'Selected customer'}
                      </p>
                    )}
                  </div> : invoiceType === 'REVERSAL' ? 'Invoice Number to Reverse' : invoiceType === 'CREDIT' ? 'Invoice Number to Credit' : 'Job Number'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={parentSearch}
                    onChange={e => handleParentSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleParentSearchConfirm()}
                    placeholder={invoiceType === 'SALESORDER' ? 'SO-4802 or just 4802' : invoiceType === 'REVERSAL' || invoiceType === 'CREDIT' ? 'INV-7063' : 'Job number'}
                    className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isView}
                  />
                  {!parentRecord && (
                    <Button
                      variant="outline"
                      onClick={handleParentSearchConfirm}
                      disabled={parentSearchLoading || !parentSearch.trim()}
                    >
                      {parentSearchLoading ? '...' : 'Load'}
                    </Button>
                  )}
                  {parentRecord && !initialData?.salesOrderId && (
                    <button
                      type="button"
                      onClick={clearParentData}
                      className="h-9 w-9 flex items-center justify-center border rounded text-muted-foreground hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Error */}
                {parentError && (
                  <p className="text-xs text-red-500 mt-1">⚠ {parentError}</p>
                )}

              </div>
            )}

            {/* Freehand message */}
            {/* Freehand — Customer picker */}
            {isFreehand && (
              <div className="flex-1 min-w-[280px] relative">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Customer
                </label>

                {form.customerId ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border rounded px-3 py-2 text-sm bg-white">
                      {selectedCustomerLabel || 'Selected customer'}
                    </div>
                    {!isView && (
                      <button
                        type="button"
                        onClick={clearSelectedCustomer}
                        className="h-9 w-9 flex items-center justify-center border rounded text-muted-foreground hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={e => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                      placeholder="Search customer by name or number..."
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isView}
                    />

                    {showCustomerDropdown && (
                      <div className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto border rounded bg-white shadow-lg">
                        {!customerSearch.trim() && genericCustomers.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-slate-50">
                              Generic Customers
                            </div>
                            {genericCustomers.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={() => selectCustomer(c)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b"
                              >
                                {c.name} <span className="text-muted-foreground">— {c.customerNumber}</span>
                              </button>
                            ))}
                          </>
                        )}

                        {customerSearch.trim() && (
                          <>
                            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-slate-50">
                              {customerSearchLoading ? 'Searching...' : 'Results'}
                            </div>
                            {!customerSearchLoading && customerResults.length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No customers found</div>
                            )}
                            {customerResults.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={() => selectCustomer(c)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b"
                              >
                                {c.name}{c.isGeneric ? ' (Generic)' : ''} <span className="text-muted-foreground">— {c.customerNumber}</span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View mode — show invoice type badge */}
      {(mode !== 'create' || isFromPreinstall) && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
            {INVOICE_TYPES.find(t => t.value === (initialData?.invoiceType ?? invoiceType))?.label ?? 'Invoice'}
          </span>
          {initialData?.isProforma && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
              Proforma
            </span>
          )}
        </div>
      )}

      {/* HEADER ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <FormSection title="Invoice Details" required defaultOpen>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {initialData?.invoiceNumber && (
                <Input label="Invoice #" value={initialData.invoiceNumber} disabled />
              )}
              {(mode !== 'create' || isFromPreinstall) && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Invoice Type</label>
                  <div className={`h-10 px-3 flex items-center rounded text-sm font-medium w-fit ${INVOICE_TYPE_COLORS[initialData?.invoiceType ?? invoiceType] ?? 'bg-slate-100 text-slate-700'}`}>
                    {INVOICE_TYPES.find(t => t.value === (initialData?.invoiceType ?? invoiceType))?.label ?? 'Invoice'}
                  </div>
                </div>
              )}
              {initialData?.salesOrder && (
                <Input label="Sales Order" value={initialData.salesOrder.orderNumber} disabled />
              )}
              <Select
                label="Status"
                value={form.status}
                options={[
                  { label: 'Issued', value: 'ISSUED' },
                  { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
                  { label: 'Paid', value: 'PAID' },
                  { label: 'Cancelled', value: 'CANCELLED' },
                  { label: 'Draft', value: 'DRAFT' },
                  ...(form.status === 'REVERSED' ? [{ label: 'Reversed', value: 'REVERSED' }] : []),
                ]}
                onChange={v => update('status', v)}
                disabled={isView || form.status === 'REVERSED'}
              />
              <Input label="Order Number" value={form.reference} onChange={e => update('reference', e.target.value)} disabled={isView} />
              <Input label="ABN Number" value={form.abnNumber} onChange={e => update('abnNumber', e.target.value)} disabled={isView} />
              {dispatches.length > 0 && (
                <Select
                  label="Shipping Account"
                  value={form.dispatchId || ''}
                  options={dispatches.map((d: any) => ({
                    label: `${methodLabel(d.method)}${d.accountName ? ' — ' + d.accountName : d.accountNo ? ' — ' + d.accountNo : ''}`,
                    value: d.id,
                  }))}
                  onChange={(v: string) => update('dispatchId', v)}
                  disabled={isView}
                />
              )}
              <Input label="Issue Date" type="date" value={form.issuedAt} onChange={e => update('issuedAt', e.target.value)} disabled={isView} />
              <Input label="Due Date" type="date" value={form.dueDate} onChange={e => update('dueDate', e.target.value)} disabled={isView} />
            </div>
          </FormSection>
        </div>

        {/* Show shipping/account only for non-freehand or if freehand with data */}

        <div className="lg:col-span-4">
          <ShippingDetailsSection
            value={shipping}
            update={(key: string, val: any) => {
              const map: Record<string, string> = { shippingName: 'shippingName', name: 'shippingName', address1: 'address1', address2: 'address2', city: 'city', state: 'state', postcode: 'postcode' };
              setShipping(prev => ({ ...prev, [map[key] ?? key]: val }));
            }}
            defaultOpen
            readOnly={isView}
          />
        </div>

        <div className="lg:col-span-3">
          <AccountDetailsSection
            value={{ billingName: account.billingName, address1: account.address1, city: account.city, state: account.state, postcode: account.postcode }}
            update={(key: string, val: any) => {
              const map: Record<string, string> = { shippingName: 'billingName', billingName: 'billingName', address1: 'address1', address2: 'address2', city: 'city', state: 'state', postcode: 'postcode' };
              setAccount(prev => ({ ...prev, [map[key] ?? key]: val }));
            }}
            defaultOpen
            readOnly={isView || isLocked}
          />
        </div>

      </div>

      {/* ITEMS + CHARGES */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-9">
          {initialData?.invoiceType === "SUBSCRIPTION" && (
            <div className="w-full bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{
                  initialData.subscriptionReport.reportType
                }</h4>
              </div>
              <div>
                <div style={{ minWidth: 320 }}>
                  <table className="w-full border text-sm table-fixed">
                    <colgroup>
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '25%' }} />
                    </colgroup>
                    <thead>
                      <tr className="h-8">
                        <th className="px-1 py-1 text-left font-medium text-xs">Label</th>
                        <th className="px-1 py-1 text-left font-medium text-xs">Quantity</th>
                        <th className="px-1 py-1 text-left font-medium text-xs">rate</th>
                        <th className="px-1 py-1 text-left font-medium text-xs">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialData.fmSubscriptionItems.map(r => (
                        <tr key={r.productId} className="h-9">
                          <td className="px-1 py-1 text-sm">{r.label}</td>
                          <td className="px-1 py-1">
                            <Input
                              type="number"
                              min="0"
                              value={r.quantity}
                              className="w-full h-7 text-xs px-1"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              type="number"
                              min="0"
                              value={r.rate}
                              className="w-full h-7 text-xs px-1"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              type="number"
                              min="0"
                              value={r.total}
                              className="w-full h-7 text-xs px-1"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {initialData?.invoiceType !== "SUBSCRIPTION" && (!isFromPreinstall || items.some(i => i.itemId)) && (
            <SalesOrderItemsSection
              items={items}
              setItems={setItems}
              freight={form.freight}
              disabled={isView}
              lockedReduceOnly={!isView && isLocked}
              defaultOpen
              showBackorderQty={needsParent}
              form={form}
            />
          )}
          <div className="border rounded p-4 mt-4 bg-white">
            <h3 className="font-semibold mb-2">Notes</h3>
            {(isView || isLocked) ?
              <p
                className="w-full border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              >{form.externalNotes}</p>
              :
              <textarea
                value={form.externalNotes}
                onChange={e => update('externalNotes', e.target.value)}
                placeholder="Enter any notes..."
                rows={10}
                disabled={isView || isLocked}
                className="w-full border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            }
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3">
          <SalesOrderCharges items={initialData?.invoiceType === "SUBSCRIPTION" ? initialData.fmSubscriptionItems : items} freight={form.freight} sundries={form.sundries} labour={form.labour} rounding={form.rounding} otherCharges={form.otherCharges} update={update} readOnly={isView || isLocked} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
        {!isView && <Button onClick={handleSubmit}>Save</Button>}
      </div>
    </div>
  );
}