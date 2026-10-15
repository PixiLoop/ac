import React, { useState } from 'react';
import { ChecklistTemplate, HardwareModel } from '../types/installation';
import {
  ArrowLeft,
  CheckSquare,
  Plus,
  Edit2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Trash2,
  Copy,
  Check,
  X,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

interface ChecklistTemplateDetailProps {
  template: ChecklistTemplate;
  onBack: () => void;
}

export const ChecklistTemplateDetail: React.FC<ChecklistTemplateDetailProps> = ({
  template,
  onBack,
}) => {
  const {
    addTemplateSection,
    deleteTemplateSection,
    addTemplateItem,
    updateTemplateItem,
    deleteTemplateItem,
    updateChecklistTemplate,
    deleteChecklistTemplate,
    createChecklistTemplate,
    setSelectedTemplateId,
  } = useOperations();

  // Add section state
  const [newSectionTitle, setNewSectionTitle] = useState<string>('');
  const [showAddSection, setShowAddSection] = useState<boolean>(false);

  // New item modal state
  const [targetSection, setTargetSection] = useState<{ id: string; title: string } | null>(null);
  const [newItemTitle, setNewItemTitle] = useState<string>('');
  const [newItemDesc, setNewItemDesc] = useState<string>('');
  const [newItemRequired, setNewItemRequired] = useState<boolean>(true);

  // Edit Template Info Modal state
  const [showEditInfoModal, setShowEditInfoModal] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(template.name);
  const [editModel, setEditModel] = useState<string>(template.hardwareModel);
  const [editType, setEditType] = useState<string>(template.hardwareType);
  const [editCategory, setEditCategory] = useState<string>(template.category);
  const [editVersion, setEditVersion] = useState<string>(template.version);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'DRAFT' | 'ARCHIVED'>(template.status);
  const [editDescription, setEditDescription] = useState<string>(template.description);

  // Delete Template Confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const totalItems = template.sections.reduce(
    (acc, sec) => acc + sec.items.length,
    0
  );
  const requiredItems = template.sections.reduce(
    (acc, sec) => acc + sec.items.filter((i) => i.isRequired).length,
    0
  );

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    await addTemplateSection(template.id, newSectionTitle.trim());
    setNewSectionTitle('');
    setShowAddSection(false);
  };

  const handleDeleteSection = async (sectionId: string, sectionTitle: string) => {
    if (window.confirm(`Are you sure you want to remove the section "${sectionTitle}" and all its checklist items?`)) {
      await deleteTemplateSection(template.id, sectionId);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSection || !newItemTitle.trim()) return;

    await addTemplateItem(template.id, targetSection.title, {
      title: newItemTitle.trim(),
      description: newItemDesc.trim() || undefined,
      isRequired: newItemRequired,
    });

    setTargetSection(null);
    setNewItemTitle('');
    setNewItemDesc('');
    setNewItemRequired(true);
  };

  const handleDeleteItem = async (sectionId: string, itemId: string) => {
    await deleteTemplateItem(template.id, sectionId, itemId);
  };

  const handleToggleRequired = async (sectionId: string, itemId: string, currentReq: boolean) => {
    await updateTemplateItem(template.id, sectionId, itemId, {
      isRequired: !currentReq,
    });
  };

  const handleSaveTemplateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateChecklistTemplate(template.id, {
      name: editName.trim(),
      hardwareModel: editModel as HardwareModel,
      hardwareType: editType.trim(),
      category: editCategory,
      version: editVersion.trim(),
      status: editStatus,
      description: editDescription.trim(),
    });
    setShowEditInfoModal(false);
  };

  const handleDuplicate = async () => {
    const newId = await createChecklistTemplate({
      name: `${template.name} (Copy)`,
      hardwareModel: template.hardwareModel,
      hardwareType: template.hardwareType,
      category: template.category,
      description: template.description,
      version: `${template.version}-copy`,
      status: 'DRAFT',
      sections: template.sections.map((sec, sIdx) => ({
        id: `sec-dup-${sIdx}-${Date.now()}`,
        title: sec.title,
        items: sec.items.map((it, iIdx) => ({
          id: `item-dup-${sIdx}-${iIdx}-${Date.now()}`,
          title: it.title,
          description: it.description,
          section: sec.title,
          isRequired: it.isRequired,
          displayOrder: it.displayOrder,
        })),
      })),
    });
    setSelectedTemplateId(newId);
  };

  const handleDeleteTemplate = async () => {
    await deleteChecklistTemplate(template.id);
    onBack();
  };

  return (
    <div className="space-y-6 mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Checklist Templates
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors"
            title="Duplicate as new template"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 shadow-xs transition-colors"
            title="Delete this template"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <button
            onClick={() => {
              setEditName(template.name);
              setEditModel(template.hardwareModel);
              setEditType(template.hardwareType);
              setEditCategory(template.category);
              setEditVersion(template.version);
              setEditStatus(template.status);
              setEditDescription(template.description);
              setShowEditInfoModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Info
          </button>

          <button
            onClick={() => setShowAddSection(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>
      </div>

      {/* 1. Template Information Card (Requirement #3) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {template.hardwareModel}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                {template.hardwareType}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {template.category}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${template.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : template.status === 'DRAFT'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
              >
                {template.status}
              </span>
            </div>

            <h1 className="text-xl font-black text-slate-900 tracking-tight">{template.name}</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {template.description || 'Standard installation checklist procedure for this telematics hardware.'}
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6 shrink-0">
            <div>
              <span className="block text-slate-400 font-medium text-[11px]">Version</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{template.version}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium text-[11px]">Last Updated</span>
              <span className="font-medium text-slate-700 text-xs">{template.lastUpdated}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium text-[11px]">Checklist Steps</span>
              <span className="font-bold text-blue-600 text-sm">
                {totalItems} <span className="text-xs font-normal text-slate-500">({requiredItems} req)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Section Form Inline */}
      {showAddSection && (
        <form
          onSubmit={handleCreateSection}
          className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Add New Checklist Section
            </h4>
            <button
              type="button"
              onClick={() => setShowAddSection(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="e.g. Pre-Trip Diagnostics, Battery Isolation, CAN Calibration"
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newSectionTitle.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              Save Section
            </button>
            <button
              type="button"
              onClick={() => setShowAddSection(false)}
              className="px-3 py-2 text-slate-600 text-xs hover:bg-slate-200/50 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* 2. Checklist Sections (Requirement #3 & #4) */}
      <div className="space-y-6">
        {template.sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Sections in Template</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Click "Add Section" to create your first workflow section (e.g. Device Setup, Testing, Verification).
            </p>
            <button
              onClick={() => setShowAddSection(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add First Section
            </button>
          </div>
        ) : (
          template.sections.map((section, sIndex) => (
            <div
              key={section.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                    {sIndex + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
                  <span className="text-xs text-slate-500">
                    ({section.items.length} item{section.items.length === 1 ? '' : 's'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTargetSection({ id: section.id, title: section.title })}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>

                  <button
                    onClick={() => handleDeleteSection(section.id, section.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Checklist Items (Requirement #4) */}
              <div className="divide-y divide-slate-100">
                {section.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No items in this section yet. Click "Add Item" above.
                  </div>
                ) : (
                  section.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-slate-50/60 transition-colors flex items-start justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-slate-300">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {item.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleRequired(section.id, item.id, item.isRequired)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${item.isRequired
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                }`}
                              title="Click to toggle Required / Optional"
                            >
                              {item.isRequired ? 'Required' : 'Optional'}
                            </button>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-mono text-slate-400">
                          Step #{item.displayOrder}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(section.id, item.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Item Modal */}
      {targetSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                Add Item to "{targetSection.title}"
              </h3>
              <button
                onClick={() => setTargetSection(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. Solder ignition connection line"
                  className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Description / Specification
                </label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Specific details, torques, wiring guidelines or acceptance criteria..."
                  className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reqCheckbox"
                  checked={newItemRequired}
                  onChange={(e) => setNewItemRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="reqCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Required step (must be completed before job completion)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTargetSection(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs"
                >
                  Add Step
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Info Modal */}
      {showEditInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Template Metadata
              </h3>
              <button
                onClick={() => setShowEditInfoModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateInfo} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hardware Model</label>
                  <input
                    type="text"
                    required
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hardware Type</label>
                  <input
                    type="text"
                    required
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Telematics Unit">Telematics Unit</option>
                    <option value="Camera & Video">Camera & Video</option>
                    <option value="Connectivity">Connectivity</option>
                    <option value="Sensors">Sensors</option>
                    <option value="Core Unit">Core Unit</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={editVersion}
                    onChange={(e) => setEditVersion(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditInfoModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Template Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Checklist Template</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete <span className="font-bold text-slate-900">{template.name}</span>? Existing installations will retain already attached checklists, but new installations with {template.hardwareModel} hardware will no longer automatically attach this checklist.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTemplate}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
