'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import { CustomerSearchSelect } from '../../../components/common/CustomerSearchSelect';
import { cn } from '../../../lib/utils';
import { FMInstallDetailsPanel } from '../../../components/fm-install/sections/FMInstallDetailsPanel';
import { DEFAULT_MIX_CODE, INVALID_FM_CUS_NUM, INVALID_MIX_SERVICE_CODE, INVALID_SERVICE, SETUP_FM_CUSTOMER_FIRST } from '../../../lib/fm-rules';
import { FMInstallComments } from '../../../components/fm-install/sections/FMInstallComments';

function orgFromFm(fm: any) {
    const orgs = (fm?.FMCustomerOrgIds ?? [])
        .map((row: any) => row.organizations)
        .filter(Boolean);
    const linkedId = orgs.map((org: any) => org.code).filter(Boolean).join(', ');
    const linkedName = orgs.map((org: any) => org.label).filter(Boolean).join(', ');
    const id = fm?.mixOrgId || linkedId;
    const name = fm?.mixDBase || linkedName;
    return { id, name };
}

function FMCustomerSearch({
    value,
    onSelect,
}: {
    value: { id: string; fmWebNumber?: string | null; fleetName?: string | null; customerName?: string | null } | null;
    onSelect: (row: any) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            api.get('/fm-customers', {
                params: { search: query.trim() || undefined, take: 20 },
            }).then(res => {
                const payload = res.data?.data ?? res.data;
                const list = payload?.items ?? payload ?? [];
                setItems(Array.isArray(list) ? list : []);
            }).catch(() => setItems([]));
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const label = value
        ? `${value.fmWebNumber ?? ''} – ${value.fleetName || value.customerName || ''}`.replace(/^ – /, '')
        : '';

    return (
        <div ref={ref} className="relative w-full min-w-0">
            <label className="font-medium text-slate-700 mb-1 block text-sm">FM Customer</label>
            <div
                className={cn(
                    'w-full h-9 border rounded-md px-3 flex items-center text-sm bg-white cursor-pointer truncate',
                    !value && 'text-slate-400',
                )}
                onClick={() => setOpen(o => !o)}
            >
                {label || 'Select FM Customer'}
            </div>
            {open && (
                <div className="absolute z-50 mt-1 w-full border rounded-md bg-white shadow-lg">
                    <input
                        autoFocus
                        className="w-full px-3 py-2 text-sm border-b outline-none"
                        placeholder="Type to search…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <div className="max-h-56 overflow-auto">
                        {items.length === 0 && (
                            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
                        )}
                        {items.map((row: any) => (
                            <div
                                key={row.id}
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                    onSelect(row);
                                    setOpen(false);
                                    setQuery('');
                                }}
                            >
                                <span className="font-mono text-xs text-slate-500 mr-2">{row.fmWebNumber}</span>
                                {row.fleetName || row.customer?.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface Props {
    installId?: string;
    preinstallId?: string;
}

export function FMInstallFormPage({ installId, preinstallId }: Props) {
    const router = useRouter();
    const { showToast } = useToast();
    const isEdit = Boolean(installId);
    const [fmLocked, setFmLocked] = useState(false);
    const [serviceOk, setServiceOk] = useState(false);
    const [accountCustomerId, setAccountCustomerId] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [selectedFm, setSelectedFm] = useState<any>(null);
    const [orgIdText, setOrgIdText] = useState('');
    const [orgNameText, setOrgNameText] = useState('');

    const [form, setForm] = useState<any>({
        status: 'ACTIVE',
        entryDate: new Date().toISOString().split('T')[0],
        preinstallRef: '',
    });
    const [installDetail, setInstallDetail] = useState<any>({});
    const [preinstallInfo, setPreinstallInfo] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const applyFmCustomer = async (
        fmId: string,
        hint?: { name?: string; customerNumber?: string },
    ) => {
        const res = await api.get(`/fm-customers/${fmId}`);
        const fm = res.data?.data ?? res.data;
        if (!fm?.id) return;
        const org = orgFromFm(fm);
        const customerNumber = fm.customer?.customerNumber ?? hint?.customerNumber ?? '';
        const customerName = hint?.name ?? '';
        setSelectedFm({
            id: fm.id,
            fmWebNumber: fm.fmWebNumber,
            fleetName: fm.fleetName,
            customerName,
        });
        setSelectedCustomer({
            id: fm.customerId,
            customerNumber,
            name: customerName,
            fmCustomer: { id: fm.id, fleetName: fm.fleetName, fmWebNumber: fm.fmWebNumber },
        });
        setAccountCustomerId(fm.customerId ?? '');
        setFmLocked(true);
        setOrgIdText(org.id);
        setOrgNameText(org.name);
        setForm((p: any) => ({
            ...p,
            aasCustomerNum: customerNumber || p.aasCustomerNum,
            fmCustomerNum: fm.fmWebNumber ?? '',
            mixOrgId: org.id,
        }));
        setInstallDetail((p: any) => ({ ...p, mixOrgId: org.id }));
    };

    const resolveFmByNumber = async (fmNumber: string, aasNumber?: string) => {
        const res = await api.get('/fm-customers', { params: { search: fmNumber, take: 20 } });
        const payload = res.data?.data ?? res.data;
        const list = payload?.items ?? payload ?? [];
        const match = (Array.isArray(list) ? list : []).find((row: any) =>
            String(row.fmWebNumber ?? '').toLowerCase() === String(fmNumber).trim().toLowerCase(),
        );
        if (!match?.id) return;
        await applyFmCustomer(match.id, {
            name: match.customer?.name ?? match.fleetName,
            customerNumber: match.customer?.customerNumber ?? aasNumber,
        });
    };

    const resolveCustomerByNumber = async (number: string) => {
        try {
            const res = await api.get('/customers/lookup', { params: { number } });
            const customer = res.data?.data ?? res.data;
            if (!customer?.id) return;
            setSelectedCustomer(customer);
            setAccountCustomerId(customer.id);
            if (customer.fmCustomer?.id) {
                await applyFmCustomer(customer.fmCustomer.id, {
                    name: customer.name,
                    customerNumber: customer.customerNumber,
                });
            }
        } catch {
            /* leave the stored numbers on the install */
        }
    };

    // Load existing FMInstall (edit mode)
    useEffect(() => {
        if (!installId) return;
        api.get(`/fm-install/${installId}`).then(res => {
            const d = res.data?.data ?? res.data;
            if (!d) return;

            setForm({
                id: d.id ?? '',
                entryDate: d.entryDate?.split('T')[0] ?? '',
                installDate: d.installDate?.split('T')[0] ?? '',
                installInvoice: d.installInvoice ?? '',
                author: d.author ?? '',
                installBy: d.installBy ?? '',
                aasCustomerNum: d.aasCustomerNum ?? '',
                fmCustomerNum: d.fmCustomerNum ?? '',
                mixOrgId: d.mixOrgId ?? '',
                mixAssetNum: d.mixAssetNum ?? '',
                baseUnit: d.baseUnit ?? '',
                vehicleMake: d.vehicleMake ?? '',
                vehicleModel: d.vehicleModel ?? '',
                vehicleYear: d.vehicleYear ?? '',
                rego: d.rego ?? '',
                fiNumber: d.fiNumber ?? '',
                depot: d.depot ?? '',
                site: d.site ?? '',
                serviceNumber: d.serviceNumber ?? '',
                fmwService: d.fmwService || d.installDetail?.serviceCode || '',
                mixCode: d.mixCode || d.installDetail?.mixCode || '',
                status: d.status ?? 'ACTIVE',
                commissionedDate: d.commissionedDate?.split('T')[0] ?? '',
                decommissionedDate: d.decommissionedDate?.split('T')[0] ?? '',
                notCharged: d.notCharged ?? false,
                preinstallId: d.preinstallId ?? '',
                preinstallRef: d.preinstallRef ?? '',
                chargeFlag: d.chargeFlag ?? false,
                commissionMonth: d.commissionMonth ?? '',
            });
            if (d.fmCustomerNum) setFmLocked(true);
            if (d.fmwService || d.installDetail?.serviceCode) setServiceOk(true);
            setOrgIdText(d.mixOrgId ?? '');
            if (d.fmCustomerNum) {
                void resolveFmByNumber(d.fmCustomerNum, d.aasCustomerNum);
            } else if (d.aasCustomerNum) {
                void resolveCustomerByNumber(d.aasCustomerNum);
            }

            if (d.installDetail) {
                setInstallDetail(d.installDetail);
            }
        }).catch(() => showToast({ type: 'error', title: 'Load failed' }));
    }, [installId]);

    // Load preinstall data to pre-populate (create mode with preinstallId)
    useEffect(() => {
        if (!preinstallId || installId) return;
        api.get(`/fm-install/preinstall/${preinstallId}`).then(res => {
            const d = res.data?.data ?? res.data;
            setPreinstallInfo(d);
            // Pre-populate from preinstall
            const detail = d.installDetail ?? {};
            setForm((p: any) => ({
                ...p,
                preinstallId,
                preinstallRef: d.preinstallNo ?? d.preinstallRef ?? d.reference ?? '',
                aasCustomerNum: d.customer?.customerNumber ?? '',
                fmCustomerNum: d.fmCustomer?.fmWebNumber ?? '',
                mixOrgId: detail.mixOrgId ?? '',
                mixAssetNum: detail.assetNumber ?? '',
                vehicleMake: detail.vehicleMake ?? '',
                vehicleModel: detail.vehicleModel ?? '',
                vehicleYear: detail.yearVariant ?? '',
                rego: detail.regoNumber ?? '',
                fiNumber: detail.fleetNumber ?? '',
                baseUnit: detail.fmUnitCode ?? '',
                mixCode: detail.mixCode ?? '',
                fmwService: detail.serviceCode ?? '',
                installDate: detail.installDate
                    ? new Date(detail.installDate).toISOString().split('T')[0]
                    : '',
                installBy: d.installByName || detail.installer || '',
                author: d.authorName || '',
                installInvoice: d.invoice?.invoiceNumber ?? '',
                depot: d.Depots?.name ?? d.depot ?? detail.installLocation ?? '',
                site: detail.installLocation ?? '',
            }));
            if (d.fmCustomer?.id) {
                void applyFmCustomer(d.fmCustomer.id, {
                    name: d.customer?.name,
                    customerNumber: d.customer?.customerNumber,
                });
            } else if (d.customer?.id) {
                setSelectedCustomer(d.customer);
                setAccountCustomerId(d.customer.id);
            }
            if (detail.serviceCode) setServiceOk(true);
            if (d.installDetail) setInstallDetail(d.installDetail);
        }).catch(() => showToast({ type: 'error', title: 'Failed to load preinstall' }));
    }, [preinstallId]);

    const validateFmCustomer = async () => {
        const number = String(form.fmCustomerNum ?? '').trim();
        if (!number) {
            showToast({ type: 'error', title: SETUP_FM_CUSTOMER_FIRST, message: SETUP_FM_CUSTOMER_FIRST });
            setFmLocked(false);
            return false;
        }
        try {
            const res = await api.get('/fm-customers', { params: { search: number, take: 20 } });
            const payload = res.data?.data ?? res.data;
            const list = payload?.items ?? payload ?? [];
            const match = (Array.isArray(list) ? list : []).find((row: any) =>
                String(row.fmWebNumber ?? '').toLowerCase() === number.toLowerCase() && row.customer && !row.customer.deletedAt
            );
            if (!match) {
                showToast({ type: 'error', title: INVALID_FM_CUS_NUM, message: INVALID_FM_CUS_NUM });
                setFmLocked(false);
                return false;
            }
            setFmLocked(true);
            setAccountCustomerId(match.customerId ?? '');
            return true;
        } catch {
            showToast({ type: 'error', title: INVALID_FM_CUS_NUM, message: INVALID_FM_CUS_NUM });
            setFmLocked(false);
            return false;
        }
    };

    const resolvedServiceCode = () =>
        String(form.fmwService || installDetail?.serviceCode || '').trim();

    const validateService = async (opts?: { silent?: boolean }) => {
        const code = resolvedServiceCode();
        if (!code) {
            setServiceOk(false);
            if (!opts?.silent) {
                showToast({ type: 'error', title: INVALID_SERVICE, message: INVALID_SERVICE });
            }
            return false;
        }
        try {
            const res = await api.get('/products/by-code', { params: { code } });
            const product = res.data?.data ?? res.data;
            if (!product?.id) {
                setServiceOk(false);
                if (!opts?.silent) {
                    showToast({
                        type: 'error',
                        title: INVALID_SERVICE,
                        message: `${INVALID_SERVICE} — ${code}`,
                    });
                }
                return false;
            }
            // Keep form.fmwService in sync when only detail.serviceCode was set
            if (!String(form.fmwService ?? '').trim()) {
                setForm((p: any) => ({ ...p, fmwService: code }));
            }
            setServiceOk(true);
            return true;
        } catch {
            setServiceOk(false);
            if (!opts?.silent) {
                showToast({
                    type: 'error',
                    title: INVALID_SERVICE,
                    message: `${INVALID_SERVICE} — ${code}`,
                });
            }
            return false;
        }
    };

    const mixCode = String(form.mixCode || installDetail?.mixCode || '').trim();
    const mixOk = !!mixCode && mixCode !== DEFAULT_MIX_CODE;
    const canSave = fmLocked && serviceOk && mixOk;

    const save = async () => {
        if (!String(form.fmCustomerNum ?? '').trim()) {
            showToast({ type: 'error', title: SETUP_FM_CUSTOMER_FIRST, message: SETUP_FM_CUSTOMER_FIRST });
            return;
        }
        const fmOk = fmLocked || await validateFmCustomer();
        if (!fmOk) return;
        // Always re-check service on save (don't trust stale serviceOk from load)
        // const svcOk = await validateService();
        // if (!svcOk) return;
        if (!mixOk) {
            showToast({ type: 'error', title: INVALID_MIX_SERVICE_CODE, message: INVALID_MIX_SERVICE_CODE });
            return;
        }
        setSaving(true);
        try {
            if (isEdit) {
                const serviceCode = resolvedServiceCode();
                const payload = {
                    entryDate: form.entryDate || null,
                    installDate: form.installDate || null,
                    installInvoice: form.installInvoice ?? null,
                    author: form.author ?? null,
                    installBy: form.installBy ?? null,
                    aasCustomerNum: form.aasCustomerNum ?? null,
                    fmCustomerNum: form.fmCustomerNum ?? null,
                    mixOrgId: form.mixOrgId ?? null,
                    mixAssetNum: form.mixAssetNum ?? null,
                    baseUnit: form.baseUnit ?? null,
                    vehicleMake: form.vehicleMake ?? null,
                    vehicleModel: form.vehicleModel ?? null,
                    vehicleYear: form.vehicleYear ?? null,
                    rego: form.rego ?? null,
                    fiNumber: form.fiNumber ?? null,
                    depot: form.depot ?? null,
                    site: form.site ?? null,
                    serviceNumber: form.serviceNumber === '' || form.serviceNumber == null
                        ? null
                        : Number(form.serviceNumber),
                    fmwService: serviceCode || null,
                    mixCode: mixCode || null,
                    status: form.status || null,
                    commissionedDate: form.commissionedDate || null,
                    decommissionedDate: form.decommissionedDate || null,
                    notCharged: !!form.notCharged,
                    invoiceRef: form.invoiceRef ?? null,
                    preinstallRef: form.preinstallRef ?? null,
                };
                const res = await api.put(`/fm-install/${installId}`, payload);
                const updated = res.data?.data ?? res.data;

                // Save detail separately if present (strip nested relation junk)
                if (installDetail && (installDetail.id || installDetail.serviceCode || installDetail.mixCode)) {
                    const {
                        id: _id,
                        preinstallId: _pid,
                        createdAt: _c,
                        updatedAt: _u,
                        fMInstallDetailOrgIds: _orgs,
                        organizations: _organizations,
                        preinstall: _pre,
                        fmInstall: _fm,
                        ...detailPayload
                    } = installDetail;
                    await api.put(`/fm-install/${installId}/detail`, detailPayload);
                }

                setForm((p: any) => ({
                    ...p,
                    chargeFlag: updated.chargeFlag ?? p.chargeFlag,
                    commissionMonth: updated.commissionMonth ?? p.commissionMonth,
                }));

                showToast({ type: 'success', title: 'Updated' });
            } else {
                const res = await api.post('/fm-install', { ...form, installDetail });
                const id = res.data?.data?.id ?? res.data?.id;
                router.push(`/fm-install/${id}`);
            }
        } catch (err: any) {
            const raw = err?.response?.data?.message;
            const msg = typeof raw === 'string' ? raw : (raw?.message ?? err?.message ?? 'Save failed');
            showToast({ type: 'error', title: 'Save failed', message: String(msg) });
        } finally {
            setSaving(false);
        }
    };

    const f = (k: string) => (form[k] ?? '');
    const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

    const previewChargeFlag = useMemo(() => {
        if (form.notCharged) return false;

        const now = new Date();
        const monthRelation = (dateStr: string): 'past' | 'current' | 'future' | null => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            const dMonths = d.getFullYear() * 12 + d.getMonth();
            const nMonths = now.getFullYear() * 12 + now.getMonth();
            if (dMonths < nMonths) return 'past';
            if (dMonths > nMonths) return 'future';
            return 'current';
        };

        if (form.status === 'INSTALL') return false;

        if (form.status === 'ACTIVE') {
            const rel = monthRelation(form.commissionedDate);
            if (!rel) return false;
            return rel !== 'future';
        }

        if (form.status === 'DECOMMISSIONED' || form.status === 'ON_HOLD') {
            const rel = monthRelation(form.decommissionedDate);
            if (!rel) return false;
            return rel !== 'past';
        }

        return false;
    }, [form.status, form.commissionedDate, form.decommissionedDate, form.notCharged]);

    return (
        <AdminShell title={isEdit ? 'Edit FM Install' : 'Create FM Install'}>
            <div className="flex justify-end gap-2 mb-3">
                <Button onClick={() => router.push('/fm-install')}>Cancel</Button>
                <Button onClick={save} disabled={saving || !canSave}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </div>

            <div className="grid grid-cols-12 gap-3">
                {/* LEFT — Header fields */}
                <div className="col-span-12 lg:col-span-6 space-y-3">

                    {/* FM Installation header */}
                    <div className="bg-white border p-3 text-xs">
                        <div className="font-bold text-sm mb-3 text-blue-700">FM Installation</div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-slate-500">Entry Date</label>
                                <input type="date" className="border p-1 w-full"
                                    value={f('entryDate')} onChange={e => set('entryDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">Install Date</label>
                                <input type="date" className="border p-1 w-full"
                                    value={f('installDate')} onChange={e => set('installDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">Install Invoice</label>
                                <Input value={f('installInvoice')} onChange={(e: any) => set('installInvoice', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">Author</label>
                                <Input value={f('author')} onChange={(e: any) => set('author', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">Install By</label>
                                <Input value={f('installBy')} onChange={(e: any) => set('installBy', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">Pre Install Ref</label>
                                <Input value={f('preinstallRef') || f('preinstallId')} readOnly
                                    className="bg-slate-50 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Customer info */}
                    <div className="bg-white border p-3 text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <CustomerSearchSelect
                                    value={selectedCustomer}
                                    label="Customer"
                                    requireFmCustomer
                                    onSelect={(customer) => {
                                        setSelectedCustomer(customer);
                                        setAccountCustomerId(customer.id);
                                        set('aasCustomerNum', customer.customerNumber);
                                        if (customer.fmCustomer?.id) {
                                            void applyFmCustomer(customer.fmCustomer.id, {
                                                name: customer.name,
                                                customerNumber: customer.customerNumber,
                                            });
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-slate-500">Customer Name</label>
                                <Input value={selectedCustomer?.name ?? preinstallInfo?.customer?.name ?? ''} readOnly className="bg-slate-50" />
                            </div>
                            <div>
                                <FMCustomerSearch
                                    value={selectedFm}
                                    onSelect={(row) => {
                                        void applyFmCustomer(row.id, {
                                            name: row.customer?.name ?? row.fleetName,
                                            customerNumber: row.customer?.customerNumber,
                                        });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-slate-500">FM Customer Name</label>
                                <Input value={selectedFm?.fleetName || selectedFm?.customerName || ''} readOnly className="bg-slate-50" />
                            </div>
                            <div>
                                <label className="text-slate-500">MIX Org ID</label>
                                <Input value={orgIdText} readOnly className="bg-slate-50" />
                            </div>
                            <div>
                                <label className="text-slate-500">MIX Org Name</label>
                                <Input value={orgNameText} readOnly className="bg-slate-50" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-slate-500">MIX Asset Num</label>
                                <Input value={f('mixAssetNum')} onChange={(e: any) => set('mixAssetNum', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Vehicle */}
                    <div className="bg-white border p-3 text-xs">
                        <div className="text-slate-400 text-[10px] mb-1 uppercase tracking-wide">Vehicle Make / Model / Year</div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                                <label className="text-slate-500">Make</label>
                                <Input value={f('vehicleMake')} onChange={(e: any) => set('vehicleMake', e.target.value)}
                                    onBlur={(e: any) => set('vehicleMake', String(e.target.value ?? '').toUpperCase())} />
                            </div>
                            <div>
                                <label className="text-slate-500">Model</label>
                                <Input value={f('vehicleModel')} onChange={(e: any) => set('vehicleModel', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">Year</label>
                                <Input value={f('vehicleYear')} onChange={(e: any) => set('vehicleYear', e.target.value)} />
                            </div>
                        </div>

                        <div className="mb-2">
                            <label className="text-slate-500">Base Unit</label>
                            <Input value={f('baseUnit')} onChange={(e: any) => set('baseUnit', e.target.value)} />
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            <div>
                                <label className="text-slate-500">Rego</label>
                                <Input value={f('rego')} onChange={(e: any) => set('rego', e.target.value)}
                                    onBlur={(e: any) => set('rego', String(e.target.value ?? '').toUpperCase())} />
                            </div>
                            <div>
                                <label className="text-slate-500">FI Num</label>
                                <Input value={f('fiNumber')} onChange={(e: any) => set('fiNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">Depot</label>
                                <Input value={f('depot')} onChange={(e: any) => set('depot', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">Site</label>
                                <Input value={f('site')} onChange={(e: any) => set('site', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Service / MIX CODE */}
                    <div className="bg-white border p-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                                <label className="text-slate-500">Service Number</label>
                                <Input value={f('serviceNumber')} numeric
                                    onChange={(e: any) => set('serviceNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">FMW Service</label>
                                <Input
                                    value={f('fmwService')}
                                    className={!serviceOk && resolvedServiceCode() ? 'border-rose-400 bg-rose-50' : ''}
                                    onChange={(e: any) => { setServiceOk(false); set('fmwService', e.target.value); }}
                                    onBlur={() => validateService()}
                                />
                            </div>
                        </div>

                        {/* MIX CODE display — synced from form/installDetail */}
                        <div>
                            <label className="text-slate-500">MIX CODE</label>
                            <div className="flex items-center gap-2">
                                <Input value={f('mixCode') || installDetail?.mixCode || ''} readOnly className="font-mono bg-slate-50 flex-1" />
                                {/* Segment visual */}
                                <div className="flex gap-0.5 text-[9px] text-blue-600 font-bold">
                                    {(f('mixCode') || installDetail?.mixCode || '').split('_').map((seg: string, i: number) => (
                                        <span key={i} className="border border-blue-200 px-1 bg-blue-50">{seg}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="bg-white border p-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-slate-500">Current Status</label>
                                <select className="border p-1 w-full"
                                    value={f('status')}
                                    onChange={e => {
                                        const newStatus = e.target.value;
                                        const today = new Date().toISOString().split('T')[0];

                                        setForm((p: any) => {
                                            const wasActive = p.status === 'ACTIVE';
                                            const goingActive = newStatus === 'ACTIVE';
                                            const goingDecommissioned = newStatus === 'ON_HOLD' || newStatus === 'DECOMMISSIONED';

                                            return {
                                                ...p,
                                                status: newStatus,
                                                ...(goingActive && !p.commissionedDate && {
                                                    commissionedDate: today,
                                                }),
                                                ...(goingDecommissioned && {
                                                    decommissionedDate: today,
                                                }),
                                                ...(goingActive && !wasActive && {
                                                    decommissionedDate: '',
                                                }),
                                            };
                                        });
                                    }}
                                >
                                    <option value="INSTALL">Install</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="DECOMMISSIONED">Decommissioned</option>
                                </select>
                            </div>
                            <div>
                                <div className="flex items-center justify-start gap-2 mt-5 w-fit">
                                    <input type="checkbox" checked={form.notCharged ?? false}
                                        onChange={e => set('notCharged', e.target.checked)} />
                                    <span className="text-slate-600 whitespace-nowrap">Not Charged</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-slate-500">Commissioned Date</label>
                                <input type="date" className="border p-1 w-full"
                                    value={f('commissionedDate')} onChange={e => set('commissionedDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">Decommissioned Date</label>
                                <input type="date" className="border p-1 w-full"
                                    value={f('decommissionedDate')} onChange={e => set('decommissionedDate', e.target.value)} />
                            </div>

                            <div>
                                <label className="text-slate-500">Charge Flag <span className="text-slate-400">(live preview)</span></label>
                                <div className={`mt-1 px-3 py-1 rounded text-xs font-bold w-fit ${previewChargeFlag ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {previewChargeFlag ? '✓ Charging' : 'Not Charging'}
                                </div>
                            </div>
                            <div>
                                <label className="text-slate-500">Commission Month</label>
                                <div className="mt-1 text-xs text-slate-600 font-mono">
                                    {form.commissionMonth || '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT — FM Install Details Panel */}
                <div className="col-span-12 lg:col-span-6">
                    <FMInstallDetailsPanel
                        form={installDetail}
                        unitType={form.baseUnit}
                        customerId={accountCustomerId}
                        visionFitted={!!(installDetail.visionType || installDetail.cameraType || installDetail.standard || installDetail.highDef)}
                        update={(k: string, v: any) => {
                            setInstallDetail((p: any) => {
                                const next = { ...p, [k]: v };
                                if (k === 'mixCode') {
                                    setForm((f: any) => ({ ...f, mixCode: v }));
                                }
                                return next;
                            });
                        }}
                    />

                    {isEdit && installId && <FMInstallComments installId={installId} />}
                </div>
            </div>
        </AdminShell>
    );
}