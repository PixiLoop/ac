'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '../../ui/input';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';
import { Checkbox } from '../../ui/checkbox';
import { Radio } from '../../ui/radio';
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxValue } from '../../ui/combobox';

// ─── Vision types where camera count digit is NOT appended to service code ───
const VISION_NO_COUNT = new Set(['DX', 'MN']);

// ─── MiX Code S1 index mapping ───────────────────────────────────────────────
const SIM_MIX_INDEX: Record<string, number> = { S1: 1, S2: 2, S3: 3, S4: 4 };

export function FMInstallDetailsPanel({ item, onClose, onSave, fleetName, onSyncType, fmCustomerId }: any) {
    const [loading, setLoading] = useState(false)
    const [fmCustomer, setFmCustomer] = useState(null)
    const [customerOrgs, setCustomerOrgs] = useState([])
    const loadCustomer = async () => {
        if (!fmCustomerId) {
            setLoading(false);
            setFmCustomer(null)
            return;
        }

        try {
            const res = await api.get(`/customers/${fmCustomerId}`);
            const c = res.data.data;

            setFmCustomer(c)
        } catch {
            showToast({
                type: 'error',
                title: 'Failed to load customer',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomer();
    }, [fmCustomerId]);

    useEffect(() => {
        if (fmCustomer) {
            const orgs = fmCustomer?.fmCustomer?.FMCustomerOrgIds ? fmCustomer?.fmCustomer?.FMCustomerOrgIds?.map(item => ({ ...item.organizations })) : []
            setCustomerOrgs(orgs)
        } else {
            setCustomerOrgs([])
        }
    }, [fmCustomer])


    // ── Local form state — initialised from prop once, then self-managed ─────
    const [form, setForm] = useState<any>(() => item.installDetail ?? {});

    // Keep form in sync if a *different* item is passed in (e.g. user opens
    // another record) but never overwrite with a stale re-render of same item.
    const lastItemId = useRef<string>(item.installDetail?.id ?? '');
    useEffect(() => {
        const newId = item.installDetail?.id ?? '';
        if (newId !== lastItemId.current) {
            lastItemId.current = newId;
            setForm(item.installDetail ?? {});
            setIsInitialLoad(true);
        }
    }, [item.installDetail?.id]);

    useEffect(() => {
        if (!fleetName) return;
        setForm((prev: any) => {
            if (prev.fleetNumber) return prev;
            return { ...prev, fleetNumber: fleetName };
        });
    }, [fleetName]);

    useEffect(() => {
        if (!item?.installDetail?.installType) return;
        setForm((prev: any) => {
            if (prev.installType === item.installDetail.installType) return prev;
            return { ...prev, installType: item.installDetail.installType };
        });
    }, [item?.installDetail?.installType]);

    const [saving, setSaving] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const { showToast } = useToast();

    // Lookup lists
    const [baseUnits, setBaseUnits] = useState<any[]>([]);
    const [unitCodes, setUnitCodes] = useState<any[]>([]);
    const [visionList, setVisionList] = useState<any[]>([]);
    const [cameraList, setCameraList] = useState<any[]>([]);
    const [sim1List, setSim1List] = useState<any[]>([]);
    const [sim2List, setSim2List] = useState<any[]>([]);

    // ── Derived ──────────────────────────────────────────────────────────────
    const cameraCount = form.cameraCount ?? 2;
    const hasVision = !!form.visionType;
    const omitCount = VISION_NO_COUNT.has(form.visionType ?? '');
    const fmutIndex = baseUnits.find((u: any) => u.code === form.fmUnitType)?.sortOrder ?? '';
    const selectedUC = unitCodes.find((c: any) => c.code === form.fmUnitCode);
    const unitCodeIndex = selectedUC?.sortOrder ?? '';

    // ── Local update helper — keeps local state AND notifies parent ──────────
    const patchForm = (patch: Partial<typeof form>) => {
        setForm((prev: any) => {
            const next = { ...prev, ...patch };
            onSave(next);          // notify parent so it can persist
            return next;
        });
    };

    const update = (k: string, v: any) => patchForm({ [k]: v });

    // ── Validation ───────────────────────────────────────────────────────────
    const validateForm = () => {
        const errors: string[] = [];
        if (!form.fmUnitType) errors.push('FM Unit Type is required');
        if (!form.serviceCode) errors.push('Service Code missing');
        if (!form.mixCode) errors.push('MIX Code missing');
        if (form.mixSim1) {
            if (!form.unitSim) errors.push('Unit SIM required');
            if (!form.unitIMEI) errors.push('Unit IMEI required');
        }
        if (hasVision && !form.cameraType) errors.push('Camera Type required when Vision selected');
        if (form.mixSim2) {
            if (!form.visSim) errors.push('Vis SIM required');
            if (!form.visIMEI) errors.push('Vis IMEI required');
            if (cameraCount >= 2 && !form.vis2Serial) errors.push('Vis 2 Serial required');
            if (cameraCount >= 3 && !form.vis3Serial) errors.push('Vis 3 Serial required');
            if (cameraCount >= 4 && !form.vis4Serial) errors.push('Vis 4 Serial required');
        }
        return errors;
    };

    // ── Load static lists on mount ────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const [baseRes, s1Res, s2Res] = await Promise.all([
                    api.get('/fm-segments?type=BASE_UNIT'),
                    api.get('/fm-segments?type=SIM1'),
                    api.get('/fm-segments?type=SIM2'),
                ]);
                const allBase: any[] = baseRes.data?.data ?? [];
                setBaseUnits(allBase.filter((u: any) => u.sortOrder !== 0 && u.code !== 'NULL'));
                setSim1List(s1Res.data?.data ?? []);
                setSim2List(s2Res.data?.data ?? []);
            } catch {
                showToast({ type: 'error', title: 'Failed loading FM segments' });
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Restore dependent lists when editing existing record ─────────────────
    // Sets isInitialLoad=false AFTER lists are ready so generateCodes
    // does NOT fire with empty lists and overwrite saved serviceCode/mixCode.
    useEffect(() => {
        if (!form.fmUnitType) { setIsInitialLoad(false); return; }
        const restore = async () => {
            const [ucRes, visRes] = await Promise.allSettled([
                api.get(`/fm-segments?type=UNIT_CODE&dependsOn=${form.fmUnitType}`),
                api.get(`/fm-segments?type=VISION&dependsOn=${form.fmUnitType}`),
            ]);
            const uc = ucRes.status === 'fulfilled' ? (ucRes.value.data?.data ?? []) : [];
            const vis = visRes.status === 'fulfilled' ? (visRes.value.data?.data ?? []) : [];
            setUnitCodes(uc);
            setVisionList(vis);
            if (form.visionType) {
                const camRes = await api.get(`/fm-segments?type=CAMERA&dependsOn=${form.visionType}`).catch(() => null);
                setCameraList(camRes?.data?.data ?? []);
            }
            setIsInitialLoad(false);
        };
        restore();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Mirror unitSim → visSim
    // useEffect(() => {
    //     if (form.mixSim1 && form.mixSim2 && form.unitSim && !form.visSim) {
    //         update('visSim', form.unitSim);
    //     }
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [form.unitSim, form.mixSim1, form.mixSim2]);


    // SERVICE CODE + MIX CODE GENERATOR
    // SERVICE CODE: Seg1[Seg2][Seg3[Seg4]][Seg5]
    // MIX CODE:     MU_S1_V_VO_C+_S2
    // ─────────────────────────────────────────────────────────────────────────
    const generateCodes = (base: any) => {
        const f = base;
        const baseItem = baseUnits.find((u: any) => u.code === f.fmUnitType);
        const codeItem = unitCodes.find((c: any) => c.code === f.fmUnitCode);
        const muIndex = codeItem?.mixIndex ?? baseItem?.mixIndex ?? 0;

        const visItem = visionList.find((v: any) => v.code === f.visionType);
        const voIndex = visItem?.mixIndex ?? 0;
        const hasVis = !!f.visionType;
        const noCount = VISION_NO_COUNT.has(f.visionType ?? '');
        const camCount = f.cameraCount ?? 2;

        const s1Idx = f.mixSim1 ? (f.sim1Type ?? 0) : 0;
        const s2Idx = f.mixSim2 ? (f.sim2Type ?? 0) : 0;
        let cPlus = 0;
        if (hasVis && !noCount && camCount > 2) cPlus = camCount;

        let svc = f.fmUnitType ?? '';
        if (f.mixSim1 && f.sim1Type) svc += `S${f.sim1Type}`;
        if (hasVis && f.visionType) svc += f.visionType;
        if (hasVis && !noCount) svc += String(camCount);
        if (f.mixSim2 && f.sim2Type) svc += f.sim2Type;

        const mix = [muIndex, s1Idx, hasVis ? 1 : 0, voIndex, cPlus, s2Idx].join('_');
        return { serviceCode: svc, mixCode: mix };
    };

    // ── Re-generate codes when key fields change (skip initial load) ─────────
    useEffect(() => {
        if (isInitialLoad) return;
        if (!form.fmUnitType) return;
        const codes = generateCodes(form);
        setForm((prev: any) => {
            const next = { ...prev, ...codes };
            onSave(next);
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isInitialLoad,
        form.fmUnitType, form.fmUnitCode,
        form.mixSim1, form.sim1Type,
        form.visionType, form.cameraType, form.cameraCount,
        form.mixSim2, form.sim2Type,
    ]);

    // ── FM Unit TYPE change ──────────────────────────────────────────────────
    const handleUnitChange = async (val: string) => {
        const [ucRes, visRes] = await Promise.allSettled([
            api.get(`/fm-segments?type=UNIT_CODE&dependsOn=${val}`),
            api.get(`/fm-segments?type=VISION&dependsOn=${val}`),
        ]);
        const uc = ucRes.status === 'fulfilled' ? (ucRes.value.data?.data ?? []) : [];
        const visions = visRes.status === 'fulfilled' ? (visRes.value.data?.data ?? []) : [];
        setUnitCodes(uc);
        setVisionList(visions);
        setCameraList([]);

        const defaultUC = [...uc].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
        const defaultVis = [...visions].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
        const visionCode = defaultVis?.code ?? undefined;

        let cameras: any[] = [];
        let defaultCam: any = undefined;
        if (visionCode) {
            try {
                const camRes = await api.get(`/fm-segments?type=CAMERA&dependsOn=${visionCode}`);
                cameras = camRes.data?.data ?? [];
                setCameraList(cameras);
            } catch { /* ignore */ }
            defaultCam = [...cameras].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
        }

        patchForm({
            fmUnitType: val,
            fmUnitCode: defaultUC?.code ?? undefined,
            visionType: visionCode,
            cameraType: defaultCam?.code ?? undefined,
            cameraCount: defaultCam?.sortOrder ?? 2,
            mixSim2: !!visionCode,
            visSim: '', visIMEI: '',
            vis1Serial: '', vis2Serial: '', vis3Serial: '', vis4Serial: '',
        });
    };

    const handleUnitCodeChange = (val: string) => patchForm({ fmUnitCode: val });

    // ── Vision radio change ──────────────────────────────────────────────────
    const handleVisionChange = async (val: string) => {
        const noVis = !val;
        let cameras: any[] = [];
        let defaultCam: any = undefined;
        if (!noVis) {
            try {
                const res = await api.get(`/fm-segments?type=CAMERA&dependsOn=${val}`);
                cameras = res.data?.data ?? [];
                setCameraList(cameras);
            } catch { setCameraList([]); }
            defaultCam = [...cameras].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
        } else { setCameraList([]); }

        patchForm({
            visionType: noVis ? undefined : val,
            cameraType: defaultCam?.code ?? undefined,
            cameraCount: noVis ? undefined : (defaultCam?.sortOrder ?? 2),
            mixSim2: !noVis,
            ...(noVis && { visSim: '', visIMEI: '', vis1Serial: '', vis2Serial: '', vis3Serial: '', vis4Serial: '' }),
        });
    };

    const handleCameraTypeChange = (val: string) => {
        const cam = cameraList.find((c: any) => c.code === val);
        const count = cam?.sortOrder ?? 2;
        patchForm({
            cameraType: val,
            cameraCount: count,
            ...(count < 4 && { vis4Serial: '' }),
            ...(count < 3 && { vis3Serial: '' }),
            ...(count < 2 && { vis2Serial: '' }),
        });
    };

    const handleMixSim2Change = (val: boolean) => {
        patchForm({
            mixSim2: val,
            ...(!val && { visSim: '', visIMEI: '', vis1Serial: '', vis2Serial: '', vis3Serial: '', vis4Serial: '' }),
        });
    };

    const handleCameraCountChange = (count: number) => {
        patchForm({
            cameraCount: count,
            ...(count < 4 && { vis4Serial: '' }),
            ...(count < 3 && { vis3Serial: '' }),
            ...(count < 2 && { vis2Serial: '' }),
        });
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const errors = validateForm();
        if (errors.length) {
            showToast({ type: 'error', title: 'Validation Error', message: errors.join(', ') });
            return;
        }
        setSaving(true);
        try { await onSave(form); }
        finally { setSaving(false); }
    };

    const sortedBaseUnits = [...baseUnits].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const sortedUnitCodes = [...unitCodes].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return (
        <div className="h-full flex flex-col bg-white border text-xs">

            {/* HEADER */}
            <div className="flex justify-between items-center px-3 py-2 border-b bg-slate-100">
                <div className="font-bold text-sm">FM INSTALLATION DETAILS</div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">Target Record</span>
                    <span className="border px-2 py-0.5 bg-white font-mono min-w-[40px] text-center">
                        {item?.targetRecord ?? ''}
                    </span>
                    <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-900 font-bold">✕</button>
                </div>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-3">
                <div className="flex gap-4">

                    {/* ══ LEFT COLUMN ══════════════════════════════════════════ */}
                    <div className="w-1/2 space-y-1.5">

                        <LabelRow label="Install Type">
                            <select className="w-full border p-1"
                                value={form.installType ?? ''}
                                onChange={e => {
                                    update('installType', e.target.value);
                                    onSyncType?.(e.target.value);  // sync to main form type
                                }}>
                                <option value="NEW_INSTALL">New Install</option>
                                <option value="WARRANTY">Warranty</option>
                                <option value="REPLACEMENT">Replacement</option>
                                <option value="MODIFIED_INSTALL">Modified Install</option>
                                <option value="TRANSFER_UNIT">Transfer Unit</option>
                            </select>
                        </LabelRow>

                        <LabelRow label="FM Unit Type">
                            <div className="flex gap-1 items-center">
                                <select className="flex-1 border p-1"
                                    value={form.fmUnitType ?? ''}
                                    onChange={e => handleUnitChange(e.target.value)}>
                                    <option value="">Select</option>
                                    {sortedBaseUnits.map((b: any) => (
                                        <option key={b.id} value={b.code}>{b.label}</option>
                                    ))}
                                </select>
                                <IndexBadge>{fmutIndex}</IndexBadge>
                            </div>
                        </LabelRow>

                        <LabelRow label="FM Unit Code">
                            <div className="flex gap-1 items-center">
                                <select className="flex-1 border p-1"
                                    value={form.fmUnitCode ?? ''}
                                    onChange={e => handleUnitCodeChange(e.target.value)}>
                                    <option value="">Select</option>
                                    {sortedUnitCodes.map((c: any) => (
                                        <option key={c.id} value={c.code}>{c.label}</option>
                                    ))}
                                </select>
                                <IndexBadge>{unitCodeIndex}</IndexBadge>
                                <IndexBadge>{fmutIndex}</IndexBadge>
                            </div>
                        </LabelRow>

                        <LabelRow label="4G Modem">
                            <select className="w-full border p-1"
                                value={form.modem4G === false ? 'NO' : 'YES'}
                                onChange={e => update('modem4G', e.target.value === 'YES')}>
                                <option value="YES">Yes</option>
                                <option value="NO">No</option>
                            </select>
                        </LabelRow>

                        <LabelRow label="Service Code">
                            <div className="flex gap-1 items-center">
                                <Input className="flex-1 bg-cyan-100 font-bold tracking-wide"
                                    value={form.serviceCode ?? ''} readOnly />
                                <IndexBadge>{(form.serviceCode ?? '').length || ''}</IndexBadge>
                            </div>
                        </LabelRow>

                        <LabelRow label="MIX Code">
                            <Input className="font-mono bg-yellow-50"
                                value={form.mixCode ?? ''} readOnly />
                        </LabelRow>

                        <LabelRow label="Mix Org ID">
                            <Input className="bg-orange-100"
                                value={form.mixOrgId ?? ''}
                                onChange={(e: any) => update('mixOrgId', e.target.value)} />
                        </LabelRow>
                        <LabelRow label="Mix Org ID">
                            <Combobox
                                items={customerOrgs}
                                multiple
                                value={form?.organizations ?? []}
                                onValueChange={e => {
                                    patchForm({ organizations: e });
                                }}
                            >
                                <ComboboxChips className={"p-0"}>
                                    <ComboboxValue>
                                        {form?.organizations?.map((item) => (
                                            <ComboboxChip key={item.id}>{item.label}</ComboboxChip>
                                        ))}
                                    </ComboboxValue>
                                    <ComboboxChipsInput placeholder="Add organization" />
                                </ComboboxChips>
                                <ComboboxContent className={"bg-white"}>
                                    <ComboboxEmpty>No items found.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(item) => (
                                            <ComboboxItem key={item} value={item}>
                                                {item.label}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        </LabelRow>

                        <LabelRow label="Asset Number">
                            <div className="flex gap-1 items-center">
                                <Input
                                    type="number"
                                    min={0}
                                    max={32767}
                                    value={form.assetNumber ?? ''}
                                    onChange={(e: any) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            update('assetNumber', '');
                                            return;
                                        }
                                        const num = parseInt(val, 10);
                                        if (!isNaN(num) && num >= 0 && num <= 32767) {
                                            update('assetNumber', num);
                                        }
                                    }}
                                />
                                <span className="text-slate-400 whitespace-nowrap">Range: 0 to 32,767</span>
                            </div>
                        </LabelRow>

                        <LabelRow label="Fleet Number">
                            <Input value={form.fleetNumber ?? ''}
                                onChange={(e: any) => update('fleetNumber', e.target.value)} />
                        </LabelRow>

                        <LabelRow label="Veh VIN Code">
                            <Input value={form.vinNumber ?? ''}
                                onChange={(e: any) => update('vinNumber', e.target.value)} />
                        </LabelRow>

                        <LabelRow label="Rego Number">
                            <Input value={form.regoNumber ?? ''}
                                onChange={(e: any) => update('regoNumber', e.target.value)} />
                        </LabelRow>

                        <LabelRow label="Veh Make">
                            <Input value={form.vehicleMake ?? ''}
                                onChange={(e: any) => update('vehicleMake', e.target.value)} />
                        </LabelRow>

                        <LabelRow label="Veh Model">
                            <Input value={form.vehicleModel ?? ''}
                                onChange={(e: any) => update('vehicleModel', e.target.value)} />
                        </LabelRow>

                        <LabelRow label="Year-Variant">
                            <Input value={form.yearVariant ?? ''}
                                onChange={(e: any) => update('yearVariant', e.target.value)} />
                        </LabelRow>

                        {/* <LabelRow label="Location">
                            <Input value={form.installLocation ?? ''}
                                onChange={(e: any) => update('installLocation', e.target.value)} />
                        </LabelRow>

                        <LabelRow label="Installer">
                            <Input value={form.installer ?? ''}
                                onChange={(e: any) => update('installer', e.target.value)} />
                        </LabelRow>

                        <LabelRow label="Date">
                            <input type="date" className="w-full border p-1"
                                value={form.installDate ?? ''}
                                onChange={e => update('installDate', e.target.value)} />
                        </LabelRow> */}
                    </div>

                    {/* ══ RIGHT COLUMN ═════════════════════════════════════════ */}
                    <div className="w-1/2 space-y-3">

                        {/* ── MONITOR DETAILS ────────────────────────────────── */}
                        <div className="border p-3">
                            <div className="font-semibold mb-2">Monitor Details</div>

                            {/* Mix Sim1 checkbox */}
                            <div className="mb-1.5">
                                <Checkbox label="Mix Sim1"
                                    checked={form.mixSim1 ?? false}
                                    onChange={(v: boolean) => patchForm({ mixSim1: v, ...(!v && { sim1Type: undefined }) })} />
                            </div>

                            {form.mixSim1 && (
                                <LabelRow label="SIM 1 Type">
                                    <select className="w-full border p-1"
                                        value={form.sim1Type ?? ''}
                                        onChange={e => patchForm({ sim1Type: e.target.value })}>
                                        <option value="">Select</option>
                                        {sim1List.map((s: any) => (
                                            <option key={s.id} value={s.code}>{s.label}</option>
                                        ))}
                                    </select>
                                </LabelRow>
                            )}

                            <LabelRow label="Unit SIM">
                                <Input value={form.unitSim ?? ''}
                                    onChange={(e: any) => update('unitSim', e.target.value)} />
                            </LabelRow>
                            <LabelRow label="Unit Serial">
                                <Input value={form.unitSerial ?? ''}
                                    onChange={(e: any) => update('unitSerial', e.target.value)} />
                            </LabelRow>
                            <LabelRow label="Unit IMEI">
                                <Input value={form.unitIMEI ?? ''}
                                    onChange={(e: any) => update('unitIMEI', e.target.value)} />
                            </LabelRow>
                        </div>

                        {/* ── VISION FITTED ──────────────────────────────────── */}
                        <div className="border p-3">
                            <div className="font-semibold mb-2">Vision Fitted</div>

                            {/* AAI Camera Type — only when vision selected */}
                            {hasVision && (
                                <LabelRow label="AAI Camera Type">
                                    <div className="flex gap-1 items-center">
                                        <IndexBadge>
                                            {cameraList.find((c: any) => c.code === form.cameraType)?.mixIndex ?? ''}
                                        </IndexBadge>
                                        <select className="flex-1 border p-1"
                                            value={form.cameraType ?? ''}
                                            onChange={e => handleCameraTypeChange(e.target.value)}>
                                            <option value="">Select</option>
                                            {cameraList.map((c: any) => (
                                                <option key={c.id} value={c.code}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </LabelRow>
                            )}

                            {/* Vision radios: No Vision | Std | High Def | DX AI | M1N */}
                            <div className="flex flex-wrap gap-3 my-2">
                                {visionList.length > 0 && (
                                    <Radio value="" label="No Vision"
                                        checked={!form.visionType}
                                        onChange={() => handleVisionChange('')} />
                                )}
                                {visionList.map((v: any) => (
                                    <Radio key={`${v.code}-${v.label}`}
                                        value={v.code} label={v.label}
                                        checked={form.visionType === v.code}
                                        onChange={(val: string) => handleVisionChange(val)} />
                                ))}
                            </div>

                            {/* Row 1: Mix Sim2 checkbox  +  Cameras dropdown (right) */}
                            <div className="flex items-center mb-1">
                                <Checkbox label="Mix Sim2"
                                    checked={form.mixSim2 ?? false}
                                    onChange={handleMixSim2Change} />

                                {/* Camera count — only for V/X (not DX/MN) */}
                                {hasVision && !omitCount && (
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <span className="text-slate-500">Cameras</span>
                                        <select className="border p-1"
                                            value={cameraCount}
                                            onChange={e => handleCameraCountChange(Number(e.target.value))}>
                                            {[2, 3, 4].map(n => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Row 2: 4G Vis checkbox — mirrors mixSim2, styled like legacy */}
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <input
                                    type="checkbox"
                                    id="chk-4gvis"
                                    checked={form.mixSim2 ?? false}
                                    onChange={e => handleMixSim2Change(e.target.checked)}
                                    className="accent-green-600 w-3.5 h-3.5"
                                />
                                <label htmlFor="chk-4gvis"
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${form.mixSim2 ? 'bg-green-500 text-white' : 'bg-fuchsia-500 text-white'
                                        }`}>
                                    4G Vis
                                </label>
                            </div>

                            {/* SIM 2 Type — only when sim2 active */}
                            {form.mixSim2 && (
                                <LabelRow label="SIM 2 Type">
                                    <select className="w-full border p-1"
                                        value={form.sim2Type ?? ''}
                                        onChange={e => patchForm({ sim2Type: e.target.value })}>
                                        <option value="">Select</option>
                                        {sim2List.map((s: any) => (
                                            <option key={s.id} value={s.code}>{s.label}</option>
                                        ))}
                                    </select>
                                </LabelRow>
                            )}

                            <LabelRow label="Vis SIM">
                                <Input value={form.visSim ?? ''}
                                    disabled={!form.mixSim2}
                                    onChange={(e: any) => update('visSim', e.target.value)} />
                            </LabelRow>
                            <LabelRow label="Vis IMEI">
                                <Input value={form.visIMEI ?? ''}
                                    disabled={!form.mixSim2}
                                    onChange={(e: any) => update('visIMEI', e.target.value)} />
                            </LabelRow>

                            {/* Camera serials */}
                            {hasVision && (
                                <>
                                    <LabelRow label="Vis 1 Serial">
                                        <Input value={form.vis1Serial ?? ''}
                                            onChange={(e: any) => update('vis1Serial', e.target.value)} />
                                    </LabelRow>
                                    {cameraCount >= 2 && (
                                        <LabelRow label="Vis 2 Serial">
                                            <Input value={form.vis2Serial ?? ''}
                                                onChange={(e: any) => update('vis2Serial', e.target.value)} />
                                        </LabelRow>
                                    )}
                                    {cameraCount >= 3 && (
                                        <LabelRow label="Vis 3 Serial">
                                            <Input value={form.vis3Serial ?? ''}
                                                onChange={(e: any) => update('vis3Serial', e.target.value)} />
                                        </LabelRow>
                                    )}
                                    {cameraCount >= 4 && (
                                        <LabelRow label="Vis 4 Serial">
                                            <Input value={form.vis4Serial ?? ''}
                                                onChange={(e: any) => update('vis4Serial', e.target.value)} />
                                        </LabelRow>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── OPTIONS ────────────────────────────────────────── */}
                        <div className="border p-3">
                            <div className="font-semibold mb-2">Options</div>
                            <div className="mb-1.5">
                                <Checkbox label="AI Option"
                                    checked={form.aiOption ?? false}
                                    onChange={(v: boolean) => update('aiOption', v)} />
                            </div>
                            <div className="mb-1.5 flex items-center gap-1.5">
                                <Checkbox label="TMA Option"
                                    checked={form.tmaOption ?? false}
                                    onChange={(v: boolean) => update('tmaOption', v)} />
                                <span className="text-slate-400">&gt; Mix 4000</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Checkbox label="RIM Option"
                                    checked={form.rimOption ?? false}
                                    onChange={(v: boolean) => update('rimOption', v)} />
                                <span className="text-slate-400">&gt; Mix 4000</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Checkbox label="NRC"
                                    checked={form.nrc ?? false}
                                    onChange={(v: boolean) => update('nrc', v)} />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Checkbox label="WI-Fi"
                                    checked={form.wiFi ?? false}
                                    onChange={(v: boolean) => update('wiFi', v)} />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Checkbox label="Safe Guard"
                                    checked={form.safeGuard ?? false}
                                    onChange={(v: boolean) => update('safeGuard', v)} />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Checkbox label="Int SIM"
                                    checked={form.intSim ?? false}
                                    onChange={(v: boolean) => update('intSim', v)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="border-t px-3 py-2 flex justify-end gap-2 bg-slate-50">
                <button className="px-3 py-1 border text-xs rounded hover:bg-slate-100" onClick={onClose}>
                    Cancel
                </button>
                {/* <button className="px-4 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </button> */}
            </div>
        </div>
    );
}

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1 mb-0.5">
            <label className="w-24 shrink-0 text-right pr-1 text-slate-500 leading-snug">{label}</label>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    );
}

function IndexBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="border px-1.5 py-0.5 bg-slate-100 min-w-[22px] text-center font-mono text-[10px] shrink-0">
            {children}
        </span>
    );
}