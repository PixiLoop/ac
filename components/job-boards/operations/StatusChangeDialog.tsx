import React, { useEffect, useState } from 'react';
import { InstallationJob, InstallationStatus } from '../types/installation';
import { StatusBadge } from './shared/StatusBadge';
import { ChecklistValidationDialog } from './ChecklistValidationDialog';
import { ArrowRight, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

interface StatusChangeDialogProps {
  job: InstallationJob;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_FLOW: InstallationStatus[] = [
  'Not Actioned',
  'Workshop Setup',
  'Waiting Install',
  'Installed',
  'Invoiced',
  'Completed',
];

export const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({
  job,
  isOpen,
  onClose,
}) => {
  const { changeJobStatus } = useOperations();
  const currentIdx = Math.max(0, STATUS_FLOW.indexOf(job.status));
  const recommendedNext = STATUS_FLOW[currentIdx + 1] ?? null;

  const [selectedStatus, setSelectedStatus] = useState<InstallationStatus>(
    recommendedNext || job.status,
  );
  const [note, setNote] = useState<string>('');
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [incompleteCount, setIncompleteCount] = useState<number>(0);
  const [successToast, setSuccessToast] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const idx = Math.max(0, STATUS_FLOW.indexOf(job.status));
    setSelectedStatus(STATUS_FLOW[idx + 1] || job.status);
    setNote('');
    setErrorMsg(null);
    setSuccessToast(false);
  }, [isOpen, job.status, job.id]);

  if (!isOpen) return null;

  const handleConfirm = async (bypass: boolean = false) => {
    setErrorMsg(null);
    if (STATUS_FLOW.indexOf(selectedStatus) < currentIdx) {
      setErrorMsg('Status can only move forward in the install flow.');
      return;
    }

    const res = await changeJobStatus(
      job.id,
      selectedStatus,
      note.trim() || undefined,
      'Current User',
      bypass,
    );

    if (res.requiresChecklistCompletion) {
      setIncompleteCount(res.incompleteCount || 1);
      setShowValidationModal(true);
      return;
    }

    if (!res.success) {
      setErrorMsg((res as any).message || 'Could not update status.');
      return;
    }

    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 700);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <div>
              <h3 className="text-base font-bold text-slate-900">Change Installation Status</h3>
              <p className="text-xs text-slate-500 font-mono">
                {job.id} • {job.customerName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {successToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Status updated to {selectedStatus} and logged to timeline.
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Current Status
                </span>
                <StatusBadge status={job.status} />
              </div>

              <ArrowRight className="w-5 h-5 text-slate-400" />

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  New Status
                </span>
                <StatusBadge status={selectedStatus} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Select New Status (forward flow)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_FLOW.map((st, idx) => {
                  const isSelected = selectedStatus === st;
                  const isRecommended = recommendedNext === st;
                  const isPast = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={isPast}
                      onClick={() => !isPast && setSelectedStatus(st)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition-all relative ${
                        isPast
                          ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                          : isSelected
                            ? 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>
                          {st}
                          {isCurrent ? ' (current)' : ''}
                        </span>
                        {isRecommended && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded shrink-0">
                            Next
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedStatus === 'Installed' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Transitioning to <strong>Installed</strong> unlocks invoice creation for this fitting job.
                </span>
              </div>
            )}

            {selectedStatus === 'Completed' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Marking as <strong>Completed</strong> verifies all mandatory checklist items have been signed off.
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status Change Note (Optional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Fitting verified by supervisor, calibration completed on vehicle cluster."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirm(false)}
                disabled={selectedStatus === job.status}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                Update Status
              </button>
            </div>
          </div>
        </div>
      </div>

      <ChecklistValidationDialog
        isOpen={showValidationModal}
        incompleteCount={incompleteCount}
        onClose={() => setShowValidationModal(false)}
        onViewChecklist={() => {
          setShowValidationModal(false);
          onClose();
        }}
        onAdminOverride={() => {
          setShowValidationModal(false);
          handleConfirm(true);
        }}
      />
    </>
  );
};
