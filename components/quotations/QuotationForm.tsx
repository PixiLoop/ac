'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { QuotationDetailsSection } from './sections/QuotationDetailsSection'
import { SalesOrderItemsSection } from '../../components/salesorders/sections/SalesOrderItemsSection';
import { SalesOrderCharges } from '../../components/salesorders/SalesOrderCharges';
import { ShippingDetailsSection } from '../salesorders/sections/ShippingDetailsSection'
import { AccountDetailsSection } from '../salesorders/sections/AccountDetailsSection'
import { useToast } from '../../components/ui/toast';
import { api } from '../../lib/api-client';
import { useRouter } from 'next/navigation';

export function QuotationForm({ mode = 'create', initialData }: any) {
  const { showToast } = useToast();
  const router = useRouter();
  const isView = mode === 'view';

  const [generalCharges, setGeneralCharges] = useState({ sundries: 0, labour: 0, rounding: 0, otherCharges: 0 });
  const [premiumCharges, setPremiumCharges] = useState({ sundries: 0, labour: 0, rounding: 0 });
  const [essentialCharges, setEssentialCharges] = useState({ sundries: 0, labour: 0, rounding: 0 });
  const [ongoingCharges, setOngoingCharges] = useState({ sundries: 0, labour: 0, rounding: 0 });

  const [form, setForm] = useState(
    initialData || {

      customerId: '',
      shippingName: '',
      shippingAddress1: '',
      shippingCity: '',
      shippingState: '',
      shippingPostcode: '',

      accountName: '',
      accountAddress1: '',
      accountCity: '',
      accountState: '',
      accountPostcode: '',

      quotationDate: '',
      expiryDate: '',
      salesFactor: 1,

      priceLevel: 'RETAIL',
      paymentTerms: 'DAYS_30',

      gstExempt: false,
      hasGeneral: true,
      hasPremium: false,
      hasEssential: false,
      hasOngoing: false,
      dispatchMethod: ''
    }
  )

  // Guard: only populate from initialData once — prevents parent re-renders
  // from resetting user edits back to DB values mid-session
  const formInitialized = useRef(false)

  useEffect(() => {
    if (!initialData) return;
    setGeneralCharges({
      sundries: Number(initialData.sundries ?? 0),
      labour: Number(initialData.labour ?? 0),
      rounding: Number(initialData.rounding ?? 0),
      otherCharges: Number(initialData.otherCharges ?? 0),
    });
  }, [initialData]);

  useEffect(() => {
    if (!initialData || formInitialized.current) return;
    formInitialized.current = true
    setForm({
      ...initialData,

      quotationDate: initialData.quotationDate
        ? initialData.quotationDate.substring(0, 10)
        : '',

      expiryDate: initialData.expiryDate
        ? initialData.expiryDate.substring(0, 10)
        : '',

      // Normalise shipping — edit page mapper may use address1/city/state
      shippingName: initialData.shippingName ?? initialData.name ?? '',
      shippingAddress1: initialData.shippingAddress1 ?? initialData.address1 ?? '',
      shippingAddress2: initialData.shippingAddress2 ?? initialData.address2 ?? '',
      shippingCity: initialData.shippingCity ?? initialData.city ?? '',
      shippingState: initialData.shippingState ?? initialData.state ?? '',
      shippingPostcode: initialData.shippingPostcode ?? initialData.postcode ?? '',

      // Normalise billing — edit page mapper uses accountName/accountAddress1
      accountName: initialData.accountName ?? initialData.billingName ?? '',
      accountAddress1: initialData.accountAddress1 ?? initialData.billingAddress1 ?? '',
      accountAddress2: initialData.accountAddress2 ?? initialData.billingAddress2 ?? '',
      accountCity: initialData.accountCity ?? initialData.billingCity ?? '',
      accountState: initialData.accountState ?? initialData.billingState ?? '',
      accountPostcode: initialData.accountPostcode ?? initialData.billingPostcode ?? '',
    });

  }, [initialData]);

  const update = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const EMPTY_ROW = {
    itemId: '',
    description: '',
    qty: 1,
    unitPrice: 0,
    discountPct: 0,
  };

  const mapItems = (groupType: string) => {
    if (!initialData?.groups) return [{ ...EMPTY_ROW }];

    const group = initialData.groups.find(
      (g: any) => g.groupType === groupType
    );

    if (!group || !group.items?.length)
      return [{ ...EMPTY_ROW }];

    return [
      ...group.items.map((i: any) => ({
        id: i.id,
        itemId: i.productId,
        description: i.description,
        qty: i.quantity,
        unitPrice: Number(i.unitPrice),
        discountPct: Number(i.discountPct ?? 0),
        landedCost: Number(i.landedCost) || 0,
        retailPrice: Number(i.retailPrice ?? 0),
        tradePrice: Number(i.tradePrice ?? 0),
        salesPartnerPrice: Number(i.salesPartnerPrice ?? 0),
        agentPrice: Number(i.agentPrice ?? 0)
      })),
      { ...EMPTY_ROW },
    ];
  };

  const [generalItems, setGeneralItems] = useState([{ ...EMPTY_ROW }]);
  const [premiumItems, setPremiumItems] = useState([{ ...EMPTY_ROW }]);
  const [essentialItems, setEssentialItems] = useState([{ ...EMPTY_ROW }]);
  const [ongoingItems, setOngoingItems] = useState([{ ...EMPTY_ROW }]);

  const premiumHasItems = premiumItems.some(i => i.itemId);
  const essentialHasItems = essentialItems.some(i => i.itemId);
  const ongoingHasItems = ongoingItems.some(i => i.itemId);

  useEffect(() => {
    if (!initialData?.groups) return;

    setGeneralItems(mapItems('GENERAL'));
    setPremiumItems(mapItems('PREMIUM'));
    setEssentialItems(mapItems('ESSENTIAL'));
    setOngoingItems(mapItems('ONGOING'));
  }, [initialData]);

  const handleSubmit = async () => {

    // Validations
    if (!form.customerId) {
      showToast({ type: 'error', title: 'Customer is required' });
      return;
    }

    if (!form.quotationDate) {
      showToast({ type: 'error', title: 'Quotation Date is required' });
      return;
    }

    if (!form.expiryDate) {
      showToast({ type: 'error', title: 'Expiry Date is required' });
      return;
    }

    if (!form.priceLevel) {
      showToast({ type: 'error', title: 'Price Level is required' });
      return;
    }

    if (!form.paymentTerms) {
      showToast({ type: 'error', title: 'Payment Terms is required' });
      return;
    }


    try {
      // Map internal form keys → API field names before sending
      const payload = {
        ...form,
        sundries: generalCharges.sundries,
        labour: generalCharges.labour,
        rounding: generalCharges.rounding,
        otherCharges: generalCharges.otherCharges,
        // Shipping fields
        shippingName: form.shippingName ?? form.name ?? '',
        shippingAddress1: form.shippingAddress1 ?? form.address1 ?? '',
        shippingAddress2: form.shippingAddress2 ?? form.address2 ?? '',
        shippingCity: form.shippingCity ?? form.city ?? '',
        shippingState: form.shippingState ?? form.state ?? '',
        shippingPostcode: form.shippingPostcode ?? form.postcode ?? '',
        // Billing fields — form stores as accountName/accountAddress1 etc.
        billingName: form.accountName ?? '',
        billingAddress1: form.accountAddress1 ?? '',
        billingAddress2: form.accountAddress2 ?? '',
        billingCity: form.accountCity ?? '',
        billingState: form.accountState ?? '',
        billingPostcode: form.accountPostcode ?? '',
      };
      console.log('PAYLOAD:', payload);
      const res =
        mode === 'create'
          ? await api.post('/quotations', payload)
          : await api.patch(`/quotations/${form.id}`, payload);

      const quotationId = res.data?.data?.id ?? res.data.id;

      const saveGroup = async (
        group: string,
        items: any[],
        enabled: boolean
      ) => {
        if (!enabled) return;
        const realItems = items.filter(i => i.itemId);
        if (!realItems.length) return;

        await api.patch(
          `/quotations/${quotationId}/groups/${group}/items`,
          {
            items: realItems.map(i => ({
              id: i.id,
              productId: i.itemId,
              description: i.description,
              quantity: i.qty,
              unitPrice: i.unitPrice,
              discountPct: i.discountPct,
              landedCost: Number(i.landedCost) || 0,
              retailPrice: Number(i.retailPrice ?? 0),
              tradePrice: Number(i.tradePrice ?? 0),
              salesPartnerPrice: Number(i.salesPartnerPrice ?? 0),
              agentPrice: Number(i.agentPrice ?? 0)
            })),
          }
        );
      };

      await saveGroup('GENERAL', generalItems, true);
      await saveGroup('PREMIUM', premiumItems, form.hasPremium);
      await saveGroup('ESSENTIAL', essentialItems, form.hasEssential);
      await saveGroup('ONGOING', ongoingItems, form.hasOngoing);

      showToast({
        type: 'success',
        title: 'Success',
        message: 'Quotation saved successfully.',
      });

      // router.push('/quotations');

    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err?.response?.data?.message || 'Save failed',
      });
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-end gap-2 mb-4">

        {(mode === 'edit' || mode === 'view') && form.salesOrderId && (

          <button
            onClick={() => router.push(`/salesorders/${form.salesOrderId}`)}
            className="text-sm font-semibold text-blue-600 hover:underline border rounded-lg px-4 py-2 bg-muted/40"
          >
            View Sales Order →
          </button>
        )}

        {(mode === 'edit' || mode === 'view') && !form.salesOrderId && (
          <Button
            size="sm"
            type="button"
            onClick={() => router.push(`/salesorders/new?quotationId=${form.id}`)}
          >
            Create Sales Order
          </Button>
        )}

        {mode === 'view' && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/quotations/${form.id}`)}
          >
            Edit
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          Back
        </Button>

        {!isView && !form.salesOrderId && (
          <Button onClick={handleSubmit}>
            Save
          </Button>
        )}

      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5">
          <QuotationDetailsSection
            value={form}
            update={update}
            readOnly={isView}
          />
        </div>

        <div className="col-span-12 lg:col-span-4">
          <ShippingDetailsSection
            value={{
              shippingName: form.shippingName ?? '',
              address1: form.shippingAddress1 ?? '',
              address2: form.shippingAddress2 ?? '',
              city: form.shippingCity ?? '',
              state: form.shippingState ?? '',
              postcode: form.shippingPostcode ?? '',
            }}
            update={(key, val) => {
              // Map ShippingDetailsSection keys → form shipping keys
              const map: Record<string, string> = {
                name: 'shippingName',
                shippingName: 'shippingName',
                address1: 'shippingAddress1',
                address2: 'shippingAddress2',
                city: 'shippingCity',
                state: 'shippingState',
                postcode: 'shippingPostcode',
              }
              update(map[key] ?? key, val)
            }}
            defaultOpen
            readOnly={isView}
          />
        </div>

        <div className="col-span-12 lg:col-span-3">
          <AccountDetailsSection
            value={{
              billingName: form.accountName,
              address1: form.accountAddress1,
              city: form.accountCity,
              state: form.accountState,
              postcode: form.accountPostcode,
            }}
            update={(key, val) => {
              // FIX: AccountDetailsSection's Name input incorrectly calls
              // update('shippingName', ...) due to a bug in that component.
              // We intercept it here and redirect to the correct account keys.
              const map: Record<string, string> = {
                shippingName: 'accountName',   // ← fixes the Name field bug
                billingName: 'accountName',
                address1: 'accountAddress1',
                address2: 'accountAddress2',
                city: 'accountCity',
                state: 'accountState',
                postcode: 'accountPostcode',
              }
              update(map[key] ?? key, val)
            }}
            defaultOpen
            readOnly={true}
          />
        </div>

      </div>


      <GroupSection
        title="General"
        items={generalItems}
        setItems={setGeneralItems}
        charges={generalCharges}
        setCharges={setGeneralCharges}
        category={null}
        gstExempt={form.gstExempt}
        form={form}
        disabled={isView}
      />


      {form.hasPremium && (
        <GroupSection
          title="Premium Hardware"
          items={premiumItems}
          setItems={setPremiumItems}
          category="K3"
          gstExempt={form.gstExempt}
          disabled={isView}
        />
      )}

      {form.hasEssential && (
        <GroupSection
          title="Essential Hardware"
          items={essentialItems}
          setItems={setEssentialItems}
          category="A1"
          gstExempt={form.gstExempt}
          disabled={isView}
        />
      )}

      {form.hasOngoing && (
        <GroupSection
          title="Ongoing"
          items={ongoingItems}
          setItems={setOngoingItems}
          category="X1"
          gstExempt={form.gstExempt}
          disabled={isView}
        />
      )}

      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="outline"
          onClick={() => window.history.back()} className='gap-4'
        >
          Back
        </Button>

        {!isView && !form.salesOrderId && (
          <Button onClick={handleSubmit}>
            Save
          </Button>
        )}

        {form.salesOrderId && !isView && (
          <span className="text-xs text-muted-foreground italic">
            Locked — Sales Order exists
          </span>
        )}

      </div>
    </div>
  );
}

function GroupSection({ title, items, setItems, charges, setCharges, category, disabled, gstExempt = false, form }: any) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-9">
        <SalesOrderItemsSection
          items={items}
          setItems={setItems}
          freight={0}
          category={category}
          disabled={disabled}
          form={form}
          defaultOpen
        />
      </div>
      <div className="col-span-12 lg:col-span-3">
        <SalesOrderCharges
          items={items}
          freight={0}
          sundries={charges?.sundries ?? 0}
          labour={charges?.labour ?? 0}
          rounding={charges?.rounding ?? 0}
          otherCharges={charges?.otherCharges ?? 0}
          gstExempt={gstExempt}
          update={(key, val) => setCharges(prev => ({ ...prev, [key]: val }))}
          readOnly={disabled}
        />
      </div>
    </div>
  );
}
