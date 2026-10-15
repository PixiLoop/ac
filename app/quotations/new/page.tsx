'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';

import { QuotationDetailsSection } from '../../../components/quotations/sections/QuotationDetailsSection';
import { ShippingDetailsSection } from '../../../components/salesorders/sections/ShippingDetailsSection';
import { AccountDetailsSection } from '../../../components/salesorders/sections/AccountDetailsSection';

import { SalesOrderItemsSection } from '../../../components/salesorders/sections/SalesOrderItemsSection';
import { SalesOrderCharges } from '../../../components/salesorders/SalesOrderCharges';

import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';

export default function NewQuotationPage() {

    const router = useRouter();
    const { showToast } = useToast();


    const [form, setForm] = useState<any>({
        customerId: '',
        priceLevel: 'RETAIL',
        paymentTerms: 'DAYS_30',
        quotationDate: '',
        expiryDate: '',
        requestNumber: '',
        salesFactor: '',
        hasGeneral: true,
        hasPremium: false,
        hasEssential: false,
        hasOngoing: false,
        notes: '',
        gstExempt: false,
        dispatchMethod: ''
    });

    const update = (key: string, value: any) => {
        setForm(prev => ({
            ...prev,
            [key]: value,
        }));
    };


    const [shipping, setShipping] = useState({
        shippingName: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postcode: '',
    });

    const updateShipping = (key: string, value: any) => {
        setShipping(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const [account, setAccount] = useState({
        billingName: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postcode: '',
    });

    // const updateAccount = (key: string, value: any) => {
    //     setAccount(prev => ({
    //         ...prev,
    //         [key]: value,
    //     }));
    // };

    const updateAccount = (key: string, value: any) => {
        setAccount(prev => ({
            ...prev,
            [key === 'shippingName' ? 'billingName' : key]: value,  // ← fix
        }));
    };

    useEffect(() => {

        if (!form.customerId) return;

        async function loadCustomer() {

            try {

                /* CLEAR OLD SHIPPING */
                setShipping({
                    shippingName: '',
                    address1: '',
                    address2: '',
                    city: '',
                    state: '',
                    postcode: '',
                })

                /* CLEAR OLD ACCOUNT */
                setAccount({
                    billingName: '',
                    address1: '',
                    address2: '',
                    city: '',
                    state: '',
                    postcode: '',
                })

                const res = await api.get(`/customers/${form.customerId}`);
                const data = res.data?.data ?? res.data;

                const addresses = data.addresses || [];

                const shippingAddress =
                    addresses.find((a: any) => a.type === 'SHIPPING' && a.isDefault) ||
                    addresses.find((a: any) => a.type === 'SHIPPING');

                if (shippingAddress) {
                    setShipping({
                        shippingName: data.name ?? '',
                        address1: shippingAddress.address1 ?? '',
                        address2: shippingAddress.address2 ?? '',
                        city: shippingAddress.city ?? '',
                        state: shippingAddress.state ?? '',
                        postcode: shippingAddress.postcode ?? '',
                    });
                }

                const postalAddress =
                    addresses.find((a: any) => a.type === 'CHARGE' && a.isDefault) ||
                    addresses.find((a: any) => a.type === 'CHARGE');

                if (postalAddress) {
                    setAccount({
                        billingName: data.name ?? '',
                        address1: postalAddress.address1 ?? '',
                        address2: postalAddress.address2 ?? '',
                        city: postalAddress.city ?? '',
                        state: postalAddress.state ?? '',
                        postcode: postalAddress.postcode ?? '',
                    });
                }

            } catch (err) {
                console.error('Failed to load customer addresses', err);
            }

        }

        loadCustomer();

    }, [form.customerId]);

    const EMPTY_ROW = {
        itemId: '',
        description: '',
        qty: 1,
        unitPrice: 0,
        discountPct: 0,
    };



    const [generalItems, setGeneralItems] = useState([{ ...EMPTY_ROW }]);
    const [premiumItems, setPremiumItems] = useState<any[]>([{ ...EMPTY_ROW }]);
    const [essentialItems, setEssentialItems] = useState<any[]>([{ ...EMPTY_ROW }]);
    const [ongoingItems, setOngoingItems] = useState<any[]>([{ ...EMPTY_ROW }]);

    const [generalCharges, setGeneralCharges] = useState({ sundries: 0, freight: 0, labour: 0, rounding: 0, otherCharges: 0 });
    const [premiumCharges, setPremiumCharges] = useState({ sundries: 0, freight: 0, labour: 0, rounding: 0, otherCharges: 0 });
    const [essentialCharges, setEssentialCharges] = useState({ sundries: 0, freight: 0, labour: 0, rounding: 0, otherCharges: 0 });
    const [ongoingCharges, setOngoingCharges] = useState({ sundries: 0, freight: 0, labour: 0, rounding: 0, otherCharges: 0 });

    const premiumHasItems = premiumItems.some(i => i.itemId);
    const essentialHasItems = essentialItems.some(i => i.itemId);
    const ongoingHasItems = ongoingItems.some(i => i.itemId);


    const setFreight = (param) => {
        setGeneralCharges(prev => ({ ...prev, freight: param }))
        setPremiumCharges(prev => ({ ...prev, freight: param }))
        setEssentialCharges(prev => ({ ...prev, freight: param }))
        setOngoingCharges(prev => ({ ...prev, freight: param }))
    }
    const onSubmit = async (e: React.FormEvent) => {

        e.preventDefault();

        if (!form.customerId) {

            showToast({
                type: 'error',
                title: 'Validation Error',
                message: 'Customer is required.',
            });

            return;

        }

        try {

            const res = await api.post('/quotations', {
                ...form,

                quotationDate: form.quotationDate
                    ? new Date(form.quotationDate)
                    : null,

                expiryDate: form.expiryDate
                    ? new Date(form.expiryDate)
                    : null,

                salesFactor: form.salesFactor
                    ? Number(form.salesFactor)
                    : null,

                sundries: generalCharges.sundries,
                labour: generalCharges.labour,
                rounding: generalCharges.rounding,
                otherCharges: generalCharges.otherCharges,

                shippingName: shipping.shippingName,
                shippingAddress1: shipping.address1,
                shippingCity: shipping.city,
                shippingState: shipping.state,
                shippingPostcode: shipping.postcode,

                billingName: account.billingName,
                billingAddress1: account.address1,
                billingCity: account.city,
                billingState: account.state,
                billingPostcode: account.postcode,
                notes: form.notes || null,
            });

            const quotationId = res.data?.data?.id ?? res.data.id;

            const saveGroup = async (group: string, items: any[]) => {

                const realItems = items.filter(i => i.itemId);

                if (!realItems.length) return;

                await api.patch(`/quotations/${quotationId}/groups/${group}/items`, {

                    items: realItems.map(i => ({
                        productId: i.itemId,
                        description: i.description,
                        quantity: Number(i.qty),
                        unitPrice: Number(i.unitPrice),
                        discountPct: Number(i.discountPct),
                        landedCost: Number(i.landedCost) || 0,
                        retailPrice: Number(i.retailPrice ?? 0),
                        tradePrice: Number(i.tradePrice ?? 0),
                        salesPartnerPrice: Number(i.salesPartnerPrice ?? 0),
                        agentPrice: Number(i.agentPrice ?? 0)
                    })),

                });

            };

            if (form.hasGeneral) await saveGroup('GENERAL', generalItems);
            if (form.hasPremium) await saveGroup('PREMIUM', premiumItems);
            if (form.hasEssential) await saveGroup('ESSENTIAL', essentialItems);
            if (form.hasOngoing) await saveGroup('ONGOING', ongoingItems);

            router.push('/quotations');

        } catch (err: any) {

            const apiError =
                err?.response?.data?.message?.message?.[0] ||
                err?.response?.data?.message ||
                'Error creating quotation';

            showToast({
                type: 'error',
                title: 'Save Failed',
                message: apiError,
            });

        }

    };

    return (

        <AdminShell title="Create Quotation">
            <div className="flex justify-end gap-2 mb-1">
                <Button
                    variant="outline"
                    type="button"
                    onClick={() => router.push('/quotations')}
                >
                    Cancel
                </Button>
                <Button type="submit" form="quotation-form">
                    Save
                </Button>
            </div>

            <form
                id="quotation-form"
                onSubmit={onSubmit}
                className="space-y-4"
            >

                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 lg:col-span-5">
                        <QuotationDetailsSection
                            value={form}
                            update={update}
                            setFreight={setFreight}
                        />
                    </div>

                    <div className="col-span-12 lg:col-span-4">
                        <ShippingDetailsSection
                            value={shipping}
                            update={updateShipping}
                        />
                    </div>

                    <div className="col-span-12 lg:col-span-3">
                        <AccountDetailsSection
                            value={account}
                            update={updateAccount}
                        />
                    </div>
                </div>


                {/* <div className="border rounded p-4">

                    <h3 className="font-semibold mb-3">Quote Sections</h3>
                    <div className="flex gap-8 flex-wrap">
                        <Checkbox
                            label="General"
                            checked={form.hasGeneral}
                            onChange={(checked: boolean) => update('hasGeneral', checked)}
                        />

                        <Checkbox
                            label="Hardware (Premium)"
                            checked={form.hasPremium}
                            onChange={(checked: boolean) => update('hasPremium', checked)}
                        />

                        <Checkbox
                            label="Hardware (Essential)"
                            checked={form.hasEssential}
                            onChange={(checked: boolean) => update('hasEssential', checked)}
                        />

                        <Checkbox
                            label="Ongoing"
                            checked={form.hasOngoing}
                            onChange={(checked: boolean) => update('hasOngoing', checked)}
                        />
                    </div>
                </div> */}

                {form.hasGeneral && (
                    <GroupSection
                        title="General"
                        items={generalItems}
                        setItems={setGeneralItems}
                        charges={generalCharges}
                        setCharges={setGeneralCharges}
                        category={null}
                        notes={form.notes}
                        updateNotes={update}
                        gstExempt={form.gstExempt}
                        form={form}
                        showNotes={!form.hasPremium && !form.hasEssential && !form.hasOngoing}
                    />
                )}

                {form.hasPremium && (
                    <GroupSection
                        title="Premium Hardware"
                        items={premiumItems}
                        setItems={setPremiumItems}
                        charges={premiumCharges}
                        setCharges={setPremiumCharges}
                        category="K3"
                        notes={form.notes}
                        updateNotes={update}
                        gstExempt={form.gstExempt}
                        showNotes={!form.hasEssential && !form.hasOngoing}
                    />
                )}


                {form.hasEssential && (
                    <GroupSection
                        title="Essential Hardware"
                        items={essentialItems}
                        setItems={setEssentialItems}
                        charges={essentialCharges}
                        setCharges={setEssentialCharges}
                        category="A1"
                        notes={form.notes}
                        updateNotes={update}
                        gstExempt={form.gstExempt}
                        showNotes={!form.hasOngoing}
                    />
                )}

                {form.hasOngoing && (

                    <GroupSection
                        title="Ongoing"
                        items={ongoingItems}
                        setItems={setOngoingItems}
                        charges={ongoingCharges}
                        setCharges={setOngoingCharges}
                        category="X1"
                        notes={form.notes}
                        updateNotes={update}
                        gstExempt={form.gstExempt}
                        showNotes={true}
                    />
                )}
            </form>
        </AdminShell>
    );

}


function GroupSection({ title, items, setItems, charges, setCharges, category, notes, updateNotes, showNotes, gstExempt = false, form }: any) {
    return (
        <div className="space-y-0">
            <div className="grid grid-cols-12 gap-4">

                <div className="col-span-12 lg:col-span-9">
                    <SalesOrderItemsSection
                        items={items}
                        setItems={setItems}
                        freight={0}
                        category={category}
                        form={form}
                        defaultOpen
                    />

                    {/* Additional Notes sits flush below items table */}
                    {showNotes && (
                        <div className="border rounded p-4 mt-4">
                            <h3 className="font-semibold mb-2">Additional Notes</h3>
                            <textarea
                                value={notes}
                                onChange={(e) => updateNotes('notes', e.target.value)}
                                placeholder="Enter any additional notes"
                                rows={12}
                                style={{ minHeight: '100px' }}
                                className="w-full border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                            />
                        </div>
                    )}

                </div>

                <div className="col-span-12 lg:col-span-3">
                    <SalesOrderCharges
                        items={items}
                        freight={charges.freight}
                        sundries={charges.sundries}
                        labour={charges.labour}
                        rounding={charges.rounding}
                        otherCharges={charges.otherCharges}
                        gstExempt={gstExempt}
                        update={(key, val) => setCharges(prev => ({ ...prev, [key]: val }))}
                    />
                </div>
            </div></div>
    );

}