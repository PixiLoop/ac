import React, { useEffect, useState, useRef } from 'react';
import { ChecklistTemplate, ChecklistTemplateSection, HardwareModel } from '../types/installation';
import {
    CheckSquare,
    Plus,
    Trash2,
    X,
    Sparkles,
    Layers,
    Check,
    AlertCircle,
    Cpu,
    Camera,
    Radio,
    Navigation,
    ShieldCheck,
    Sliders,
    Library,
    FilePlus2,
    Search,
    ChevronDown,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

interface CreateChecklistTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (templateId: string) => void;
    /** Open modal as a deep clone of an existing saved template (never mutates source). */
    reuseFrom?: ChecklistTemplate | null;
}

type BuilderSection = {
    id: string;
    title: string;
    items: { id: string; title: string; description?: string; isRequired: boolean }[];
};

function deepCloneSectionsFromTemplate(tmpl: ChecklistTemplate): BuilderSection[] {
    const stamp = Date.now();
    return (tmpl.sections || []).map((sec, sIdx) => ({
        id: `sec-reuse-${stamp}-${sIdx}`,
        title: sec.title,
        items: (sec.items || []).map((it, iIdx) => ({
            id: `it-reuse-${stamp}-${sIdx}-${iIdx}`,
            title: it.title,
            description: it.description,
            isRequired: it.isRequired,
        })),
    }));
}


const STATUS_TO_ENUM: Record<string, string> = {
    'Active': 'ACTIVE',
    'Draft': 'DRAFT',
    'Archived': 'ARCHIVED',
};

export const CreateChecklistTemplateModal: React.FC<CreateChecklistTemplateModalProps> = ({
    isOpen,
    onClose,
    onCreated,
    reuseFrom = null,
}) => {
    const { createChecklistTemplate, setSelectedTemplateId, checklistTemplates, fmSegments } =
        useOperations();

    const [hardwareId, setHardwareId] = useState<string>("")

    // Selected Preset / blank / saved library clone
    const [activePresetIndex, setActivePresetIndex] = useState<number | null>(0);
    const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null);

    // YouTube-style Search dropdown states
    const [presetSearchQuery, setPresetSearchQuery] = useState<string>('');
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Form Fields
    const [name, setName] = useState<string>("");
    const [status, setStatus] = useState<'Active' | 'Draft'>('Active');

    // Sections & Items builder
    const [sections, setSections] = useState<BuilderSection[]>([])

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

    // Filtered presets based on search query
    const filteredPresets = fmSegments.filter((preset) =>
        preset.label.toLowerCase().includes(presetSearchQuery.toLowerCase()) ||
        preset.code.toLowerCase().includes(presetSearchQuery.toLowerCase()) ||
        preset.type.toLowerCase().includes(presetSearchQuery.toLowerCase())
    );

    // Close search menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Apply a saved library template as an independent clone
    const handleSelectLibraryTemplate = (tmpl: ChecklistTemplate) => {
        setActivePresetIndex(null);
        setActiveLibraryId(tmpl.id);
        setName(`${tmpl.name} (Custom)`);


        setStatus('Draft');
        setSections(deepCloneSectionsFromTemplate(tmpl));
    };

    useEffect(() => {
        if (!isOpen || !reuseFrom) return;
        handleSelectLibraryTemplate(reuseFrom);
    }, [isOpen, reuseFrom?.id]);

    if (!isOpen) return null;


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

    const saveTemplate = async (saveStatus: 'Active' | 'Draft') => {
        setErrorMessage(null);

        if (!hardwareId) {
            setErrorMessage('Please select or specify a Hardware Model.');
            return;
        }

        if (!name.trim()) {
            setErrorMessage('Please enter a Template Name.');
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
            setStatus(saveStatus);

            const stamp = Date.now();
            const formattedSections: ChecklistTemplateSection[] = sections.map((sec, secIdx) => ({
                id: `sec-${secIdx + 1}-${stamp}`,
                title: sec.title,
                items: sec.items.map((it, itIdx) => ({
                    id: `item-${secIdx + 1}-${itIdx + 1}-${stamp}`,
                    title: it.title,
                    description: it.description,
                    section: sec.title,
                    isRequired: it.isRequired,
                    displayOrder: itIdx + 1,
                })),
            }));

            const newTemplateId = await createChecklistTemplate({
                name: name.trim(),
                hardwareId: hardwareId,
                status: (STATUS_TO_ENUM[saveStatus] || saveStatus) as any,
                sections: formattedSections,
                fmSegmentId: null
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await saveTemplate(status);
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
                    {/* YouTube-Style Searchable Starter Preset Dropdown */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                Select a Starter Preset or Build Custom
                            </label>
                            {/* <button
                                type="button"
                                onClick={() => handleSelectPreset(null)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 ${activePresetIndex === null && !activeLibraryId
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                            >
                                <FilePlus2 className="w-3.5 h-3.5" />
                                Blank Custom Template
                            </button> */}
                        </div>

                        {/* YouTube Search Bar Input Container */}
                        <div className="relative" ref={searchRef}>
                            <div className="relative flex items-center">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Search className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    value={presetSearchQuery}
                                    onFocus={() => setIsSearchDropdownOpen(true)}
                                    onChange={(e) => {
                                        setPresetSearchQuery(e.target.value);
                                        setIsSearchDropdownOpen(true);
                                        setHardwareId("")
                                    }}
                                    placeholder="Search presets (e.g. MIX4000, Dashcam, CAN-Bus)..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white shadow-xs transition-all"
                                />
                                {presetSearchQuery ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPresetSearchQuery('');
                                            setIsSearchDropdownOpen(true);
                                        }}
                                        className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <ChevronDown className="absolute right-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                )}
                            </div>

                            {/* Floating YouTube-style Results Menu */}
                            {isSearchDropdownOpen && (
                                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                                    {filteredPresets.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            No matching starter presets found.
                                        </div>
                                    ) : (
                                        <div className="py-1 divide-y divide-slate-100">
                                            {filteredPresets.map((preset) => {
                                                const originalIndex = fmSegments.findIndex((p) => p.label === preset.label);
                                                const isSelected = activePresetIndex === originalIndex && !activeLibraryId;
                                                // const Icon = preset.icon;

                                                return (
                                                    <button
                                                        key={preset.code}
                                                        type="button"
                                                        onClick={() => {
                                                            setHardwareId(preset.id)
                                                            setPresetSearchQuery(preset.label)
                                                            setIsSearchDropdownOpen(false)
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-blue-50/70 transition-colors ${isSelected ? 'bg-blue-50/90 font-semibold' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {/* <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                                <Icon className="w-4 h-4" />
                                                            </div> */}
                                                            <div>
                                                                <p className="text-xs text-slate-900 font-bold">{preset.label}</p>
                                                                <p className="text-[11px] text-slate-500">
                                                                    {preset.code} · {preset.type}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check className="w-4 h-4 text-blue-600 font-bold shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reuse saved templates (deep clone — source stays unchanged) */}
                    {checklistTemplates.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Library className="w-3.5 h-3.5 text-ink" />
                                        Reuse a Saved Template
                                    </label>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Starts a new copy you can customise. Saving creates a separate template — the original is not changed.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-0.5">
                                {checklistTemplates.map((tmpl) => {
                                    const selected = activeLibraryId === tmpl.id;
                                    const itemCount = tmpl.sections.reduce(
                                        (acc, s) => acc + s.items.length,
                                        0
                                    );
                                    return (
                                        <button
                                            key={tmpl.id}
                                            type="button"
                                            onClick={() => handleSelectLibraryTemplate(tmpl)}
                                            className={`text-left rounded-xl border px-3 py-2.5 transition-all ${selected
                                                ? 'bg-ink/5 border-ink ring-2 ring-ink/15'
                                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[11px] font-bold text-slate-900 truncate">
                                                    {tmpl.name}
                                                </p>
                                                {selected && (
                                                    <Check className="w-3.5 h-3.5 text-ink shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                {itemCount} items · {tmpl.status}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

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
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={fmSegments.find(segment => segment.id === hardwareId)?.label ?? ""}
                                        disabled
                                        placeholder="e.g. Remora"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    />
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
                                        value={fmSegments.find(segment => segment.id === hardwareId)?.type ?? ""}
                                        disabled
                                        placeholder="e.g. Telematics Gateway, Dual ADAS Dashcam..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    />
                                </div>


                                {/* Version & Status */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                                        <input
                                            type="text"
                                            required
                                            value={fmSegments.find(segment => segment.id === hardwareId)?.isActive ? "Active":"In-Active"}
                                            disabled
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                        />
                                    </div>
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

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => void saveTemplate('Draft')}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-50 rounded-xl border border-slate-300 transition-colors"
                        >
                            Save as Draft
                        </button>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => void saveTemplate('Active')}
                            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
                        >
                            <CheckSquare className="w-4 h-4" />
                            {isSubmitting ? 'Saving…' : 'Save & Publish Template'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};