import React, { useState } from 'react';
import { InstallationJob, InstallationStatus } from '../types/installation';
import { StatusBadge } from './shared/StatusBadge';
import { ChecklistValidationDialog } from './ChecklistValidationDialog';
import { ArrowRight, CheckCircle2, AlertTriangle, FileText, X } from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

interface StatusChangeDialogProps {
  job: InstallationJob;
  isOpen: boolean;
  onClose: () => void;
}

export const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({
  job,
  isOpen,
  onClose,
}) => {
  const { changeJobStatus, getChecklistStats } = useOperations();
  const [selectedStatus, setSelectedStatus] = useState<InstallationStatus>(job.status);
  const [note, setNote] = useState<string>('');
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [incompleteCount, setIncompleteCount] = useState<number>(0);
  const [successToast, setSuccessToast] = useState<boolean>(false);

  const allStatuses: InstallationStatus[] = [
    'Not Actioned',
    'Workshop Setup',
    'Waiting Install',
    'Installed',
    'Invoiced',
    'Completed',
  ];

  // Natural recommended next transition
  const getRecommendedNext = (current: InstallationStatus): InstallationStatus | null => {
    switch (current) {
      case 'Not Actioned':
        return 'Workshop Setup';
      case 'Workshop Setup':
        return 'Waiting Install';
      case 'Waiting Install':
        return 'Installed';
      case 'Installed':
        return 'Invoiced';
      case 'Invoiced':
        return 'Completed';
      default:
        return null;
    }
  };

  const recommendedNext = getRecommendedNext(job.status);

  if (!isOpen) return null;

  const handleConfirm = async (bypass: boolean = false) => {
    const res = await changeJobStatus(job.id, selectedStatus, note, 'Current User', bypass);

    if (res.requiresChecklistCompletion) {
      setIncompleteCount(res.incompleteCount || 1);
      setShowValidationModal(true);
      return;
    }

    if (res.success) {
      setSuccessToast(true);
      setTimeout(() => {
        setSuccessToast(false);
        onClose();
      }, 700);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
          {/* Header */}
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

            {/* Current vs New Status visualization */}
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

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Select New Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {allStatuses.map((st) => {
                  const isSelected = selectedStatus === st;
                  const isRecommended = recommendedNext === st;

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStatus(st)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition-all relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{st}</span>
                        {isRecommended && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rule warning notifications */}
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

            {/* Note input */}
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

            {/* Actions */}
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
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Update Status
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Dialog */}
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
