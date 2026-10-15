'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AdminShell } from '../../components/layout/AdminShell';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import DataTable from '../../components/common/DataTable';
import { api } from '../../lib/api-client';
import { useToast } from '../../components/ui/toast';
import { Select } from '../../components/ui/select';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission';

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] text-slate-500 mb-0.5 font-medium">{children}</div>;
}

function ClearBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="border px-1.5 text-slate-400 hover:text-red-500 hover:border-red-300 rounded text-xs shrink-0">
      ×
    </button>
  );
}

function CheckBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs">
      <span
        onClick={() => onChange(!checked)}
        className={`w-5 h-5 border-2 flex items-center justify-center rounded-sm shrink-0 transition-colors
          ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-400'}`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-slate-700">{label}</span>
    </label>
  );
}
const STATUS_COLOR: Record<string, string> = {
  NOT_ACTIONED: 'bg-slate-100 text-slate-700',
  WORKSHOP_SETUP: 'bg-yellow-100 text-yellow-800',
  WAITING_INSTALL: 'bg-blue-100 text-blue-800',
  INSTALLED: 'bg-green-100 text-green-800',
  INVOICED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABEL: Record<string, string> = {
  NOT_ACTIONED: 'Not Actioned',
  WORKSHOP_SETUP: 'Workshop Setup',
  WAITING_INSTALL: 'Waiting Install',
  INSTALLED: 'Installed',
  INVOICED: 'Invoiced',
  COMPLETED: 'Completed',
};

export default function FMPreinstallPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});

  const [lastNo, setLastNo] = useState('-');
  const [maxCount, setMaxCount] = useState(0);
  const [listCount, setListCount] = useState(0);

  const [excludeCompleted, setExcludeCompleted] = useState(true);
  const [visionOnly, setVisionOnly] = useState(false);

  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);

  const canView = has('fmpreinstalls.view');
  const canCreate = has('fmpreinstalls.create');

  const [filters, setFilters] = useState({
    search: '',
    customer: '',
    fleet: '',
    status: '',
    installType: '',
    serviceCode: '',
    unitCode: '',
  });

  const statusOptions = [
    { label: 'ALL', value: '' },
    { label: 'Not Actioned', value: 'NOT_ACTIONED' },
    { label: 'Workshop Setup', value: 'WORKSHOP_SETUP' },
    { label: 'Waiting Install', value: 'WAITING_INSTALL' },
    { label: 'Installed', value: 'INSTALLED' },
    { label: 'Invoiced', value: 'INVOICED' },
    { label: 'Completed', value: 'COMPLETED' },
  ];

  const installTypeOptions = [
    { label: 'ALL', value: '' },
    { label: 'New Install', value: 'NEW_INSTALL' },
    { label: 'Warranty', value: 'WARRANTY' },
    { label: 'Replacement', value: 'REPLACEMENT' },
    { label: 'Modified', value: 'MODIFIED_INSTALL' },
    { label: 'Transfer', value: 'TRANSFER_UNIT' },
  ];

  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [serviceOptions, setServiceOptions] = useState<any[]>([]);
  const [unitOptions, setUnitOptions] = useState<any[]>([]);

  const loadFilters = async () => {
    if (!canView) return;
    try {
      const [cust, svc, unit] = await Promise.all([
        api.get('/fm-preinstall/filters/customers'),
        api.get('/fm-preinstall/filters/service-codes'),
        api.get('/fm-preinstall/filters/unit-codes'),
      ]);
      const custData = cust.data?.data ?? cust.data ?? [];
      const svcData = svc.data?.data ?? svc.data ?? [];
      const unitData = unit.data?.data ?? unit.data ?? [];

      setCustomerOptions(custData.map((c: any) => ({
        label: c.customerNumber
          ? `${c.customerNumber} – ${c.registeredName || c.name}`
          : c.registeredName || c.name,
        value: c.id,
      })));
      setServiceOptions(svcData.map((s: any) => ({ label: s.serviceCode, value: s.serviceCode })));
      setUnitOptions(unitData.map((u: any) => ({ label: u.fmUnitCode, value: u.fmUnitCode })));
    } catch { /* silently ignore */ }
  };

  //Main load
  const load = async () => {
    if (!canView) return;
    setLoading(true);
    try {

      const res = await api.get('/fm-preinstall', {
        params: {
          ...filters,
          ...(excludeCompleted && !filters.status && { excludeCompleted: 'true' }),
          ...(visionOnly && { visionOnly: 'true' }),
          page,
          pageSize,
          sortKey: sort.key,
          sortDir: sort.dir,
          ...Object.fromEntries(
            Object.entries(columnFilters)
              .filter(([, v]) => v?.length)
              .map(([k, v]) => [`filter_${k}`, v.join(',')])
          ),
        },
      });

      const payload = res.data?.data ?? res.data ?? {};
      const rowData = payload.items || [];
      setRows(rowData);
      setTotal(payload.total || 0);
      setListCount(payload.total || 0);

      // Set Last Preinstall from first row (most recent)
      if (rowData.length) setLastNo(rowData[0]?.preinstallNo ?? '-');
    } catch {
      showToast({ type: 'error', title: 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, pageSize, sort, columnFilters]);

  useEffect(() => {
    if (!canView) return;
    loadFilters();
    // Get max count (unfiltered total)
    api.get('/fm-preinstall', { params: { page: 1, pageSize: 1 } }).then(res => {
      setMaxCount(res.data?.data?.total ?? 0);
    });
  }, []);

  const updateFilter = (k: string, v: any) => setFilters(p => ({ ...p, [k]: v }));

  const handleSearch = () => { setPage(1); load(); };

  const handleReset = () => {
    setFilters({ search: '', customer: '', fleet: '', status: '', installType: '', serviceCode: '', unitCode: '' });
    setExcludeCompleted(true);
    setVisionOnly(false);
    setPage(1);
  };

  // Trigger load after reset state settles
  useEffect(() => { load(); }, [excludeCompleted, visionOnly]);

  if (!canView) {
    return (
      <AdminShell title="FM Preinstall">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="FM Preinstall">

      <div className="flex justify-end gap-6 mb-2 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <span className="font-medium">Last Preinstall</span>
          <span className="border px-2 py-0.5 bg-yellow-50 font-mono min-w-[60px] text-center">{lastNo}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">Max List Count</span>
          <span className="border px-2 py-0.5 bg-white font-mono min-w-[40px] text-center">{maxCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">List Count</span>
          <span className="border px-2 py-0.5 bg-white font-mono min-w-[40px] text-center">{listCount}</span>
        </div>
      </div>

      <div className="border rounded-md p-3 mb-3 bg-white text-xs">

        <div className="grid grid-cols-12 gap-2 items-end mb-2">

          <div className="col-span-2">
            <div className="flex gap-1">
              <div className="flex-1">
                <SearchSelect placeholder="Customer Name" value={filters.customer}
                  options={customerOptions} onChange={v => updateFilter('customer', v)} />
              </div>
              {filters.customer && (
                <ClearBtn onClick={() => updateFilter('customer', '')} />
              )}
            </div>
          </div>

          {/* Fleet Name */}
          <div className="col-span-2">
            <FilterLabel>Fleet Name</FilterLabel>
            <input className="w-full border p-1.5 text-xs rounded"
              placeholder="Fleet Name"
              value={filters.fleet}
              onChange={e => updateFilter('fleet', e.target.value)} />
          </div>

          {/* Unit Code */}
          <div className="col-span-2">
            <div className="flex gap-1">
              <div className="flex-1">
                <SearchSelect placeholder="Unit Code" value={filters.unitCode}
                  options={unitOptions} onChange={v => updateFilter('unitCode', v)} />
              </div>
              {filters.unitCode && (
                <ClearBtn onClick={() => updateFilter('unitCode', '')} />
              )}
            </div>
          </div>

          {/* Svr Code */}
          <div className="col-span-2">
            <div className="flex gap-1">
              <div className="flex-1">
                <SearchSelect placeholder="Service Code" value={filters.serviceCode}
                  options={serviceOptions} onChange={v => updateFilter('serviceCode', v)} />
              </div>
              {filters.serviceCode && (
                <ClearBtn onClick={() => updateFilter('serviceCode', '')} />
              )}
            </div>
          </div>

          {/* Status */}
          <div className="col-span-2">
            <FilterLabel>Status</FilterLabel>
            <select className="w-full border p-1.5 text-xs rounded"
              value={filters.status}
              onChange={e => updateFilter('status', e.target.value)}>
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Install Type */}
          <div className="col-span-2">
            <FilterLabel>Install Type</FilterLabel>
            <select className="w-full border p-1.5 text-xs rounded"
              value={filters.installType}
              onChange={e => updateFilter('installType', e.target.value)}>
              {installTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

        </div>

        {/* ROW 2 — checkboxes + search + buttons */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Vision Only checkbox — styled box like legacy */}
          <CheckBox
            label="Vision Only"
            checked={visionOnly}
            onChange={setVisionOnly}
          />









          {/* Exclude Completed checkbox */}
          <CheckBox
            label="Exclude Completed / Cancelled"
            checked={excludeCompleted}
            onChange={setExcludeCompleted}
          />

          {/* Search */}
          <input
            className="border p-1.5 text-xs rounded flex-1 max-w-xs"
            placeholder="Search..."
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
          />

          <Button size="sm" onClick={handleSearch}>Start Search</Button>
          <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
          
          {canCreate && (
          <div className="ml-auto">
            <Button onClick={() => router.push('/fm-preinstall/new')}>New Preinstall</Button>
          </div>
          )}
        </div>
      </div>

      <DataTable
        loading={loading}
        data={rows}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={setColumnFilters}
        columns={[
          {
            key: 'preinstallNo',
            title: 'Record',
            sortable: true,
          },
          {
            key: 'createdAt',
            title: 'Date',
            sortable: true,
            render: r => new Date(r.createdAt).toLocaleDateString('en-AU'),
          },
          {
            key: 'cusNum',
            title: 'CushNum',
            sortable: true,
            render: r => r.customer?.customerNumber || r.customer?.name || '-',
          },
          {
            key: 'fmCus',
            title: 'FMCus',
            sortable: true,
            render: r => r.fmCustomer?.fmWebNumber || r.fmCustomer?.id?.slice(-6) || '-',
          },
          {
            key: 'fleetName',
            title: 'Fleet Name',
            sortable: true,
            render: r => r.installDetail?.fleetNumber || '-',
          },
          {
            key: 'assetId',
            title: 'Asset ID',
            sortable: true,
            render: r => r.installDetail?.assetNumber || '-',
          },
          {
            key: 'rego',
            title: 'Rego Num',
            sortable: true,
            render: r => r.installDetail?.regoNumber || '-',
          },
          {
            key: 'fleetNum',
            title: 'Fleet Num',
            sortable: true,
            render: r => r.installDetail?.fleetNumber || '-',
          },
          {
            key: 'orderNum',
            title: 'Num',
            render: r => r.orderNumber || '-',
          },
          {
            key: 'serviceCode',
            title: 'Service-Code',
            sortable: true,
            render: r => r.installDetail?.serviceCode || '-',
          },
          {
            key: 'status',
            title: 'Status',
            sortable: true,
            render: r => (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            ),
          },
          {
            key: 'dateReq',
            title: 'Date Req',
            render: r => r.installDetail?.installDate
              ? new Date(r.installDetail.installDate).toLocaleDateString('en-AU')
              : '-',
          },
          {
            key: 'invoice',
            title: 'Invoice',
            render: () => '0',
          },
          {
            key: 'install',
            title: 'Install',
            render: () => '0',
          },
          {
            key: 'installType',
            title: 'Install Type',
            render: r => r.type?.replace('_', ' ') ?? '-',
          },
          {
            key: 'memo',
            title: 'Memo',
            render: () => '0',
          },
          {
            key: 'installer',
            title: 'Installer',
            render: r => r.installDetail?.installer || '-',
          },
          {
            key: 'location',
            title: 'Location',
            render: r => r.installDetail?.installLocation || '-',
          },
          {
            key: 'mix',
            title: 'MIX Service',
            render: r => r.installDetail?.mixCode || '-',
          },
          {
            key: 'hardware',
            title: 'Hware',
            render: () => '-',
          },
          {
            key: 'actions',
            title: '',
            render: r => (
              <Button size="sm"
                onClick={e => { e.stopPropagation(); router.push(`/fm-preinstall/${r.id}`); }}>
                Edit
              </Button>
            ),
          },
        ]}
      />
    </AdminShell>
  );
}