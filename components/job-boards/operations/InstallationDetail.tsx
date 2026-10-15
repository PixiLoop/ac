import React, { useState } from 'react';
import { HardwareItem, HardwareModel } from '../types/installation';
import { StatusBadge, ScheduleBadge } from './shared/StatusBadge';
import { ChecklistProgress } from './shared/ChecklistProgress';
import { ScheduleJobDialog } from './ScheduleJobDialog';
import { StatusChangeDialog } from './StatusChangeDialog';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Truck,
  Cpu,
  Plus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Edit3,
  CalendarCheck,
  Send,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

export const InstallationDetail: React.FC = () => {
  const {
    selectedJob,
    setSelectedJobId,
    toggleChecklistItem,
    addHardwareToJob,
    removeHardwareFromJob,
    getChecklistStats,
    checkTechnicianConflict,
    changeJobStatus,
  } = useOperations();

  const [showScheduleDialog, setShowScheduleDialog] = useState<boolean>(false);
  const [showStatusDialog, setShowStatusDialog] = useState<boolean>(false);
  const [selectedHwToAdd, setSelectedHwToAdd] = useState<HardwareModel>('GPS Unit');
  const [showAddHwModal, setShowAddHwModal] = useState<boolean>(false);
  const [editingNotesItemId, setEditingNotesItemId] = useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  if (!selectedJob) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border">
        <h3 className="text-lg font-semibold text-slate-800">Job Not Found or Loading</h3>
        <p className="mt-1 text-sm text-slate-500">The requested installation job was not found or is still loading.</p>
        <button
          onClick={() => {
            setSelectedJobId(null);
            if (typeof window !== 'undefined') window.history.back();
          }}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
        >
          Back to Installation Jobs
        </button>
      </div>
    );
  }

  const stats = getChecklistStats(selectedJob);

  // Check if technician has a scheduling conflict
  const conflict = selectedJob.technicianId && selectedJob.installationDate && selectedJob.startTime && selectedJob.endTime
    ? checkTechnicianConflict(
        selectedJob.technicianId,
        selectedJob.installationDate,
        selectedJob.startTime,
        selectedJob.endTime,
        selectedJob.id
      )
    : { hasConflict: false };

  const toggleSectionCollapse = (secId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const handleToggleItem = async (sectionId: string, itemId: string, currentState: boolean) => {
    await toggleChecklistItem(
      selectedJob.id,
      sectionId,
      itemId,
      !currentState,
      undefined,
      selectedJob.technicianName || 'Current Installer'
    );
  };

  const handleSaveItemNotes = async (sectionId: string, itemId: string) => {
    await toggleChecklistItem(
      selectedJob.id,
      sectionId,
      itemId,
      true,
      itemNoteText,
      selectedJob.technicianName || 'Current Installer'
    );
    setEditingNotesItemId(null);
    setItemNoteText('');
  };

  const handleAddHardware = async () => {
    const newItem: HardwareItem = {
      id: `hw-${Date.now()}`,
      model: selectedHwToAdd,
      name: `${selectedHwToAdd} Standard Fleet Component`,
      serialNumber: `SN-${Date.now().toString().slice(-6)}`,
      category:
        selectedHwToAdd === 'MIX4000' || selectedHwToAdd === 'FM3306'
          ? 'Telematics Unit'
          : selectedHwToAdd === 'HD Camera' || selectedHwToAdd === 'Standard Camera'
          ? 'Camera & Video'
          : selectedHwToAdd === 'SIM'
          ? 'Connectivity'
          : 'Sensors',
    };

    await addHardwareToJob(selectedJob.id, newItem);
    setShowAddHwModal(false);
  };

  const availableHardwareToAdd: HardwareModel[] = [
    'MIX4000',
    'FM3306',
    'HD Camera',
    'Standard Camera',
    'SIM',
    'GPS Unit',
    'Base Unit',
  ];

  return (
    <div className="space-y-6 mx-auto pb-12 animate-in fade-in duration-200">
      {/* Back button and quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => setSelectedJobId(null)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Installations
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowScheduleDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors"
          >
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            {selectedJob.isScheduled ? 'Reschedule' : 'Schedule Installation'}
          </button>

          <button
            onClick={() => setShowStatusDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Change Status
          </button>

          {selectedJob.status === 'Installed' && !selectedJob.invoiceId && (
            <button
              onClick={() => changeJobStatus(selectedJob.id, 'Invoiced', 'Generated fitting invoice', 'Accounts')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              Generate Invoice
            </button>
          )}
        </div>
      </div>

      {/* 1. Job Header (Requirement #32) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="font-mono text-2xl font-black text-slate-900 tracking-tight">
                {selectedJob.id}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {selectedJob.jobNumber}
              </span>
              <StatusBadge status={selectedJob.status} />
              <ScheduleBadge isScheduled={selectedJob.isScheduled} />
            </div>

            <h1 className="text-xl font-bold text-slate-800">
              {selectedJob.customerName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Project: <span className="font-semibold text-slate-700">{selectedJob.projectName}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {selectedJob.invoiceId && (
              <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs">
                <span className="font-semibold text-purple-700">Invoiced:</span>{' '}
                <span className="font-mono font-bold text-purple-900">{selectedJob.invoiceId}</span>
              </div>
            )}
            <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <span className="text-slate-400">Created:</span>{' '}
              <span className="font-medium text-slate-700">
                {new Date(selectedJob.createdAt).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Information Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Vehicle Rego</span>
            <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedJob.vehicle.rego}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Fleet Unit #</span>
            <p className="font-semibold text-slate-800 mt-0.5">{selectedJob.vehicle.fleetNumber}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Make & Model</span>
            <p className="font-semibold text-slate-800 mt-0.5">{selectedJob.vehicle.makeModel}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">VIN</span>
            <p className="font-mono text-slate-600 truncate mt-0.5">{selectedJob.vehicle.vin}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Details & Scheduling + Hardware */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Installation Details & Scheduling */}
        <div className="lg:col-span-2 space-y-6">
          {/* 2. Installation Details & Scheduling Section (Requirement #14 & #32) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Installation Details & Scheduling</h2>
                <p className="text-xs text-slate-500">
                  Site location, assigned field installer, and scheduled fitting timeline.
                </p>
              </div>
              <button
                onClick={() => setShowScheduleDialog(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
              >
                {selectedJob.isScheduled ? 'Edit Schedule' : 'Book Now'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Location
                </span>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedJob.location}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Assigned Installer / Technician
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedJob.technicianName ? (
                      selectedJob.technicianName
                    ) : (
                      <span className="text-amber-600 font-medium">Unassigned</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Installation Date
                </span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedJob.installationDate || 'Not Scheduled'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Time Slot
                </span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedJob.startTime && selectedJob.endTime ? (
                      `${selectedJob.startTime} – ${selectedJob.endTime}`
                    ) : (
                      'TBD'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Conflict Status Display */}
            {conflict.hasConflict ? (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="block font-bold">Scheduling Conflict Alert</strong>
                  {conflict.message}
                </div>
              </div>
            ) : selectedJob.isScheduled ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Technician calendar slot confirmed without conflicts.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                <span>⚠ This installation is currently unscheduled.</span>
                <button
                  onClick={() => setShowScheduleDialog(true)}
                  className="font-bold underline text-amber-900"
                >
                  Book now
                </button>
              </div>
            )}

            {selectedJob.notes && (
              <div className="pt-2 text-xs text-slate-600 border-t border-slate-100">
                <span className="font-semibold text-slate-700">Fitting Notes:</span>{' '}
                {selectedJob.notes}
              </div>
            )}
          </div>

          {/* 3. Installation Checklist Execution (Requirement #1, #5, #6, #7, #8) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Installation Checklist</h2>
                <p className="text-xs text-slate-500">
                  Predefined checklist templates automatically combined from attached hardware devices.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {selectedJob.checklistSections.length} Hardware Section{selectedJob.checklistSections.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Checklist Progress Component (Requirement #5) */}
            <ChecklistProgress stats={stats} />

            {/* Combined Checklist Sections */}
            <div className="space-y-4">
              {selectedJob.checklistSections.map((section) => {
                const isCollapsed = !!collapsedSections[section.id];
                const sectionCompleted = section.items.filter((i) => i.completed).length;
                const sectionTotal = section.items.length;

                return (
                  <div
                    key={section.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                  >
                    {/* Section Header */}
                    <div
                      onClick={() => toggleSectionCollapse(section.id)}
                      className="px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer transition-colors border-b border-slate-200/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <button className="text-slate-400">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">
                            {section.title}
                          </h3>
                          {section.hardwareModel && (
                            <span className="text-[11px] text-blue-600 font-medium">
                              Device: {section.hardwareModel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {sectionCompleted} / {sectionTotal}
                        </span>
                      </div>
                    </div>

                    {/* Section Items */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100">
                        {section.items.map((item) => (
                          <div
                            key={item.id}
                            className={`p-4 hover:bg-slate-50/60 transition-colors flex items-start gap-3 ${
                              item.completed ? 'bg-emerald-50/20' : ''
                            }`}
                          >
                            {/* Interactive Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleItem(section.id, item.id, item.completed)}
                              className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                item.completed
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : 'border-slate-300 hover:border-blue-500 bg-white'
                              }`}
                            >
                              {item.completed && <CheckCircle2 className="w-4 h-4" />}
                            </button>

                            {/* Item Content */}
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-sm font-medium ${
                                    item.completed
                                      ? 'text-slate-700 line-through decoration-slate-400'
                                      : 'text-slate-900 font-semibold'
                                  }`}
                                >
                                  {item.title}
                                </span>

                                {item.isRequired ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                    Required
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                                    Optional
                                  </span>
                                )}
                              </div>

                              {item.description && (
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  {item.description}
                                </p>
                              )}

                              {/* Item Completion Info */}
                              {item.completed && (
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-700 font-medium pt-1">
                                  <span>✓ Signed off by: {item.completedBy || 'Technician'}</span>
                                  {item.completedAt && (
                                    <span>
                                      •{' '}
                                      {new Date(item.completedAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Notes */}
                              {item.notes && editingNotesItemId !== item.id && (
                                <div className="mt-1.5 p-2 bg-slate-100/70 rounded-lg text-xs text-slate-700 border border-slate-200/80 flex items-start justify-between">
                                  <span className="italic">Note: “{item.notes}”</span>
                                  <button
                                    onClick={() => {
                                      setEditingNotesItemId(item.id);
                                      setItemNoteText(item.notes || '');
                                    }}
                                    className="text-[10px] text-blue-600 font-semibold ml-2"
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}

                              {editingNotesItemId === item.id ? (
                                <div className="mt-2 space-y-2">
                                  <input
                                    type="text"
                                    value={itemNoteText}
                                    onChange={(e) => setItemNoteText(e.target.value)}
                                    placeholder="Add fitting note or measurement..."
                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleSaveItemNotes(section.id, item.id)}
                                      className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-semibold rounded-md"
                                    >
                                      Save Note
                                    </button>
                                    <button
                                      onClick={() => setEditingNotesItemId(null)}
                                      className="px-2 py-1 text-slate-500 text-[11px]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : !item.notes ? (
                                <button
                                  onClick={() => {
                                    setEditingNotesItemId(item.id);
                                    setItemNoteText('');
                                  }}
                                  className="text-[11px] text-slate-400 hover:text-blue-600 font-medium inline-flex items-center gap-1 pt-0.5"
                                >
                                  + Add note / serial
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Hardware & Status Timeline */}
        <div className="space-y-6">
          {/* 4. Hardware Selection (Requirement #1 & #6) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Selected Hardware</h3>
                <p className="text-[11px] text-slate-500">
                  Hardware models drive the automatic checklist engine.
                </p>
              </div>
              <button
                onClick={() => setShowAddHwModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Hardware
              </button>
            </div>

            <div className="space-y-2">
              {selectedJob.hardware.map((hw) => (
                <div
                  key={hw.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{hw.model}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-medium">
                          {hw.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1">{hw.name}</p>
                      {hw.serialNumber && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          SN: {hw.serialNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedJob.hardware.length > 1 && (
                    <button
                      onClick={() => removeHardwareFromJob(selectedJob.id, hw.id)}
                      className="text-slate-400 hover:text-rose-600 text-xs p-1"
                      title="Remove component"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. Job Status Timeline (Requirement #26 & #32) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Job Status Timeline</h3>
              <button
                onClick={() => setShowStatusDialog(true)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Change Status
              </button>
            </div>

            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {selectedJob.timeline.map((event, idx) => (
                <div key={event.id} className="relative group">
                  {/* Timeline dot */}
                  <span
                    className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      idx === selectedJob.timeline.length - 1
                        ? 'bg-blue-600 ring-4 ring-blue-100'
                        : 'bg-slate-400'
                    }`}
                  />

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {event.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(event.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      By: {event.updatedBy}
                    </p>
                    {event.note && (
                      <p className="text-xs text-slate-600 mt-1 p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                        {event.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Hardware Modal */}
      {showAddHwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 border border-slate-200 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Add Hardware Component</h3>
            <p className="text-xs text-slate-500">
              Adding this hardware will automatically attach its corresponding checklist template section to this job.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Hardware Model
              </label>
              <select
                value={selectedHwToAdd}
                onChange={(e) => setSelectedHwToAdd(e.target.value as HardwareModel)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm"
              >
                {availableHardwareToAdd.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowAddHwModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddHardware}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
              >
                Add & Attach Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Dialog */}
      <ScheduleJobDialog
        job={selectedJob}
        isOpen={showScheduleDialog}
        onClose={() => setShowScheduleDialog(false)}
      />

      {/* Status Change Dialog */}
      <StatusChangeDialog
        job={selectedJob}
        isOpen={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
      />
    </div>
  );
};
