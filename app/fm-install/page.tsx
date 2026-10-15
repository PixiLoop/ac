'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../components/layout/AdminShell';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/api-client';
import { useToast } from '../../components/ui/toast';

const FM_SERVICE_TYPES = ['ALL', 'FMSS1X', 'FMSS1', 'FMRMS1', 'FMS'];
const UNIT_TYPES = ['ALL', 'FM_RM', 'FM_VIS', 'FMS', 'FM_TABS'];
const HW_TYPES = ['ALL', 'Remora', 'MIX4000'];
const CAMERA_TYPES = ['Null', 'Std', 'HighDef', 'AI', 'DX', 'MN'];
const EXTRA_SERVICES = ['Service', 'Camera', 'SIM'];
const INSTALL_STATUSES = ['ALL', 'INSTALL', 'ACTIVE', 'ON_HOLD', 'DECOMMISSIONED'];

export default function FMInstallListPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [filters, setFilters] = useState({
    customer: '',
    fmCusNum: '',
    colSearch: '',
    chargeOnly: false,
    visionFitted: false,
    status: 'ALL',
    serviceType: 'ALL',
    unitType: 'ALL',
    hwType: 'ALL',
    cameraType: 'Null',
    extraService: 'Service',
  });

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (filters.customer) params.customer = filters.customer;
      if (filters.fmCusNum) params.fmCusNum = filters.fmCusNum;
      if (filters.colSearch) params.colSearch = filters.colSearch;
      if (filters.chargeOnly) params.chargeOnly = 'true';
      if (filters.visionFitted) params.visionFitted = 'true';
      if (filters.status !== 'ALL') params.status = filters.status;
      if (filters.serviceType !== 'ALL') params.serviceType = filters.serviceType;
      if (filters.unitType !== 'ALL') params.unitType = filters.unitType;
      if (filters.hwType !== 'ALL') params.hwType = filters.hwType;
      if (filters.cameraType !== 'Null') params.cameraType = filters.cameraType;
      if (filters.extraService !== 'Service') params.extraService = filters.extraService;

      const res = await api.get('/fm-install', { params });
      const d = res.data?.data ?? res.data;
      setItems(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch {
      showToast({ type: 'error', title: 'Load failed' });
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k: string, v: any) =>
    setFilters(p => ({ ...p, [k]: v }));

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminShell title="FM Install">
      <div className="flex justify-end mb-2">
        <Button onClick={() => router.push('/fm-install/new')}>New Install</Button>
      </div>

      {/* FILTERS */}
      <div className="bg-white border p-3 mb-3 space-y-2 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-slate-500 text-xs">Customer</label>
            <input className="border p-1 w-full"
              value={filters.customer}
              onChange={e => setFilter('customer', e.target.value)} />
          </div>
          <div>
            <label className="text-slate-500 text-xs">FM Cus Num</label>
            <input className="border p-1 w-full"
              value={filters.fmCusNum}
              onChange={e => setFilter('fmCusNum', e.target.value)} />
          </div>
          <div>
            <label className="text-slate-500 text-xs">Col Search</label>
            <input className="border p-1 w-full"
              value={filters.colSearch}
              onChange={e => setFilter('colSearch', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3">
          <div>
            <label className="text-slate-500 text-xs">FM Installs</label>
            <select className="border p-1 w-full"
              value={filters.status}
              onChange={e => setFilter('status', e.target.value)}>
              {INSTALL_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs">FM Service Type</label>
            <select className="border p-1 w-full"
              value={filters.serviceType}
              onChange={e => setFilter('serviceType', e.target.value)}>
              {FM_SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs">Unit Type</label>
            <select className="border p-1 w-full"
              value={filters.unitType}
              onChange={e => setFilter('unitType', e.target.value)}>
              {UNIT_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs">FM Hardware Type</label>
            <select className="border p-1 w-full"
              value={filters.hwType}
              onChange={e => setFilter('hwType', e.target.value)}>
              {HW_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs">AAI Camera Type</label>
            <select className="border p-1 w-full"
              value={filters.cameraType}
              onChange={e => setFilter('cameraType', e.target.value)}>
              {CAMERA_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs">Extra Service</label>
            <select className="border p-1 w-full"
              value={filters.extraService}
              onChange={e => setFilter('extraService', e.target.value)}>
              {EXTRA_SERVICES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={filters.chargeOnly}
              onChange={e => setFilter('chargeOnly', e.target.checked)} />
            <span>Charge Only</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={filters.visionFitted}
              onChange={e => setFilter('visionFitted', e.target.checked)} />
            <span>Vision Fitted</span>
          </label>
          {/* <Button onClick={() => { setPage(1); load(); }}>Start</Button> */}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border overflow-x-auto text-xs">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-100">
            <tr>
              {['Install', 'FMCN', 'AAI Cus', 'Fleet Name', 'OrgID', 'VehID',
                'Rego', 'Fleet Num', 'Status', 'Charge', 'Commissioned', 'Decommissioned', 'Depot', 'Unit Type',
                'FM Serv', 'Cameras', 'VFM3N', 'Sim2', 'Sim3', 'Hware', 'Mix Serv']
                .map(h => (
                  <th key={h} className="px-2 py-1.5 text-left font-medium border-b whitespace-nowrap">{h}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={21} className="text-center py-6 text-slate-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={21} className="text-center py-6 text-slate-400">No records</td></tr>
            ) : items.map((r: any) => (
              <tr key={r.id} className="border-b hover:bg-blue-50 cursor-pointer"
                onClick={() => router.push(`/fm-install/${r.id}`)}>
                <td className="px-2 py-1">{r.serviceNumber ?? '-'}</td>
                <td className="px-2 py-1">{r.fmCustomerNum ?? '-'}</td>
                <td className="px-2 py-1">{r.aasCustomerNum ?? '-'}</td>
                <td className="px-2 py-1">{r.installDetail?.fleetNumber ?? '-'}</td>
                <td className="px-2 py-1">{r.mixOrgId ?? '-'}</td>
                <td className="px-2 py-1">{r.mixAssetNum ?? '-'}</td>
                <td className="px-2 py-1">{r.rego ?? '-'}</td>
                <td className="px-2 py-1">{r.installDetail?.fleetNumber ?? '-'}</td>
                <td className="px-2 py-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.status ?? '-'}
                  </span>
                </td>
                {/* <td className="px-2 py-1">{r.notCharged === false ? 'Y' : '-'}</td> */}
                <td className="px-2 py-1">
                  {r.chargeFlag ? (
                    <span className="text-green-600 font-semibold">✓</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="px-2 py-1">
                  {r.commissionedDate ? new Date(r.commissionedDate).toLocaleDateString('en-AU') : '-'}
                </td>
                <td className="px-2 py-1">
                  {r.decommissionedDate ? new Date(r.decommissionedDate).toLocaleDateString('en-AU') : '-'}
                </td>
                <td className="px-2 py-1">{r.depot ?? '-'}</td>
                <td className="px-2 py-1">{r.installDetail?.fmUnitType ?? '-'}</td>
                <td className="px-2 py-1">{r.fmwService ?? '-'}</td>
                <td className="px-2 py-1">{r.installDetail?.cameraCount ?? '-'}</td>
                <td className="px-2 py-1">-</td>
                <td className="px-2 py-1">{r.installDetail?.mixSim2 ? '1' : '-'}</td>
                <td className="px-2 py-1">-</td>
                <td className="px-2 py-1">-</td>
                <td className="px-2 py-1">{r.installDetail?.mixCode ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
        <span>Showing {items.length} of {total}</span>
        <div className="flex gap-1">
          <button className="border px-2 py-1 disabled:opacity-40"
            disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span className="px-2 py-1">Page {page} / {totalPages || 1}</span>
          <button className="border px-2 py-1 disabled:opacity-40"
            disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      </div>
    </AdminShell>
  );
}