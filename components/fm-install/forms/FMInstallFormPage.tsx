'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import { FMInstallDetailsPanel } from '../../../components/fm-install/sections/FMInstallDetailsPanel';
import { FMInstallComments } from '../../../components/fm-install/sections/FMInstallComments';

interface Props {
    installId?: string;
    preinstallId?: string;
}

export function FMInstallFormPage({ installId, preinstallId }: Props) {
    const router = useRouter();
    const { showToast } = useToast();
    const isEdit = !installId;

    const [form, setForm] = useState<any>({
        status: 'ACTIVE',
        entryDate: new Date().toISOString().split('T')[0],
        preinstallRef: '',
    });
    const [installDetail, setInstallDetail] = useState<any>({});
    const [preinstallInfo, setPreinstallInfo] = useState<any>(null);
    const [saving, setSaving] = useState(false);

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
                fmwService: d.fmwService ?? '',
                mixCode: d.mixCode ?? '',
                status: d.status ?? 'ACTIVE',
                commissionedDate: d.commissionedDate?.split('T')[0] ?? '',
                decommissionedDate: d.decommissionedDate?.split('T')[0] ?? '',
                notCharged: d.notCharged ?? false,
                preinstallId: d.preinstallId ?? '',
                preinstallRef: d.preinstallRef ?? '',
                chargeFlag: d.chargeFlag ?? false,
                commissionMonth: d.commissionMonth ?? '',
            });

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
            setForm((p: any) => ({
                ...p,
                preinstallId,
                preinstallRef: d.preinstallRef ?? d.reference ?? '',
                aasCustomerNum: d.customer?.customerNumber ?? '',
                fmCustomerNum: d.fmCustomer?.fmWebNumber ?? '',
                mixOrgId: d.installDetail?.mixOrgId ?? '',
                mixAssetNum: d.installDetail?.assetNumber ?? '',
                vehicleMake: d.installDetail?.vehicleMake ?? '',
                vehicleModel: d.installDetail?.vehicleModel ?? '',
                vehicleYear: d.installDetail?.yearVariant ?? '',
                rego: d.installDetail?.regoNumber ?? '',
                baseUnit: d.installDetail?.fmUnitCode ?? '',
                mixCode: d.installDetail?.mixCode ?? '',
                depot: d.depot ?? '',
            }));
            if (d.installDetail) setInstallDetail(d.installDetail);
        }).catch(() => showToast({ type: 'error', title: 'Failed to load preinstall' }));
    }, [preinstallId]);

    const save = async () => {
        setSaving(true);
        try {
            if (isEdit) {
                const res = await api.put(`/fm-install/${installId}`, form);
                const updated = res.data?.data ?? res.data;

                // Save detail separately if changed
                if (Object.keys(installDetail).length) {
                    await api.put(`/fm-install/${installId}/detail`, installDetail);
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
        } catch {
            showToast({ type: 'error', title: 'Save failed' });
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
                <Button onClick={save} disabled={saving}>
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
                                <label className="text-slate-500">AAS Customer Num</label>
                                <Input value={f('aasCustomerNum')} onChange={(e: any) => set('aasCustomerNum', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">AAS Customer Name</label>
                                <Input value={preinstallInfo?.customer?.name ?? ''} readOnly className="bg-slate-50" />
                            </div>
                            <div>
                                <label className="text-slate-500">FM Customer Num</label>
                                <Input value={f('fmCustomerNum')} onChange={(e: any) => set('fmCustomerNum', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">FM Customer Name</label>
                                <Input value={preinstallInfo?.fmCustomer?.customer?.name ?? ''} readOnly className="bg-slate-50" />
                            </div>
                            <div>
                                <label className="text-slate-500">MIX Org ID Num</label>
                                <Input value={f('mixOrgId')} onChange={(e: any) => set('mixOrgId', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-slate-500">MIX Org Name</label>
                                <Input value={preinstallInfo?.fmCustomer?.mixDBase ?? ''} readOnly className="bg-slate-50" />
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
                                <Input value={f('vehicleMake')} onChange={(e: any) => set('vehicleMake', e.target.value)} />
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
                            <Input value={f('baseUnit')} onChange={(e: any) => set('baseUnit', e.target.value)}
                                className="bg-yellow-50" />
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            <div>
                                <label className="text-slate-500">Rego</label>
                                <Input value={f('rego')} onChange={(e: any) => set('rego', e.target.value)} />
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
                                <Input value={f('fmwService')} className="bg-yellow-50"
                                    onChange={(e: any) => set('fmwService', e.target.value)} />
                            </div>
                        </div>

                        {/* MIX CODE display — synced from form/installDetail */}
                        <div>
                            <label className="text-slate-500">MIX CODE</label>
                            <div className="flex items-center gap-2">
                                <Input value={f('mixCode') || installDetail?.mixCode || ''} readOnly className="font-mono bg-yellow-50 flex-1" />
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