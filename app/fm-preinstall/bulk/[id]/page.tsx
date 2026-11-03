'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    Truck,
    Layers,
    Plus,
    Copy,
    CheckCircle2,
    Wrench,
    AlertCircle,
    ArrowLeft,
    ExternalLink,
    Edit3,
    Calendar,
    MapPin,
    Shield,
    FileSpreadsheet,
    DollarSign,
    Save,
    X,
    Trash2
} from 'lucide-react';

import { AdminShell } from '../../../../components/layout/AdminShell';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Radio } from '../../../../components/ui/radio';
import { useToast } from '../../../../components/ui/toast';
import { api } from '../../../../lib/api-client';
import { CustomerSearchSelect } from '../../../../components/common/CustomerSearchSelect';
import { SearchSelect } from '../../../../components/ui/SearchSelect';
import { FormSection } from '../../../../components/forms/FormSection';

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
    preinstallNo?: string;
    status?: string;
}

const INSTALL_TYPES = [
    { value: 'NEW_INSTALL', label: 'New Install' },
    { value: 'WARRANTY', label: 'Warranty' },
    { value: 'REPLACEMENT', label: 'Replacement' },
    { value: 'MODIFIED_INSTALL', label: 'Modified Install' },
    { value: 'TRANSFER_UNIT', label: 'Transfer Unit' },
];

const STATUS_OPTIONS = [
    { value: 'NOT_ACTIONED', label: 'Not Actioned' },
    { value: 'WORKSHOP_SETUP', label: 'Workshop Setup' },
    { value: 'WAITING_INSTALL', label: 'Waiting Install' },
    { value: 'INSTALLED', label: 'Installed' },
    { value: 'INVOICED', label: 'Invoiced' },
    { value: 'COMPLETED', label: 'Completed' },
];

const STATUS_COLOR: Record<string, string> = {
    NOT_ACTIONED: 'bg-slate-100 text-slate-700 border-slate-200',
    WORKSHOP_SETUP: 'bg-amber-50 text-amber-800 border-amber-200',
    WAITING_INSTALL: 'bg-blue-50 text-blue-800 border-blue-200',
    INSTALLED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    INVOICED: 'bg-purple-50 text-purple-800 border-purple-200',
    COMPLETED: 'bg-teal-50 text-teal-800 border-teal-200',
};

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

function BulkFMPreinstallDetailContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();

    const id = params?.id as string;
    const initialMode = searchParams.get('mode') === 'edit';

    const [isEditing, setIsEditing] = useState(initialMode);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);

    // Bulk Record Data State
    const [recordData, setRecordData] = useState<any>(null);

    // Edit Form State
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customerId, setCustomerId] = useState('');
    const [fmCustomerId, setFmCustomerId] = useState('');
    const [fmFleetName, setFmFleetName] = useState('');
    const [type, setType] = useState('NEW_INSTALL');
    const [status, setStatus] = useState('NOT_ACTIONED');
    const [orderNumber, setOrderNumber] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [assignedUserId, setAssignedUserId] = useState('');
    const [installerId, setInstallerId] = useState('');
    const [installDate, setInstallDate] = useState('');
    const [installLocation, setInstallLocation] = useState('');
    const [depotId, setDepotId] = useState('');
    const [depots, setDepots] = useState<any[]>([]);
    const [notes, setNotes] = useState('');

    // Addresses
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

    // Hardware Configuration Template
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

    // Segment options
    const [baseUnits, setBaseUnits] = useState<any[]>([]);
    const [unitCodes, setUnitCodes] = useState<any[]>([]);
    const [visionList, setVisionList] = useState<any[]>([]);
    const [cameraList, setCameraList] = useState<any[]>([]);
    const [sim1List, setSim1List] = useState<any[]>([]);
    const [sim2List, setSim2List] = useState<any[]>([]);

    // Hardware Products & Packages
    const [packageItems, setPackageItems] = useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Vehicles
    const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    // Load initial reference data (segments, products, users)
    useEffect(() => {
        api.get('/users?take=100').then((res) => {
            const data = res.data?.data?.items || res.data?.data || res.data?.items || res.data;
            if (Array.isArray(data)) setUsers(data);
        }).catch(() => { });

        setLoadingProducts(true);
        api.get('/products?isFmHardware=true').then((res) => {
            const list = res.data?.data ?? res.data ?? [];
            setAvailableProducts(list);
        }).catch(() => { })
            .finally(() => setLoadingProducts(false));

        Promise.all([
            api.get('/fm-segments?type=BASE_UNIT'),
            api.get('/fm-segments?type=SIM1'),
            api.get('/fm-segments?type=SIM2'),
        ]).then(([baseRes, s1Res, s2Res]) => {
            const allBase = baseRes.data?.data ?? [];
            setBaseUnits(allBase.filter((u: any) => u.sortOrder !== 0 && u.code !== 'NULL'));
            setSim1List(s1Res.data?.data ?? []);
            setSim2List(s2Res.data?.data ?? []);
        }).catch(() => { });
    }, []);

    // Load Bulk Record by ID
    const loadRecord = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await api.get(`/fm-preinstall/bulk/${id}`);
            const data = res.data?.data ?? res.data;
            setRecordData(data);

            // Populate Edit Form State
            setCustomerId(data.customerId || '');
            setSelectedCustomer(data.customer || { id: data.customerId, name: data.customer?.name });
            setFmCustomerId(data.fmCustomerId || '');
            setFmFleetName(data.fmCustomer?.fleetName || data.customer?.name || '');
            setType(data.type || 'NEW_INSTALL');
            setStatus(data.status || 'NOT_ACTIONED');
            setOrderNumber(data.orderNumber || '');
            setJobTitle(data.jobTitle || 'Airco Fleet Rollout');
            setAssignedUserId(data.assignedUserId || '');
            setInstallerId(data.installerId || '');
            setInstallDate(data.installDate || '');
            setInstallLocation(data.installLocation || 'Customer Fleet Yard');
            setDepotId(data.depotId || '');
            setNotes(data.notes || '');

            if (data.shippingAddress) {
                setShippingAddress({
                    name: data.shippingAddress.name || '',
                    address1: data.shippingAddress.address1 || '',
                    address2: data.shippingAddress.address2 || '',
                    city: data.shippingAddress.city || '',
                    state: data.shippingAddress.state || '',
                    postcode: data.shippingAddress.postcode || '',
                });
            }

            if (data.billingAddress) {
                setBillingAddress({
                    name: data.billingAddress.name || '',
                    address1: data.billingAddress.address1 || '',
                    address2: data.billingAddress.address2 || '',
                    city: data.billingAddress.city || '',
                    state: data.billingAddress.state || '',
                    postcode: data.billingAddress.postcode || '',
                });
            }

            if (data.defaultInstallDetail) {
                setInstallDetail((prev: any) => ({
                    ...prev,
                    ...data.defaultInstallDetail,
                }));

                // Load unit code and vision options for this unit type
                if (data.defaultInstallDetail.fmUnitType) {
                    api.get(`/fm-segments?type=UNIT_CODE&dependsOn=${data.defaultInstallDetail.fmUnitType}`).then((r) => {
                        setUnitCodes(r.data?.data ?? []);
                    }).catch(() => { });
                    api.get(`/fm-segments?type=VISION&dependsOn=${data.defaultInstallDetail.fmUnitType}`).then((r) => {
                        setVisionList(r.data?.data ?? []);
                    }).catch(() => { });
                }
                if (data.defaultInstallDetail.visionType) {
                    api.get(`/fm-segments?type=CAMERA&dependsOn=${data.defaultInstallDetail.visionType}`).then((r) => {
                        setCameraList(r.data?.data ?? []);
                    }).catch(() => { });
                }
            }

            if (data.items && Array.isArray(data.items)) {
                setPackageItems(data.items);
            }

            if (data.vehicles && Array.isArray(data.vehicles)) {
                setVehicles(data.vehicles);
            }
        } catch (err: any) {
            console.error('Failed to load bulk preinstall record:', err);
            // Fallback for demo/offline resilience
            if (typeof window !== 'undefined') {
                try {
                    const raw = localStorage.getItem('operations_installation_jobs');
                    if (raw) {
                        const localJobs = JSON.parse(raw);
                        const match = localJobs.find((j: any) => j.id === id || j.jobNumber === id);
                        if (match) {
                            const mockRecord = {
                                id: match.id,
                                masterJobId: match.id,
                                masterJobNumber: match.jobNumber,
                                jobTitle: match.projectName || 'Fleet Rollout',
                                customerId: match.customerId || 'cust-1',
                                customer: { id: match.customerId, name: match.customerName || 'Fleet Customer', customerNumber: 'CUST-001' },
                                fmCustomerId: 'fm-1',
                                fmCustomer: { fleetName: match.customerName },
                                type: 'NEW_INSTALL',
                                status: match.status?.toUpperCase().replace(' ', '_') || 'NOT_ACTIONED',
                                orderNumber: 'PO-FLEET',
                                installerName: match.technicianName,
                                installLocation: match.location || 'Fleet Yard',
                                installDate: match.installationDate || new Date().toISOString().split('T')[0],
                                notes: match.notes,
                                shippingAddress: { name: match.customerName, address1: '42 Logistics Way', city: 'Eastern Creek', state: 'NSW', postcode: '2766' },
                                billingAddress: { name: match.customerName, address1: '42 Logistics Way', city: 'Eastern Creek', state: 'NSW', postcode: '2766' },
                                defaultInstallDetail: {
                                    fmUnitType: 'MIX4000',
                                    fmUnitCode: 'MIX4000',
                                    modem4G: true,
                                    serviceCode: 'MIX4000-BASE',
                                    mixCode: '1_0_1_0_2_0',
                                    visionType: 'HD_DUAL',
                                    cameraType: '2CAM',
                                    cameraCount: 2,
                                },
                                items: [
                                    { productId: 'prod-1', partNumber: 'MIX4000-BASE', description: 'Telematics Core Unit', quantity: 1, unitPrice: 550, lineTotal: 550 },
                                    { productId: 'prod-2', partNumber: 'HARN-PWR-01', description: 'Main Power Harness & Fuse Kit', quantity: 1, unitPrice: 85, lineTotal: 85 }
                                ],
                                vehicles: Array.from({ length: 5 }, (_, i) => ({
                                    id: `v-${i + 1}`,
                                    preinstallId: `pi-${i + 1}`,
                                    preinstallNo: `PI-${1000 + i + 1}`,
                                    fleetNumber: `FL-${101 + i}`,
                                    regoNumber: `ABC-${100 + i}`,
                                    vinNumber: `6T1AA81K0RA${100000 + i}`,
                                    vehicleMake: 'Isuzu',
                                    vehicleModel: 'FTR 150-260',
                                    yearVariant: '2024',
                                    assetNumber: `AST-${101 + i}`,
                                    unitSerial: `SN-MIX-${4000 + i}`,
                                    unitIMEI: `864902049102${100 + i}`,
                                    status: match.status || 'NOT_ACTIONED',
                                })),
                            };
                            setRecordData(mockRecord);
                            setJobTitle(mockRecord.jobTitle);
                            setOrderNumber(mockRecord.orderNumber);
                            setInstallLocation(mockRecord.installLocation);
                            setInstallDate(mockRecord.installDate);
                            setPackageItems(mockRecord.items);
                            setVehicles(mockRecord.vehicles);
                            return;
                        }
                    }
                } catch { }
            }
            showToast({ type: 'error', title: 'Error loading bulk record', message: 'Could not fetch record details.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecord();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Handle Unit Change for FM Install Details
    const handleUnitChange = async (val: string) => {
        if (!val) {
            setInstallDetail((prev: any) => ({ ...prev, fmUnitType: '', fmUnitCode: '', serviceCode: '', mixCode: '', visionType: undefined, cameraType: undefined }));
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

            setInstallDetail((prev: any) => ({
                ...prev,
                fmUnitType: val,
                fmUnitCode: uc[0]?.code ?? val,
            }));
        } catch { }
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
        showToast({ type: 'success', title: `Sequenced ${vehicles.length} fleet numbers` });
    };

    // Copy make/model down
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
        showToast({ type: 'success', title: `Applied ${first.vehicleMake} ${first.vehicleModel} to all vehicles` });
    };

    // Add vehicles
    const addVehicleRow = () => {
        const nextNum = vehicles.length + 1;
        setVehicles((prev) => [
            ...prev,
            {
                id: `v-new-${Date.now()}-${nextNum}`,
                fleetNumber: `FL-${String(100 + nextNum).padStart(3, '0')}`,
                regoNumber: `ABC-${100 + nextNum}`,
                vinNumber: `6T1AA81K0RA${100000 + nextNum}`,
                vehicleMake: vehicles[0]?.vehicleMake || 'Isuzu',
                vehicleModel: vehicles[0]?.vehicleModel || 'FTR',
                yearVariant: '2024',
                assetNumber: `AST-${100 + nextNum}`,
                unitSerial: '',
                unitIMEI: '',
            },
        ]);
    };

    const updateVehicleRow = (id: string, field: keyof VehicleRow, val: string) => {
        setVehicles((prev) =>
            prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
        );
    };

    // Package Items helpers
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

    // Save Updates (Update Operation)
    const handleSaveUpdate = async () => {
        if (vehicles.length === 0) {
            showToast({ type: 'error', title: 'Vehicles Required', message: 'At least one vehicle is required.' });
            return;
        }

        setSaving(true);
        setSaveProgress(20);

        const payload = {
            template: {
                customerId,
                fmCustomerId: fmCustomerId || customerId,
                type,
                status,
                orderNumber,
                jobTitle,
                assignedUserId,
                depotId: depotId || undefined,
                notes,
                installLocation,
                installer: installerId || undefined,
                installDate,
                shippingAddress,
                billingAddress,
                defaultInstallDetail: {
                    ...installDetail,
                    installLocation,
                    installer: installerId || undefined,
                    installDate,
                },
                items: packageItems,
            },
            vehicles: vehicles.map((v) => ({
                id: v.id,
                fleetNumber: v.fleetNumber.trim(),
                regoNumber: v.regoNumber.trim(),
                vinNumber: v.vinNumber.trim(),
                vehicleMake: v.vehicleMake.trim(),
                vehicleModel: v.vehicleModel.trim(),
                yearVariant: v.yearVariant.trim(),
                assetNumber: v.assetNumber.trim(),
                unitSerial: v.unitSerial?.trim() || undefined,
                unitIMEI: v.unitIMEI?.trim() || undefined,
                notes: v.notes?.trim() || undefined,
            })),
        };

        try {
            setSaveProgress(60);
            const res = await api.patch(`/fm-preinstall/bulk/${id}`, payload);
            setSaveProgress(100);

            showToast({
                type: 'success',
                title: 'Bulk Rollout Updated!',
                message: `Successfully saved changes for ${vehicles.length} vehicles in this bulk batch.`,
            });

            // Reload fresh record data and return to Read mode
            await loadRecord();
            setIsEditing(false);
        } catch (err: any) {
            console.error('Failed to update bulk rollout:', err);
            const msg = err?.response?.data?.message || err?.message || 'Failed to save updates';
            showToast({ type: 'error', title: 'Update Error', message: typeof msg === 'string' ? msg : 'Error updating bulk rollout' });
        } finally {
            setSaving(false);
        }
    };

    const packageTotalPerVehicle = packageItems.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
    const grandTotalFleetValue = packageTotalPerVehicle * vehicles.length;

    if (loading) {
        return (
            <AdminShell title="Bulk FM Preinstall">
                <div className="p-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
                    <p className="text-xs text-slate-500">Loading bulk rollout details...</p>
                </div>
            </AdminShell>
        );
    }

    if (!recordData) {
        return (
            <AdminShell title="Bulk FM Preinstall">
                <div className="p-12 text-center bg-white border rounded-xl shadow-sm space-y-4">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <h3 className="font-semibold text-slate-800 text-base">Bulk Rollout Record Not Found</h3>
                    <p className="text-xs text-slate-500">We could not find a bulk preinstallation batch matching ID: <strong>{id}</strong>.</p>
                    <Button variant="outline" size="sm" onClick={() => router.push('/fm-preinstall/bulk')}>
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                        Back to Bulk Records
                    </Button>
                </div>
            </AdminShell>
        );
    }

    const currentStatus = (recordData.status || status || 'NOT_ACTIONED').toUpperCase();
    const statusColor = STATUS_COLOR[currentStatus] || 'bg-slate-100 text-slate-700 border-slate-200';

    return (
        <AdminShell title={`Bulk Rollout: ${recordData.masterJobNumber || id}`}>
            {/* Top Navigation & Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-slate-500 hover:text-slate-800 -ml-2"
                            onClick={() => router.push('/fm-preinstall/bulk')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back to Bulk Records
                        </Button>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                            {STATUS_OPTIONS.find((s) => s.value === currentStatus)?.label || currentStatus}
                        </span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 mt-1">
                        <Truck className="w-5 h-5 text-indigo-600" />
                        {recordData.masterJobNumber || id}
                        <span className="text-slate-400 font-normal text-sm">
                            — {recordData.customer?.name || recordData.customerName || 'Fleet Customer'}
                        </span>
                    </h1>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsEditing(false);
                                    loadRecord(); // discard unsaved edits
                                }}
                                disabled={saving}
                            >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveUpdate}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? `Saving (${saveProgress}%)...` : 'Save Changes'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/job-boards/installations')}
                                className="text-xs"
                            >
                                <ExternalLink className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                Job Book
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm text-xs"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit Bulk Rollout
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-white border rounded-xl p-3 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-medium block">Fleet Size</span>
                    <div className="text-xl font-bold text-indigo-600 mt-0.5">
                        {vehicles.length} Vehicles
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-3 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-medium block">Hardware / Unit Value</span>
                    <div className="text-xl font-bold text-slate-800 mt-0.5">
                        ${packageTotalPerVehicle.toFixed(2)}
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-3 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-medium block">Total Fleet Rollout Value</span>
                    <div className="text-xl font-bold text-emerald-600 mt-0.5">
                        ${grandTotalFleetValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-3 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-medium block">Scheduled Install</span>
                    <div className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {installDate ? new Date(installDate).toLocaleDateString('en-AU') : 'TBD'}
                    </div>
                </div>
            </div>

            {/* VIEW MODE (READ) */}
            {!isEditing ? (
                <div className="space-y-5">
                    {/* Customer & Rollout Details Card */}
                    <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm">
                        <h2 className="font-semibold text-slate-800 text-sm pb-3 mb-4 border-b flex items-center justify-between">
                            <span>Fleet Rollout Particulars</span>
                            {recordData.fmCustomer?.fleetName && (
                                <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded border border-indigo-200">
                                    Fleet: {recordData.fmCustomer.fleetName}
                                </span>
                            )}
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Customer</span>
                                <span className="font-semibold text-slate-800 text-sm">
                                    {recordData.customer?.name || recordData.customerName}
                                </span>
                                {recordData.customer?.customerNumber && (
                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                        #{recordData.customer.customerNumber}
                                    </div>
                                )}
                            </div>

                            <div>
                                <span className="text-slate-400 block text-[11px]">Rollout Title</span>
                                <span className="font-medium text-slate-700 text-xs">
                                    {recordData.jobTitle || 'Fleet Telematics Installation'}
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-400 block text-[11px]">PO / Order Number</span>
                                <span className="font-mono font-medium text-slate-800">
                                    {recordData.orderNumber || '—'}
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-400 block text-[11px]">Install Type</span>
                                <span className="font-medium text-slate-800">
                                    {INSTALL_TYPES.find((t) => t.value === recordData.type)?.label || recordData.type}
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-400 block text-[11px]">Installation Location</span>
                                <span className="font-medium text-slate-700 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {recordData.installLocation || 'Customer Fleet Yard'}
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-400 block text-[11px]">Assigned Technician</span>
                                <span className="font-medium text-slate-700">
                                    {recordData.installerName || 'Unassigned Field Tech'}
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-400 block text-[11px]">Created Date</span>
                                <span className="text-slate-600">
                                    {new Date(recordData.createdAt).toLocaleDateString('en-AU')}
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-400 block text-[11px]">Status</span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${statusColor}`}>
                                    {STATUS_OPTIONS.find((s) => s.value === currentStatus)?.label || currentStatus}
                                </span>
                            </div>
                        </div>

                        {recordData.notes && (
                            <div className="mt-4 pt-3 border-t text-xs">
                                <span className="text-slate-400 block text-[11px] mb-0.5">Job Notes & Scope</span>
                                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    {recordData.notes}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Addresses Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border rounded-xl p-4 shadow-sm text-xs">
                            <h3 className="font-semibold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                Delivery / Shipping Address
                            </h3>
                            <div className="text-slate-700 space-y-0.5">
                                <div className="font-medium">{shippingAddress.name || recordData.customer?.name}</div>
                                <div>{shippingAddress.address1 || '42 Logistics Parkway'}</div>
                                {shippingAddress.address2 && <div>{shippingAddress.address2}</div>}
                                <div>
                                    {[shippingAddress.city, shippingAddress.state, shippingAddress.postcode].filter(Boolean).join(', ') || 'Eastern Creek, NSW 2766'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border rounded-xl p-4 shadow-sm text-xs">
                            <h3 className="font-semibold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                Statement / Billing Account
                            </h3>
                            <div className="text-slate-700 space-y-0.5">
                                <div className="font-medium">{billingAddress.name || recordData.customer?.name}</div>
                                <div>{billingAddress.address1 || shippingAddress.address1 || '42 Logistics Parkway'}</div>
                                <div>
                                    {[billingAddress.city, billingAddress.state, billingAddress.postcode].filter(Boolean).join(', ') || 'Eastern Creek, NSW 2766'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Telematics & FM Details Configuration */}
                    <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm text-xs">
                        <h2 className="font-semibold text-slate-800 text-sm pb-3 mb-3 border-b flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-indigo-600" />
                            Hardware & Telematics Configuration
                        </h2>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                            <div className="bg-slate-50 p-2.5 rounded-lg border">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">Base Unit</span>
                                <span className="font-mono font-semibold text-slate-800 text-xs mt-0.5 block">
                                    {installDetail.fmUnitType || 'MIX4000'}
                                </span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">Unit Code</span>
                                <span className="font-mono font-semibold text-slate-800 text-xs mt-0.5 block">
                                    {installDetail.fmUnitCode || 'MIX4000'}
                                </span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">Service Code</span>
                                <span className="font-mono font-semibold text-indigo-600 text-xs mt-0.5 block">
                                    {installDetail.serviceCode || 'MIX4000-BASE'}
                                </span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">MIX Code</span>
                                <span className="font-mono font-semibold text-indigo-600 text-xs mt-0.5 block">
                                    {installDetail.mixCode || '1_0_1_0_2_0'}
                                </span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">Vision System</span>
                                <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                                    {installDetail.visionType || 'None'}
                                </span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">Cameras</span>
                                <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                                    {installDetail.cameraCount ? `${installDetail.cameraCount} Cameras` : '2 Cameras'}
                                </span>
                            </div>
                        </div>

                        {/* Active Options Badges */}
                        <div className="mt-3 flex flex-wrap gap-1.5 pt-2">
                            {installDetail.modem4G && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 text-[11px] font-medium">4G Modem</span>}
                            {installDetail.mixSim1 && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 text-[11px] font-medium">MIX SIM 1</span>}
                            {installDetail.mixSim2 && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 text-[11px] font-medium">MIX SIM 2 (Vision)</span>}
                            {installDetail.aiOption && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 text-[11px] font-medium">AI Capability</span>}
                            {installDetail.tmaOption && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 text-[11px] font-medium">TMA Option</span>}
                            {installDetail.rimOption && <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded border border-teal-200 text-[11px] font-medium">RIM Module</span>}
                            {installDetail.wiFi && <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border text-[11px] font-medium">Wi-Fi Hotspot</span>}
                            {installDetail.safeGuard && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 text-[11px] font-medium">Safeguard</span>}
                        </div>
                    </div>

                    {/* Hardware Package Line Items Table */}
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden text-xs">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                Hardware Package Line Items (Applied per Vehicle)
                            </h3>
                            <span className="text-xs font-semibold text-slate-800">
                                Unit Cost: ${packageTotalPerVehicle.toFixed(2)} | Fleet Total: ${grandTotalFleetValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b text-slate-600 font-semibold text-[11px]">
                                    <th className="py-2.5 px-4">Part #</th>
                                    <th className="py-2.5 px-4">Description</th>
                                    <th className="py-2.5 px-4 text-center">Qty / Veh</th>
                                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                                    <th className="py-2.5 px-4 text-right">Disc %</th>
                                    <th className="py-2.5 px-4 text-right">Per Vehicle</th>
                                    <th className="py-2.5 px-4 text-right">Fleet Total ({vehicles.length}x)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {packageItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/60">
                                        <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{item.partNumber}</td>
                                        <td className="py-2.5 px-4 text-slate-700">{item.description}</td>
                                        <td className="py-2.5 px-4 text-center">{item.quantity}</td>
                                        <td className="py-2.5 px-4 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                                        <td className="py-2.5 px-4 text-right">{item.discountPct ? `${item.discountPct}%` : '0%'}</td>
                                        <td className="py-2.5 px-4 text-right font-medium text-slate-800">${Number(item.lineTotal).toFixed(2)}</td>
                                        <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                                            ${(Number(item.lineTotal) * vehicles.length).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Fleet Vehicles Rollout Table */}
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden text-xs">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-indigo-600" />
                                    Fleet Rollout Vehicles ({vehicles.length} Units)
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Individual preinstallation records generated for this rollout. Click any row to view or edit the single sheet.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsEditing(true)}
                                className="text-xs h-8"
                            >
                                <Edit3 className="w-3.5 h-3.5 mr-1" />
                                Edit Vehicles
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b text-slate-600 font-semibold text-[11px]">
                                        <th className="py-2.5 px-3">#</th>
                                        <th className="py-2.5 px-3">Preinstall #</th>
                                        <th className="py-2.5 px-3">Fleet #</th>
                                        <th className="py-2.5 px-3">Rego #</th>
                                        <th className="py-2.5 px-3">Make & Model</th>
                                        <th className="py-2.5 px-3">VIN</th>
                                        <th className="py-2.5 px-3">Asset #</th>
                                        <th className="py-2.5 px-3">Unit Serial</th>
                                        <th className="py-2.5 px-3">IMEI</th>
                                        <th className="py-2.5 px-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vehicles.map((v, idx) => (
                                        <tr
                                            key={v.id || idx}
                                            className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/fm-preinstall/${v.id}`)}
                                        >
                                            <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                                            <td className="py-2 px-3 font-mono font-semibold text-indigo-600">
                                                {v.preinstallNo || `PI-${idx + 1}`}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-slate-800">{v.fleetNumber}</td>
                                            <td className="py-2 px-3 font-medium text-slate-700">{v.regoNumber}</td>
                                            <td className="py-2 px-3 text-slate-600">{v.vehicleMake} {v.vehicleModel}</td>
                                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{v.vinNumber}</td>
                                            <td className="py-2 px-3 font-mono text-slate-600">{v.assetNumber || '—'}</td>
                                            <td className="py-2 px-3 font-mono text-slate-600">{v.unitSerial || '—'}</td>
                                            <td className="py-2 px-3 font-mono text-slate-600">{v.unitIMEI || '—'}</td>
                                            <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-2 text-indigo-600 hover:text-indigo-800 text-[11px]"
                                                    onClick={() => router.push(`/fm-preinstall/${v.id}`)}
                                                >
                                                    View Preinstall
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* EDIT MODE (UPDATE) */
                <div className="space-y-5">
                    {/* Customer & Master Job Header */}
                    <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b">
                            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                Edit Customer & Fleet Job Details
                            </h2>
                            {fmFleetName && (
                                <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2.5 py-1 rounded-md border border-indigo-200">
                                    FM Fleet: <strong>{fmFleetName}</strong>
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs">
                            <div className="sm:col-span-2 lg:col-span-4">
                                <label className="text-slate-600 font-medium block mb-1">
                                    Customer <span className="text-rose-500">*</span>
                                </label>
                                <CustomerSearchSelect
                                    value={selectedCustomer || customerId}
                                    onSelect={(cust) => {
                                        setSelectedCustomer(cust);
                                        setCustomerId(cust.id);
                                    }}
                                    label=""
                                />
                            </div>

                            <div className="sm:col-span-2 lg:col-span-4">
                                <label className="text-slate-600 font-medium block mb-1">Fleet Job Title</label>
                                <Input
                                    placeholder="e.g. 20-Vehicle Rollout"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                />
                            </div>

                            <div className="sm:col-span-1 lg:col-span-2">
                                <label className="text-slate-600 font-medium block mb-1">Install Type</label>
                                <Select
                                    value={type}
                                    onChange={(val: any) => setType(val)}
                                    options={INSTALL_TYPES}
                                />
                            </div>

                            <div className="sm:col-span-1 lg:col-span-2">
                                <label className="text-slate-600 font-medium block mb-1">Status</label>
                                <Select
                                    value={status}
                                    onChange={(val: any) => setStatus(val)}
                                    options={STATUS_OPTIONS}
                                />
                            </div>

                            <div className="sm:col-span-1 lg:col-span-3">
                                <label className="text-slate-600 font-medium block mb-1">Order / PO Number</label>
                                <Input
                                    placeholder="e.g. PO-89021"
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
                                />
                            </div>

                            <div className="sm:col-span-1 lg:col-span-3">
                                <label className="text-slate-600 font-medium block mb-1">Target Install Date</label>
                                <Input
                                    type="date"
                                    value={installDate}
                                    onChange={(e) => setInstallDate(e.target.value)}
                                />
                            </div>

                            <div className="sm:col-span-1 lg:col-span-3">
                                <label className="text-slate-600 font-medium block mb-1">Install Location</label>
                                <Input
                                    placeholder="e.g. Eastern Creek Yard"
                                    value={installLocation}
                                    onChange={(e) => setInstallLocation(e.target.value)}
                                />
                            </div>

                            <div className="sm:col-span-1 lg:col-span-3">
                                <label className="text-slate-600 font-medium block mb-1">Technician / Installer</label>
                                <Select
                                    value={installerId}
                                    onChange={(val: any) => setInstallerId(val)}
                                    options={[
                                        { label: 'Select Installer', value: '' },
                                        ...users.map((u) => ({
                                            label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                                            value: u.id,
                                        })),
                                    ]}
                                />
                            </div>

                            <div className="sm:col-span-2 lg:col-span-12">
                                <label className="text-slate-600 font-medium block mb-1">Job Notes</label>
                                <Input
                                    placeholder="Rollout instructions, depot access notes, etc."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Addresses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border rounded-xl p-4 shadow-sm text-xs space-y-2">
                            <h3 className="font-semibold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                Delivery / Shipping Address
                            </h3>
                            <div>
                                <label className="text-slate-500 text-[11px] block">Contact / Facility Name</label>
                                <Input
                                    value={shippingAddress.name}
                                    onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-slate-500 text-[11px] block">Address Line 1</label>
                                <Input
                                    value={shippingAddress.address1}
                                    onChange={(e) => setShippingAddress({ ...shippingAddress, address1: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-slate-500 text-[11px] block">City</label>
                                    <Input
                                        value={shippingAddress.city}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-500 text-[11px] block">State</label>
                                    <Input
                                        value={shippingAddress.state}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-500 text-[11px] block">Postcode</label>
                                    <Input
                                        value={shippingAddress.postcode}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, postcode: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border rounded-xl p-4 shadow-sm text-xs space-y-2">
                            <h3 className="font-semibold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                Statement / Billing Account
                            </h3>
                            <div>
                                <label className="text-slate-500 text-[11px] block">Billing Name</label>
                                <Input
                                    value={billingAddress.name}
                                    onChange={(e) => setBillingAddress({ ...billingAddress, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-slate-500 text-[11px] block">Address Line 1</label>
                                <Input
                                    value={billingAddress.address1}
                                    onChange={(e) => setBillingAddress({ ...billingAddress, address1: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-slate-500 text-[11px] block">City</label>
                                    <Input
                                        value={billingAddress.city}
                                        onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-500 text-[11px] block">State</label>
                                    <Input
                                        value={billingAddress.state}
                                        onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-500 text-[11px] block">Postcode</label>
                                    <Input
                                        value={billingAddress.postcode}
                                        onChange={(e) => setBillingAddress({ ...billingAddress, postcode: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hardware Configuration Template Details */}
                    <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm text-xs">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b">
                            <div>
                                <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    <Wrench className="w-4 h-4 text-indigo-600" />
                                    FM Telematics Hardware Template
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    This telematics hardware configuration is applied to all vehicles in this batch.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <label className="text-slate-600 font-medium block mb-1">Base Unit</label>
                                <Select
                                    value={installDetail.fmUnitType}
                                    onChange={(val: any) => handleUnitChange(val)}
                                    options={baseUnits.map((u) => ({ label: `${u.code} – ${u.label}`, value: u.code }))}
                                />
                            </div>

                            <div>
                                <label className="text-slate-600 font-medium block mb-1">Unit Code</label>
                                <Select
                                    value={installDetail.fmUnitCode}
                                    onChange={(val: any) => setInstallDetail({ ...installDetail, fmUnitCode: val })}
                                    options={unitCodes.map((c) => ({ label: `${c.code} – ${c.label}`, value: c.code }))}
                                />
                            </div>

                            <div>
                                <label className="text-slate-600 font-medium block mb-1">Vision System</label>
                                <Select
                                    value={installDetail.visionType || ''}
                                    onChange={(val: any) => setInstallDetail({ ...installDetail, visionType: val || undefined })}
                                    options={[
                                        { label: 'None', value: '' },
                                        ...visionList.map((v) => ({ label: `${v.code} – ${v.label}`, value: v.code })),
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="text-slate-600 font-medium block mb-1">Camera Count</label>
                                <Select
                                    value={String(installDetail.cameraCount || 2)}
                                    onChange={(val: any) => setInstallDetail({ ...installDetail, cameraCount: Number(val) })}
                                    options={[
                                        { label: '1 Camera', value: '1' },
                                        { label: '2 Cameras', value: '2' },
                                        { label: '3 Cameras', value: '3' },
                                        { label: '4 Cameras', value: '4' },
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Additional Options */}
                        <div className="mt-4 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={installDetail.modem4G ?? true}
                                    onChange={(e) => setInstallDetail({ ...installDetail, modem4G: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-slate-700">4G Modem</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={installDetail.mixSim1 ?? false}
                                    onChange={(e) => setInstallDetail({ ...installDetail, mixSim1: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-slate-700">MIX SIM 1</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={installDetail.aiOption ?? false}
                                    onChange={(e) => setInstallDetail({ ...installDetail, aiOption: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-slate-700">AI Option</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={installDetail.tmaOption ?? false}
                                    onChange={(e) => setInstallDetail({ ...installDetail, tmaOption: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-slate-700">TMA Option</span>
                            </label>
                        </div>
                    </div>

                    {/* Hardware Package Items Editor */}
                    <div className="bg-white border rounded-xl shadow-sm p-4 sm:p-5 text-xs">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                    Hardware Package Line Items
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Edit quantities, prices, or add items to each vehicle rollout.
                                </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={addPackageItem} className="text-xs h-8">
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Add Hardware Item
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b text-slate-600 font-semibold text-[11px]">
                                        <th className="py-2 px-3">Part #</th>
                                        <th className="py-2 px-3">Description</th>
                                        <th className="py-2 px-3 w-20 text-center">Qty</th>
                                        <th className="py-2 px-3 w-28 text-right">Unit Price</th>
                                        <th className="py-2 px-3 w-24 text-right">Disc %</th>
                                        <th className="py-2 px-3 w-28 text-right">Total</th>
                                        <th className="py-2 px-3 w-16 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {packageItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="py-2 px-3 font-mono font-medium">{item.partNumber}</td>
                                            <td className="py-2 px-3">
                                                <Input
                                                    value={item.description}
                                                    onChange={(e) => updatePackageItem(idx, { description: e.target.value })}
                                                    className="h-7 text-xs"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updatePackageItem(idx, { quantity: Number(e.target.value) })}
                                                    className="h-7 text-xs text-center"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <Input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updatePackageItem(idx, { unitPrice: Number(e.target.value) })}
                                                    className="h-7 text-xs text-right"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <Input
                                                    type="number"
                                                    value={item.discountPct || 0}
                                                    onChange={(e) => updatePackageItem(idx, { discountPct: Number(e.target.value) })}
                                                    className="h-7 text-xs text-right"
                                                />
                                            </td>
                                            <td className="py-2 px-3 text-right font-semibold text-slate-800">
                                                ${Number(item.lineTotal).toFixed(2)}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removePackageItem(idx)}
                                                    className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Vehicles Grid Editor */}
                    <div className="bg-white border rounded-xl shadow-sm p-4 sm:p-5 text-xs">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 mb-4 border-b">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-indigo-600" />
                                    Rollout Vehicles Grid ({vehicles.length} Units)
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Update fleet numbers, registration, serials, and IMEIs for this rollout.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Button size="sm" variant="outline" onClick={() => autoSequenceFleetNumbers()} className="text-xs h-8">
                                    Sequence Fleet #s
                                </Button>
                                <Button size="sm" variant="outline" onClick={copyMakeModelDown} className="text-xs h-8">
                                    <Copy className="w-3.5 h-3.5 mr-1" />
                                    Copy Make/Model
                                </Button>
                                <Button size="sm" onClick={addVehicleRow} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8">
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Add Vehicle
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b text-slate-600 font-semibold text-[11px]">
                                        <th className="py-2 px-2 w-10">#</th>
                                        <th className="py-2 px-2 w-28">Fleet #</th>
                                        <th className="py-2 px-2 w-28">Rego #</th>
                                        <th className="py-2 px-2 w-44">Make</th>
                                        <th className="py-2 px-2 w-44">Model</th>
                                        <th className="py-2 px-2 w-48">VIN</th>
                                        <th className="py-2 px-2 w-32">Unit Serial</th>
                                        <th className="py-2 px-2 w-36">Unit IMEI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vehicles.map((v, idx) => (
                                        <tr key={v.id || idx} className="hover:bg-slate-50/50">
                                            <td className="py-1.5 px-2 font-mono text-[10px] text-slate-400">{idx + 1}</td>
                                            <td className="py-1.5 px-2">
                                                <Input
                                                    value={v.fleetNumber}
                                                    onChange={(e) => updateVehicleRow(v.id, 'fleetNumber', e.target.value)}
                                                    className="h-7 text-xs font-semibold"
                                                />
                                            </td>
                                            <td className="py-1.5 px-2">
                                                <Input
                                                    value={v.regoNumber}
                                                    onChange={(e) => updateVehicleRow(v.id, 'regoNumber', e.target.value)}
                                                    className="h-7 text-xs uppercase"
                                                />
                                            </td>
                                            <td className="py-1.5 px-2">
                                                <Input
                                                    value={v.vehicleMake}
                                                    onChange={(e) => updateVehicleRow(v.id, 'vehicleMake', e.target.value)}
                                                    className="h-7 text-xs"
                                                />
                                            </td>
                                            <td className="py-1.5 px-2">
                                                <Input
                                                    value={v.vehicleModel}
                                                    onChange={(e) => updateVehicleRow(v.id, 'vehicleModel', e.target.value)}
                                                    className="h-7 text-xs"
                                                />
                                            </td>
                                            <td className="py-1.5 px-2">
                                                <Input
                                                    value={v.vinNumber}
                                                    onChange={(e) => updateVehicleRow(v.id, 'vinNumber', e.target.value)}
                                                    className="h-7 text-xs font-mono text-[11px]"
                                                />
                                            </td>
                                            <td className="py-1.5 px-2">
                                                <Input
                                                    value={v.unitSerial || ''}
                                                    onChange={(e) => updateVehicleRow(v.id, 'unitSerial', e.target.value)}
                                                    placeholder="Serial #"
                                                    className="h-7 text-xs font-mono"
                                                />
                                            </td>
                                            <td className="py-1.5 px-2">
                                                <Input
                                                    value={v.unitIMEI || ''}
                                                    onChange={(e) => updateVehicleRow(v.id, 'unitIMEI', e.target.value)}
                                                    placeholder="IMEI"
                                                    className="h-7 text-xs font-mono"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Save Action Bar */}
                    <div className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                            Cancel Edits
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveUpdate}
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? `Saving (${saveProgress}%)...` : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            )}
        </AdminShell>
    );
}

export default function BulkFMPreinstallDetailPage() {
    return (
        <React.Suspense fallback={
            <AdminShell title="Bulk FM Preinstall">
                <div className="p-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
                    <p className="text-xs text-slate-500">Loading rollout details...</p>
                </div>
            </AdminShell>
        }>
            <BulkFMPreinstallDetailContent />
        </React.Suspense>
    );
}
