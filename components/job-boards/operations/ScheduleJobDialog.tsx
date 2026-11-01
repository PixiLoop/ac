import React, { useState, useEffect } from 'react';
import { InstallationJob } from '../types/installation';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  X,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

interface ScheduleJobDialogProps {
  job: InstallationJob;
  isOpen: boolean;
  onClose: () => void;
}

/** Clean technician label — never show raw cuid / clipped long ids */
function techLabel(tech: {
  id: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  status?: string | null;
}): string {
  const fromNames = `${tech.firstName ?? ''} ${tech.lastName ?? ''}`.trim();
  let name = (tech.displayName || fromNames || 'Technician').trim();
  name = name
    .replace(/\s*\([^)]*\)\s*[—\-]\s*Technician\s*$/i, '')
    .replace(/\s*\(c[a-z0-9]{20,}\)\s*/gi, '')
    .replace(/\s*[—\-]\s*Technician\s*$/i, '')
    .trim();
  if (!name || name === tech.id) name = fromNames || 'Technician';
  return tech.status ? `${name} — ${tech.status}` : name;
}

/** Fixed height + horizontal padding only — vertical padding clips select text on Windows */
const fieldControlStyle: React.CSSProperties = {
  height: 44,
  minHeight: 44,
  lineHeight: '44px',
  paddingTop: 0,
  paddingBottom: 0,
  boxSizing: 'border-box',
};

export const ScheduleJobDialog: React.FC<ScheduleJobDialogProps> = ({
  job,
  isOpen,
  onClose,
}) => {
  const {
    technicians,
    scheduleJob,
    checkTechnicianConflict,
    getTechnicianJobsForDate,
    contractors,
    subContractors
  } = useOperations();

  const [selectedTechId, setSelectedTechId] = useState<string>(job.technicianId || technicians[0]?.id || '');
  const [assignedTo, setAssignedTo] = useState<"technician" | "contractor" | "subcontractor">("technician")
  const [date, setDate] = useState<string>(job.installationDate || '2026-10-06');
  const [startTime, setStartTime] = useState<string>(job.startTime || '09:00');
  const [endTime, setEndTime] = useState<string>(job.endTime || '11:00');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<boolean>(false);

  // Time options for quick selection
  const timeOptions = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00'
  ];

  // Selected tech object
  const selectedTech = assignedTo === "technician" ? technicians.find((t) => t.id === selectedTechId) : (assignedTo === "contractor" ? contractors.find((t) => t.id === selectedTechId) : subContractors.find((t) => t.id === selectedTechId));

  // Conflict evaluation
  const conflict = checkTechnicianConflict(selectedTechId, date, startTime, endTime, job.id);

  // Existing jobs for selected tech on that date
  const techJobsOnDate = getTechnicianJobsForDate(selectedTechId, date);

  useEffect(() => {
    if (job) {
      if (job.technicianId) setSelectedTechId(job.technicianId);
      if (job.installationDate) setDate(job.installationDate);
      if (job.startTime) setStartTime(job.startTime);
      if (job.endTime) setEndTime(job.endTime);
      if (job.assignedTo) setAssignedTo(job.assignedTo);
      setErrorMsg(null);
    }
  }, [job, isOpen]);

  useEffect(() => {
    if (assignedTo === 'technician' && technicians.length > 0 && !technicians.find(technician => technician.id === selectedTechId)) {
      setSelectedTechId(technicians[0].id)
    } else if (assignedTo === 'contractor' && contractors.length > 0 && !contractors.find(contractor => contractor.id === selectedTechId)) {
      setSelectedTechId(contractors[0].id)
    } else if (assignedTo === 'subcontractor' && subContractors.length > 0 && !subContractors.find(contractor => contractor.id === selectedTechId)) {
      setSelectedTechId(subContractors[0].id)
    }
  }, [assignedTo, contractors, selectedTechId])


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (conflict.hasConflict) {
      setErrorMsg(conflict.message || 'Scheduling conflict detected.');
      return;
    }

    const res = await scheduleJob(job.id, assignedTo, selectedTechId, date, startTime, endTime, notes);
    if (!res.success) {
      setErrorMsg(res.conflict?.message || 'Could not schedule job.');
      return;
    }

    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Schedule Installation</h3>
              <p className="text-xs text-slate-500 font-mono">
                {job.id} • {job.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              Installation scheduled successfully! Updating operations view...
            </div>
          )}

          {/* Technician Selection */}
          <div className="w-full mb-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Assigned To <span className="text-rose-500">*</span>
            </label>
            <div className="relative w-full">
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value as "technician" | "contractor" | "subcontractor")}
                style={{ ...fieldControlStyle, paddingLeft: 14, paddingRight: 40 }}
                className="block w-full appearance-none rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={"technician"}>
                  Technician
                </option>
                <option value={"contractor"}>
                  Contractor
                </option>
                <option value={"subcontractor"}>
                  Sub-Contractor
                </option>
              </select>
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Technician Selection */}
          <div className="w-full mb-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Assigned {assignedTo === "technician" ? "Installer / Technician" : (assignedTo === "contractor" ? "Contractor" : "Sub-Contractor")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative w-full">
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                style={{ ...fieldControlStyle, paddingLeft: 14, paddingRight: 40 }}
                className="block w-full appearance-none rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {assignedTo === "technician" && technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {techLabel(tech)}
                  </option>
                ))}
                {assignedTo === "contractor" && contractors.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {techLabel(tech)}
                  </option>
                ))}
                {assignedTo === "subcontractor" && subContractors.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {techLabel(tech)}
                  </option>
                ))}
              </select>
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Date & Time Selectors — equal height, one row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div className="w-full min-w-0">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Installation Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...fieldControlStyle, paddingLeft: 14, paddingRight: 14 }}
                className="block w-full rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="w-full min-w-0">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ ...fieldControlStyle, paddingLeft: 12, paddingRight: 12 }}
                className="block w-full appearance-none rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full min-w-0">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                End Time <span className="text-rose-500">*</span>
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ ...fieldControlStyle, paddingLeft: 12, paddingRight: 12 }}
                className="block w-full appearance-none rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conflict Warning Box (Requirement #16 & #17) */}
          {conflict.hasConflict && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex items-start gap-3 animate-in shake duration-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-800">
                  ⚠ Technician Unavailable — Scheduling Conflict
                </h4>
                <p className="text-xs text-rose-700">
                  {conflict.message}
                </p>
                <p className="text-[11px] text-rose-600 font-medium">
                  Please adjust the installation time window or assign another available technician below.
                </p>
              </div>
            </div>
          )}

          {/* Technician Schedule Preview for the Date (Requirement #16) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">
                  {selectedTech?.displayName}’s Schedule for {date}:
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {techJobsOnDate.length} existing booking{techJobsOnDate.length === 1 ? '' : 's'}
              </span>
            </div>

            {techJobsOnDate.length === 0 ? (
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Technician has full availability all day on this date.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {techJobsOnDate.map((tj) => (
                  <div
                    key={tj.id}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${tj.id === job.id
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-white border-slate-200 text-slate-700'
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold text-slate-900 shrink-0">
                        {tj.startTime} – {tj.endTime}
                      </span>
                      <span className="shrink-0">—</span>
                      <span className="font-mono font-medium text-blue-600 shrink-0">{tj.id}</span>
                      <span className="text-slate-500 truncate">
                        ({tj.customerName})
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0 leading-none">
                      {tj.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location details */}
          <div className="w-full">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Installation Location
            </label>
            <div
              style={{ height: 44 }}
              className="flex w-full items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
            >
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate leading-normal">{job.location}</span>
            </div>
          </div>

          {/* Scheduling Notes */}
          <div className="w-full">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Scheduling / Fitting Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Technician requires access badge from Gate 2. Driver on standby."
              className="!block !h-auto !w-full !min-w-0 rounded-xl border border-slate-300 bg-white !px-3 !py-2 !text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="!h-10 inline-flex items-center px-4 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={conflict.hasConflict}
              className="!h-10 inline-flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
            >
              <CalendarCheck className="w-4 h-4 shrink-0" />
              Confirm & Book Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
