'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Truck,
    Layers,
    Plus,
    Trash2,
    Copy,
    FileSpreadsheet,
    CheckCircle2,
    Wrench,
    AlertCircle,
    ArrowRight,
    ExternalLink,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { Radio } from '../../../components/ui/radio';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import { CustomerSearchSelect } from '../../../components/common/CustomerSearchSelect';
import { SearchSelect } from '../../../components/ui/SearchSelect';
import { FormSection } from '../../../components/forms/FormSection';
import { FMInstallDetailsPanel } from '../../../components/fm-preinstall/sections/FMInstallDetailsPanel';
import { BulkRolloutList } from '../../../components/fm-preinstall/BulkRolloutList';
import { useOperations } from '../../../providers/OperationsContext';
import { buildChecklistForHardware } from '../../../components/job-boards/types/mockData';

interface VehicleRow {
    id: string;
    fleetNumber: string;
    regoNumber: string;
    vinNumber: string;
    vehicleMake: string;
    vehicleModel: string;
    yearVariant: string;
    assetNumber: string;
    unitSerial: string;
    unitIMEI: string;
    notes?: string;
}

const INSTALL_TYPES = [
    { value: 'NEW_INSTALL', label: 'New Install' },
    { value: 'WARRANTY', label: 'Warranty' },
    { value: 'REPLACEMENT', label: 'Replacement' },
    { value: 'MODIFIED_INSTALL', label: 'Modified Install' },
    { value: 'TRANSFER_UNIT', label: 'Transfer Unit' },
];

const VISION_NO_COUNT = new Set(['DX', 'MN']);

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1 mb-1.5">
            <label className="w-24 shrink-0 text-right pr-1 text-slate-500 text-xs leading-snug">{label}</label>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    );
}

function IndexBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="border px-1.5 py-0.5 bg-slate-100 min-w-[22px] text-center font-mono text-[10px] shrink-0 rounded">
            {children}
        </span>
    );
}

export default function BulkFMPreinstallPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { createInstallationJob, refreshFromApi, checklistTemplates } = useOperations();

    // Tab State: 'records' (Read) or 'create' (Create)
    const [activeTab, setActiveTab] = useState<'records' | 'create'>('records');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const tabParam = new URLSearchParams(window.location.search).get('tab');
            if (tabParam === 'create' || tabParam === 'new') {
                setActiveTab('create');
            } else if (tabParam === 'records') {
                setActiveTab('records');
            }
        }
    }, []);

    // Core Form State
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customerId, setCustomerId] = useState('');
    const [fmCustomerId, setFmCustomerId] = useState('');
    const [fmFleetName, setFmFleetName] = useState('');
    const [type, setType] = useState('NEW_INSTALL');
    const [orderNumber, setOrderNumber] = useState('');
    const [jobTitle, setJobTitle] = useState('Airco Fleet Device Rollout');
    const [assignedUserId, setAssignedUserId] = useState('');
    const [installerId, setInstallerId] = useState('');
    const [installDate, setInstallDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [installLocation, setInstallLocation] = useState('Customer Fleet Yard');
    const [depotId, setDepotId] = useState('');
    const [depots, setDepots] = useState<any[]>([]);
    const [notes, setNotes] = useState('');

    // Address snapshots
    const [shippingAddress, setShippingAddress] = useState({
        name: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postcode: '',
    });

    const [billingAddress, setBillingAddress] = useState({
        name: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postcode: '',
    });

    const [showAddressDetails, setShowAddressDetails] = useState(false);

    // FM Installation Details Template (Applied to all rollout vehicles)
    const [showInstallDetailsModal, setShowInstallDetailsModal] = useState(false);
    const [installDetail, setInstallDetail] = useState<any>({
        installType: 'NEW_INSTALL',
        fmUnitType: '',
        fmUnitCode: '',
        modem4G: true,
        serviceCode: '',
        mixCode: '',
        mixOrgId: '',
        mixSim1: false,
        sim1Type: undefined,
        unitSim: '',
        unitSerial: '',
        unitIMEI: '',
        visionType: undefined,
        cameraType: undefined,
        cameraCount: 2,
        mixSim2: false,
        sim2Type: undefined,
        visSim: '',
        visIMEI: '',
        vis1Serial: '',
        vis2Serial: '',
        vis3Serial: '',
        vis4Serial: '',
        aiOption: false,
        tmaOption: false,
        rimOption: false,
        nrc: false,
        wiFi: false,
        safeGuard: false,
        intSim: false,
    });

    // Lookup lists for FM Segments
    const [baseUnits, setBaseUnits] = useState<any[]>([]);
    const [unitCodes, setUnitCodes] = useState<any[]>([]);
    const [visionList, setVisionList] = useState<any[]>([]);
    const [cameraList, setCameraList] = useState<any[]>([]);
    const [sim1List, setSim1List] = useState<any[]>([]);
    const [sim2List, setSim2List] = useState<any[]>([]);

    // Derived values matching FMInstallDetailsPanel
    const cameraCount = installDetail.cameraCount ?? 2;
    const hasVision = !!installDetail.visionType;
    const omitCount = VISION_NO_COUNT.has(installDetail.visionType ?? '');
    const fmutIndex = baseUnits.find((u: any) => u.code === installDetail.fmUnitType)?.sortOrder ?? '';
    const selectedUC = unitCodes.find((c: any) => c.code === installDetail.fmUnitCode);
    const unitCodeIndex = selectedUC?.sortOrder ?? '';

    // SERVICE CODE + MIX CODE GENERATOR (Identical to FMInstallDetailsPanel)
    const generateCodes = (base: any, curBaseUnits = baseUnits, curUnitCodes = unitCodes, curVisionList = visionList) => {
        const f = base;
        const baseItem = curBaseUnits.find((u: any) => u.code === f.fmUnitType);
        const codeItem = curUnitCodes.find((c: any) => c.code === f.fmUnitCode);
        const muIndex = codeItem?.mixIndex ?? baseItem?.mixIndex ?? 0;

        const visItem = curVisionList.find((v: any) => v.code === f.visionType);
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

    const updateInstallDetail = (patch: any) => {
        setInstallDetail((prev: any) => {
            const next = { ...prev, ...patch };
            const codes = generateCodes(next, baseUnits, unitCodes, visionList);
            return { ...next, ...codes };
        });
    };

    const handleUnitChange = async (val: string, curBaseUnits = baseUnits) => {
        if (!val) {
            setInstallDetail((prev: any) => ({
                ...prev,
                fmUnitType: '',
                fmUnitCode: '',
                serviceCode: '',
                mixCode: '',
                visionType: undefined,
                cameraType: undefined,
            }));
            setUnitCodes([]);
            setVisionList([]);
            setCameraList([]);
            return;
        }

        try {
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
                } catch { }
                defaultCam = [...cameras].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
            }

            setInstallDetail((prev: any) => {
                const next = {
                    ...prev,
                    fmUnitType: val,
                    fmUnitCode: defaultUC?.code ?? val,
                    visionType: visionCode,
                    cameraType: defaultCam?.code ?? undefined,
                    cameraCount: defaultCam?.sortOrder ?? 2,
                    mixSim2: !!visionCode,
                };
                const codes = generateCodes(next, curBaseUnits, uc, visions);
                return { ...next, ...codes };
            });
        } catch (err) {
            console.error('Failed to change FM unit:', err);
        }
    };

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
        } else {
            setCameraList([]);
        }

        setInstallDetail((prev: any) => {
            const next = {
                ...prev,
                visionType: noVis ? undefined : val,
                cameraType: defaultCam?.code ?? undefined,
                cameraCount: noVis ? undefined : (defaultCam?.sortOrder ?? 2),
                mixSim2: !noVis,
            };
            const codes = generateCodes(next, baseUnits, unitCodes, visionList);
            return { ...next, ...codes };
        });
    };

    const handleCameraTypeChange = (val: string) => {
        const cam = cameraList.find((c: any) => c.code === val);
        const count = cam?.sortOrder ?? 2;
        setInstallDetail((prev: any) => {
            const next = {
                ...prev,
                cameraType: val,
                cameraCount: count,
            };
            const codes = generateCodes(next, baseUnits, unitCodes, visionList);
            return { ...next, ...codes };
        });
    };

    // Load static segments on mount
    useEffect(() => {
        const load = async () => {
            try {
                const [baseRes, s1Res, s2Res] = await Promise.all([
                    api.get('/fm-segments?type=BASE_UNIT'),
                    api.get('/fm-segments?type=SIM1'),
                    api.get('/fm-segments?type=SIM2'),
                ]);
                const allBase: any[] = baseRes.data?.data ?? [];
                const filtered = allBase.filter((u: any) => u.sortOrder !== 0 && u.code !== 'NULL');
                setBaseUnits(filtered);
                setSim1List(s1Res.data?.data ?? []);
                setSim2List(s2Res.data?.data ?? []);

                if (filtered.length > 0) {
                    const firstUnit = filtered[0].code;
                    handleUnitChange(firstUnit, filtered);
                }
            } catch {
                showToast({ type: 'error', title: 'Failed loading FM segments' });
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Package Line Items (Applied to each preinstall)
    const [packageItems, setPackageItems] = useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Vehicles List
    const [vehicles, setVehicles] = useState<VehicleRow[]>(() =>
        Array.from({ length: 5 }, (_, i) => ({
            id: `v-${Date.now()}-${i}`,
            fleetNumber: `FL-${String(101 + i).padStart(3, '0')}`,
            regoNumber: `ABC-${100 + i}`,
            vinNumber: `6T1AA81K0RA${100000 + i}`,
            vehicleMake: 'Isuzu',
            vehicleModel: 'FTR 150-260',
            yearVariant: '2024',
            assetNumber: `AST-${101 + i}`,
            unitSerial: '',
            unitIMEI: '',
        }))
    );

    // Users / Technicians
    const [users, setUsers] = useState<any[]>([]);

    // Paste / Bulk Import Modal
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteData, setPasteData] = useState('');

    // Submission & Results
    const [saving, setSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [completedResult, setCompletedResult] = useState<any>(null);

    // Load Initial Options (Users & Hardware Products)
    useEffect(() => {
        api.get('/users?take=100').then((res) => {
            const data = res.data?.data?.items || res.data?.data || res.data?.items || res.data;
            if (Array.isArray(data)) setUsers(data);
        }).catch(() => { });

        setLoadingProducts(true);
        api.get('/products?isFmHardware=true').then((res) => {
            const list = res.data?.data ?? res.data ?? [];
            setAvailableProducts(list);
            // Preload 2 default telematics items if available
            if (list.length > 0 && packageItems.length === 0) {
                const primary = list[0];
                const secondary = list[1] || list[0];
                setPackageItems([
                    {
                        productId: primary.id,
                        partNumber: primary.productCode || 'MIX4000-BASE',
                        description: primary.name || 'Telematics Core Unit',
                        quantity: 1,
                        unitPrice: Number(primary.retailPrice || 550),
                        discountPct: 0,
                        lineTotal: Number(primary.retailPrice || 550),
                    },
                    ...(secondary ? [{
                        productId: secondary.id,
                        partNumber: secondary.productCode || 'HARN-PWR-01',
                        description: secondary.name || 'Main Power Harness & Inline Fuse Kit',
                        quantity: 1,
                        unitPrice: Number(secondary.retailPrice || 85),
                        discountPct: 0,
                        lineTotal: Number(secondary.retailPrice || 85),
                    }] : []),
                ]);
            }
        }).catch(() => { })
            .finally(() => setLoadingProducts(false));
    }, []);

    // Handle Customer Selection
    const handleCustomerSelect = async (customer: any) => {
        setSelectedCustomer(customer);
        setCustomerId(customer.id);

        try {
            // 1. Fetch full customer details & addresses
            const res = await api.get(`/customers/${customer.id}`);
            const data = res.data?.data ?? res.data;
            setDepots(data?.Depots || []);
            if (data?.Depots?.length > 0) {
                setDepotId(data.Depots[0].id);
            }

            const addresses = data.addresses || [];
            const ship = addresses.find((a: any) => a.type === 'SHIPPING' && a.isDefault) || addresses.find((a: any) => a.type === 'SHIPPING');
            const stmt = addresses.find((a: any) => a.type === 'STATEMENT' && a.isDefault) || addresses.find((a: any) => a.type === 'STATEMENT');

            if (ship) {
                setShippingAddress({
                    name: customer.name,
                    address1: ship.address1 || '',
                    address2: ship.address2 || '',
                    city: ship.city || '',
                    state: ship.state || '',
                    postcode: ship.postcode || '',
                });
                setInstallLocation(`${ship.address1 || ''}, ${ship.city || ''}`.trim());
            } else {
                setShippingAddress({
                    name: customer.name,
                    address1: '42 Logistics Parkway',
                    address2: '',
                    city: 'Eastern Creek',
                    state: 'NSW',
                    postcode: '2766',
                });
            }

            if (stmt) {
                setBillingAddress({
                    name: customer.name,
                    address1: stmt.address1 || '',
                    address2: stmt.address2 || '',
                    city: stmt.city || '',
                    state: stmt.state || '',
                    postcode: stmt.postcode || '',
                });
            }

            // 2. Fetch FM Customer details
            const fmRes = await api.get(`/fm-customers?customerId=${customer.id}`);
            const fmData = fmRes.data?.data?.items || fmRes.data?.data || fmRes.data;
            if (Array.isArray(fmData) && fmData.length > 0) {
                const fm = fmData[0];
                setFmCustomerId(fm.id);
                setFmFleetName(fm.fleetName || customer.name);
            } else {
                setFmCustomerId(customer.id);
                setFmFleetName(customer.name);
            }

            // Update default rollout job title
            setJobTitle(`${customer.name} - Fleet Rollout`);
        } catch (err) {
            console.warn('Could not load customer particulars:', err);
        }
    };

    // Add Vehicles Helpers
    const addVehiclesCount = (count: number) => {
        setVehicles((prev) => {
            const startNum = prev.length + 1;
            const newRows: VehicleRow[] = Array.from({ length: count }, (_, i) => {
                const cur = startNum + i;
                const baseMake = prev[prev.length - 1]?.vehicleMake || 'Isuzu';
                const baseModel = prev[prev.length - 1]?.vehicleModel || 'FTR';
                return {
                    id: `v-${Date.now()}-${cur}`,
                    fleetNumber: `FL-${String(100 + cur).padStart(3, '0')}`,
                    regoNumber: `ABC-${String(100 + cur)}`,
                    vinNumber: `6T1AA81K0RA${String(100000 + cur)}`,
                    vehicleMake: baseMake,
                    vehicleModel: baseModel,
                    yearVariant: '2024',
                    assetNumber: `AST-${String(100 + cur)}`,
                    unitSerial: '',
                    unitIMEI: '',
                };
            });
            return [...prev, ...newRows];
        });
        showToast({ type: 'success', title: `Added ${count} vehicles to grid` });
    };

    const removeVehicle = (id: string) => {
        if (vehicles.length <= 1) {
            showToast({ type: 'error', title: 'At least one vehicle is required' });
            return;
        }
        setVehicles((prev) => prev.filter((v) => v.id !== id));
    };

    const updateVehicleRow = (id: string, field: keyof VehicleRow, val: string) => {
        setVehicles((prev) =>
            prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
        );
    };

    // Auto Sequence Fleet Numbers
    const autoSequenceFleetNumbers = (prefix = 'FL-', startAt = 101) => {
        setVehicles((prev) =>
            prev.map((v, idx) => ({
                ...v,
                fleetNumber: `${prefix}${String(startAt + idx).padStart(3, '0')}`,
                assetNumber: `AST-${String(startAt + idx)}`,
                regoNumber: v.regoNumber || `REG-${startAt + idx}`,
            }))
        );
        showToast({ type: 'success', title: `Sequenced ${vehicles.length} fleet numbers (${prefix}${startAt}...)` });
    };

    // Copy first vehicle make/model down to all
    const copyMakeModelDown = () => {
        if (vehicles.length === 0) return;
        const first = vehicles[0];
        setVehicles((prev) =>
            prev.map((v) => ({
                ...v,
                vehicleMake: first.vehicleMake,
                vehicleModel: first.vehicleModel,
                yearVariant: first.yearVariant,
            }))
        );
        showToast({ type: 'success', title: `Applied ${first.vehicleMake} ${first.vehicleModel} to all ${vehicles.length} vehicles` });
    };

    // Parse Pasted Text from Excel / CSV
    const handleParsePastedData = () => {
        if (!pasteData.trim()) return;
        const lines = pasteData.trim().split(/\r?\n/).filter(Boolean);
        const parsed: VehicleRow[] = [];

        lines.forEach((line, index) => {
            // Split on tabs (Excel) or comma (CSV)
            const cols = line.includes('\t') ? line.split('\t') : line.split(',');
            const clean = cols.map((c) => c.trim().replace(/^["']|["']$/g, ''));
            if (clean.length === 0) return;

            // Skip header if detected
            if (index === 0 && (clean[0].toLowerCase().includes('fleet') || clean[0].toLowerCase().includes('rego'))) {
                return;
            }

            parsed.push({
                id: `v-paste-${Date.now()}-${index}`,
                fleetNumber: clean[0] || `FL-${101 + index}`,
                regoNumber: clean[1] || `REG-${101 + index}`,
                vinNumber: clean[2] || `VIN-IMP-${1000 + index}`,
                vehicleMake: clean[3] || 'Commercial Vehicle',
                vehicleModel: clean[4] || 'Fleet Unit',
                yearVariant: clean[5] || '2024',
                assetNumber: clean[6] || clean[0] || '',
                unitSerial: clean[7] || '',
                unitIMEI: clean[8] || '',
            });
        });

        if (parsed.length > 0) {
            setVehicles(parsed);
            setShowPasteModal(false);
            setPasteData('');
            showToast({ type: 'success', title: `Successfully imported ${parsed.length} vehicles!` });
        } else {
            showToast({ type: 'error', title: 'No valid rows detected in pasted data' });
        }
    };

    // Hardware Line Item Management
    const addPackageItem = () => {
        if (availableProducts.length === 0) return;
        const prod = availableProducts[0];
        setPackageItems((prev) => [
            ...prev,
            {
                productId: prod.id,
                partNumber: prod.productCode || 'ACC-ITEM',
                description: prod.name || 'Accessory Item',
                quantity: 1,
                unitPrice: Number(prod.retailPrice || 50),
                discountPct: 0,
                lineTotal: Number(prod.retailPrice || 50),
            },
        ]);
    };

    const updatePackageItem = (index: number, patch: any) => {
        setPackageItems((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], ...patch };
            const qty = Number(copy[index].quantity || 1);
            const price = Number(copy[index].unitPrice || 0);
            const disc = Number(copy[index].discountPct || 0);
            copy[index].lineTotal = parseFloat((qty * price * (1 - disc / 100)).toFixed(2));
            return copy;
        });
    };

    const removePackageItem = (index: number) => {
        setPackageItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    // Total pricing calculation
    const packageTotalPerVehicle = packageItems.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
    const grandTotalFleetValue = packageTotalPerVehicle * vehicles.length;

    // Save Bulk Job & Preinstalls
    const handleSaveBulk = async () => {
        if (!customerId) {
            showToast({ type: 'error', title: 'Customer is required', message: 'Please search and select an FM customer.' });
            return;
        }

        if (vehicles.length === 0) {
            showToast({ type: 'error', title: 'Vehicles required', message: 'Please add at least one vehicle to the grid.' });
            return;
        }

        // Validate that each vehicle has a fleet # or rego
        const invalidRows = vehicles.filter((v) => !v.fleetNumber.trim() && !v.regoNumber.trim());
        if (invalidRows.length > 0) {
            showToast({ type: 'error', title: 'Incomplete vehicle details', message: 'Every vehicle must have at least a Fleet Number or Rego.' });
            return;
        }

        setSaving(true);
        setSaveProgress(10);

        const payload = {
            template: {
                customerId,
                fmCustomerId: fmCustomerId || customerId,
                type,
                status: 'NOT_ACTIONED',
                orderNumber: orderNumber || `BULK-PO-${Date.now().toString().slice(-4)}`,
                assignedUserId: assignedUserId || undefined,
                depotId: depotId || undefined,
                notes: notes ? `[BULK JOB: ${jobTitle}] ${notes}` : `[BULK JOB: ${jobTitle}]`,
                installLocation,
                installer: installerId || undefined,
                installDate,
                shippingName: shippingAddress.name || selectedCustomer?.name || 'Customer Fleet',
                shippingAddress1: shippingAddress.address1 || '',
                shippingAddress2: `${shippingAddress.address2 || ''}||${shippingAddress.city || ''}||${shippingAddress.state || ''}||${shippingAddress.postcode || ''}`,
                shippingAddress3: shippingAddress.postcode || '',
                billingName: billingAddress.name || selectedCustomer?.name || 'Customer Fleet',
                billingAddress1: billingAddress.address1 || '',
                billingAddress2: `${billingAddress.address2 || ''}||${billingAddress.city || ''}||${billingAddress.state || ''}||${billingAddress.postcode || ''}`,
                billingAddress3: billingAddress.postcode || '',
                defaultInstallDetail: {
                    installType: type,
                    fmUnitType: installDetail.fmUnitType,
                    fmUnitCode: installDetail.fmUnitCode,
                    modem4G: installDetail.modem4G,
                    serviceCode: installDetail.serviceCode,
                    mixCode: installDetail.mixCode,
                    mixOrgId: installDetail.mixOrgId,
                    mixSim1: installDetail.mixSim1,
                    sim1Type: installDetail.sim1Type,
                    unitSim: installDetail.unitSim,
                    unitSerial: installDetail.unitSerial,
                    unitIMEI: installDetail.unitIMEI,
                    visionType: installDetail.visionType,
                    cameraType: installDetail.cameraType,
                    cameraCount: installDetail.cameraCount,
                    mixSim2: installDetail.mixSim2,
                    sim2Type: installDetail.sim2Type,
                    visSim: installDetail.visSim,
                    visIMEI: installDetail.visIMEI,
                    vis1Serial: installDetail.vis1Serial,
                    vis2Serial: installDetail.vis2Serial,
                    vis3Serial: installDetail.vis3Serial,
                    vis4Serial: installDetail.vis4Serial,
                    aiOption: installDetail.aiOption,
                    tmaOption: installDetail.tmaOption,
                    rimOption: installDetail.rimOption,
                    nrc: installDetail.nrc,
                    wiFi: installDetail.wiFi,
                    safeGuard: installDetail.safeGuard,
                    intSim: installDetail.intSim,
                    installLocation,
                    installer: installerId || undefined,
                    installDate,
                },
                items: packageItems,
            },
            vehicles: vehicles.map((v) => ({
                fleetNumber: v.fleetNumber.trim(),
                regoNumber: v.regoNumber.trim() || `REG-${v.fleetNumber.trim()}`,
                vinNumber: v.vinNumber.trim() || `VIN-${v.fleetNumber.trim()}`,
                vehicleMake: v.vehicleMake.trim(),
                vehicleModel: v.vehicleModel.trim(),
                yearVariant: v.yearVariant.trim(),
                assetNumber: v.assetNumber.trim() || v.fleetNumber.trim(),
                unitSerial: v.unitSerial.trim() || undefined,
                unitIMEI: v.unitIMEI.trim() || undefined,
            })),
        };

        try {
            setSaveProgress(35);
            const res = await api.post('/fm-preinstall/bulk', payload);
            setSaveProgress(80);
            const data = res.data?.data ?? res.data ?? {};

            // Also create local installation job for operations context
            const createdPreinstalls = data.preinstalls || [];
            const masterJobId = data.masterJobId || `INSTALL-BULK-${Date.now().toString().slice(-4)}`;
            const masterJobNumber = data.masterJobNumber || `JOB-BULK-${vehicles.length}V`;

            const unitModel = installDetail.fmUnitCode || installDetail.fmUnitType || 'MIX4000';
            const matchingTemplates = buildChecklistForHardware([unitModel], checklistTemplates);
            const resolvedChecklist = matchingTemplates.length > 0 ? matchingTemplates : [
                {
                    id: 'sec-fleet-prep',
                    title: `Fleet Hardware Pre-Configuration (${vehicles.length} Units)`,
                    hardwareModel: unitModel,
                    items: [
                        { id: `chk-b1`, title: `Program and flash firmware on ${vehicles.length}x ${unitModel} devices`, isRequired: true, displayOrder: 1, completed: false, section: 'Fleet Prep' },
                        { id: `chk-b2`, title: `Insert and verify M2M SIM cards & APN connectivity`, isRequired: true, displayOrder: 2, completed: false, section: 'Fleet Prep' },
                        { id: `chk-b3`, title: `Assemble ${vehicles.length} harness looms & fuse packs`, isRequired: true, displayOrder: 3, completed: false, section: 'Fleet Prep' },
                    ],
                },
                {
                    id: 'sec-fleet-install',
                    title: `On-Site Vehicle Installation (${vehicles.length} Vehicles)`,
                    hardwareModel: unitModel,
                    items: vehicles.slice(0, 10).map((v, i) => ({
                        id: `chk-veh-${i}`,
                        title: `Install & certify unit in Fleet #${v.fleetNumber} (${v.regoNumber} - ${v.vehicleMake} ${v.vehicleModel})`,
                        isRequired: true,
                        displayOrder: i + 1,
                        completed: false,
                        section: 'Vehicle Installation',
                    })),
                },
            ];

            const selectedUser = users.find((u) => u.id === installerId);
            const roleName = String(selectedUser?.role?.name || selectedUser?.role || '').toLowerCase();
            const assignedRole: 'technician' | 'contractor' | 'subcontractor' = roleName.includes('subcontractor') || roleName.includes('sub-contractor')
                ? 'subcontractor'
                : roleName.includes('contractor')
                    ? 'contractor'
                    : 'technician';

            const newJob = {
                id: masterJobId,
                jobNumber: masterJobNumber,
                assignedTo: assignedRole,
                isWhiteboard: false,
                customerId,
                customerName: selectedCustomer?.name || shippingAddress.name || 'FM Customer',
                customerContact: shippingAddress.name || 'Fleet Manager',
                customerPhone: '02 9876 5432',
                projectId: 'proj-fleet-telematics',
                projectName: jobTitle,
                location: installLocation,
                vehicle: {
                    rego: `${vehicles.length} Vehicles: ${vehicles.slice(0, 3).map((v) => v.fleetNumber || v.regoNumber).join(', ')}${vehicles.length > 3 ? '...' : ''}`,
                    fleetNumber: `Bulk Fleet (${vehicles.length} Units)`,
                    vin: `BULK-VIN-${vehicles.length}`,
                    makeModel: `${vehicles[0]?.vehicleMake || 'Fleet'} (${vehicles.length} Vehicles)`,
                },
                hardware: packageItems.map((item) => ({
                    id: item.productId,
                    model: item.partNumber || unitModel,
                    name: `${item.description} (x${vehicles.length})`,
                    serialNumber: 'Batch Rollout',
                    imei: 'Batch Rollout',
                    category: 'Fleet Rollout Package',
                })),
                technicianId: installerId || undefined,
                technicianName: selectedUser
                    ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.displayName || selectedUser.email
                    : undefined,
                installationDate: installDate,
                startTime: '08:00',
                endTime: '17:00',
                isScheduled: !!(installerId && installDate),
                status: 'Not Actioned' as any,
                checklistSections: resolvedChecklist,
                timeline: [
                    {
                        id: `tl-${Date.now()}`,
                        status: 'Not Actioned' as any,
                        timestamp: new Date().toISOString(),
                        updatedBy: 'Operations Dispatch',
                        note: `Bulk installation job created for ${vehicles.length} vehicles. Linked preinstalls: ${createdPreinstalls.map((p: any) => p.preinstallNo).join(', ')}`,
                    },
                ],
                notes: `Bulk Rollout for ${selectedCustomer?.name || 'Customer'}: ${vehicles.length} vehicles. Location: ${installLocation}.`,
                createdAt: new Date().toISOString(),
                canInvoice: false,
            };

            try {
                await createInstallationJob(newJob as any);
                await refreshFromApi();
            } catch (jobErr) {
                console.warn('Could not auto-create bulk installation job in context:', jobErr);
            }

            if (typeof window !== 'undefined') {
                const raw = localStorage.getItem('operations_installation_jobs');
                let currentJobs: any[] = [];
                if (raw) {
                    try { currentJobs = JSON.parse(raw); } catch (e) { }
                }
                currentJobs = [newJob, ...currentJobs.filter((j: any) => j.id !== newJob.id)];
                localStorage.setItem('operations_installation_jobs', JSON.stringify(currentJobs));
                window.dispatchEvent(new Event('operations_jobs_updated'));
            }

            setSaveProgress(100);
            setCompletedResult({
                count: vehicles.length,
                jobId: masterJobId,
                jobNumber: masterJobNumber,
                preinstalls: createdPreinstalls,
                customerName: selectedCustomer?.name || shippingAddress.name,
            });

            showToast({
                type: 'success',
                title: `Bulk Creation Complete!`,
                message: `Successfully created ${vehicles.length} Preinstall records and 1 consolidated job (${masterJobNumber}).`,
            });
        } catch (err: any) {
            console.error('Bulk save failed:', err);
            const raw = err?.response?.data?.message;
            const errorText = typeof raw === 'string' ? raw : (raw?.message ?? 'Bulk preinstall creation failed');
            showToast({ type: 'error', title: 'Bulk Save Error', message: errorText });
        } finally {
            setSaving(false);
        }
    };

    const sortedBaseUnits = [...baseUnits].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const sortedUnitCodes = [...unitCodes].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return (
        <AdminShell title="Bulk FM Preinstall">
            {/* Top Action & Navigation Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Bulk FM Preinstall Module
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Create, inspect, and update consolidated preinstallation rollouts across customer fleets.
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button variant="outline" size="sm" onClick={() => router.push('/fm-preinstall')}>
                        Back to Preinstalls
                    </Button>
                    {activeTab === 'create' && (
                        <Button
                            size="sm"
                            onClick={handleSaveBulk}
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
                        >
                            {saving ? (
                                <>Creating ({saveProgress}%)...</>
                            ) : (
                                <>
                                    <Truck className="w-4 h-4" />
                                    Create Bulk Job ({vehicles.length} Vehicles)
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Sub-nav Tab Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-5 w-fit border border-slate-200">
                <button
                    onClick={() => setActiveTab('records')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'records'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Bulk Records
                </button>
                <button
                    onClick={() => setActiveTab('create')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'create'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Bulk Rollout
                </button>
            </div>

            {activeTab === 'records' ? (
                <BulkRolloutList onCreateNewClick={() => setActiveTab('create')} />
            ) : (
                <>

                    {/* Completion Modal / Banner */}
                    {completedResult && (
                        <div className="mb-6 bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <h3 className="font-semibold text-emerald-900 text-base">
                                            Successfully Generated {completedResult.count} FM Preinstall Records!
                                        </h3>
                                        <span className="text-xs px-2.5 py-1 bg-emerald-200 text-emerald-800 rounded-full font-mono font-bold">
                                            {completedResult.jobNumber}
                                        </span>
                                    </div>
                                    <p className="text-xs text-emerald-700 mt-1">
                                        One master installation job was created for <strong>{completedResult.customerName}</strong> in Job Book, with individual preinstall sheets generated for each vehicle.
                                    </p>

                                    {/* Badges of created preinstall numbers */}
                                    <div className="mt-3 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white/80 rounded-lg border border-emerald-200">
                                        {completedResult.preinstalls.map((p: any, idx: number) => (
                                            <span
                                                key={p.id || idx}
                                                className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 border rounded text-slate-700 cursor-pointer"
                                                onClick={() => router.push(`/fm-preinstall/${p.id}`)}
                                                title={`View ${p.preinstallNo} (Fleet: ${p.fleetNumber})`}
                                            >
                                                <strong>{p.preinstallNo}</strong>
                                                <span className="text-slate-400">({p.fleetNumber || p.regoNumber})</span>
                                            </span>
                                        ))}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setCompletedResult(null);
                                                setActiveTab('records');
                                            }}
                                            className="bg-indigo-700 hover:bg-indigo-800 text-white"
                                        >
                                            View Bulk Rollouts
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => router.push('/fm-preinstall')}
                                            className="bg-emerald-700 hover:bg-emerald-800 text-white"
                                        >
                                            View All Preinstalls
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.push('/job-boards/installations')}
                                            className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                        >
                                            Open in Job Book
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setCompletedResult(null)}
                                            className="text-slate-600"
                                        >
                                            Create Another Fleet Job
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Grid: Form Sections */}
                    <div className="space-y-5">

                        {/* SECTION 1: Customer & Master Job Header */}
                        <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b">
                                <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    Customer & Fleet Job Details
                                </h2>
                                {fmFleetName && (
                                    <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2.5 py-1 rounded-md border border-indigo-200">
                                        FM Fleet: <strong>{fmFleetName}</strong>
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs">
                                {/* Customer Search Select */}
                                <div className="sm:col-span-2 lg:col-span-4">
                                    <label className="text-slate-600 font-medium block mb-1">
                                        Select Customer <span className="text-rose-500">*</span>
                                    </label>
                                    <CustomerSearchSelect
                                        value={selectedCustomer || customerId}
                                        onSelect={handleCustomerSelect}
                                        label=""
                                    />
                                </div>

                                {/* Job Title */}
                                <div className="sm:col-span-2 lg:col-span-4">
                                    <label className="text-slate-600 font-medium block mb-1">Fleet Job Title</label>
                                    <Input
                                        placeholder="e.g. 20-Vehicle Rollout"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                    />
                                </div>

                                {/* Install Type */}
                                <div className="sm:col-span-1 lg:col-span-2">
                                    <label className="text-slate-600 font-medium block mb-1">Install Type</label>
                                    <Select
                                        value={type}
                                        onChange={(val: any) => {
                                            const nextType = typeof val === 'string' ? val : (val?.target?.value ?? String(val ?? ''));
                                            setType(nextType);
                                            updateInstallDetail({ installType: nextType });
                                        }}
                                        options={INSTALL_TYPES}
                                    />
                                </div>

                                {/* Order / PO Number */}
                                <div className="sm:col-span-1 lg:col-span-2">
                                    <label className="text-slate-600 font-medium block mb-1">Order / PO #</label>
                                    <Input
                                        placeholder="e.g. PO-8921"
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                    />
                                </div>

                                {/* Install Date */}
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <label className="text-slate-600 font-medium block mb-1">Installation Date</label>
                                    <Input
                                        type="date"
                                        value={installDate}
                                        onChange={(e) => setInstallDate(e.target.value)}
                                    />
                                </div>

                                {/* Install Location */}
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <label className="text-slate-600 font-medium block mb-1">Install Location</label>
                                    <Input
                                        placeholder="e.g. Main Yard or Customer Depot"
                                        value={installLocation}
                                        onChange={(e) => setInstallLocation(e.target.value)}
                                    />
                                </div>

                                {/* Assigned Installer / Technician */}
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <label className="text-slate-600 font-medium block mb-1">Lead Installer / Tech</label>
                                    <select
                                        className="w-full border rounded-md p-2 text-xs bg-white text-slate-800"
                                        value={installerId}
                                        onChange={(e) => setInstallerId(e.target.value)}
                                    >
                                        <option value="">Unassigned (Operations Pool)</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Depot Selector if customer has depots */}
                                <div className="sm:col-span-1 lg:col-span-3">
                                    <label className="text-slate-600 font-medium block mb-1">Customer Depot</label>
                                    <select
                                        className="w-full border rounded-md p-2 text-xs bg-white text-slate-800"
                                        value={depotId}
                                        onChange={(e) => setDepotId(e.target.value)}
                                    >
                                        <option value="">Default Depot</option>
                                        {depots.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name || d.code}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Collapsible Address Verification */}
                            <div className="mt-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowAddressDetails(!showAddressDetails)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                >
                                    {showAddressDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    {showAddressDetails ? 'Hide' : 'Review'} Shipping & Billing Address Snapshots
                                </button>

                                {showAddressDetails && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-slate-50 p-3 rounded-lg border text-xs">
                                        <div>
                                            <h4 className="font-semibold text-slate-700 mb-2">Shipping Destination</h4>
                                            <div className="space-y-1.5">
                                                <Input
                                                    placeholder="Shipping Name"
                                                    value={shippingAddress.name}
                                                    onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                                                />
                                                <Input
                                                    placeholder="Street Address 1"
                                                    value={shippingAddress.address1}
                                                    onChange={(e) => setShippingAddress({ ...shippingAddress, address1: e.target.value })}
                                                />
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    <Input
                                                        placeholder="City"
                                                        value={shippingAddress.city}
                                                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                                                    />
                                                    <Input
                                                        placeholder="State"
                                                        value={shippingAddress.state}
                                                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                                                    />
                                                    <Input
                                                        placeholder="Postcode"
                                                        value={shippingAddress.postcode}
                                                        onChange={(e) => setShippingAddress({ ...shippingAddress, postcode: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-slate-700 mb-2">Billing Account</h4>
                                            <div className="space-y-1.5">
                                                <Input
                                                    placeholder="Billing Name"
                                                    value={billingAddress.name}
                                                    onChange={(e) => setBillingAddress({ ...billingAddress, name: e.target.value })}
                                                />
                                                <Input
                                                    placeholder="Street Address 1"
                                                    value={billingAddress.address1}
                                                    onChange={(e) => setBillingAddress({ ...billingAddress, address1: e.target.value })}
                                                />
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    <Input
                                                        placeholder="City"
                                                        value={billingAddress.city}
                                                        onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                                                    />
                                                    <Input
                                                        placeholder="State"
                                                        value={billingAddress.state}
                                                        onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                                                    />
                                                    <Input
                                                        placeholder="Postcode"
                                                        value={billingAddress.postcode}
                                                        onChange={(e) => setBillingAddress({ ...billingAddress, postcode: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECTION 2: Standard Hardware & Line Items (Per Vehicle) */}
                        <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b">
                                <div>
                                    <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                        Standard Hardware & Bill of Materials (Per Vehicle)
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Every vehicle in this bulk job will receive this configuration and hardware kit.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-400 block">Kit Cost / Vehicle</span>
                                    <span className="text-sm font-bold text-slate-800 font-mono">${packageTotalPerVehicle.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* FM INSTALLATION DETAILS SECTION (Matched to /fm-preinstall/new) */}
                            <div className="mb-5 border rounded-lg overflow-hidden bg-white shadow-xs">
                                <div className="flex justify-between items-center px-3.5 py-2.5 bg-slate-100 border-b">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                                            FM INSTALLATION DETAILS (Per Vehicle Specification)
                                        </span>
                                        {installDetail.serviceCode && (
                                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-cyan-100 text-cyan-800 border border-cyan-300 rounded">
                                                SVC: {installDetail.serviceCode}
                                            </span>
                                        )}
                                        {installDetail.mixCode && (
                                            <span className="font-mono text-[11px] px-2 py-0.5 bg-yellow-100 text-amber-800 border border-yellow-300 rounded">
                                                MIX: {installDetail.mixCode}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowInstallDetailsModal(true)}
                                            className="h-6 text-[11px] px-2.5 bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200"
                                        >
                                            <ExternalLink className="w-3 h-3 mr-1" />
                                            Open Full FM Panel
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-3.5">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                                        {/* ══ LEFT COLUMN: Core Telematics Unit & Service Codes ══════ */}
                                        <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                                            <div className="text-xs font-semibold text-slate-700 pb-1 mb-1 border-b border-slate-200 flex items-center justify-between">
                                                <span>Core Telematics & Service Codes</span>
                                                <span className="text-[10px] text-slate-400 font-normal">Base unit & network segments</span>
                                            </div>

                                            <LabelRow label="Install Type">
                                                <select
                                                    className="w-full border rounded p-1 bg-white text-xs"
                                                    value={type}
                                                    onChange={(e) => {
                                                        setType(e.target.value);
                                                        updateInstallDetail({ installType: e.target.value });
                                                    }}
                                                >
                                                    {INSTALL_TYPES.map((t) => (
                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </LabelRow>

                                            <LabelRow label="FM Unit Type">
                                                <div className="flex gap-1 items-center">
                                                    <select
                                                        className="flex-1 border rounded p-1 bg-white text-xs"
                                                        value={installDetail.fmUnitType ?? ''}
                                                        onChange={(e) => handleUnitChange(e.target.value)}
                                                    >
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
                                                    <select
                                                        className="flex-1 border rounded p-1 bg-white text-xs"
                                                        value={installDetail.fmUnitCode ?? ''}
                                                        onChange={(e) => updateInstallDetail({ fmUnitCode: e.target.value })}
                                                    >
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
                                                <select
                                                    className="w-full border rounded p-1 bg-white text-xs"
                                                    value={installDetail.modem4G === false ? 'NO' : 'YES'}
                                                    onChange={(e) => updateInstallDetail({ modem4G: e.target.value === 'YES' })}
                                                >
                                                    <option value="YES">Yes</option>
                                                    <option value="NO">No</option>
                                                </select>
                                            </LabelRow>

                                            <LabelRow label="Service Code">
                                                <div className="flex gap-1 items-center">
                                                    <Input
                                                        className="flex-1 bg-cyan-100/70 font-bold tracking-wide text-xs border-cyan-300 text-cyan-900"
                                                        value={installDetail.serviceCode ?? ''}
                                                        readOnly
                                                    />
                                                    <IndexBadge>{(installDetail.serviceCode ?? '').length || ''}</IndexBadge>
                                                </div>
                                            </LabelRow>

                                            <LabelRow label="MIX Code">
                                                <Input
                                                    className="font-mono bg-yellow-50 text-xs border-yellow-300 text-amber-900"
                                                    value={installDetail.mixCode ?? ''}
                                                    readOnly
                                                />
                                            </LabelRow>

                                            <LabelRow label="Mix Org ID">
                                                <Input
                                                    className="bg-orange-50 text-xs border-orange-200"
                                                    placeholder="e.g. 5049"
                                                    value={installDetail.mixOrgId ?? ''}
                                                    onChange={(e) => updateInstallDetail({ mixOrgId: e.target.value })}
                                                />
                                            </LabelRow>
                                        </div>

                                        {/* ══ RIGHT COLUMN: Monitor, Vision & Options ══════ */}
                                        <div className="space-y-3">
                                            {/* ── MONITOR DETAILS ── */}
                                            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/70">
                                                <div className="font-semibold text-xs text-slate-700 mb-1.5">Monitor Details</div>
                                                <div className="mb-2">
                                                    <Checkbox
                                                        label="Mix Sim1"
                                                        checked={installDetail.mixSim1 ?? false}
                                                        onChange={(v: boolean) => updateInstallDetail({ mixSim1: v, ...(!v && { sim1Type: undefined }) })}
                                                    />
                                                </div>
                                                {installDetail.mixSim1 && (
                                                    <LabelRow label="SIM 1 Type">
                                                        <select
                                                            className="w-full border rounded p-1 bg-white text-xs"
                                                            value={installDetail.sim1Type ?? ''}
                                                            onChange={(e) => updateInstallDetail({ sim1Type: e.target.value })}
                                                        >
                                                            <option value="">Select</option>
                                                            {sim1List.map((s: any) => (
                                                                <option key={s.id} value={s.code}>{s.label}</option>
                                                            ))}
                                                        </select>
                                                    </LabelRow>
                                                )}
                                            </div>

                                            {/* ── VISION FITTED ── */}
                                            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/70">
                                                <div className="font-semibold text-xs text-slate-700 mb-1.5">Vision Fitted</div>

                                                {/* Vision Radios */}
                                                <div className="flex flex-wrap gap-3 mb-2 text-xs">
                                                    {visionList.length > 0 && (
                                                        <Radio
                                                            value=""
                                                            label="No Vision"
                                                            checked={!installDetail.visionType}
                                                            onChange={() => handleVisionChange('')}
                                                        />
                                                    )}
                                                    {visionList.map((v: any) => (
                                                        <Radio
                                                            key={`${v.code}-${v.label}`}
                                                            value={v.code}
                                                            label={v.label}
                                                            checked={installDetail.visionType === v.code}
                                                            onChange={(val: string) => handleVisionChange(val)}
                                                        />
                                                    ))}
                                                </div>

                                                {/* AAI Camera Type (when vision active) */}
                                                {hasVision && (
                                                    <div className="mb-2">
                                                        <LabelRow label="AAI Camera Type">
                                                            <div className="flex gap-1 items-center">
                                                                <IndexBadge>
                                                                    {cameraList.find((c: any) => c.code === installDetail.cameraType)?.mixIndex ?? ''}
                                                                </IndexBadge>
                                                                <select
                                                                    className="flex-1 border rounded p-1 bg-white text-xs"
                                                                    value={installDetail.cameraType ?? ''}
                                                                    onChange={(e) => handleCameraTypeChange(e.target.value)}
                                                                >
                                                                    <option value="">Select</option>
                                                                    {cameraList.map((c: any) => (
                                                                        <option key={c.id} value={c.code}>{c.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </LabelRow>
                                                    </div>
                                                )}

                                                {/* Mix Sim2 + Camera Count Controls */}
                                                <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox
                                                            label="Mix Sim2"
                                                            checked={installDetail.mixSim2 ?? false}
                                                            onChange={(val: boolean) => updateInstallDetail({ mixSim2: val })}
                                                        />
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="checkbox"
                                                                id="bulk-chk-4gvis"
                                                                checked={installDetail.mixSim2 ?? false}
                                                                onChange={(e) => updateInstallDetail({ mixSim2: e.target.checked })}
                                                                className="accent-green-600 w-3.5 h-3.5"
                                                            />
                                                            <label
                                                                htmlFor="bulk-chk-4gvis"
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${installDetail.mixSim2 ? 'bg-green-500 text-white' : 'bg-fuchsia-500 text-white'
                                                                    }`}
                                                            >
                                                                4G Vis
                                                            </label>
                                                        </div>
                                                    </div>

                                                    {hasVision && !omitCount && (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <span className="text-slate-500">Cameras</span>
                                                            <select
                                                                className="border rounded p-1 bg-white text-xs"
                                                                value={cameraCount}
                                                                onChange={(e) => updateInstallDetail({ cameraCount: Number(e.target.value) })}
                                                            >
                                                                {[2, 3, 4].map((n) => (
                                                                    <option key={n} value={n}>{n} Channels</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* SIM 2 Type (when Sim2 active) */}
                                                {installDetail.mixSim2 && (
                                                    <LabelRow label="SIM 2 Type">
                                                        <select
                                                            className="w-full border rounded p-1 bg-white text-xs"
                                                            value={installDetail.sim2Type ?? ''}
                                                            onChange={(e) => updateInstallDetail({ sim2Type: e.target.value })}
                                                        >
                                                            <option value="">Select</option>
                                                            {sim2List.map((s: any) => (
                                                                <option key={s.id} value={s.code}>{s.label}</option>
                                                            ))}
                                                        </select>
                                                    </LabelRow>
                                                )}
                                            </div>

                                            {/* ── OPTIONS ── */}
                                            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/70">
                                                <div className="font-semibold text-xs text-slate-700 mb-1.5">Options</div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                    <Checkbox
                                                        label="AI Option"
                                                        checked={installDetail.aiOption ?? false}
                                                        onChange={(v: boolean) => updateInstallDetail({ aiOption: v })}
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <Checkbox
                                                            label="TMA"
                                                            checked={installDetail.tmaOption ?? false}
                                                            onChange={(v: boolean) => updateInstallDetail({ tmaOption: v })}
                                                        />
                                                        <span className="text-[10px] text-slate-400">&gt;4k</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Checkbox
                                                            label="RIM"
                                                            checked={installDetail.rimOption ?? false}
                                                            onChange={(v: boolean) => updateInstallDetail({ rimOption: v })}
                                                        />
                                                        <span className="text-[10px] text-slate-400">&gt;4k</span>
                                                    </div>
                                                    <Checkbox
                                                        label="NRC"
                                                        checked={installDetail.nrc ?? false}
                                                        onChange={(v: boolean) => updateInstallDetail({ nrc: v })}
                                                    />
                                                    <Checkbox
                                                        label="Wi-Fi"
                                                        checked={installDetail.wiFi ?? false}
                                                        onChange={(v: boolean) => updateInstallDetail({ wiFi: v })}
                                                    />
                                                    <Checkbox
                                                        label="Safe Guard"
                                                        checked={installDetail.safeGuard ?? false}
                                                        onChange={(v: boolean) => updateInstallDetail({ safeGuard: v })}
                                                    />
                                                    <Checkbox
                                                        label="Int SIM"
                                                        checked={installDetail.intSim ?? false}
                                                        onChange={(v: boolean) => updateInstallDetail({ intSim: v })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 flex items-center justify-between">
                                    <span>Hardware Package Components</span>
                                    <Button size="sm" variant="outline" onClick={addPackageItem} className="h-7 text-xs flex items-center gap-1">
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Component
                                    </Button>
                                </div>

                                <div className="divide-y text-xs">
                                    {packageItems.length === 0 ? (
                                        <div className="p-4 text-center text-slate-400">No hardware components selected. Click "Add Component" above.</div>
                                    ) : (
                                        packageItems.map((item, idx) => (
                                            <div key={idx} className="p-2.5 flex items-center gap-3 bg-white hover:bg-slate-50">
                                                <div className="flex-1">
                                                    <select
                                                        className="w-full border rounded p-1.5 text-xs bg-white"
                                                        value={item.productId}
                                                        onChange={(e) => {
                                                            const chosen = availableProducts.find((p) => p.id === e.target.value);
                                                            if (chosen) {
                                                                updatePackageItem(idx, {
                                                                    productId: chosen.id,
                                                                    partNumber: chosen.productCode,
                                                                    description: chosen.name,
                                                                    unitPrice: Number(chosen.retailPrice || 0),
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        {availableProducts.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.productCode} — {p.name || 'Hardware Part'} (${p.retailPrice || '0.00'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="w-20">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="Qty"
                                                        value={item.quantity}
                                                        onChange={(e) => updatePackageItem(idx, { quantity: Number(e.target.value) })}
                                                    />
                                                </div>

                                                <div className="w-24">
                                                    <Input
                                                        type="number"
                                                        placeholder="Unit Price"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updatePackageItem(idx, { unitPrice: Number(e.target.value) })}
                                                    />
                                                </div>

                                                <div className="w-20 font-mono font-semibold text-slate-800 text-right">
                                                    ${Number(item.lineTotal || 0).toFixed(2)}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removePackageItem(idx)}
                                                    className="text-slate-400 hover:text-rose-500 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: Multiple Vehicles Grid */}
                        <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-4 border-b">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-semibold text-slate-800 text-sm">
                                            Vehicle Fleet Entry ({vehicles.length} Vehicles)
                                        </h2>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Each row corresponds to one vehicle preinstall record created in the batch.
                                    </p>
                                </div>

                                {/* Quick Generator & Action Toolbar */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-400 font-medium mr-1">Quick Add:</span>
                                    <button
                                        type="button"
                                        onClick={() => addVehiclesCount(1)}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border rounded text-xs text-slate-700 font-medium"
                                    >
                                        +1
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addVehiclesCount(5)}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border rounded text-xs text-slate-700 font-medium"
                                    >
                                        +5
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addVehiclesCount(10)}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border rounded text-xs text-slate-700 font-medium"
                                    >
                                        +10
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addVehiclesCount(20)}
                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-xs text-indigo-700 font-bold"
                                    >
                                        +20 Vehicles
                                    </button>

                                    <div className="h-4 w-px bg-slate-200 mx-1" />

                                    <button
                                        type="button"
                                        onClick={() => autoSequenceFleetNumbers()}
                                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border rounded text-xs text-slate-700 flex items-center gap-1"
                                        title="Automatically sequence Fleet # (e.g. FL-101, FL-102...)"
                                    >
                                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                                        Auto-Sequence
                                    </button>

                                    <button
                                        type="button"
                                        onClick={copyMakeModelDown}
                                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border rounded text-xs text-slate-700 flex items-center gap-1"
                                        title="Copy Make & Model from row 1 to all vehicles"
                                    >
                                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                                        Copy Make/Model
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowPasteModal(true)}
                                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-xs text-emerald-800 font-medium flex items-center gap-1"
                                    >
                                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                        Paste / Import Excel
                                    </button>
                                </div>
                            </div>

                            {/* Vehicle Table */}
                            <div className="border rounded-lg overflow-x-auto max-h-[500px]">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b">
                                        <tr>
                                            <th className="p-2 w-10 text-center">#</th>
                                            <th className="p-2 min-w-[110px]">Fleet # <span className="text-rose-500">*</span></th>
                                            <th className="p-2 min-w-[110px]">Rego <span className="text-rose-500">*</span></th>
                                            <th className="p-2 min-w-[140px]">VIN</th>
                                            <th className="p-2 min-w-[110px]">Make</th>
                                            <th className="p-2 min-w-[110px]">Model</th>
                                            <th className="p-2 min-w-[80px]">Year</th>
                                            <th className="p-2 min-w-[100px]">Asset #</th>
                                            <th className="p-2 min-w-[120px]">Serial Override</th>
                                            <th className="p-2 min-w-[120px]">IMEI Override</th>
                                            <th className="p-2 w-10 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {vehicles.map((v, idx) => (
                                            <tr key={v.id} className="hover:bg-slate-50">
                                                <td className="p-2 text-center text-slate-400 font-mono text-[11px]">
                                                    {idx + 1}
                                                </td>
                                                <td className="p-1.5">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-indigo-500"
                                                        placeholder="FL-101"
                                                        value={v.fleetNumber}
                                                        onChange={(e) => updateVehicleRow(v.id, 'fleetNumber', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs font-mono uppercase text-slate-800 focus:outline-indigo-500"
                                                        placeholder="ABC-123"
                                                        value={v.regoNumber}
                                                        onChange={(e) => updateVehicleRow(v.id, 'regoNumber', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs font-mono text-slate-600 focus:outline-indigo-500"
                                                        placeholder="VIN..."
                                                        value={v.vinNumber}
                                                        onChange={(e) => updateVehicleRow(v.id, 'vinNumber', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs text-slate-800 focus:outline-indigo-500"
                                                        placeholder="Isuzu"
                                                        value={v.vehicleMake}
                                                        onChange={(e) => updateVehicleRow(v.id, 'vehicleMake', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs text-slate-800 focus:outline-indigo-500"
                                                        placeholder="FTR"
                                                        value={v.vehicleModel}
                                                        onChange={(e) => updateVehicleRow(v.id, 'vehicleModel', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs text-slate-600 focus:outline-indigo-500"
                                                        placeholder="2024"
                                                        value={v.yearVariant}
                                                        onChange={(e) => updateVehicleRow(v.id, 'yearVariant', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs text-slate-600 focus:outline-indigo-500"
                                                        placeholder="Asset ID"
                                                        value={v.assetNumber}
                                                        onChange={(e) => updateVehicleRow(v.id, 'assetNumber', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs font-mono text-slate-500 focus:outline-indigo-500"
                                                        placeholder="Optional"
                                                        value={v.unitSerial}
                                                        onChange={(e) => updateVehicleRow(v.id, 'unitSerial', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs font-mono text-slate-500 focus:outline-indigo-500"
                                                        placeholder="Optional"
                                                        value={v.unitIMEI}
                                                        onChange={(e) => updateVehicleRow(v.id, 'unitIMEI', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVehicle(v.id)}
                                                        className="text-slate-300 hover:text-rose-500 p-1"
                                                        title="Remove vehicle row"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Quick summary below table */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3 pt-3 border-t text-xs text-slate-500">
                                <div>
                                    Total Vehicles to Roll Out: <strong className="text-slate-800 text-sm">{vehicles.length}</strong>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>Total Fleet Hardware Value:</span>
                                    <span className="font-bold text-slate-800 font-mono text-sm">
                                        ${grandTotalFleetValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: Final Confirmation & Action Bar */}
                        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-base flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-indigo-400" />
                                    Ready to create bulk job for {vehicles.length} vehicles
                                </h3>
                                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                                    This will generate {vehicles.length} individual FM Preinstall sheets (linked with serials/registrations) and 1 consolidated master Installation Job in the Job Book for scheduling.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/fm-preinstall')}
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveBulk}
                                    disabled={saving}
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow-lg px-5"
                                >
                                    {saving ? `Creating Batch (${saveProgress}%)...` : `Generate ${vehicles.length} Preinstalls`}
                                </Button>
                            </div>
                        </div>

                    </div>

                    {/* Paste from Excel / CSV Modal */}
                    {showPasteModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                        <h3 className="font-bold text-slate-800 text-sm">Paste Fleet Vehicles from Excel / CSV</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPasteModal(false)}
                                        className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <p className="text-xs text-slate-600">
                                    Copy columns from your fleet spreadsheet and paste below. The expected column order is:
                                    <br />
                                    <code className="text-indigo-600 font-mono bg-slate-100 px-1 py-0.5 rounded mt-1 inline-block">
                                        Fleet # | Rego | VIN | Make | Model | Year | Asset # | Serial | IMEI
                                    </code>
                                </p>

                                <textarea
                                    className="w-full h-48 border rounded-lg p-3 text-xs font-mono focus:outline-indigo-500 bg-slate-50"
                                    placeholder={`FL-101\tABC-123\tVIN123456789\tIsuzu\tFTR\t2024\nFL-102\tXYZ-789\tVIN987654321\tKenworth\tT680\t2024`}
                                    value={pasteData}
                                    onChange={(e) => setPasteData(e.target.value)}
                                />

                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-xs text-slate-400">
                                        {pasteData.trim() ? `${pasteData.trim().split(/\r?\n/).length} lines detected` : 'Empty'}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setShowPasteModal(false)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleParsePastedData}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            Import Vehicles
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal for full FMInstallDetailsPanel */}
                    {showInstallDetailsModal && (
                        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
                                <FMInstallDetailsPanel
                                    item={{ id: 'bulk-template', targetRecord: 'BULK', installDetail }}
                                    onClose={() => setShowInstallDetailsModal(false)}
                                    onSave={(data: any) => {
                                        setInstallDetail(data);
                                        if (data.installType && data.installType !== type) {
                                            setType(data.installType);
                                        }
                                        setShowInstallDetailsModal(false);
                                        showToast({ type: 'success', title: 'FM Installation Details Updated' });
                                    }}
                                    onSyncType={(newType: string) => setType(newType)}
                                    fleetName={fmFleetName || selectedCustomer?.name || ''}
                                    fmCustomerId={fmCustomerId || customerId || ''}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
        </AdminShell>
    );
}
