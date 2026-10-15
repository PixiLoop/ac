import React, { useState } from 'react';
import { ChecklistTemplate, ChecklistTemplateSection, ChecklistTemplateItem, HardwareModel } from '../types/installation';
import {
    CheckSquare,
    Plus,
    Trash2,
    X,
    Sparkles,
    Layers,
    HelpCircle,
    Check,
    AlertCircle,
    Cpu,
    Camera,
    Radio,
    Navigation,
    ShieldCheck,
    Sliders,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

interface CreateChecklistTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (templateId: string) => void;
}

interface StarterPreset {
    name: string;
    hardwareModel: HardwareModel;
    hardwareType: string;
    category: string;
    version: string;
    description: string;
    icon: any;
    sections: {
        title: string;
        items: { title: string; description?: string; isRequired: boolean }[];
    }[];
}

const STARTER_PRESETS: StarterPreset[] = [
    {
        name: 'MIX4000 Installation Checklist',
        hardwareModel: 'MIX4000',
        hardwareType: 'Telematics Gateway',
        category: 'Telematics Unit',
        version: 'v1.0',
        description: 'Comprehensive installation, CAN-Bus integration, diagnostic checks and supervisor signoff for MIX4000 units.',
        icon: Cpu,
        sections: [
            {
                title: 'Device Setup',
                items: [
                    { title: 'Mount unit securely in cabin away from heat & airbags', description: 'Mount behind lower dash fascia using heavy-duty bracket.', isRequired: true },
                    { title: 'Connect constant power (12V/24V) with inline 3A fuse', description: 'Solder and heat-shrink terminal connection.', isRequired: true },
                    { title: 'Connect true ignition sense line', description: 'Measure voltage drop between ACC and IGN states.', isRequired: true },
                    { title: 'Secure wiring loom with nylon ties', description: 'Route along factory wiring troughs.', isRequired: false },
                ],
            },
            {
                title: 'Testing',
                items: [
                    { title: 'Power-on diagnostic LED sequence check', description: 'Confirm solid green status LED within 45s.', isRequired: true },
                    { title: 'Cellular communication packet transmission test', description: 'Verify gateway ACK in dispatch terminal.', isRequired: true },
                    { title: 'GPS lock & satellite fix verification', description: 'Ensure minimum 8 satellite locks with HDOP < 1.8.', isRequired: true },
                ],
            },
            {
                title: 'Verification',
                items: [
                    { title: 'Scan and match IMEI & Serial Number barcode', description: 'Verify match with installation work order.', isRequired: true },
                    { title: 'Confirm vehicle odometer calibration', description: 'Cross-check against vehicle digital odometer reading.', isRequired: true },
                    { title: 'Apply tamper-evident security seal on loom', description: 'Document seal number in installation notes.', isRequired: false },
                ],
            },
            {
                title: 'Installation Confirmation',
                items: [
                    { title: 'Technician cabin cleanup & cosmetic inspection', description: 'Ensure driver area is left completely clean.', isRequired: true },
                    { title: 'Customer representative physical signoff', description: 'Authorized contact inspects and approves work.', isRequired: true },
                ],
            },
        ],
    },
    {
        name: 'FM3306 CAN-Bus Tracker Checklist',
        hardwareModel: 'FM3306',
        hardwareType: 'CAN-Bus Telematics Terminal',
        category: 'Telematics Unit',
        version: 'v1.0',
        description: 'CAN-Bus vehicle telemetry wiring, baud rate auto-negotiation, and live telemetry validation.',
        icon: Sliders,
        sections: [
            {
                title: 'Hardware Mounting & Power',
                items: [
                    { title: 'Mount FM3306 unit securely in dry area', description: 'Ensure unit is insulated against vibration and moisture.', isRequired: true },
                    { title: 'Tap CAN High and CAN Low wires into vehicle CAN bus', description: 'Use non-intrusive contactless CAN click if available.', isRequired: true },
                    { title: 'Connect vehicle ground to chassis stud', description: 'Clean contact area and use star washer.', isRequired: true },
                ],
            },
            {
                title: 'CAN Telemetry Testing',
                items: [
                    { title: 'Verify CAN bus synchronization and baud rate', description: 'Check green CAN LED pulses indicating telemetry flow.', isRequired: true },
                    { title: 'Confirm engine RPM & speed telemetry in live feed', description: 'Run engine at idle and confirm RPM reporting.', isRequired: true },
                    { title: 'Confirm fuel level and odometer telemetry packets', description: 'Validate reading against dashboard gauge.', isRequired: true },
                ],
            },
            {
                title: 'Signoff',
                items: [
                    { title: 'Record CAN profile version and firmware ID', description: 'Enter into commissioning tablet.', isRequired: true },
                    { title: 'Installer final verification signoff', description: 'Signed by certified installer.', isRequired: true },
                ],
            },
        ],
    },
    {
        name: 'Dual-Facing AI Dashcam Checklist',
        hardwareModel: 'HD Camera',
        hardwareType: 'Dual-Lens AI Dashcam',
        category: 'Camera & Video',
        version: 'v1.0',
        description: 'Road and driver video telematics setup, windshield angling, ADAS calibration, and cloud sync.',
        icon: Camera,
        sections: [
            {
                title: 'Camera Mount & Loom',
                items: [
                    { title: 'Clean windshield surface with isopropyl alcohol', description: 'Mount camera behind rearview mirror without blocking driver vision.', isRequired: true },
                    { title: 'Affix 3M high-temperature VHB adhesive bracket', description: 'Apply firm pressure for 30 seconds.', isRequired: true },
                    { title: 'Tuck power loom behind A-pillar trim', description: 'Ensure cable does not cross side curtain airbag deployment path.', isRequired: true },
                ],
            },
            {
                title: 'Camera Calibration & Testing',
                items: [
                    { title: 'Level road-facing lens with horizon guide', description: 'Horizon line at 50% screen height via installer preview app.', isRequired: true },
                    { title: 'Calibrate driver-facing lens for face detection', description: 'Ensure full face & steering wheel in frame.', isRequired: true },
                    { title: 'Format high-endurance SD card (V30/U3)', description: 'Initialize card through camera system menu.', isRequired: true },
                    { title: 'Trigger manual panic event and verify video upload', description: 'Confirm 20-second video clip is visible in cloud portal.', isRequired: true },
                ],
            },
            {
                title: 'Confirmation',
                items: [
                    { title: 'Remove protective lens film covers', description: 'Wipe lens clean with microfiber cloth.', isRequired: true },
                    { title: 'Customer supervisor camera viewing demonstration', description: 'Show authorized client live feed playback.', isRequired: true },
                ],
            },
        ],
    },
    {
        name: 'M2M SIM Connectivity Checklist',
        hardwareModel: 'SIM',
        hardwareType: 'M2M Cellular SIM Card',
        category: 'Connectivity',
        version: 'v1.0',
        description: 'Multi-carrier SIM provisioning, APN verification, carrier lock testing, and cellular signal benchmarking.',
        icon: Radio,
        sections: [
            {
                title: 'SIM Installation',
                items: [
                    { title: 'Insert Micro-SIM into device slot until click', description: 'Ensure correct notch orientation.', isRequired: true },
                    { title: 'Fasten SIM protective rubber cover or screw flap', description: 'Ensure IP67 moisture seal is seated.', isRequired: true },
                ],
            },
            {
                title: 'SIM Verification',
                items: [
                    { title: 'Confirm network registration on 4G/LTE band', description: 'Verify RSRP signal quality is better than -95 dBm.', isRequired: true },
                    { title: 'Verify ICCID matches job manifest', description: 'Scan 19-digit ICCID barcode into device record.', isRequired: true },
                    { title: 'Validate private APN IP address assignment', description: 'Confirm static/dynamic APN IP received from carrier gateway.', isRequired: true },
                ],
            },
        ],
    },
    {
        name: 'External GPS Antenna Checklist',
        hardwareModel: 'GPS Unit',
        hardwareType: 'External GNSS Antenna',
        category: 'Sensors',
        version: 'v1.0',
        description: 'Active GNSS antenna placement, sky clearance, FAKRA coaxial termination, and satellite fix benchmarking.',
        icon: Navigation,
        sections: [
            {
                title: 'Antenna Mounting',
                items: [
                    { title: 'Mount GPS antenna with clear sky view', description: 'Under plastic dash deck or exterior roof with magnetic/adhesive base.', isRequired: true },
                    { title: 'Ensure antenna is mounted horizontal and face-up', description: 'Must have at least 120-degree unobstructed upward view cone.', isRequired: true },
                    { title: 'Tighten SMA/FAKRA coaxial connector firmly', description: 'Finger-tight plus 1/4 turn, or audible Fakra snap.', isRequired: true },
                ],
            },
            {
                title: 'Signal Acquisition',
                items: [
                    { title: 'Acquire 3D GNSS fix in under 120 seconds', description: 'Minimum 8 active satellite locks (GPS + GLONASS/Galileo).', isRequired: true },
                    { title: 'Verify HDOP (Horizontal Dilution of Precision) < 1.8', description: 'Check accuracy metric on commissioning interface.', isRequired: true },
                    { title: 'Confirm map pin accurately reflects depot bay coordinates', description: 'Cross-check latitude/longitude against physical address.', isRequired: true },
                ],
            },
        ],
    },
    {
        name: 'Driver ID Keypad / Dallas Key Checklist',
        hardwareModel: 'Driver ID Keypad',
        hardwareType: 'Driver Authentication Module',
        category: 'Accessories',
        version: 'v1.0',
        description: 'Driver identification buzzer, 1-Wire Dallas key reader or numeric keypad mounting and buzzer test.',
        icon: ShieldCheck,
        sections: [
            {
                title: 'Hardware Setup',
                items: [
                    { title: 'Mount keypad or RFID reader within easy driver reach', description: 'Beside steering column or centre console using trim screws.', isRequired: true },
                    { title: 'Wire 1-Wire data and LED indicator to telematics unit', description: 'Ensure firm solder connection on green/yellow loom.', isRequired: true },
                ],
            },
            {
                title: 'Functional Testing',
                items: [
                    { title: 'Test starter-interrupt relay lockout without auth', description: 'Confirm vehicle will not crank until valid ID is presented.', isRequired: true },
                    { title: 'Tap authorized RFID fob and confirm authorization chirp', description: 'Buzzer chirps once and green indicator illuminates.', isRequired: true },
                    { title: 'Confirm driver ID tag reports in dispatch terminal', description: 'Check server log for driver tag match.', isRequired: true },
                ],
            },
        ],
    },
];

const PREDEFINED_MODELS: HardwareModel[] = [
    'MIX4000',
    'FM3306',
    'HD Camera',
    'Standard Camera',
    'Base Unit',
    'SIM',
    'GPS Unit',
    'CAN Bus Interface',
    'Driver ID Keypad',
];

const CATEGORIES = [
    'Telematics Unit',
    'Camera & Video',
    'Connectivity',
    'Sensors',
    'Core Unit',
    'Accessories',
];


const CATEGORY_TO_ENUM: Record<string, string> = {
    'Telematics Unit': 'TELEMATICS_UNIT',
    'Camera & Video': 'CAMERA_AND_VIDEO',
    'Connectivity': 'CONNECTIVITY',
    'Sensors': 'SENSORS',
    'Core Unit': 'CORE_UNIT',
    'Accessories': 'ACCESSORIES',
};

const STATUS_TO_ENUM: Record<string, string> = {
    'Active': 'ACTIVE',
    'Draft': 'DRAFT',
    'Archived': 'ARCHIVED',
};

export const CreateChecklistTemplateModal: React.FC<CreateChecklistTemplateModalProps> = ({
    isOpen,
    onClose,
    onCreated,
}) => {
    const { createChecklistTemplate, setSelectedTemplateId } = useOperations();

    // Selected Preset or custom
    const [activePresetIndex, setActivePresetIndex] = useState<number | null>(0);

    // Form Fields
    const [name, setName] = useState<string>(STARTER_PRESETS[0].name);
    const [hardwareModel, setHardwareModel] = useState<string>(STARTER_PRESETS[0].hardwareModel);
    const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
    const [customModelInput, setCustomModelInput] = useState<string>('');
    const [hardwareType, setHardwareType] = useState<string>(STARTER_PRESETS[0].hardwareType);
    const [category, setCategory] = useState<string>(STARTER_PRESETS[0].category);
    const [version, setVersion] = useState<string>(STARTER_PRESETS[0].version);
    const [status, setStatus] = useState<'Active' | 'Draft'>('Active');
    const [description, setDescription] = useState<string>(STARTER_PRESETS[0].description);

    // Sections & Items builder
    const [sections, setSections] = useState<
        {
            id: string;
            title: string;
            items: { id: string; title: string; description?: string; isRequired: boolean }[];
        }[]
    >(
        STARTER_PRESETS[0].sections.map((sec, secIdx) => ({
            id: `sec-preset-${secIdx}`,
            title: sec.title,
            items: sec.items.map((it, itIdx) => ({
                id: `it-preset-${secIdx}-${itIdx}`,
                title: it.title,
                description: it.description,
                isRequired: it.isRequired,
            })),
        }))
    );

    // Helper state for adding a new section in builder
    const [newSectionTitle, setNewSectionTitle] = useState<string>('');
    const [showAddSectionInput, setShowAddSectionInput] = useState<boolean>(false);

    // Helper state for adding an item into a section
    const [addingItemToSectionId, setAddingItemToSectionId] = useState<string | null>(null);
    const [newItemTitle, setNewItemTitle] = useState<string>('');
    const [newItemDesc, setNewItemDesc] = useState<string>('');
    const [newItemRequired, setNewItemRequired] = useState<boolean>(true);

    // Submission & Error
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    // Apply a starter preset
    const handleSelectPreset = (idx: number | null) => {
        setActivePresetIndex(idx);
        if (idx !== null) {
            const preset = STARTER_PRESETS[idx];
            setName(preset.name);
            setHardwareModel(preset.hardwareModel);
            setIsCustomModel(false);
            setCustomModelInput('');
            setHardwareType(preset.hardwareType);
            setCategory(preset.category);
            setVersion(preset.version);
            setDescription(preset.description);
            setSections(
                preset.sections.map((sec, sIdx) => ({
                    id: `sec-preset-${sIdx}-${Date.now()}`,
                    title: sec.title,
                    items: sec.items.map((it, iIdx) => ({
                        id: `it-preset-${sIdx}-${iIdx}-${Date.now()}`,
                        title: it.title,
                        description: it.description,
                        isRequired: it.isRequired,
                    })),
                }))
            );
        } else {
            // Blank custom template
            setName('');
            setHardwareModel(PREDEFINED_MODELS[0]);
            setIsCustomModel(false);
            setHardwareType('');
            setCategory(CATEGORIES[0]);
            setVersion('v1.0');
            setDescription('');
            setSections([
                {
                    id: `sec-custom-1-${Date.now()}`,
                    title: 'Device Setup',
                    items: [],
                },
                {
                    id: `sec-custom-2-${Date.now()}`,
                    title: 'Testing & Verification',
                    items: [],
                },
                {
                    id: `sec-custom-3-${Date.now()}`,
                    title: 'Installation Sign-off',
                    items: [],
                },
            ]);
        }
    };

    // Add section
    const handleAddSection = () => {
        if (!newSectionTitle.trim()) return;
        const newSec = {
            id: `sec-new-${Date.now()}`,
            title: newSectionTitle.trim(),
            items: [],
        };
        setSections([...sections, newSec]);
        setNewSectionTitle('');
        setShowAddSectionInput(false);
    };

    // Remove section
    const handleRemoveSection = (sectionId: string) => {
        setSections(sections.filter((s) => s.id !== sectionId));
    };

    // Add item to section
    const handleAddItemToSection = (sectionId: string) => {
        if (!newItemTitle.trim()) return;
        setSections((prev) =>
            prev.map((s) => {
                if (s.id !== sectionId) return s;
                return {
                    ...s,
                    items: [
                        ...s.items,
                        {
                            id: `it-new-${Date.now()}`,
                            title: newItemTitle.trim(),
                            description: newItemDesc.trim() || undefined,
                            isRequired: newItemRequired,
                        },
                    ],
                };
            })
        );
        setNewItemTitle('');
        setNewItemDesc('');
        setNewItemRequired(true);
        setAddingItemToSectionId(null);
    };

    // Remove item
    const handleRemoveItem = (sectionId: string, itemId: string) => {
        setSections((prev) =>
            prev.map((s) => {
                if (s.id !== sectionId) return s;
                return {
                    ...s,
                    items: s.items.filter((i) => i.id !== itemId),
                };
            })
        );
    };

    // Toggle item requirement
    const handleToggleItemRequired = (sectionId: string, itemId: string) => {
        setSections((prev) =>
            prev.map((s) => {
                if (s.id !== sectionId) return s;
                return {
                    ...s,
                    items: s.items.map((i) => (i.id === itemId ? { ...i, isRequired: !i.isRequired } : i)),
                };
            })
        );
    };

    const totalItemsCount = sections.reduce((acc, s) => acc + s.items.length, 0);
    const totalRequiredCount = sections.reduce(
        (acc, s) => acc + s.items.filter((i) => i.isRequired).length,
        0
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        const finalModel = isCustomModel ? customModelInput.trim() : hardwareModel;

        if (!name.trim()) {
            setErrorMessage('Please enter a Template Name.');
            return;
        }
        if (!finalModel) {
            setErrorMessage('Please select or specify a Hardware Model.');
            return;
        }
        if (!hardwareType.trim()) {
            setErrorMessage('Please enter the Hardware Type (e.g. Telematics Gateway, CAN Tracker, Dashcam).');
            return;
        }
        if (sections.length === 0) {
            setErrorMessage('Please create at least one section in the checklist template.');
            return;
        }
        if (totalItemsCount === 0) {
            setErrorMessage('Please add at least one checklist item to the template.');
            return;
        }

        try {
            setIsSubmitting(true);

            const formattedSections: ChecklistTemplateSection[] = sections.map((sec, secIdx) => ({
                id: `sec-${secIdx + 1}-${Date.now()}`,
                title: sec.title,
                items: sec.items.map((it, itIdx) => ({
                    id: `item-${secIdx + 1}-${itIdx + 1}-${Date.now()}`,
                    title: it.title,
                    description: it.description,
                    section: sec.title,
                    isRequired: it.isRequired,
                    displayOrder: itIdx + 1,
                })),
            }));

            const newTemplateId = await createChecklistTemplate({
                name: name.trim(),
                hardwareModel: finalModel as HardwareModel,
                hardwareType: hardwareType.trim(),
                category: CATEGORY_TO_ENUM[category] || category,
                description: description.trim(),
                version: version.trim() || 'v1.0',
                status: (STATUS_TO_ENUM[status] || status) as any,
                sections: formattedSections,
            });

            setIsSubmitting(false);
            onClose();

            if (onCreated) {
                onCreated(newTemplateId);
            } else {
                setSelectedTemplateId(newTemplateId);
            }
        } catch (err: any) {
            setIsSubmitting(false);
            setErrorMessage(err.message || 'Failed to create template. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl shadow-xs">
                            <CheckSquare className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                                Create Checklist Template
                                <span className="text-[11px] font-medium bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
                                    Operations Config
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                Define standardized installation procedures automatically applied when hardware is selected on jobs.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body - Scrollable */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                    {/* Preset Selector Banner */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                Select a Starter Preset or Build Custom
                            </label>
                            <button
                                type="button"
                                onClick={() => handleSelectPreset(null)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${activePresetIndex === null
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                            >
                                + Blank Custom Template
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {STARTER_PRESETS.map((preset, idx) => {
                                const Icon = preset.icon;
                                const isSelected = activePresetIndex === idx;
                                return (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => handleSelectPreset(idx)}
                                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${isSelected
                                                ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div
                                                    className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />}
                                            </div>
                                            <p className="font-bold text-[11px] text-slate-900 line-clamp-1">{preset.hardwareModel}</p>
                                            <p className="text-[10px] text-slate-500 line-clamp-1">{preset.category}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Form Information */}
                    <form id="create-template-form" onSubmit={handleSubmit} className="space-y-6">
                        {errorMessage && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Required Information Missing</p>
                                    <p className="mt-0.5">{errorMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* Template Details Card */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                                1. Template Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Template Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Template Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. MIX4000 Advanced Fleet Installation Checklist"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    />
                                </div>

                                {/* Hardware Model */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Hardware Model <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCustomModel(!isCustomModel);
                                                if (!isCustomModel) setCustomModelInput('');
                                            }}
                                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                                        >
                                            {isCustomModel ? '← Select Standard Model' : '+ Custom Model'}
                                        </button>
                                    </div>
                                    {isCustomModel ? (
                                        <input
                                            type="text"
                                            required
                                            value={customModelInput}
                                            onChange={(e) => setCustomModelInput(e.target.value)}
                                            placeholder="e.g. CAN-Sensor Pro, Dashcam 4K..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                        />
                                    ) : (
                                        <select
                                            value={hardwareModel}
                                            onChange={(e) => setHardwareModel(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                        >
                                            {PREDEFINED_MODELS.map((model) => (
                                                <option key={model} value={model}>
                                                    {model}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Jobs containing this hardware model automatically inherit this checklist.
                                    </p>
                                </div>

                                {/* Hardware Type */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Hardware Type / Specification <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={hardwareType}
                                        onChange={(e) => setHardwareType(e.target.value)}
                                        placeholder="e.g. Telematics Gateway, Dual ADAS Dashcam..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Hardware Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Version & Status */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Version</label>
                                        <input
                                            type="text"
                                            value={version}
                                            onChange={(e) => setVersion(e.target.value)}
                                            placeholder="v1.0"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as any)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Draft">Draft</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Description & Scope</label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Provide overview of procedures, wiring standards, safety equipment, or tools required."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Checklist Sections & Items Builder */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                                        2. Checklist Sections & Procedure Items
                                    </h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Organize installation steps into logical workflow sections (e.g. Device Setup, Testing, Verification).
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                                        {sections.length} Sections · {totalItemsCount} Items ({totalRequiredCount} Required)
                                    </span>
                                    {!showAddSectionInput && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddSectionInput(true)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add Section
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Add Section Input Form */}
                            {showAddSectionInput && (
                                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-2 animate-in fade-in">
                                    <input
                                        type="text"
                                        value={newSectionTitle}
                                        onChange={(e) => setNewSectionTitle(e.target.value)}
                                        placeholder="Enter new section title (e.g. Calibration, Pre-checks, Safety Testing)..."
                                        className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddSection();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSection}
                                        disabled={!newSectionTitle.trim()}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
                                    >
                                        Add
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddSectionInput(false);
                                            setNewSectionTitle('');
                                        }}
                                        className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs rounded-lg hover:bg-slate-200/50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {/* Sections List */}
                            {sections.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-slate-700">No sections added yet</p>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Click "Add Section" above or choose a preset to initialize standard sections.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sections.map((section, sIdx) => {
                                        const isAddingItem = addingItemToSectionId === section.id;
                                        const reqCount = section.items.filter((i) => i.isRequired).length;

                                        return (
                                            <div
                                                key={section.id}
                                                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all"
                                            >
                                                {/* Section Header */}
                                                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">
                                                            {sIdx + 1}
                                                        </span>
                                                        <h4 className="text-xs font-bold text-slate-900">{section.title}</h4>
                                                        <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                            {section.items.length} items ({reqCount} required)
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setAddingItemToSectionId(section.id);
                                                                setNewItemTitle('');
                                                                setNewItemDesc('');
                                                                setNewItemRequired(true);
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            Add Item
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSection(section.id)}
                                                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-white transition-colors"
                                                            title="Delete Section"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Items in Section */}
                                                <div className="mt-2.5 space-y-1.5">
                                                    {section.items.length === 0 ? (
                                                        <p className="text-[11px] text-slate-400 italic py-2">
                                                            No items in this section yet. Click "+ Add Item".
                                                        </p>
                                                    ) : (
                                                        section.items.map((item, iIdx) => (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-start justify-between gap-3 p-2.5 bg-white rounded-lg border border-slate-200/80 hover:border-slate-300 transition-colors text-xs"
                                                            >
                                                                <div className="flex items-start gap-2 flex-1">
                                                                    <div className="w-4 h-4 rounded border border-slate-300 mt-0.5 shrink-0 bg-slate-50" />
                                                                    <div>
                                                                        <p className="font-semibold text-slate-900">{item.title}</p>
                                                                        {item.description && (
                                                                            <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleItemRequired(section.id, item.id)}
                                                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${item.isRequired
                                                                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                                                            }`}
                                                                    >
                                                                        {item.isRequired ? 'Required' : 'Optional'}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveItem(section.id, item.id)}
                                                                        className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}

                                                    {/* Adding Item Form */}
                                                    {isAddingItem && (
                                                        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs space-y-2.5 mt-2 animate-in fade-in">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-bold text-blue-700 uppercase">
                                                                    New Checklist Step in "{section.title}"
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAddingItemToSectionId(null)}
                                                                    className="text-slate-400 hover:text-slate-600"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            <input
                                                                type="text"
                                                                value={newItemTitle}
                                                                onChange={(e) => setNewItemTitle(e.target.value)}
                                                                placeholder="Checklist item action title (e.g. Verify ground cable resistance < 0.5 ohm)..."
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />

                                                            <input
                                                                type="text"
                                                                value={newItemDesc}
                                                                onChange={(e) => setNewItemDesc(e.target.value)}
                                                                placeholder="Optional description or acceptance criteria..."
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />

                                                            <div className="flex items-center justify-between pt-1">
                                                                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={newItemRequired}
                                                                        onChange={(e) => setNewItemRequired(e.target.checked)}
                                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                                    />
                                                                    <span className="font-semibold">Mark as Required for job completion</span>
                                                                </label>

                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setAddingItemToSectionId(null)}
                                                                        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddItemToSection(section.id)}
                                                                        disabled={!newItemTitle.trim()}
                                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
                                                                    >
                                                                        Save Item
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="text-xs text-slate-500 hidden sm:block">
                        Standardizing telematics installations ensures fleet compliance and zero missed wiring steps.
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="create-template-form"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
                        >
                            <CheckSquare className="w-4 h-4" />
                            {isSubmitting ? 'Creating Template...' : 'Save & Publish Template'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
