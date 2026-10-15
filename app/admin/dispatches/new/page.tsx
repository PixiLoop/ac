'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../../components/layout/AdminShell';
import { Button } from '../../../../components/ui/button';
import { api } from '../../../../lib/api-client';
import { useToast } from '../../../../components/ui/toast';
import { useAuth } from '../../../../providers/auth-provider';
import { createPermissionChecker } from '../../../../lib/permission';
import { Select } from '../../../../components/ui/select';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/TextareaField';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../../../../components/ui/sheet';
import { UserDto } from '../../users/page';

interface DispatchFormData {
  id?: string;
  customerId: string;
  dispatchDate: string;
  dispatchMethod: string;
  salesPerson: string;
  conNote: string;
  freightCost: string;
  freightCharge: string;
  invoices: any[];
  shippingAddress: string;
}

interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  backorderQty: number;
  unitPrice: string | number;
  discountPct?: string | number;
  lineTotal: string | number;
  invoiceNumber?: string;
}

interface SelectedInvoice {
  id: string;
  invoiceNumber: string;
  total: number | string;
  dispatchCode: string;
  createdAt?: string;
  invoiceType?: string;
  salesPersonId?: string;
  freight?: number | string;
  dispatchId: string;
  dispatch: any;
  customer?: {
    id?: string;
    customerNumber?: string;
    name?: string;
  };
  items?: InvoiceItem[];
}

const initialFormState: DispatchFormData = {
  conNote: '',
  salesPerson: '',
  customerId: '',
  dispatchDate: new Date().toISOString().split('T')[0],
  dispatchMethod: '',
  freightCharge: '',
  freightCost: '',
  invoices: [],
  shippingAddress: '',
};

const formatShippingAddress = (invoice: any) => {
  if (!invoice) return '';
  const parts = [
    invoice.shippingName,
    invoice.shippingAddress1,
    invoice.shippingAddress2,
    invoice.shippingAddress3,
    invoice.shippingCity,
    invoice.shippingState,
    invoice.shippingPostcode,
  ].filter((part) => Boolean(part && String(part).trim()));

  return parts.join('\n');
};

const getSalesPerson = (invoice: any) => {
  if (!invoice) return '';
  return invoice.salesPersonId || invoice.salesPerson || invoice.salesperson || '';
};

const formatIsoToDateInput = (isoDate?: string) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

export default function DispatchMethodsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);

  const canView = has('dispatches.view');

  const [dispatchMethods, setDispatchMethods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<DispatchFormData>(initialFormState);
  const [selectedInvoice, setSelectedInvoice] = useState<SelectedInvoice | null>(null);

  // Last Dispatches States
  const [lastDispatches, setLastDispatches] = useState<any[]>([]);
  const [showLastDispatches, setShowLastDispatches] = useState(false);
  const [loadingLastDispatches, setLoadingLastDispatches] = useState(false);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleChange = (field: keyof DispatchFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSalesPersonChange = (value: string) => {
    setSelectedSalesPerson(value);
    setFormData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) =>
        inv.id === selectedInvoice?.id ? { ...inv, salesPersonId: value } : inv
      ),
    }));

    if (selectedInvoice) {
      setSelectedInvoice((prev: any) =>
        prev ? { ...prev, salesPersonId: value } : null
      );
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowInvoiceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDispatchMethods = async () => {
    try {
      const res = await api.get('/dispatch-methods');
      setDispatchMethods(res.data?.data ?? res.data ?? []);
    } catch {
      showToast({ type: 'error', title: 'Failed to load dispatch methods' });
    }
  };

  useEffect(() => {
    loadDispatchMethods();
  }, []);

  // Fetch last dispatches for the active customer
  const loadLastDispatches = async () => {
    const primaryInvoice = formData.invoices[0];
    const customerId = primaryInvoice?.customerId || primaryInvoice?.customer?.id;

    if (!customerId) return;

    setLoadingLastDispatches(true);
    try {
      const res = await api.get(`/dispatch/customer/${customerId}`);
      setLastDispatches(res.data?.data ?? res.data ?? []);
    } catch {
      showToast({ type: 'error', title: 'Failed to fetch last dispatch data' });
    } finally {
      setLoadingLastDispatches(false);
    }
  };

  useEffect(() => {
    if (showLastDispatches && formData.invoices.length > 0) {
      loadLastDispatches();
    }
  }, [showLastDispatches, formData.invoices.length]);

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      const payload = res.data?.data ?? res.data;
      setUsers(payload.items ?? []);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load users',
        message: 'Please try again later.',
      });
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Search invoices with a 300ms debounce
  useEffect(() => {
    if (!invoiceSearch.trim()) {
      setInvoices([]);
      setShowInvoiceDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingInvoices(true);
      try {
        const res = await api.get('/invoices', {
          params: { search: invoiceSearch },
        });
        const payload = res.data?.data ?? res.data;
        const results = payload?.items ?? payload ?? [];
        setInvoices(results);
        setShowInvoiceDropdown(true);
      } catch {
        showToast({ type: 'error', title: 'Failed to load invoices' });
      } finally {
        setLoadingInvoices(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [invoiceSearch]);

  // Recalculate aggregated items, total freight, active sales person, and shipping address when selectedInvoices changes
  useEffect(() => {
    if (formData.invoices.length === 0) {
      setSelectedInvoiceItems([]);
      setSelectedInvoice(null);
      setFormData(initialFormState);
      return;
    }

    const currentInvoice = selectedInvoice || formData.invoices[formData.invoices.length - 1];

    // Aggregate line items from all selected invoices
    const aggregatedItems: InvoiceItem[] = formData.invoices.flatMap((inv) =>
      (inv.items || []).map((item: any) => ({
        ...item,
        invoiceNumber: inv.invoiceNumber,
      }))
    );

    // Aggregate total freight costs/charges across all selected invoices
    const totalFreight = formData.invoices.reduce((acc, inv) => {
      const freightVal = Number(inv.freight) || 0;
      return acc + freightVal;
    }, 0);

    setSelectedInvoiceItems(aggregatedItems);

    setFormData((prev) => ({
      ...prev,
      shippingAddress: formatShippingAddress(currentInvoice) || prev.shippingAddress,
      freightCost: totalFreight.toFixed(2),
      freightCharge: totalFreight.toFixed(2),
    }));
  }, [formData.invoices, selectedInvoice]);

  // Select an invoice with same-customer validation
  const handleSelectInvoice = (invoice: any) => {
    if (invoice.Dispatched) {
      showToast({ type: 'info', title: 'Invoice is already dispatched' });
      setShowInvoiceDropdown(false);
      setInvoiceSearch('');
      return;
    }
    if (formData.invoices.some((inv) => inv.id === invoice.id)) {
      showToast({ type: 'info', title: 'Invoice is already selected' });
      setShowInvoiceDropdown(false);
      setInvoiceSearch('');
      return;
    }

    if (formData.invoices.length > 0) {
      const activeCustomerNum = formData.invoices[0].customer?.customerNumber;
      const activeCustomerId = formData.invoices[0].customer?.id;

      const newCustomerNum = invoice.customer?.customerNumber;
      const newCustomerId = invoice.customer?.id;

      const isSameCustomer =
        (activeCustomerId && activeCustomerId === newCustomerId) ||
        (activeCustomerNum && activeCustomerNum === newCustomerNum);

      if (!isSameCustomer) {
        showToast({
          type: 'error',
          title: 'Customer Mismatch',
          message: `All selected invoices must belong to customer: ${
            formData.invoices[0].customer?.name || activeCustomerNum || 'the active customer'
          }`,
        });
        return;
      }
    }

    const updatedInvoice = { ...invoice, dispatchCode: invoice?.dispatch?.method || '', salesPersonId: selectedSalesPerson };

    setFormData((prev) => ({
      ...prev,
      invoices: [...prev.invoices, updatedInvoice],
      shippingAddress: formatShippingAddress(invoice),
    }));

    setSelectedInvoice(updatedInvoice);

    setShowInvoiceDropdown(false);
    setInvoiceSearch('');
  };

  const handleRemoveInvoice = (invoiceId: string) => {
    setFormData((prev) => {
      const remainingInvoices = prev.invoices.filter((inv) => inv.id !== invoiceId);
      const nextActiveInvoice = remainingInvoices[remainingInvoices.length - 1];

      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(nextActiveInvoice || null);
      }

      return {
        ...prev,
        invoices: remainingInvoices,
        shippingAddress: formatShippingAddress(nextActiveInvoice),
      };
    });
  };

  const validateDispatchForm = (): string | null => {
    if (!formData.invoices || formData.invoices.length === 0) {
      return 'Please select at least one invoice';
    }

    const customerId = formData.invoices[0]?.customerId || formData.invoices[0]?.customer?.id;
    if (!customerId) {
      return 'Selected invoice does not contain a valid Customer ID';
    }

    if (!formData.dispatchDate) {
      return 'Please select a valid dispatch date';
    }

    if (formData.invoices.some((inv) => !inv.dispatchCode)) {
      return 'Please select dispatch method of all the invoices';
    }
    
    if (formData.invoices.some((inv) => !inv.salesPersonId)) {
      return 'Please select sales person of all the invoices';
    }

    const freightCostNum = parseFloat(formData.freightCost);
    if (isNaN(freightCostNum) || freightCostNum < 0) {
      return 'Freight Cost must be a valid non-negative number';
    }

    const freightChargeNum = parseFloat(formData.freightCharge);
    if (isNaN(freightChargeNum) || freightChargeNum < 0) {
      return 'Freight Charge must be a valid non-negative number';
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const errorMessage = validateDispatchForm();
    if (errorMessage) {
      showToast({ type: 'error', title: 'Validation Error', message: errorMessage });
      return;
    }

    setSubmitting(true);

    try {
      const primaryInvoice = formData.invoices[0];
      const customerId = primaryInvoice.customerId || primaryInvoice.customer?.id;

      const payload = {
        ...formData,
        customerId,
        freightCost: String(parseFloat(formData.freightCost) || 0),
        freightCharge: String(parseFloat(formData.freightCharge) || 0),
        invoices: formData.invoices.map((inv) => ({
          id: inv.id,
          dispatchCode: inv.dispatchCode,
          salesPersonId: getSalesPerson(inv) || formData.salesPerson,
        })),
      };

      await api.post('/dispatch', payload);

      showToast({ type: 'success', title: 'Dispatch created successfully' });
      router.push('/admin/dispatches');
    } catch (error: any) {
      const apiError = error?.response?.data?.message || 'Failed to save dispatch';
      showToast({
        type: 'error',
        title: 'Failed to save dispatch',
        message: apiError,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) {
    return (
      <AdminShell title="Dispatch Methods">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    );
  }

  const dispatchMethodOptions = dispatchMethods.map((item) => ({
    label: item.label,
    value: String(item.code),
  }));

  const grandTotalAmount =
    selectedInvoice?.items?.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0) ?? 0;

  return (
    <AdminShell title="New Dispatch">
      <form onSubmit={handleSave}>
        {/* Action Controls */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mb-6">
          <Sheet
            open={showLastDispatches}
            onOpenChange={(open) => {
              if (open && formData.invoices.length === 0) {
                showToast({
                  type: 'info',
                  title: 'Select an invoice first',
                  message: 'Please search and select an invoice to view previous customer dispatches.',
                });
                return;
              }
              setShowLastDispatches(open);
            }}
          >
            <SheetTrigger
              type="button"
              className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-aqua disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
            >
              Show Last Dispatch
            </SheetTrigger>

            {/* Sheet Drawer Content */}
            <SheetContent className="bg-white sm:max-w-md w-full overflow-y-auto p-6">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-base font-semibold text-slate-800">
                  Customer Dispatch History
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  {formData.invoices[0]?.customer?.name
                    ? `Showing previous dispatches for ${formData.invoices[0].customer.name}`
                    : 'Recent customer dispatch records.'}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                {loadingLastDispatches ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Loading dispatch history...
                  </div>
                ) : lastDispatches.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-lg">
                    No previous dispatches found for this customer.
                  </div>
                ) : (
                  lastDispatches.map((dispatch: any) => (
                    <div
                      key={dispatch.id}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
                    >
                      {/* Top Row: Date & Salesperson */}
                      <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            Date: {dispatch.dispatchDate ? new Date(dispatch.dispatchDate).toLocaleDateString() : 'N/A'}
                          </span>
                          {/* <span className="text-slate-500 text-[11px]">
                            Salesperson: <strong className="text-slate-700">{dispatch.salesPerson || 'N/A'}</strong>
                          </span> */}
                        </div>
                        {dispatch.conNote ? (
                          <span className="bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded text-[10px]">
                            Con: {dispatch.conNote}
                          </span>
                        ) : null}
                      </div>

                      {/* Dispatched Invoices List */}
                      <div>
                        <span className="font-medium text-slate-600 block mb-1">Invoices Dispatched:</span>
                        <div className="space-y-1.5">
                          {dispatch.DispatchedInvoices?.map((di: any) => (
                            <div
                              key={di.id}
                              className="flex justify-between items-center bg-white p-2 rounded border border-slate-200"
                            >
                              <span className="font-mono font-medium text-slate-800">
                                {di.Invoice?.invoiceNumber || di.invoiceId}
                              </span>
                              <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                                {di.DispatchMethod?.label || di.dispatchCode || 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Freight Details */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded border border-slate-200">
                        <div>
                          <span className="text-slate-400">Freight Cost: </span>
                          <span className="font-mono font-semibold text-slate-700">
                            ${Number(dispatch.freightCost || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Freight Charge: </span>
                          <span className="font-mono font-semibold text-slate-700">
                            ${Number(dispatch.freightCharge || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Address */}
                      {dispatch.shippingAddress && (
                        <div>
                          <span className="text-slate-400 block mb-0.5 text-[10px]">Shipping Address:</span>
                          <p className="whitespace-pre-line text-slate-600 bg-white p-2 rounded border border-slate-200 font-mono text-[10px]">
                            {dispatch.shippingAddress}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Form Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-8 space-y-6">

            {/* Dispatch & Sales Details Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Dispatch & Sales Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">


                {/* Multi-Invoice Selector Dropdown */}
                <div className="relative sm:col-span-2" ref={dropdownRef}>
                  <Input
                    label="Search Invoices"
                    placeholder="Search & add invoice..."
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    onFocus={() => {
                      if (invoices.length > 0) setShowInvoiceDropdown(true);
                    }}
                  />

                  {/* Dropdown Menu */}
                  {showInvoiceDropdown && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto text-sm">
                      {loadingInvoices ? (
                        <div className="p-3 text-xs text-slate-500 text-center">Searching invoices...</div>
                      ) : invoices.length > 0 ? (
                        invoices.map((inv) => {
                          const isAlreadySelected = formData.invoices.some((s) => s.id === inv.id);
                          return (
                            <div
                              key={inv.id}
                              className={`p-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                                isAlreadySelected || inv.Dispatched ? 'opacity-50 bg-slate-50' : ''
                              }`}
                              onClick={() => handleSelectInvoice(inv)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800">{inv.invoiceNumber}</span>
                                <span className="text-xs text-slate-400 font-mono">${inv.total}</span>
                              </div>
                              {inv.customer?.name && (
                                <div className="text-xs text-slate-500 mt-0.5 flex justify-between">
                                  <span>{inv.customer.name}</span>
                                  <span className="font-mono">({inv.customer.customerNumber})</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 text-xs text-slate-500 text-center">No invoices found</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Input
                    label="Dispatch Date"
                    type="date"
                    value={formData.dispatchDate}
                    onChange={(e) => handleChange('dispatchDate', e.target.value)}
                  />
                </div>
              </div>
              {/* Selected Invoices Badges */}
              {formData.invoices.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Selected Invoices ({formData.invoices.length}):
                    </span>
                    {formData.invoices[0]?.customer?.name && (
                      <span className="text-xs text-slate-500 font-medium">
                        Customer: <strong className="text-slate-700">{formData.invoices[0].customer.name}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.invoices.map((inv) => (
                      <span
                        key={inv.id}
                        className={`inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-md border cursor-pointer ${
                          selectedInvoice?.id === inv.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200'
                        }`}
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setFormData((prev) => ({
                            ...prev,
                            shippingAddress: formatShippingAddress(inv),
                            salesPerson: getSalesPerson(inv),
                          }));
                        }}
                      >
                        <span>{inv.invoiceNumber}</span>
                        <span className="text-slate-400 font-mono text-[10px]">(${inv.total})</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveInvoice(inv.id);
                          }}
                          className="ml-1 text-slate-400 hover:text-red-500 focus:outline-none text-xs font-bold"
                          title="Remove invoice"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div>
                  <Select
                    label="Dispatch Method"
                    options={dispatchMethodOptions}
                    placeholder="Select Method..."
                    value={
                      selectedInvoice?.dispatchCode
                        ? selectedInvoice.dispatchCode
                        : selectedInvoice?.dispatch?.method || ''
                    }
                    onChange={(e: any) => {
                      const value = e.target ? e.target.value : e;
                      setFormData((prev) => ({
                        ...prev,
                        invoices: prev.invoices.map((invoice) =>
                          invoice.id === selectedInvoice?.id
                            ? { ...invoice, dispatchCode: value, dispatch: null }
                            : invoice
                        ),
                      }));
                      setSelectedInvoice((prev) =>
                        prev ? { ...prev, dispatchCode: value, dispatch: null } : null
                      );
                    }}
                    disabled={!selectedInvoice}
                  />
                </div>
                <div>
                  <Select
                    label="Sales Person"
                    options={users.map((user) => ({
                      value: user.id,
                      label: `${user.firstName} ${user.lastName}`,
                    }))}
                    disabled={!selectedInvoice}
                    value={selectedInvoice?.salesPersonId || ''}
                    onChange={(e: any) => handleSalesPersonChange(e.target ? e.target.value : e)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Con Note"
                    placeholder="Enter consignment note..."
                    type="text"
                    value={formData.conNote}
                    onChange={(e) => handleChange('conNote', e.target.value)}
                  />
                </div>
              </div>


            </div>

            {/* Smart Aggregated Invoice Line Items Card */}
            {selectedInvoice && (
              <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-700">Consolidated Invoice Items</h2>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {selectedInvoice?.items?.length || 0} {(selectedInvoice?.items?.length || 0) === 1 ? 'item' : 'items'}
                  </span>
                </div>














                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="pb-2">Inv #</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-center">Qty</th>
                        <th className="pb-2 text-center">Backorder</th>
                        <th className="pb-2 text-right">Unit Price</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedInvoice?.items?.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-mono text-slate-500 text-[11px]">
                            {selectedInvoice.invoiceNumber || '—'}
                          </td>
                          <td className="py-2.5 font-medium text-slate-800">
                            {item.description || 'N/A'}
                          </td>
                          <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                          <td className="py-2.5 text-center">
                            {item.backorderQty > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium">
                                {item.backorderQty}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">0</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-mono">${Number(item.unitPrice).toFixed(2)}</td>
                          <td className="py-2.5 text-right font-semibold font-mono text-slate-800">
                            ${Number(item.lineTotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 font-semibold text-slate-800">
                        <td colSpan={5} className="pt-3 text-right">
                          Items Subtotal:
                        </td>
                        <td className="pt-3 text-right font-mono text-sm">${grandTotalAmount.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Freight Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Shipping Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Customer Number"
                    placeholder="Enter customer number..."
                    type="text"
                    disabled={true}
                    value={formData.invoices[0]?.customer?.customerNumber || ''}
                  />
                </div>

                <div>
                  <Input
                    label="Receipt Number"
                    placeholder="Receipt No."
                    type="text"
                    disabled={true}
                    value={formData.invoices[0]?.receiptNumber || ''}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Textarea
                    label="Shipping Address"
                    placeholder="Customer shipping address..."
                    value={formData.shippingAddress}
                    onChange={(e: any) => handleChange('shippingAddress', e.target ? e.target.value : e)}
                    readOnly={true}
                  />
                </div>

                <div>
                  <Input label="Trade Terms" placeholder="Trade Terms..." type="text" disabled={true} value="" />
                </div>

                {/* <div>
                  <Input label="Dispatch Number" placeholder="Dispatch Number..." type="text" value="" />
                </div> */}

                <div>
                  <Input
                    label="Invoice Date"
                    type="date"
                    disabled={true}
                    value={formatIsoToDateInput(selectedInvoice?.createdAt)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Freight & Charges</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <div>
                  <Input
                    label="Freight Cost ($)"
                    placeholder="0.00"
                    type="text"
                    disabled
                    value={selectedInvoice?.freight || ''}
                    onChange={(e) => handleChange('freightCost', e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Freight Charge ($)"
                    placeholder="0.00"
                    type="text"
                    value={formData.freightCharge}
                    onChange={(e) => handleChange('freightCharge', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminShell>
  );
}