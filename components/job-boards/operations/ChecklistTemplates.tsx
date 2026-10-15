import React, { useState } from 'react';
import { ChecklistTemplate } from '../types/installation';
import { ChecklistTemplateDetail } from './ChecklistTemplateDetail';
import { CreateChecklistTemplateModal } from './CreateChecklistTemplateModal';
import {
  CheckSquare,
  Search,
  Plus,
  Layers,
  Eye,
  Calendar,
  Cpu,
  Copy,
  Trash2,
  Sparkles,
  Sliders,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

export const ChecklistTemplates: React.FC = () => {
  const {
    checklistTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    createChecklistTemplate,
    deleteChecklistTemplate,
  } = useOperations();

  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null);

  const selectedTemplate = checklistTemplates.find((t) => t.id === selectedTemplateId);

  if (selectedTemplate) {
    return (
      <ChecklistTemplateDetail
        template={selectedTemplate}
        onBack={() => setSelectedTemplateId(null)}
      />
    );
  }

  const categories = ['All', 'Telematics Unit', 'Camera & Video', 'Connectivity', 'Sensors', 'Core Unit', 'Accessories'];

  const filteredTemplates = checklistTemplates.filter((tmpl) => {
    if (categoryFilter !== 'All' && tmpl.category !== categoryFilter) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchName = tmpl.name.toLowerCase().includes(q);
      const matchModel = tmpl.hardwareModel.toLowerCase().includes(q);
      const matchType = tmpl.hardwareType.toLowerCase().includes(q);
      if (!matchName && !matchModel && !matchType) return false;
    }
    return true;
  });

  // ChecklistTemplates.tsx

  const handleDuplicateTemplate = async (tmpl: ChecklistTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newId = await createChecklistTemplate({
        name: `${tmpl.name} (Copy)`,
        hardwareModel: tmpl.hardwareModel,
        hardwareType: tmpl.hardwareType,
        category: tmpl.category,
        description: tmpl.description,
        version: `${tmpl.version}-copy`,
        status: 'DRAFT', // Changed from 'Draft' to 'DRAFT'
        sections: tmpl.sections.map((sec, sIdx) => ({
          id: `sec-copy-${sIdx}-${Date.now()}`,
          title: sec.title,
          items: sec.items.map((it, iIdx) => ({
            id: `item-copy-${sIdx}-${iIdx}-${Date.now()}`,
            title: it.title,
            description: it.description,
            section: sec.title,
            isRequired: it.isRequired,
            displayOrder: it.displayOrder,
          })),
        })),
      });
      setSelectedTemplateId(newId);
    } catch (err) {
      console.error('Failed to duplicate template', err);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteChecklistTemplate(templateToDelete.id);
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Failed to delete template', err);
    }
  };

  // KPI Metrics
  const totalTemplatesCount = checklistTemplates.length;
  const activeTemplatesCount = checklistTemplates.filter((t) => t.status === 'ACTIVE').length;
  const totalStepsCount = checklistTemplates.reduce(
    (acc, t) => acc + t.sections.reduce((sAcc, s) => sAcc + s.items.length, 0),
    0
  );
  const modelsCoveredCount = new Set(checklistTemplates.map((t) => t.hardwareModel)).size;

  return (
    <div className="space-y-6 mx-auto pb-12 animate-in fade-in duration-200">
      {/* Title & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            Checklist Templates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Predefined hardware checklist definitions automatically attached to jobs based on selected telematics devices.
          </p>
        </div>

        {/* Create Template Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create Checklist Template
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Templates</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalTemplatesCount}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active In Field</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{activeTemplatesCount}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Models Covered</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">{modelsCoveredCount}</p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Audit Steps</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalStepsCount}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by model, hardware type, or name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Table (Requirement #2) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredTemplates.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Checklist Templates Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              {search || categoryFilter !== 'All'
                ? 'No templates match your search filters. Try clearing filters or create a new template.'
                : 'Create your first hardware checklist template to standardize vehicle installations.'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Template Name</th>
                  <th className="py-3.5 px-4">Hardware Model</th>
                  <th className="py-3.5 px-4">Hardware Type</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Sections</th>
                  <th className="py-3.5 px-4 text-center">Checklist Items</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((tmpl) => {
                  const totalItems = tmpl.sections.reduce(
                    (acc, s) => acc + s.items.length,
                    0
                  );
                  const requiredItems = tmpl.sections.reduce(
                    (acc, s) => acc + s.items.filter((i) => i.isRequired).length,
                    0
                  );

                  return (
                    <tr
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                    >
                      {/* Template Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 flex items-center gap-1.5">
                              {tmpl.name}
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                                {tmpl.version}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {tmpl.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Hardware Model */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {tmpl.hardwareModel}
                        </span>
                      </td>

                      {/* Hardware Type */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {tmpl.hardwareType}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {tmpl.category}
                        </span>
                      </td>

                      {/* Sections Count */}
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                        {tmpl.sections.length}
                      </td>

                      {/* Items Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          {totalItems} items ({requiredItems} req)
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tmpl.status === 'ACTIVE'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : tmpl.status === 'DRAFT'
                              ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : 'text-slate-600 bg-slate-100 border-slate-200'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${tmpl.status === 'ACTIVE'
                              ? 'bg-emerald-500'
                              : tmpl.status === 'DRAFT'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                              }`}
                          />
                          {tmpl.status}
                        </span>
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {tmpl.lastUpdated}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedTemplateId(tmpl.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View / Edit Template"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={(e) => handleDuplicateTemplate(tmpl, e)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Clone / Duplicate Template"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTemplateToDelete(tmpl)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Checklist Template Modal */}
      <CreateChecklistTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(newId) => {
          setSelectedTemplateId(newId);
        }}
      />

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-xl">
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
              Are you sure you want to delete <span className="font-bold text-slate-900">{templateToDelete.name}</span> ({templateToDelete.hardwareModel})? Jobs already scheduled will retain their current checklist instances, but new jobs will no longer auto-attach this template.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
