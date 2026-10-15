'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';

import { FMPreinstallForm } from '../../../components/fm-preinstall/forms/FMPreinstallForm';

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

  // ── Load data
  useEffect(() => {
    if (!id) return;

    api.get(`/fm-preinstall/${id}`).then(res => {
      const data = res.data?.data ?? res.data;


      const splitAddress = (val?: string) => {
        if (!val) return ['', '', ''];
        if (val.includes('||')) return val.split('||');
        if (val.includes('|')) return val.split('|');
        return [val, '', ''];
      };

      const [sAddr2, sCity, sState] = splitAddress(data.shippingAddress2);
      const [bAddr2, bCity, bState] = splitAddress(data.billingAddress2);

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

      setShipping({
        name: data.shippingName || '',
        address1: data.shippingAddress1 || '',
        address2: sAddr2 || '',
        city: sCity || '',
        state: sState || '',
      });

      setAccount({
        name: data.billingName || '',
        address1: data.billingAddress1 || '',
        address2: bAddr2 || '',
        city: bCity || '',
        state: bState || '',
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

      const payload = {
        ...form,
        shippingName: shipping?.name || '',
        shippingAddress1: shipping?.address1 || '',
        shippingAddress2: `${shipping?.address2 || ''}||${shipping?.city || ''}||${shipping?.state || ''}`,
        billingName: account?.name,
        billingAddress1: account?.address1 || '',
        billingAddress2: `${account?.address2 || ''}||${account?.city || ''}||${account?.state || ''}`,
        installDetail: {
          ...installDetail,
          installDate: installDetail.installDate
            ? new Date(installDetail.installDate).toISOString()
            : null,
        },
      };

      await api.patch(`/fm-preinstall/${id}`, payload);

      // Filter empty rows before saving items
      const validItems = items.filter(i => i.productId && i.productId !== '');
      await api.patch(`/fm-preinstall/${id}/items`, {
        items: validItems.map(i => ({
          id: i.id,
          productId: i.productId,
          partNumber: i.partNumber || '',
          description: i.description || '',
          quantity: i.quantity || 1,
          unitPrice: Number(i.unitPrice || 0),
          discountPct: i.discountPct ?? null,
          lineTotal: i.lineTotal ?? null,
        })),
      });

      setSavedStatus(form.status);

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
    const handleBeforeUnload = (e: any) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
        <Button onClick={() => router.push('/fm-preinstall')}>Cancel</Button>
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
            onClick={() => router.push(`/invoices/new?fromPreinstall=${id}`)}
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
      />
    </AdminShell>
  );
}