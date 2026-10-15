import React, { useState } from 'react';
import { InstallationJob } from '../types/installation';
import { Calendar, Clock, AlertTriangle, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

interface RescheduleDialogProps {
  job: InstallationJob;
  isOpen: boolean;
  targetDate?: string;
  targetStartTime?: string;
  targetEndTime?: string;
  onClose: () => void;
}

export const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  job,
  isOpen,
  targetDate: initialDate,
  targetStartTime: initialStart,
  targetEndTime: initialEnd,
  onClose,
}) => {
  const { rescheduleJob, checkTechnicianConflict } = useOperations();
  const [newDate, setNewDate] = useState<string>(initialDate || '2026-10-11');
  const [newStartTime, setNewStartTime] = useState<string>(initialStart || '14:00');
  const [newEndTime, setNewEndTime] = useState<string>(initialEnd || '16:00');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const conflict = job.technicianId
    ? checkTechnicianConflict(job.technicianId, newDate, newStartTime, newEndTime, job.id)
    : { hasConflict: false };

  const handleConfirm = async () => {
    setErrorMsg(null);
    if (conflict.hasConflict) {
      setErrorMsg(conflict.message || 'Technician has a scheduling conflict.');
      return;
    }

    const res = await rescheduleJob(job.id, newDate, newStartTime, newEndTime);
    if (!res.success) {
      setErrorMsg(res.conflict?.message || 'Could not reschedule job.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Reschedule Installation?</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono font-bold text-slate-900">{job.id}</span>
              <span className="font-medium text-slate-600">{job.technicianName}</span>
            </div>
            <p className="text-slate-500 font-medium truncate">{job.customerName}</p>
          </div>

          {/* From / To Comparison */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                From Current
              </span>
              <p className="font-bold text-slate-800">
                {job.installationDate || 'Not set'}
              </p>
              <p className="text-slate-600">
                {job.startTime && job.endTime ? `${job.startTime} – ${job.endTime}` : 'No time'}
              </p>
            </div>

            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200">
              <span className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                To New Schedule
              </span>
              <p className="font-bold text-blue-900">{newDate}</p>
              <p className="text-blue-800">
                {newStartTime} – {newEndTime}
              </p>
            </div>
          </div>

          {/* Edit selectors */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                New Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  New Start
                </label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  New End
                </label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {conflict.hasConflict && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{conflict.message}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2 bg-rose-50 text-rose-700 text-xs rounded-lg">{errorMsg}</div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={conflict.hasConflict}
              onClick={handleConfirm}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              Confirm Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
