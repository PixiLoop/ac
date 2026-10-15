'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Plus, Trash2, AlertTriangle } from 'lucide-react';

import { AdminShell } from '../../../components/layout/AdminShell';
import { api } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/toast';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Checkbox } from '../../../components/ui/checkbox';
import { Select } from '../../../components/ui/select';
import { FormSection } from '../../../components/forms/FormSection';
import { AbnLookup } from '../../../components/common/AbnLookup';
import { fetchDispatchMethodOptions } from '../../../components/customers/forms/CustomerDispatchForm';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\-\s]{6,20}$/;

export default function EditCustomerPage({ params }: any) {
  const customerId = params?.id;
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [dispatchMethodOptions, setDispatchMethodOptions] = useState<
    { label: string; value: string }[]
  >([]);

  // Baseline data for dirty check
  const [initialData, setInitialData] = useState<string>('');

  // 1. Details Form State
  const [details, setDetails] = useState({
    name: '',
    registeredName: '',
    abn: '',
    status: 'ACTIVE',
    fmCustomerNumber: '',
    orderRequired: false,
    gstExempt: false,
    isGeneric: false,
    requiresShippingDetails: false,
    fmCustomer: null as any,
  });

  // 2. Contacts State
  const [contacts, setContacts] = useState<any[]>([]);

  // 3. Addresses State & Dynamic Refs
  const [addresses, setAddresses] = useState<any[]>([]);
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const autocompleteRefs = useRef<{ [key: number]: any }>({});

  // 4. Account Details State (Includes Payment Fields)
  const [account, setAccount] = useState({
    creditLimit: '',
    creditHold: false,
    creditHoldReason: '',
    currentBalance: 0,
    accountType: '',
    paymentTerms: 'DAYS_30',
    priceLevel: 'RETAIL',
    salesFactor: '',
    paymentMethod: '',
    gstExempt: false,
    invoiceDelivery: 'PRINT_WITH_GOODS',
  });

  // 5. Dispatches State
  const [dispatches, setDispatches] = useState<any[]>([]);

  const [depots, setDepots] = useState([])

  /* ---------------- Track Unsaved Changes (Dirty State) ---------------- */

  const currentDataSnapshot = useMemo(() => {
    return JSON.stringify({ details, contacts, addresses, account, dispatches });
  }, [details, contacts, addresses, account, dispatches]);

  const isDirty = useMemo(() => {
    if (!initialData) return false;
    return initialData !== currentDataSnapshot;
  }, [initialData, currentDataSnapshot]);

  // Intercept tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  /* ---------------- Init & Load Data ---------------- */

  useEffect(() => {
    fetchDispatchMethodOptions().then(opts => {
      setDispatchMethodOptions(opts);
    });
  }, []);

  const loadCustomer = async () => {
    if (!customerId) {
      setLoading(false);
      setInitialData(
        JSON.stringify({ details, contacts, addresses, account, dispatches })
      );
      return;
    }

    try {
      const res = await api.get(`/customers/${customerId}`);
      const c = res.data.data;

      const loadedDetails = {
        name: c.name || '',
        registeredName: c.registeredName || '',
        abn: c.abn || '',
        status: c.status || 'ACTIVE',
        fmCustomerNumber: c.fmCustomerNumber || '',
        orderRequired: !!c.orderRequired,
        gstExempt: !!c.gstExempt,
        isGeneric: !!c.isGeneric,
        requiresShippingDetails: !!c.requiresShippingDetails,
        fmCustomer: c.fmCustomer ?? null,
      };

      const loadedContacts = c.contacts || [];
      const loadedAddresses = c.addresses || [];

      const loadedAccount = {
        creditLimit: c.creditLimit != null ? String(c.creditLimit) : '',
        creditHold: !!c.creditHold,
        creditHoldReason: c.creditHoldReason ?? '',
        currentBalance: c.currentBalance ?? 0,
        accountType: c.accountType ?? '',
        paymentTerms: c.paymentTerms ?? 'DAYS_30',
        priceLevel: c.priceLevel ?? 'RETAIL',
        salesFactor: c.salesFactor?.toString() ?? '',
        paymentMethod: c.paymentMethod ?? '',
        gstExempt: !!c.gstExempt,
        invoiceDelivery: c.invoiceDelivery ?? 'PRINT_WITH_GOODS',
      };

      const loadedDispatches = c.dispatches || [];
      const loadedDepots = c.Depots || [];

      setDetails(loadedDetails);
      setContacts(loadedContacts);
      setAddresses(loadedAddresses);
      setAccount(loadedAccount);
      setDispatches(loadedDispatches);
      setDepots(loadedDepots);

      // Snapshot clean data baseline
      setInitialData(
        JSON.stringify({
          details: loadedDetails,
          contacts: loadedContacts,
          addresses: loadedAddresses,
          account: loadedAccount,
          dispatches: loadedDispatches,
        })
      );
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load customer',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  /* ---------------- Google Address Autocomplete (Dynamic Multi-Input) ---------------- */

  useEffect(() => {
    const interval = setInterval(() => {
      if (!window.google) return;

      addresses.forEach((_, idx) => {
        const inputEl = inputRefs.current[idx];
        if (!inputEl || autocompleteRefs.current[idx]) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputEl, {
          types: ['address'],
          componentRestrictions: { country: 'au' },
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place?.address_components) return;

          const get = (type: string) =>
            place.address_components.find((c: any) => c.types.includes(type))
              ?.long_name || '';

          const subpremise = get('subpremise');
          const streetNumber = get('street_number');
          const route = get('route');

          const numberPart = subpremise
            ? `${subpremise}/${streetNumber}`
            : streetNumber;
          const street = `${numberPart} ${route}`.trim();

          setAddresses(prev => {
            const updated = [...prev];
            if (updated[idx]) {
              updated[idx] = {
                ...updated[idx],
                address1: street,
                city: get('locality'),
                state: get('administrative_area_level_1'),
                postcode: get('postal_code'),
              };
            }
            return updated;
          });
        });

        autocompleteRefs.current[idx] = autocomplete;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [addresses.length]);

  /* ---------------- Handlers for Sub-Arrays ---------------- */

  const addContact = () => {
    setContacts(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        category: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'GENERAL',
        isPrimary: false,
      },
    ]);
  };

  const updateContact = (index: number, field: string, value: any) => {
    setContacts(prev => {
      const updated = [...prev];
      if (field === 'isPrimary' && value === true) {
        updated.forEach(c => (c.isPrimary = false));
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const addAddress = () => {
    setAddresses(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        type: 'SHIPPING',
        address1: '',
        city: '',
        state: '',
        postcode: '',
        isDefault: false,
      },
    ]);
  };

  const updateAddress = (index: number, field: string, value: any) => {
    setAddresses(prev => {
      const updated = [...prev];
      if (field === 'isDefault' && value === true) {
        updated.forEach(a => (a.isDefault = false));
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeAddress = (index: number) => {
    delete autocompleteRefs.current[index];
    delete inputRefs.current[index];
    setAddresses(prev => prev.filter((_, i) => i !== index));
  };

  const addDispatch = () => {
    setDispatches(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        method: dispatchMethodOptions[0]?.value ?? '',
        accountNo: '',
        accountName: '',
        charge: '',
        reference: '',
        isDefault: false,
      },
    ]);
  };
  const addDepots = () => {
    setDepots(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        code: "",
        name: "",
        createdAt: "",
        updatedAt: "",
        customerId: ""
      },
    ]);
  };

  const updateDispatch = (index: number, field: string, value: any) => {
    setDispatches(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const updateDepot = (index: number, field: string, value: any) => {
    setDepots(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeDispatch = (index: number) => {
    setDispatches(prev => prev.filter((_, i) => i !== index));
  };
  const removeDepot = (index: number) => {
    setDepots(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelModal(true);
    } else {
      router.push('/customers');
    }
  };

  /* ---------------- Global Save ---------------- */

  const handleGlobalSave = async () => {
    // 1. Customer Details Validation
    const abn = details.abn.trim();
    if (!abn) return showToast({ type: 'error', title: 'Validation error', message: 'ABN is required' });
    if (!/^\d+$/.test(abn)) return showToast({ type: 'error', title: 'Validation error', message: 'ABN must contain numbers only' });
    if (abn.length !== 11) return showToast({ type: 'error', title: 'Validation error', message: 'ABN must be exactly 11 digits' });
    if (!details.registeredName.trim()) return showToast({ type: 'error', title: 'Validation error', message: 'Registered Name is required' });
    if (!details.name.trim()) return showToast({ type: 'error', title: 'Validation error', message: 'Customer Name is required' });

    // 2. Contacts Validation
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (!c.category?.trim()) return showToast({ type: 'error', title: `Contact #${i + 1}`, message: 'Category is required' });
      if (!c.firstName?.trim()) return showToast({ type: 'error', title: `Contact #${i + 1}`, message: 'First Name is required' });
      if (!c.lastName?.trim()) return showToast({ type: 'error', title: `Contact #${i + 1}`, message: 'Last Name is required' });
      if (c.email?.trim() && !emailRegex.test(c.email)) return showToast({ type: 'error', title: `Contact #${i + 1}`, message: 'Invalid email address' });
      if (c.phone?.trim() && !phoneRegex.test(c.phone)) return showToast({ type: 'error', title: `Contact #${i + 1}`, message: 'Invalid phone number' });
      if (!c.email?.trim() && !c.phone?.trim()) return showToast({ type: 'error', title: `Contact #${i + 1}`, message: 'Email or Phone is required' });
    }

    // 3. Addresses Validation
    for (let i = 0; i < addresses.length; i++) {
      const a = addresses[i];
      if (!a.type) return showToast({ type: 'error', title: `Address #${i + 1}`, message: 'Address Type is required' });
      if (!a.address1?.trim()) return showToast({ type: 'error', title: `Address #${i + 1}`, message: 'Address is required' });
      if (!a.city?.trim()) return showToast({ type: 'error', title: `Address #${i + 1}`, message: 'City is required' });
      if (!a.state?.trim()) return showToast({ type: 'error', title: `Address #${i + 1}`, message: 'State is required' });
      if (!a.postcode?.trim()) return showToast({ type: 'error', title: `Address #${i + 1}`, message: 'Postcode is required' });
    }

    // 4. Account Details Validation
    if (!account.creditLimit.trim()) return showToast({ type: 'error', title: 'Validation error', message: 'Credit limit is required' });
    if (isNaN(Number(account.creditLimit))) return showToast({ type: 'error', title: 'Validation error', message: 'Please enter a valid credit limit' });
    if (account.creditHold && !account.creditHoldReason.trim()) return showToast({ type: 'error', title: 'Validation error', message: 'Credit hold reason is required' });

    let parsedSalesFactor = account.salesFactor;
    if (account.salesFactor) {
      const sf = Number(account.salesFactor);
      if (isNaN(sf) || sf >= 10000 || sf < 0) {
        return showToast({
          type: 'error',
          title: 'Validation error',
          message: 'Sales Factor must be a number between 0 and 9999.99',
        });
      }
      parsedSalesFactor = parseFloat(sf.toFixed(2)).toString();
    }

    const requiredAccountFields: { key: keyof typeof account; label: string }[] = [
      { key: 'accountType', label: 'Account Type' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'paymentTerms', label: 'Payment Terms' },
      { key: 'priceLevel', label: 'Price Level' },
      { key: 'salesFactor', label: 'Sales Factor' },
    ];

    for (const field of requiredAccountFields) {
      const value = account[field.key];
      if (!value || value.toString().trim() === '') {
        return showToast({ type: 'error', title: 'Validation error', message: `${field.label} is required` });
      }
    }

    // 5. Dispatches Validation
    for (let i = 0; i < dispatches.length; i++) {
      const d = dispatches[i];
      if (!d.method) return showToast({ type: 'error', title: `Dispatch #${i + 1}`, message: 'Dispatch Method is required' });
      if (!d.accountNo?.trim()) return showToast({ type: 'error', title: `Dispatch #${i + 1}`, message: 'Dispatch Account No is required' });
      if (!d.accountName?.trim()) return showToast({ type: 'error', title: `Dispatch #${i + 1}`, message: 'Dispatch Account Name is required' });
      if (!String(d.charge ?? '').trim()) return showToast({ type: 'error', title: `Dispatch #${i + 1}`, message: 'Dispatch Charge is required' });
    }

    // 6. Depots Validation
    for (let i = 0; i < depots.length; i++) {
      const d = depots[i];
      if (!d.code) return showToast({ type: 'error', title: `Depot #${i + 1}`, message: 'Depot code is required' });
      if (!d.name?.trim()) return showToast({ type: 'error', title: `Depot #${i + 1}`, message: 'Depot Name is required' });
    }

    setSaving(true);
    try {
      let targetId = customerId;

      if (customerId) {
        await api.patch(`/customers/${customerId}/details`, {
          name: details.name || '',
          registeredName: details.registeredName || '',
          abn: details.abn || '',
          status: details.status || 'ACTIVE',
          fmCustomerNumber: details.fmCustomerNumber || '',
          orderRequired: details.orderRequired || false,
          gstExempt: !!details.gstExempt,
          isGeneric: !!details.isGeneric,
          requiresShippingDetails: !!details.requiresShippingDetails,
        });
      } else {
        const res = await api.post('/customers', details);
        targetId = res.data?.data?.id;
        if (!targetId) throw new Error('Customer ID missing');
      }

      const cleanedContacts = contacts.map(({ id, ...rest }) =>
        id?.toString().startsWith('temp-') ? rest : { id, ...rest }
      );
      const cleanedAddresses = addresses.map(({ id, ...rest }) =>
        id?.toString().startsWith('temp-') ? rest : { id, ...rest }
      );
      const cleanedDispatches = dispatches.map(({ id, ...rest }) =>
        id?.toString().startsWith('temp-') ? rest : { id, ...rest }
      );
      const cleanedDepots = depots.map(({ id, ...rest }) =>
        id?.toString().startsWith('temp-') ? rest : { id, ...rest }
      );

      await Promise.all([
        api.patch(`/customers/${targetId}/contacts`, { contacts: cleanedContacts }),
        api.patch(`/customers/${targetId}/addresses`, { addresses: cleanedAddresses }),
        api.patch(`/customers/${targetId}/account`, {
          creditLimit: account.creditLimit === '' ? null : Number(account.creditLimit),
          creditHold: account.creditHold,
          creditHoldReason: account.creditHold ? account.creditHoldReason : null,
        }),
        api.patch(`/customers/${targetId}/dispatches`, { dispatches: cleanedDispatches }),
        api.patch(`/customers/${targetId}/depots`, { depots: cleanedDepots }),
        api.patch(`/customers/${targetId}/payment`, {
          accountType: account.accountType,
          paymentTerms: account.paymentTerms,
          priceLevel: account.priceLevel,
          salesFactor: parsedSalesFactor ? Number(parsedSalesFactor) : null,
          paymentMethod: account.paymentMethod,
          gstExempt: account.gstExempt,
          invoiceDelivery: account.invoiceDelivery || 'PRINT_WITH_GOODS',
        }),
      ]);

      showToast({ type: 'success', title: 'Customer saved successfully' });

      setInitialData(currentDataSnapshot);

      if (!customerId) {
        router.replace(`/customers/${targetId}`);
      } else {
        loadCustomer();
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err?.response?.data?.message || 'Unexpected error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <AdminShell title={customerId ? 'Edit Customer' : 'New Customer'}>
      <div className="space-y-4 pb-20">
        {/* CUSTOMER DETAILS */}
        <div className="flex justify-between items-center pt-2">
          <div>
            {isDirty && (
              <span className="inline-flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <AlertTriangle className="h-3 w-3 mr-1" /> Unsaved changes
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" disabled={saving} onClick={handleCancel}>
              Cancel
            </Button>

            <Button onClick={handleGlobalSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>

        <FormSection title="Customer Details" required defaultOpen={true}>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <AbnLookup
                label="ABN"
                value={details.abn}
                onChange={v => setDetails(f => ({ ...f, abn: v }))}
                onSelect={r => {
                  setDetails(f => ({
                    ...f,
                    abn: r.Abn,
                    registeredName: r.Name,
                    gstExempt: r.Gst === 'N',
                  }));
                }}
              />

              <Input
                label="Registered Name"
                required
                placeholder="Registered business name"
                value={details.registeredName}
                onChange={e =>
                  setDetails(f => ({ ...f, registeredName: e.target.value }))
                }
              />

              <Input
                label="Customer Name"
                required
                placeholder="Enter customer name"
                sanitizeType="name"
                value={details.name}
                onChange={e =>
                  setDetails(f => ({ ...f, name: e.target.value }))
                }
              />

              <div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">FM Customer Number</label>
                  {details.fmCustomer?.id && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/admin/fm-customers/${details.fmCustomer.id}/view`
                        )
                      }
                      className="text-slate-400 hover:text-slate-700 transition"
                      title="Open FM Customer"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Input
                  readOnly
                  value={details.fmCustomerNumber || ''}
                  placeholder="External system reference"
                />
              </div>

              <Select
                placeholder="Customer Status"
                value={details.status}
                onChange={v => {
                  setDetails(f => ({
                    ...f,
                    status: v,
                    ...(v === 'STOP_CREDIT' ? { creditHold: true } : {}),
                  }));
                }}
                options={[
                  { label: 'Active', value: 'ACTIVE' },
                  { label: 'Inactive', value: 'INACTIVE' },
                  { label: 'Overdue', value: 'OVERDUE' },
                  { label: 'Credit Hold', value: 'STOP_CREDIT' },
                  { label: 'Closed', value: 'CLOSED' },
                ]}
              />

              <Checkbox
                label="Order Required (PO mandatory)"
                checked={details.orderRequired}
                onChange={v => setDetails(f => ({ ...f, orderRequired: v }))}
              />

              <Checkbox
                label="Generic Customer (for walk-in / Free Hand Invoices)"
                checked={details.isGeneric}
                onChange={v => setDetails(f => ({ ...f, isGeneric: v }))}
              />

              {details.isGeneric && (
                <Checkbox
                  label="Requires Shipping Details on each Invoice (e.g. Postal/web sales account)"
                  checked={details.requiresShippingDetails}
                  onChange={v =>
                    setDetails(f => ({ ...f, requiresShippingDetails: v }))
                  }
                />
              )}
            </div>
          </div>
        </FormSection>

        {/* CONTACT DETAILS */}
        <FormSection
          title="Contact Details"
          defaultOpen={true}
          rightAction={
            <Button size="sm" type="button" onClick={addContact}>
              <Plus className="h-4 w-4 mr-1" /> Add Contact
            </Button>
          }
        >
          <div className="space-y-4">
            {contacts.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No contacts added.</p>
            ) : (
              contacts.map((contact, idx) => (
                <div
                  key={contact.id || idx}
                  className="p-3 border rounded-md bg-slate-50 relative space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">
                      Contact #{idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContact(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    <Select
                      label="Category"
                      placeholder="Select Category"
                      value={contact.category || ''}
                      onChange={v => updateContact(idx, 'category', v)}
                      options={[
                        { label: 'Account', value: 'ACCOUNT' },
                        { label: 'Shipping', value: 'SHIPPING' },
                      ]}
                    />
                    <Input
                      label="First Name"
                      sanitizeType="name"
                      value={contact.firstName || ''}
                      onChange={e =>
                        updateContact(idx, 'firstName', e.target.value)
                      }
                    />
                    <Input
                      label="Last Name"
                      sanitizeType="name"
                      value={contact.lastName || ''}
                      onChange={e =>
                        updateContact(idx, 'lastName', e.target.value)
                      }
                    />
                    <Input
                      label="Email"
                      value={contact.email || ''}
                      onChange={e =>
                        updateContact(idx, 'email', e.target.value)
                      }
                    />
                    <Input
                      label="Phone"
                      value={contact.phone || ''}
                      onChange={e =>
                        updateContact(idx, 'phone', e.target.value)
                      }
                    />
                  </div>
                  <Checkbox
                    label="Primary contact"
                    checked={!!contact.isPrimary}
                    onChange={v => updateContact(idx, 'isPrimary', v)}
                  />
                </div>
              ))
            )}
          </div>
        </FormSection>

        {/* ADDRESS DETAILS */}
        <FormSection
          title="Address Details"
          defaultOpen={true}
          rightAction={
            <Button size="sm" type="button" onClick={addAddress}>
              <Plus className="h-4 w-4 mr-1" /> Add Address
            </Button>
          }
        >
          <div className="space-y-4">
            {addresses.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No addresses added.</p>
            ) : (
              addresses.map((addr, idx) => (
                <div
                  key={addr.id || idx}
                  className="p-3 border rounded-md bg-slate-50 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">
                      Address #{idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAddress(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <Select
                      placeholder="Address Type"
                      label="Address Type"
                      value={addr.type || 'SHIPPING'}
                      onChange={v => updateAddress(idx, 'type', v)}
                      options={[
                        { label: 'Shipping', value: 'SHIPPING' },
                        { label: 'Postal', value: 'POSTAL' },
                        // { label: 'Statement', value: 'STATEMENT' },
                        { label: 'Charge', value: 'CHARGE' },
                      ]}
                    />

                    <Input
                      label="Address"
                      ref={el => {
                        inputRefs.current[idx] = el;
                      }}
                      value={addr.address1 || ''}
                      placeholder="Start typing address..."
                      onChange={e =>
                        updateAddress(idx, 'address1', e.target.value)
                      }
                    />

                    <Input
                      label="City"
                      value={addr.city || ''}
                      onChange={e =>
                        updateAddress(idx, 'city', e.target.value)
                      }
                    />

                    <Input
                      label="State"
                      value={addr.state || ''}
                      onChange={e =>
                        updateAddress(idx, 'state', e.target.value)
                      }
                    />

                    <Input
                      label="Postcode"
                      value={addr.postcode || ''}
                      onChange={e =>
                        updateAddress(idx, 'postcode', e.target.value)
                      }
                    />
                  </div>

                  <Checkbox
                    label="Default Address"
                    checked={!!addr.isDefault}
                    onChange={v => updateAddress(idx, 'isDefault', v)}
                  />
                </div>
              ))
            )}
          </div>
        </FormSection>

        {/* ACCOUNT DETAILS */}
        <FormSection title="Account Details" defaultOpen={true}>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Input
                label="Credit Limit"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={account.creditLimit}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                    setAccount(f => ({ ...f, creditLimit: val }));
                  }
                }}
              />

              <Input
                label="Current Balance"
                value={account.currentBalance}
                disabled
              />

              <Select
                label="Account Type"
                placeholder="Account Type"
                value={account.accountType}
                onChange={v => setAccount(f => ({ ...f, accountType: v }))}
                options={[
                  { label: 'Main', value: 'Main' },
                  { label: 'Depot', value: 'Depot' },
                ]}
              />

              <Select
                label="Payment Method"
                placeholder="Payment Method"
                value={account.paymentMethod}
                onChange={v => setAccount(f => ({ ...f, paymentMethod: v }))}
                options={[
                  { label: 'Cash', value: 'Cash' },
                  { label: 'EFT', value: 'EFT' },
                  { label: 'Credit Card', value: 'Credit Card' },
                  { label: 'MOTO', value: 'MOTO' },
                ]}
              />

              <Select
                label="Payment Terms"
                placeholder="Payment Terms"
                value={account.paymentTerms}
                onChange={v => setAccount(f => ({ ...f, paymentTerms: v }))}
                options={[
                  { label: '14 Days', value: 'DAYS_14' },
                  { label: '30 Days', value: 'DAYS_30' },
                  { label: '60 Days', value: 'DAYS_60' },
                  { label: '90 Days', value: 'DAYS_90' },
                  { label: 'COD', value: 'COD' },
                  { label: 'PAY NOW', value: 'PAY_NOW' },
                ]}
              />

              <Select
                label="Price Level"
                placeholder="Price Level"
                value={account.priceLevel}
                onChange={v => setAccount(f => ({ ...f, priceLevel: v }))}
                options={[
                  { label: 'Retail', value: 'RETAIL' },
                  { label: 'Trade', value: 'TRADE' },
                  { label: 'Sales Partner', value: 'SALES_PARTNER' },
                  { label: 'Agent', value: 'AGENT' },
                ]}
              />

              <Input
                label="Sales Factor"
                placeholder="Sales Factor"
                value={account.salesFactor}
                onChange={e =>
                  setAccount(f => ({ ...f, salesFactor: e.target.value }))
                }
              />

              <div className="flex items-center pt-6">
                <Checkbox
                  label="GST Exempt"
                  checked={!!account.gstExempt}
                  onChange={v => setAccount(f => ({ ...f, gstExempt: v }))}
                />
              </div>
            </div>

            {/* <Checkbox
              label="Credit hold"
              checked={account.creditHold}
              onChange={v => setAccount(f => ({ ...f, creditHold: v }))}
            />

            {account.creditHold && (
              <Input
                label="Credit hold reason"
                value={account.creditHoldReason}
                onChange={e =>
                  setAccount(f => ({ ...f, creditHoldReason: e.target.value }))
                }
              />
            )} */}
          </div>
        </FormSection>

        <FormSection title="Documentation" defaultOpen={true}>
          <div className="max-w-md">
            <Select
              label="Invoices"
              value={account.invoiceDelivery}
              onChange={v => setAccount(f => ({ ...f, invoiceDelivery: v }))}
              options={[
                { label: 'Email as PDF', value: 'EMAIL_PDF' },
                { label: 'Print and send with goods', value: 'PRINT_WITH_GOODS' },
              ]}
            />
            <p className="text-xs text-slate-500 mt-2">
              Email as PDF asks to email the invoice when it is saved. Print and send with goods does not ask.
            </p>
          </div>
        </FormSection>

        {/* DISPATCH DETAILS */}
        <FormSection
          title="Dispatch Details"
          defaultOpen={true}
          rightAction={
            <Button size="sm" type="button" onClick={addDispatch}>
              <Plus className="h-4 w-4 mr-1" /> Add Dispatch
            </Button>
          }
        >
          <div className="space-y-4">
            {dispatches.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No dispatches added.</p>
            ) : (
              dispatches.map((disp, idx) => (
                <div
                  key={disp.id || idx}
                  className="p-3 border rounded-md bg-slate-50 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">
                      Dispatch #{idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDispatch(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Dispatch Method
                      </label>
                      <Select
                        value={disp.method || ''}
                        options={dispatchMethodOptions}
                        onChange={v => updateDispatch(idx, 'method', v)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Dispatch Account No
                      </label>
                      <Input
                        className="input"
                        maxDigits={12}
                        placeholder="Dispatch Account No"
                        value={disp.accountNo || ''}
                        onChange={e =>
                          updateDispatch(idx, 'accountNo', e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Dispatch Account Name
                      </label>
                      <Input
                        className="input"
                        placeholder="Dispatch Account Name"
                        value={disp.accountName || ''}
                        onChange={e =>
                          updateDispatch(idx, 'accountName', e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Dispatch Charge
                      </label>
                      <Input
                        className="input"
                        placeholder="Dispatch Charge"
                        decimal
                        maxDigits={8}
                        maxDecimals={2}
                        value={disp.charge || ''}
                        onChange={e =>
                          updateDispatch(idx, 'charge', e.target.value)
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm font-medium text-slate-700">
                        Dispatch Reference
                      </label>
                      <Input
                        className="input"
                        placeholder="Dispatch Reference"
                        value={disp.reference || ''}
                        onChange={e =>
                          updateDispatch(idx, 'reference', e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </FormSection>
        <FormSection
          title="Depot Details"
          defaultOpen={true}
          rightAction={
            <Button size="sm" type="button" onClick={addDepots}>
              <Plus className="h-4 w-4 mr-1" /> Add Depot
            </Button>
          }
        >
          <div className="space-y-4">
            {depots.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No depot added.</p>
            ) : (
              depots.map((depot, idx) => (
                <div
                  key={depot.id || idx}
                  className="p-3 border rounded-md bg-slate-50 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">
                      Depot #{idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDepot(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-4">

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Depot Code
                      </label>
                      <Input
                        className="input"
                        maxDigits={12}
                        placeholder="Code"
                        value={depot.code || ''}
                        onChange={e =>
                          updateDepot(idx, 'code', e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Depot Name
                      </label>
                      <Input
                        className="input"
                        placeholder="Depot Name"
                        value={depot.name || ''}
                        onChange={e =>
                          updateDepot(idx, 'name', e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </FormSection>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" disabled={saving} onClick={handleCancel}>
            Cancel
          </Button>

          <Button onClick={handleGlobalSave} loading={saving}>
            Save
          </Button>
        </div>
      </div>

      {/* UNSAVED CHANGES WARNING MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-semibold text-slate-900">
                Unsaved Changes
              </h3>
            </div>
            <p className="text-sm text-slate-600">
              You have unsaved changes on this form. Are you sure you want to discard them and exit?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Editing
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => router.push('/customers')}
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}