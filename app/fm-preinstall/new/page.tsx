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

      // Auto-create and sync Installation Job with Job Book
      try {
        const preinstallNo = res.data?.data?.preinstallNo || res.data?.preinstallNo || `PI-${Date.now().toString().slice(-4)}`;
        const rego = form.regoNumber || installDetail?.regoNumber || 'TBD';
        const vin = form.vinNumber || installDetail?.vinNumber || `VIN-${preinstallNo}`;
        const fleet = form.fleetNumber || installDetail?.fleetNumber || 'FLEET-01';
        const makeModel = `${form.vehicleMake || installDetail?.vehicleMake || ''} ${form.vehicleModel || installDetail?.vehicleModel || ''}`.trim() || 'Commercial Vehicle';

        const newJob = {
          id: `INSTALL-${preinstallNo.replace(/[^0-9]/g, '') || Date.now().toString().slice(-4)}`,
          jobNumber: `JOB-${preinstallNo}`,
          customerId: form.customerId,
          customerName: account?.name || form.shippingName || 'FM Customer',
          customerContact: form.shippingName || 'Fleet Manager',
          customerPhone: '02 9876 5432',
          projectId: 'proj-fleet-telematics',
          projectName: 'Fleet Telematics Rollout',
          location: form.installLocation || installDetail?.installLocation || shipping?.address1 || 'Main Workshop',
          vehicle: {
            rego,
            fleetNumber: fleet,
            vin,
            makeModel,
          },
          hardware: validItems.map(item => ({
            id: item.productId,
            model: item.partNumber || installDetail?.fmUnitCode || 'MIX4000',
            name: item.description || item.partNumber || 'Telematics Hardware',
            serialNumber: installDetail?.unitSerial || '',
            imei: installDetail?.unitIMEI || '',
            category: 'Telematics Unit',
          })),
          technicianId: form.installer || installDetail?.installer || undefined,
          technicianName: users.find(u => u.id === (form.installer || installDetail?.installer))
            ? `${users.find(u => u.id === (form.installer || installDetail?.installer)).firstName} ${users.find(u => u.id === (form.installer || installDetail?.installer)).lastName}`
            : (form.installer || installDetail?.installer || undefined),
          installationDate: (form.installDate || installDetail?.installDate) ? new Date(form.installDate || installDetail?.installDate).toISOString().split('T')[0] : undefined,
          startTime: '09:00',
          endTime: '12:00',
          isScheduled: !!(form.installer && (form.installDate || installDetail?.installDate)),
          status: 'Not Actioned',
          checklistSections: [
            {
              id: 'sec-prep',
              title: 'Hardware & Harness Pre-Check',
              hardwareModel: 'MIX4000',
              items: [
                { id: `chk-${Date.now()}-1`, title: 'Verify serial and IMEI against preinstall sheet', isRequired: true, displayOrder: 1, completed: false, section: 'Hardware & Harness Pre-Check' },
                { id: `chk-${Date.now()}-2`, title: 'Inspect harness cables and inline fuses', isRequired: true, displayOrder: 2, completed: false, section: 'Hardware & Harness Pre-Check' },
              ],
            },
            {
              id: 'sec-install',
              title: 'Vehicle Installation & Telemetry Verification',
              hardwareModel: 'MIX4000',
              items: [
                { id: `chk-${Date.now()}-3`, title: 'Secure mounting in cabin away from moving linkages', isRequired: true, displayOrder: 3, completed: false, section: 'Vehicle Installation & Telemetry Verification' },
                { id: `chk-${Date.now()}-4`, title: 'Connect ignition and continuous 12V/24V power lines', isRequired: true, displayOrder: 4, completed: false, section: 'Vehicle Installation & Telemetry Verification' },
                { id: `chk-${Date.now()}-5`, title: 'Confirm GPS fix and telematics cellular heartbeat', isRequired: true, displayOrder: 5, completed: false, section: 'Vehicle Installation & Telemetry Verification' },
              ],
            },
          ],
          timeline: [
            {
              id: `tl-${Date.now()}`,
              status: 'Not Actioned',
              timestamp: new Date().toISOString(),
              updatedBy: 'Operations Dispatch',
              note: `Installation job created from FM Preinstall ${preinstallNo}.`,
            },
          ],
          notes: `Created from FM Preinstall ${preinstallNo}. Location: ${form.installLocation || installDetail?.installLocation || 'Main Workshop'}.`,
          createdAt: new Date().toISOString(),
          canInvoice: false,
        };

        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('operations_installation_jobs');
          let currentJobs: any[] = [];
          if (raw) {
            try { currentJobs = JSON.parse(raw); } catch (e) {}
          }
          currentJobs = [newJob, ...currentJobs.filter((j: any) => j.id !== newJob.id)];
          localStorage.setItem('operations_installation_jobs', JSON.stringify(currentJobs));
        }
      } catch (jobErr) {
        console.warn('Could not cache installation job locally:', jobErr);
      }

      showToast({ type: 'success', title: 'Preinstall & Installation Job created successfully' });
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