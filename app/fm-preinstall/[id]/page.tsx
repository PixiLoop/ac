'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';

import { FMPreinstallForm } from '../../../components/fm-preinstall/forms/FMPreinstallForm';
import { DETAILS_NOT_COMPLETE, INVALID_SERVICE_CODE, missingInvoiceFields, supportsCamera, CAMERA_BASE_REQUIRED } from '../../../lib/fm-rules';

export default function Page() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  // ── FIX: type as Record<string, any> so .installDate is valid ────────────
  const [installDetail, setInstallDetail] = useState<Record<string, any>>({});

  const [form, setForm] = useState<any>({});
  const [shipping, setShipping] = useState<any>({});
  const [account, setAccount] = useState<any>({});
  const [items, setItems] = useState<any[]>([]);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [savedStatus, setSavedStatus] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const allowLeaveRef = useRef(false);
  const baselineRef = useRef<string>('');

  // ── Load data
  useEffect(() => {
    if (!id) return;

    api.get(`/fm-preinstall/${id}`).then(res => {
      const data = res.data?.data ?? res.data;


      const splitAddress = (val?: string) => {
        if (!val) return ['', '', '', ''];
        if (val.includes('||')) return val.split('||');
        if (val.includes('|')) return val.split('|');
        return [val, '', '', ''];
      };

      const [sAddr2, sCity, sState, sPostFromPacked] = splitAddress(data.shippingAddress2);
      const [bAddr2, bCity, bState, bPostFromPacked] = splitAddress(data.billingAddress2);

      setInstallDetail({
        ...(data?.installDetail ? {...data.installDetail, organizations: data.installDetail.fMInstallDetailOrgIds.map(item => item.organizations)}: {}),
        installDate: data.installDetail?.installDate
          ? new Date(data.installDetail.installDate).toISOString().split('T')[0]
          : '',
      });

      setForm({
        customerId: data.customerId,
        fmCustomerId: data.fmCustomerId,
        type: data.type,
        status: data.status,
        assignedUserId: data.assignedUserId ?? '',
        notes: data.notes ?? '',
        orderNumber: data.orderNumber ?? '',
        orderRequired: !!data.customer?.orderRequired,
        // Charges
        chargeSundries: data.chargeSundries ?? '',
        chargeLabour: data.chargeLabour ?? '',
        chargeFreight: data.chargeFreight ?? '',
        chargeRounding: data.chargeRounding ?? '',
        // Dispatch
        dispatchMethod: data.dispatchMethod ?? '',
        dispatchRef: data.dispatchRef ?? '',
        installLocation: data.installDetail?.installLocation ?? '',
        installer: data.installDetail?.installer ?? '',
        installDate: data.installDetail?.installDate
          ? new Date(data.installDetail.installDate).toISOString().split('T')[0]
          : '',
        invoiceId: data.invoiceId ?? null,
        installId: data.installId ?? null,
        targetInstallId: data.targetInstallId,
        depotId: data?.depotId ?? ""
      });

      const shipPost = data.shippingAddress3 || sPostFromPacked || '';
      const billPost = data.billingAddress3 || bPostFromPacked || '';

      setShipping({
        name: data.shippingName || '',
        address1: data.shippingAddress1 || '',
        address2: sAddr2 || '',
        city: sCity || '',
        state: sState || '',
        postcode: shipPost,
      });

      setAccount({
        name: data.billingName || '',
        address1: data.billingAddress1 || '',
        address2: bAddr2 || '',
        city: bCity || '',
        state: bState || '',
        postcode: billPost,
      });

      const mappedItems = (data.items || []).map((i: any, idx: number) => ({
        ...i,
        quantity: i.quantity,
        installDetail: i.installDetail || {},
        index: idx,
      }));

      setItems(mappedItems);
      setLoading(false);
      setSavedStatus(data.status);
      setInvoiceId(data.invoiceId ?? null);

      const snapShip = {
        name: data.shippingName || '',
        address1: data.shippingAddress1 || '',
        address2: sAddr2 || '',
        city: sCity || '',
        state: sState || '',
        postcode: shipPost,
      };
      const snapAcct = {
        name: data.billingName || '',
        address1: data.billingAddress1 || '',
        address2: bAddr2 || '',
        city: bCity || '',
        state: bState || '',
        postcode: billPost,
      };

      // Older records never stored postcode — backfill from customer addresses
      const finishBaseline = (ship: any, acct: any) => {
        baselineRef.current = JSON.stringify({
          form: {
            customerId: data.customerId,
            fmCustomerId: data.fmCustomerId,
            type: data.type,
            status: data.status,
            assignedUserId: data.assignedUserId ?? '',
            notes: data.notes ?? '',
            orderNumber: data.orderNumber ?? '',
            chargeSundries: data.chargeSundries ?? '',
            chargeLabour: data.chargeLabour ?? '',
            chargeFreight: data.chargeFreight ?? '',
            chargeRounding: data.chargeRounding ?? '',
            depotId: data?.depotId ?? '',
          },
          shipping: ship,
          account: acct,
          items: mappedItems.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPct: i.discountPct,
          })),
        });
      };
      finishBaseline(snapShip, snapAcct);

      if (data.customerId && (!shipPost || !billPost)) {
        api.get(`/customers/${data.customerId}`).then((cres) => {
          const cust = cres.data?.data ?? cres.data;
          const addresses = cust?.addresses || [];
          const pick = (...types: string[]) =>
            types
              .map(
                (t) =>
                  addresses.find((a: any) => a.type === t && a.isDefault) ||
                  addresses.find((a: any) => a.type === t),
              )
              .find(Boolean);
          const shipAddr = pick('SHIPPING');
          const stmtAddr = pick('STATEMENT', 'CHARGE');
          const nextShip = !shipPost && shipAddr?.postcode
            ? { ...snapShip, postcode: shipAddr.postcode }
            : snapShip;
          const nextAcct = !billPost && stmtAddr?.postcode
            ? { ...snapAcct, postcode: stmtAddr.postcode }
            : snapAcct;
          if (nextShip !== snapShip) setShipping(nextShip);
          if (nextAcct !== snapAcct) setAccount(nextAcct);
          // Treat backfill as loaded state, not a user edit
          finishBaseline(nextShip, nextAcct);
        }).catch(() => { });
      }
    });
  }, [id]);    
  const update = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const updateShipping = (k: string, v: any) => setShipping((p: any) => ({ ...p, [k]: v }));
  const updateAccount = (k: string, v: any) => setAccount((p: any) => ({ ...p, [k]: v }));

  const updateItemInstallDetail = (index: number, data: any) => {
    const copy = [...items];
    copy[index].installDetail = data;
    setItems(copy);
  };

  // ── Save
  const save = async () => {
    try {
      setSaving(true);

      // Filter empty rows before saving items / computing charges
      const validItems = items.filter(i => i.productId && i.productId !== '');
      const chargeParts = validItems.reduce((acc, i) => {
        const qty = Number(i.quantity ?? 1);
        const price = Number(i.unitPrice ?? 0);
        return acc + qty * price;
      }, 0);
      const chargeSundries = Number(form.chargeSundries || 0);
      const chargeLabour = Number(form.chargeLabour || 0);
      const chargeFreight = Number(form.chargeFreight || 0);
      const chargeSub = chargeParts + chargeSundries + chargeLabour + chargeFreight;
      const chargeGst = parseFloat((chargeSub * 0.1).toFixed(2));
      const chargeRounding = Number(form.chargeRounding || 0);
      const chargeTotal = parseFloat((chargeSub + chargeGst + chargeRounding).toFixed(2));

      const payload = {
        ...form,
        shippingName: shipping?.name || '',
        shippingAddress1: shipping?.address1 || '',
        shippingAddress2: `${shipping?.address2 || ''}||${shipping?.city || ''}||${shipping?.state || ''}||${shipping?.postcode || ''}`,
        shippingAddress3: shipping?.postcode || '',
        billingName: account?.name,
        billingAddress1: account?.address1 || '',
        billingAddress2: `${account?.address2 || ''}||${account?.city || ''}||${account?.state || ''}||${account?.postcode || ''}`,
        billingAddress3: account?.postcode || '',
        chargeParts,
        chargeSundries,
        chargeLabour,
        chargeFreight,
        chargeGst,
        chargeRounding,
        chargeTotal,
        dispatchMethod: form.dispatchMethod || null,
        dispatchRef: form.dispatchRef || null,
        depotId: form.depotId || null,
        installDetail: {
          ...installDetail,
          installDate: installDetail.installDate
            ? new Date(installDetail.installDate).toISOString()
            : null,
        },
      };

      await api.patch(`/fm-preinstall/${id}`, payload);

      await api.patch(`/fm-preinstall/${id}/items`, {
        items: validItems.map(i => ({
          id: i.id,
          productId: i.productId,
          partNumber: i.partNumber || '',
          description: i.description || '',
          quantity: i.quantity == null || i.quantity === '' ? 1 : Number(i.quantity),
          unitPrice: Number(i.unitPrice || 0),
          discountPct: i.discountPct ?? null,
          lineTotal: i.lineTotal ?? null,
        })),
      });

      setSavedStatus(form.status);
      allowLeaveRef.current = true;

      showToast({ type: 'success', title: 'Updated successfully' });
      router.push('/fm-preinstall');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Update failed';
      showToast({ type: 'error', title: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async () => {
    const missing = missingInvoiceFields(form, installDetail);
    setInvalidFields(missing);
    if (missing.length) {
      showToast({ type: 'error', title: DETAILS_NOT_COMPLETE, message: DETAILS_NOT_COMPLETE });
      return;
    }
    const serviceCode = String(installDetail.serviceCode ?? '').trim();
    const cameraOn = installDetail.visionType || installDetail.cameraType;
    if (cameraOn && !supportsCamera(installDetail.fmUnitType)) {
      showToast({ type: 'error', title: CAMERA_BASE_REQUIRED, message: CAMERA_BASE_REQUIRED });
      return;
    }
    try {
      const lookup = await api.get('/products/by-code', { params: { code: serviceCode } });
      const product = lookup.data?.data ?? lookup.data;
      if (!product?.id) {
        showToast({ type: 'error', title: INVALID_SERVICE_CODE, message: INVALID_SERVICE_CODE });
        return;
      }
    } catch {
      showToast({ type: 'error', title: INVALID_SERVICE_CODE, message: INVALID_SERVICE_CODE });
      return;
    }
    if (form.orderRequired && !String(form.orderNumber ?? '').trim()) {
      showToast({ type: 'error', title: 'Order number is required.', message: 'Order number is required.' });
      return;
    }
    if (!confirm('Do you want to create Invoice')) return;
    try {
      const res = await api.post(`/invoices/from-preinstall/${id}`);
      const invoiceId = res.data?.data?.id ?? res.data?.id;
      showToast({ type: 'success', title: 'Invoice created!' });
      router.push(`/invoices/${invoiceId}`);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: err?.response?.data?.message ?? 'Failed to create invoice',
      });
    }
  };

  useEffect(() => {
    if (items.length && !activeItem) {
      setActiveItem({ ...items[0], index: 0 });
    }
  }, [items]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      if (!baselineRef.current) return;
      const current = JSON.stringify({
        form: {
          customerId: form.customerId,
          fmCustomerId: form.fmCustomerId,
          type: form.type,
          status: form.status,
          assignedUserId: form.assignedUserId ?? '',
          notes: form.notes ?? '',
          orderNumber: form.orderNumber ?? '',
          chargeSundries: form.chargeSundries ?? '',
          chargeLabour: form.chargeLabour ?? '',
          chargeFreight: form.chargeFreight ?? '',
          chargeRounding: form.chargeRounding ?? '',
          depotId: form.depotId ?? '',
        },
        shipping,
        account,
        items: items.map((i: any) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPct: i.discountPct,
        })),
      });
      if (current === baselineRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form, shipping, account, items]);

  if (loading) {
    return (
      <AdminShell title="Edit Preinstall">
        <div className="p-6 text-sm text-gray-500">Loading preinstall...</div>
      </AdminShell>
    );
  }

  const handleAddInstalled = async () => {
    if (!confirm('Create FM Install (FM Log) record create')) return;
    try {
      const res = await api.post(`/fm-install/from-preinstall/${id}`);
      const installId = res.data?.data?.id ?? res.data?.id;
      setForm((p: any) => ({ ...p, installId }));
      showToast({ type: 'success', title: 'FM Install created!' });
      router.push(`/fm-install/${installId}`);
    } catch (err: any) {
      // Backend error responses can be nested (e.g. { message: { message, error, statusCode } })
      // depending on which exception filter formatted them — unwrap either shape
      const raw = err?.response?.data?.message;
      const errorText = typeof raw === 'string' ? raw : (raw?.message ?? 'Failed');
      showToast({
        type: 'error',
        title: errorText,
      });
    }
  };

  return (
    <AdminShell title="Edit Preinstall">
      <div className="flex justify-end gap-2 mb-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open(`/fm-preinstall/${id}/print`, '_blank', 'noopener')}
        >
          Print
        </Button>
        <Button
          onClick={() => {
            allowLeaveRef.current = true;
            router.push('/fm-preinstall');
          }}
        >
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Update'}
        </Button>

        {/* {savedStatus === 'INSTALLED' && (
          <Button onClick={() => router.push(`/fm-install/new?preinstallId=${id}`)}>
            Create FM Install
          </Button>
        )} */}

        {(savedStatus === 'INSTALLED' || savedStatus === "WAITING_INSTALL") && !invoiceId && (
          <Button
            onClick={() => {
              if (form.orderRequired && !String(form.orderNumber ?? '').trim()) {
                showToast({ type: 'error', title: 'Order number is required.', message: 'Order number is required.' });
                return;
              }
              allowLeaveRef.current = true;
              router.push(`/invoices/new?fromPreinstall=${id}`);
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Create Invoice
          </Button>
        )}

        {invoiceId && (
          <Button variant="outline" onClick={() => router.push(`/invoices/${invoiceId}`)}>
            View Invoice
          </Button>
        )}










        {savedStatus === 'INVOICED' && !form.installId && (
          <Button
            onClick={handleAddInstalled}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Add Installed
          </Button>
        )}

        {form.installId && (
          <Button variant="outline" onClick={() => router.push(`/fm-install/${form.installId}`)}>
            View FM Log
          </Button>
        )}

      </div>

      <FMPreinstallForm
        form={form}
        setForm={setForm}
        shipping={shipping}
        setShipping={setShipping}
        account={account}
        setAccount={setAccount}
        items={items}
        setItems={setItems}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        users={[]}
        updateItemInstallDetail={updateItemInstallDetail}
        installDetail={installDetail}
        setInstallDetail={setInstallDetail}
        invalidFields={invalidFields}
      />
    </AdminShell>
  );
}