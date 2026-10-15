'use client';

import { useEffect, useState } from 'react';
import { FormSection } from '../../forms/FormSection';
import { api } from '../../../lib/api-client';
import { CustomerSearchSelect } from '../../../components/common/CustomerSearchSelect';
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxValue } from '../../ui/combobox';
import { useParams } from 'next/navigation';
import { InstallerSearchSelect } from '../../common/InstallerSearchSelect';

const INSTALL_TYPES = [
    { value: 'NEW_INSTALL', label: 'New Install' },
    { value: 'WARRANTY', label: 'Warranty' },
    { value: 'REPLACEMENT', label: 'Replacement' },
    { value: 'MODIFIED_INSTALL', label: 'Modified Install' },
    { value: 'TRANSFER_UNIT', label: 'Transfer Unit' },
];

const TYPES_REQUIRING_TARGET = new Set(['MODIFIED_INSTALL', 'WARRANTY', 'REPLACEMENT', 'TRANSFER_UNIT']);

export function FMPreinstallDetailsSection({
    value,
    update,
    setShipping,
    setAccount,
    setInstallDetail,
    disabled,
    setItems
}: any) {
    const { id } = useParams();
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [fmCustomers, setFmCustomers] = useState<any[]>([]);
    const [targetSearch, setTargetSearch] = useState('');
    const [targetResults, setTargetResults] = useState<any[]>([]);
    const [showTargetDropdown, setShowTargetDropdown] = useState(false);
    const [targetLoading, setTargetLoading] = useState(false);
    const [targetError, setTargetError] = useState('');
    const [targetInfo, setTargetInfo] = useState<any>(null);

    const [depots, setDepots] = useState([])


    useEffect(() => {
        if (!targetSearch.trim()) { setTargetResults([]); return; }
        const t = setTimeout(() => {
            api.get('/fm-preinstall/target-install/search', { params: { q: targetSearch.trim() } })
                .then(res => setTargetResults(res.data?.data ?? res.data ?? []))
                .catch(() => setTargetResults([]));
        }, 300);
        return () => clearTimeout(t);
    }, [targetSearch]);

    const needsTarget = TYPES_REQUIRING_TARGET.has(value.type);

    const selectTarget = (install: any) => {
        setShowTargetDropdown(false);
        setTargetSearch('');
        loadTarget(install.id);
    };

    // Fetch and pre-populate from the target FM Install record.
    // over as a starting point.
    const loadTarget = async (id: string) => {
        if (!id.trim()) return;
        setTargetLoading(true);
        setTargetError('');
        try {
            const res = await api.get(`/fm-preinstall/target-install/${id.trim()}`);
            const install = res.data?.data ?? res.data;
            setTargetInfo(install);
            update('targetInstallId', install.id);

            const d = install.installDetail;
            const isTransfer = value.type === 'TRANSFER_UNIT';

            // NOTE: FMInstall and FMInstallDetail carry parallel/duplicate
            setInstallDetail?.((prev: any) => ({
                ...prev,
                fmUnitType: d?.fmUnitType ?? prev?.fmUnitType,
                fmUnitCode: install.baseUnit ?? d?.fmUnitCode ?? prev?.fmUnitCode,
                modem4G: d?.modem4G ?? prev?.modem4G,
                serviceCode: install.fmwService ?? d?.serviceCode ?? prev?.serviceCode,
                mixCode: install.mixCode ?? d?.mixCode ?? prev?.mixCode,
                mixOrgId: install.mixOrgId ?? d?.mixOrgId ?? prev?.mixOrgId,
                mixSim1: d?.mixSim1 ?? prev?.mixSim1,
                sim1Type: d?.sim1Type ?? prev?.sim1Type,
                visionType: d?.visionType ?? prev?.visionType,
                cameraType: d?.cameraType ?? prev?.cameraType,
                cameraCount: d?.cameraCount ?? prev?.cameraCount,
                mixSim2: d?.mixSim2 ?? prev?.mixSim2,
                sim2Type: d?.sim2Type ?? prev?.sim2Type,
                aiOption: d?.aiOption ?? prev?.aiOption,
                tmaOption: d?.tmaOption ?? prev?.tmaOption,
                rimOption: d?.rimOption ?? prev?.rimOption,
                ...(isTransfer
                    ? {
                        assetNumber: '',
                        fleetNumber: '',
                        vinNumber: '',
                        regoNumber: '',
                        installLocation: '',
                        installer: '',
                        vehicleMake: '',
                        vehicleModel: '',
                        yearVariant: '',
                    }
                    : {
                        assetNumber: install.mixAssetNum ?? d?.assetNumber ?? prev?.assetNumber,
                        fleetNumber: d?.fleetNumber ?? prev?.fleetNumber,
                        vinNumber: d?.vinNumber ?? prev?.vinNumber,
                        regoNumber: install.rego ?? d?.regoNumber ?? prev?.regoNumber,
                        vehicleMake: install.vehicleMake ?? d?.vehicleMake ?? prev?.vehicleMake,
                        vehicleModel: install.vehicleModel ?? d?.vehicleModel ?? prev?.vehicleModel,
                        yearVariant: install.vehicleYear ?? d?.yearVariant ?? prev?.yearVariant,
                    }),
            }));
            const mappedItems = (d.preinstall.items || []).map((i: any, idx: number) => ({
                ...i,
                quantity: i.quantity,
                installDetail: i.installDetail || {},
                index: idx,
            }));

            setItems(mappedItems);
        } catch (err: any) {
            setTargetInfo(null);
            update('targetInstallId', '');
            setTargetError(err?.response?.data?.message ?? 'Target record not found');
        } finally {
            setTargetLoading(false);
        }
    };



    useEffect(() => {
        if (value?.targetInstallId) {
            loadTarget(value.targetInstallId)
        }
    }, [value.targetInstallId])

    // Load FM customers when customer changes
    useEffect(() => {
        if (!value.customerId) return;

        api.get(`/fm-customers?customerId=${value.customerId}`)
            .then(res => {
                const data =
                    res.data?.data?.items ||
                    res.data?.data?.data ||
                    res.data?.data ||
                    res.data;
                const list = Array.isArray(data) ? data : [];
                setFmCustomers(list);

                //auto-populate FM Customer if exactly one match
                // Only auto-select if fmCustomerId isn't already set (don't overwrite edit-mode data)
                if (!value.fmCustomerId && list.length >= 1) {
                    if (list.length > 1) {
                        console.warn(
                            `Customer ${value.customerId} has ${list.length} FM Customer records (expected 1). Auto-selecting the first — check for duplicates.`
                        );
                    }
                    const only = list[0];
                    update('fmCustomerId', only.id);
                    update('fmFleetName', only.fleetName ?? '');
                    update('fmMixOrgId', only.mixOrgId ?? '');
                }
            });
    }, [value.customerId]);

    // On initial load (edit mode) — load the customer object to show in dropdown
    useEffect(() => {
        if (!value.customerId || selectedCustomer) return;

        api.get(`/customers/${value.customerId}`).then(res => {
            const data = res.data?.data ?? res.data;
            setSelectedCustomer(data);
        }).catch(() => { });
    }, [value.customerId]);




    const handleCustomerSelect = async (customer: any) => {
        setSelectedCustomer(customer);
        update('customerId', customer.id);
        setDepots([])

        // FIX: Load full customer with addresses from /customers/:id
        try {
            const res = await api.get(`/customers/${customer.id}`);
            const data = res.data?.data ?? res.data;
            setDepots(data?.Depots || [])

            const addresses = data.addresses || [];

            const shippingAddr =
                addresses.find((a: any) => a.type === 'SHIPPING' && a.isDefault) ||
                addresses.find((a: any) => a.type === 'SHIPPING');

            const statementAddr =
                addresses.find((a: any) => a.type === 'STATEMENT' && a.isDefault) ||
                addresses.find((a: any) => a.type === 'STATEMENT');

            if (shippingAddr) {
                setShipping({
                    name: data.name ?? '',
                    address1: shippingAddr.address1 ?? '',
                    address2: shippingAddr.address2 ?? '',
                    city: shippingAddr.city ?? '',
                    state: shippingAddr.state ?? '',
                    postcode: shippingAddr.postcode ?? '',
                });
            }

            if (statementAddr) {
                setAccount({
                    name: data.name ?? '',
                    address1: statementAddr.address1 ?? '',
                    address2: statementAddr.address2 ?? '',
                    city: statementAddr.city ?? '',
                    state: statementAddr.state ?? '',
                    postcode: statementAddr.postcode ?? '',
                });
            }
        } catch (err) {
            console.error('Failed to load customer addresses', err);
        }
    };

    const loadDepot = async () => {
        try {
            const res = await api.get(`/customers/${selectedCustomer?.id}`);
            const data = res.data?.data ?? res.data;
            setDepots(data?.Depots || [])
        } catch (err) {
            console.error('Failed to load customer addresses', err);
        }
    }
    useEffect(() => {
        if (id && selectedCustomer?.id) {
            loadDepot()
        }
    }, [id, selectedCustomer?.id])


    // Type change — sync to installDetail.installType
    const handleTypeChange = (val: string) => {
        update('type', val);
        setInstallDetail?.((prev: any) => ({ ...prev, installType: val }));
        if (!TYPES_REQUIRING_TARGET.has(val)) {
            update('targetInstallId', '');
            setTargetSearch('');
            setTargetInfo(null);
            setTargetError('');
        }
    };

    // installDate/installer/installLocation — sync to installDetail
    const handleInstallField = (k: string, v: any) => {
        update(k, v);
        setInstallDetail?.((prev: any) => ({ ...prev, [k]: v }));
    };

    return (
        <FormSection title="Preinstall Details" defaultOpen>
            <div className="grid grid-cols-2 gap-3">

                {/* CUSTOMER */}
                <div>
                    <CustomerSearchSelect
                        value={selectedCustomer}
                        onSelect={handleCustomerSelect}
                        disabled={disabled}
                        label="Customer"
                    />
                </div>

                {/* FM CUSTOMER */}
                <div>
                    <label>FM Customer</label>
                    <select
                        disabled={disabled}
                        className="border p-2 w-full"
                        value={value.fmCustomerId}
                        //onChange={e => update('fmCustomerId', e.target.value)}
                        onChange={e => {
                            const id = e.target.value;
                            update('fmCustomerId', id);
                            const selected = fmCustomers.find((c: any) => c.id === id);
                            console.log('FM selected:', selected, 'fleetName:', selected?.fleetName);
                            update('fmFleetName', selected?.fleetName ?? '');
                            update('fmMixOrgId', selected?.mixOrgId ?? '');
                        }}
                    >
                        <option value="">Select</option>
                        {Array.isArray(fmCustomers) &&
                            fmCustomers.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.customer?.name || c.fmWebNumber}
                                </option>
                            ))}
                    </select>
                </div>

                {/* TYPE */}
                <div>
                    <label>Type</label>
                    <select disabled={disabled} className="border p-2 w-full"
                        value={value.type}
                        onChange={e => handleTypeChange(e.target.value)}>
                        {INSTALL_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {/* TARGET RECORD — required for Modify / Warranty / Replacement / Transfer */}
                {needsTarget && (
                    <div className="col-span-2 relative">
                        <label>Target Record</label>
                        {targetInfo ? (
                            <div className="flex items-center gap-2 border rounded p-2 bg-slate-50">
                                <span className="text-sm flex-1">
                                    {targetInfo.rego ?? targetInfo.mixAssetNum ?? targetInfo.id}
                                    {' — '}{targetInfo.vehicleMake} {targetInfo.vehicleModel}
                                    {' '}(Status: {targetInfo.status ?? '—'})
                                </span>
                                {!disabled && (
                                    <button
                                        type="button"
                                        className="text-slate-400 hover:text-red-500 text-xs"
                                        onClick={() => {
                                            setTargetInfo(null);
                                            update('targetInstallId', '');
                                        }}
                                    >
                                        ✕ Change
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <input
                                    className="border p-2 w-full"
                                    placeholder="Search by rego, asset, or fleet number…"
                                    value={targetSearch}
                                    disabled={disabled}
                                    onChange={e => { setTargetSearch(e.target.value); setShowTargetDropdown(true); }}
                                    onFocus={() => setShowTargetDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowTargetDropdown(false), 150)}
                                />
                                {showTargetDropdown && targetResults.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto border rounded bg-white shadow-lg">
                                        {targetResults.map((r: any) => (
                                            <button
                                                key={r.id}
                                                type="button"
                                                onMouseDown={() => selectTarget(r)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b"
                                            >
                                                {r.rego ?? r.mixAssetNum ?? r.id}
                                                <span className="text-muted-foreground">
                                                    {' — '}{r.vehicleMake} {r.vehicleModel} ({r.status})
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {showTargetDropdown && targetSearch.trim() && targetResults.length === 0 && (
                                    <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow-lg px-3 py-2 text-sm text-slate-400">
                                        No matching FM Install records found
                                    </div>
                                )}
                            </>
                        )}
                        {targetError && (
                            <p className="text-xs text-red-500 mt-1">⚠ {targetError}</p>
                        )}
                        {value.type === 'TRANSFER_UNIT' && (
                            <p className="text-xs text-slate-500 mt-1">
                                Note: target must already be Decommissioned. Vehicle-specific fields (asset, fleet, rego, VIN, location) will need to be entered fresh for the new vehicle.
                            </p>
                        )}
                    </div>
                )}

                {/* STATUS */}
                <div>
                    <label>Status</label>
                    <select
                        disabled={disabled}
                        className="border p-2 w-full"
                        value={value.status}
                        onChange={e => update('status', e.target.value)}
                    >
                        <option value="NOT_ACTIONED">Not Actioned</option>
                        <option value="WORKSHOP_SETUP">Workshop Setup</option>
                        <option value="WAITING_INSTALL">Waiting Install</option>
                        <option value="INSTALLED">Installed</option>
                    </select>
                </div>

                {/* <div>
                    <label className="text-sm font-medium">Depot / Site</label>
                    <input className="border p-2 w-full text-sm"
                        value={value.depot ?? ''}
                        disabled={disabled}
                        onChange={e => update('depot', e.target.value)} />
                </div> */}
                <div>
                    <label className="text-sm font-medium">Depot / Site</label>
                    <select className="flex-1 border p-1"
                        value={value?.depotId ?? ''}
                        onChange={e => update('depotId', e.target.value)}
                        disabled={!value?.customerId}
                    >
                        <option value="">Select</option>
                        {depots.map((b: any) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {/* LOCATION — moved here from install panel */}
                <div>
                    <label className="text-sm font-medium">Location</label>
                    <input className="border p-2 w-full text-sm"
                        value={value.installLocation ?? ''}
                        disabled={disabled}
                        onChange={e => update('installLocation', e.target.value)} />
                </div>

                {/* INSTALLER */}
                <div>
                    <InstallerSearchSelect
                        value={value.installer}
                        onSelect={update}
                        disabled={disabled}
                        label="Installer"
                    />
                </div>

                {/* INSTALL DATE */}
                <div>
                    <label className="text-sm font-medium">Install Date</label>
                    <input type="date" className="border p-2 w-full text-sm"
                        value={value.installDate ?? ''}
                        disabled={disabled}
                        onChange={e => update('installDate', e.target.value)} />
                </div>

            </div>
        </FormSection >
    );
}
