'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import { FMPreinstallForm } from '../../../components/fm-preinstall/forms/FMPreinstallForm';

export default function Page() {
  const router = useRouter();
  const { showToast } = useToast();

  const [installDetail, setInstallDetail] = useState<Record<string, any>>({});

  const [form, setForm] = useState<any>({
    customerId: '',
    fmCustomerId: '',
    type: 'NEW_INSTALL',
    status: 'NOT_ACTIONED',
  });

  const isLocked = form.status === 'COMPLETED' || form.status === 'INVOICED';

  const [shipping, setShipping] = useState<any>({});
  const [account, setAccount] = useState<any>({});
  const [items, setItems] = useState<any[]>([]);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Load users
  useEffect(() => {
    api.get('/users').then(res => {
      const data =
        res.data?.data?.items ||
        res.data?.data?.data ||
        res.data?.data ||
        res.data;
      setUsers(Array.isArray(data) ? data : []);
    });
  }, []);

  const updateItemInstallDetail = (index: number, data: any) => {
    const copy = [...items];
    copy[index].installDetail = data;
    setItems(copy);
  };

  const save = async () => {
    if (!form.customerId) {
      showToast({ type: 'error', title: 'Customer required' });
      return;
    }

    // Filter empty rows for validation check
    const validItems = items.filter(i => i.productId && i.productId !== '');
    if (!validItems.length) {
      showToast({ type: 'error', title: 'Add at least 1 item' });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        fmCustomerId: form.fmCustomerId || null,

        // SHIPPING
        shippingName: shipping?.name || '',
        shippingAddress1: shipping?.address1 || '',
        shippingAddress2: `${shipping?.address2 || ''}||${shipping?.city || ''}||${shipping?.state || ''}`,

        // BILLING
        billingName: account?.name || '',
        billingAddress1: account?.address1 || '',
        billingAddress2: `${account?.address2 || ''}||${account?.city || ''}||${account?.state || ''}`,

        installDetail: {
          ...installDetail,
          installType: form.type ?? installDetail?.installType,
          installLocation: form.installLocation ?? installDetail?.installLocation,
          installer: form.installer ?? installDetail?.installer,
          installDate: (form.installDate ?? installDetail?.installDate)
            ? new Date(form.installDate ?? installDetail?.installDate).toISOString()
            : null,
        },
      };

      const res = await api.post('/fm-preinstall', payload);
      const id = res.data?.data?.id ?? res.data?.id;

      //send only valid rows with safe field mapping
      await api.patch(`/fm-preinstall/${id}/items`, {
        items: validItems.map(i => ({
          productId: i.productId,
          partNumber: i.partNumber || '',
          description: i.description || '',
          quantity: i.quantity || 1,
          unitPrice: Number(i.unitPrice || 0),
          discountPct: i.discountPct ?? null,
          lineTotal: i.lineTotal ?? null,
        })),
      });

      showToast({ type: 'success', title: 'Created successfully' });
      router.push('/fm-preinstall');
    } catch (err: any) {
      const raw = err?.response?.data?.message;
      const errorText = typeof raw === 'string' ? raw : (raw?.message ?? 'Save failed');
      showToast({ type: 'error', title: errorText });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Create Preinstall">

      {/* ACTION BAR */}
      <div className="flex justify-end gap-2 mb-2">
        <Button onClick={() => router.push('/fm-preinstall')}>Cancel</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
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
        users={users}
        updateItemInstallDetail={updateItemInstallDetail}
        isLocked={isLocked}
        installDetail={installDetail}
        setInstallDetail={setInstallDetail}
      />

    </AdminShell>
  );
}