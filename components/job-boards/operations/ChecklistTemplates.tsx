import React, { useEffect, useState } from 'react';
import { ChecklistTemplate } from '../types/installation';
import { ChecklistTemplateDetail } from './ChecklistTemplateDetail';
import { CreateChecklistTemplateModal } from './CreateChecklistTemplateModal';
import {
  CheckSquare,
  Search,
  Plus,
  Layers,
  Eye,
  Cpu,
  Copy,
  Trash2,
  CheckCircle2,
  FileCheck2,
  Pencil,
  X,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

export const ChecklistTemplates: React.FC = () => {
  const {
    checklistTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    deleteChecklistTemplate,
  } = useOperations();

  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [reuseFrom, setReuseFrom] = useState<ChecklistTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ChecklistTemplate | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const selectedTemplate = checklistTemplates.find((t) => t.id === selectedTemplateId);


  useEffect(() => {
    const uniqueCat = Array.from(
      new Set(
        checklistTemplates
          .map((t) => t.FMServiceSegment?.type)
          .filter((type): type is string => !!type),
      ),
    );
    setCategories(['All', ...uniqueCat]);
  }, [checklistTemplates]);

  useEffect(() => {
    const valid = new Set(checklistTemplates.map((t) => t.id));
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [checklistTemplates]);

  if (selectedTemplate) {
    return (
      <ChecklistTemplateDetail
        template={selectedTemplate}
        onBack={() => setSelectedTemplateId(null)}
      />
    );
  }

  const filteredTemplates = checklistTemplates.filter((tmpl) => {
    if (categoryFilter !== 'All' && tmpl.FMServiceSegment?.type !== categoryFilter) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchName = tmpl.name.toLowerCase().includes(q);
      const matchModel = (tmpl.FMServiceSegment?.label ?? "").toLowerCase().includes(q);
      const matchType = (tmpl.FMServiceSegment?.type ?? "").toLowerCase().includes(q);
      if (!matchName && !matchModel && !matchType) return false;
    }
    return true;
  });

  const filteredIds = filteredTemplates.map((t) => t.id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.has(id));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteChecklistTemplate(templateToDelete.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(templateToDelete.id);
        return next;
      });
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Failed to delete template', err);
    }
  };

  const handleConfirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkDeleting(true);
    try {
      for (const id of ids) {
        await deleteChecklistTemplate(id);
      }
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to bulk delete templates', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  // KPI Metrics
  const totalTemplatesCount = checklistTemplates.length;
  const activeTemplatesCount = checklistTemplates.filter((t) => t.status === 'ACTIVE').length;
  const totalStepsCount = checklistTemplates.reduce(
    (acc, t) =>
      acc + (t.sections ?? []).reduce((sAcc, s) => sAcc + (s.items?.length ?? 0), 0),
    0,
  );
  const modelsCoveredCount = new Set(checklistTemplates.map((t) => t.FMServiceSegment?.label)).size;

  return (
    <div className="w-full max-w-none space-y-6 pb-12 animate-in fade-in duration-200">
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

        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => {
              setReuseFrom(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create Template
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
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 pl-4 pr-2 align-middle w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                      }}
                      onChange={toggleAllFiltered}
                      title="Select all visible"
                      aria-label="Select all visible templates"
                    />
                  </th>
                  <th className="py-3 px-4 align-middle">Template Name</th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Hardware Model</th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Hardware Type</th>
                  <th className="py-3 px-4 align-middle text-center">Sections</th>
                  <th className="py-3 px-4 align-middle text-center whitespace-nowrap">Checklist Items</th>
                  <th className="py-3 px-4 align-middle">Status</th>
                  <th className="py-3 px-4 align-middle whitespace-nowrap">Last Updated</th>
                  <th className="py-3 px-4 align-middle text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((tmpl) => {
                  const sections = tmpl.sections ?? [];
                  const totalItems = sections.reduce(
                    (acc, s) => acc + (s.items?.length ?? 0),
                    0
                  );
                  const requiredItems = sections.reduce(
                    (acc, s) => acc + (s.items ?? []).filter((i) => i.isRequired).length,
                    0
                  );
                  const isChecked = selectedIds.has(tmpl.id);

                  return (
                    <tr
                      key={tmpl.id}
                      className={`hover:bg-slate-50/70 transition-colors group ${
                        isChecked ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2 align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={isChecked}
                          onChange={() => toggleOne(tmpl.id)}
                          aria-label={`Select ${tmpl.name}`}
                        />
                      </td>
                      {/* Template Name */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 flex items-center gap-1.5 leading-snug">
                              <span className="truncate">{tmpl.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 leading-snug mt-0.5">
                              {tmpl.FMServiceSegment?.code}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Hardware Model */}
                      <td className="py-3 px-4 align-middle">
                        <span className="inline-flex items-center font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 leading-none whitespace-nowrap">
                          {tmpl.FMServiceSegment?.label}
                        </span>
                      </td>

                      {/* Hardware Type */}
                      <td className="py-3 px-4 align-middle text-slate-700 font-medium whitespace-nowrap">
                        {tmpl.FMServiceSegment?.type}
                      </td>

                      {/* Sections Count */}
                      <td className="py-3 px-4 align-middle text-center font-semibold text-slate-700">
                        {sections.length}
                      </td>

                      {/* Items Count */}
                      <td className="py-3 px-4 align-middle text-center">
                        <span className="inline-flex items-center justify-center font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 leading-none whitespace-nowrap">
                          {totalItems} items ({requiredItems} req)
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border leading-none whitespace-nowrap ${tmpl.status === 'ACTIVE'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : tmpl.status === 'DRAFT'
                              ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : 'text-slate-600 bg-slate-100 border-slate-200'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${tmpl.status === 'ACTIVE'
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
                      <td className="py-3 px-4 align-middle text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {typeof tmpl.lastUpdated === 'string'
                          ? tmpl.lastUpdated.slice(0, 10)
                          : tmpl.lastUpdated}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-middle text-center">
                        <div className="inline-flex items-center justify-center gap-1 flex-nowrap">
                          <button
                            type="button"
                            onClick={() => setPreviewTemplate(tmpl)}
                            className="inline-flex items-center justify-center h-8 w-8 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTemplateId(tmpl.id)}
                            className="inline-flex items-center justify-center h-8 w-8 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReuseFrom(tmpl);
                              setShowCreateModal(true);
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Reuse"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTemplateToDelete(tmpl)}
                            className="inline-flex items-center justify-center h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
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
        reuseFrom={reuseFrom}
        onClose={() => {
          setShowCreateModal(false);
          setReuseFrom(null);
        }}
        onCreated={(newId) => {
          setReuseFrom(null);
          setSelectedTemplateId(newId);
        }}
      />

      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-slate-200 shadow-xl flex flex-col">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {previewTemplate.FMServiceSegment?.label ?? '—'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {previewTemplate.FMServiceSegment?.type ?? '—'}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      previewTemplate.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : previewTemplate.status === 'DRAFT'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {previewTemplate.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 truncate">{previewTemplate.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Read-only preview</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {(previewTemplate.sections ?? []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No sections defined on this template.</p>
              ) : (
                (previewTemplate.sections ?? []).map((section) => (
                  <div key={section.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        {section.title}
                      </h4>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {(section.items ?? []).length === 0 ? (
                        <li className="px-3 py-2 text-xs text-slate-400">No items</li>
                      ) : (
                        (section.items ?? []).map((item) => (
                          <li key={item.id} className="px-3 py-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                                {item.description ? (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                                ) : null}
                              </div>
                              {item.isRequired ? (
                                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  Required
                                </span>
                              ) : (
                                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                  Optional
                                </span>
                              )}
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = previewTemplate.id;
                  setPreviewTemplate(null);
                  setSelectedTemplateId(id);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Template
              </button>
            </div>
          </div>
        </div>
      )}

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
              Are you sure you want to delete <span className="font-bold text-slate-900">{templateToDelete.name}</span> ({templateToDelete.FMServiceSegment?.label ?? ""})? Jobs already scheduled will retain their current checklist instances, but new jobs will no longer auto-attach this template.
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

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete selected templates</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Delete <span className="font-bold text-slate-900">{selectedIds.size}</span> checklist
              template{selectedIds.size === 1 ? '' : 's'}? Existing jobs keep their checklist
              instances; new jobs will no longer auto-attach these templates.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => void handleConfirmBulkDelete()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
