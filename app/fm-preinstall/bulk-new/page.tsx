'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, Download } from 'lucide-react';
import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import { CustomerSearchSelect } from '../../../components/common/CustomerSearchSelect';

const TEMPLATE_HEADERS = [
  'Rego',
  'VIN',
  'Asset Number',
  'Fleet Number',
  'Make',
  'Model',
  'Year',
  'Depot',
  'Site',
  'Service Code',
  'Unit Code',
  'Installer',
  'Install Date',
  'Notes',
];

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(',');
  const sample = [
    'ABC123',
    'VIN0001',
    'A-100',
    'F-20',
    'Kenworth',
    'T610',
    '2024',
    'Sydney',
    'Bay 1',
    'FMSS1',
    'U0074MT',
    '',
    '2026-11-01',
    'Bulk project vehicle',
  ].join(',');
  const blob = new Blob([[header, sample].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FM_Preinstall_Bulk_Vehicles.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkNewPreinstallPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [customer, setCustomer] = useState<any>(null);
  const [fmCustomers, setFmCustomers] = useState<any[]>([]);
  const [fmCustomerId, setFmCustomerId] = useState('');
  const [type, setType] = useState('NEW_INSTALL');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!customer?.id) {
      setFmCustomers([]);
      setFmCustomerId('');
      return;
    }
    api
      .get(`/fm-customers/by-customer/${customer.id}`)
      .then((res) => {
        const fm = res.data?.data ?? res.data;
        if (fm?.id) {
          setFmCustomers([fm]);
          setFmCustomerId(fm.id);
        } else {
          setFmCustomers([]);
          setFmCustomerId('');
        }
      })
      .catch(() => {
        setFmCustomers([]);
        setFmCustomerId('');
      });
  }, [customer?.id]);

  const upload = async () => {
    if (!customer?.id || !fmCustomerId) {
      showToast({ type: 'error', title: 'Customer required', message: 'Select an FM customer first.' });
      return;
    }
    if (!file) {
      showToast({ type: 'error', title: 'File required', message: 'Upload a bulk vehicle spreadsheet.' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerId', customer.id);
      formData.append('fmCustomerId', fmCustomerId);
      formData.append('type', type);

      const res = await api.post('/fm-preinstall/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data?.data ?? res.data;
      showToast({
        type: 'success',
        title: 'Bulk preinstall created',
        message: `${data?.imported ?? 0} vehicles on one job.`,
      });
      if (data?.preinstall?.id) {
        router.push(`/fm-preinstall/${data.preinstall.id}`);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Import failed',
        message: err?.response?.data?.message || err?.message || 'Bulk import failed',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminShell title="Bulk New FM Preinstall">
      <div className="max-w-3xl space-y-6">
        <p className="text-sm text-slate-600">
          Upload a vehicle spreadsheet instead of unit details. Creates one Preinstall, one job, and later one invoice.
          Complete to FM Install adds every vehicle to the install log. Rows stay editable while the job is open.
        </p>

        <div className="rounded border bg-white p-4 space-y-4">
          <CustomerSearchSelect label="Customer" value={customer} onSelect={setCustomer} />

          <div>
            <label className="text-sm font-medium text-slate-700">FM Customer</label>
            <select
              className="mt-1 w-full border rounded-md h-10 px-3 text-sm"
              value={fmCustomerId}
              onChange={(e) => setFmCustomerId(e.target.value)}
            >
              <option value="">Select</option>
              {fmCustomers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.fmWebNumber || c.fleetName || c.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Install Type</label>
            <select
              className="mt-1 w-full border rounded-md h-10 px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="NEW_INSTALL">New Install</option>
              <option value="TRANSFER_UNIT">Transfer Unit</option>
              <option value="REPLACEMENT">Replacement</option>
              <option value="MODIFIED_INSTALL">Modified Install</option>
              <option value="WARRANTY">Warranty</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" />
              Download template
            </Button>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" />
              Choose file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <FileSpreadsheet className="h-4 w-4" />
              {file.name}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/fm-preinstall')}>
              Cancel
            </Button>
            <Button type="button" onClick={upload} disabled={uploading}>
              {uploading ? 'Importing…' : 'Create bulk preinstall'}
            </Button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
