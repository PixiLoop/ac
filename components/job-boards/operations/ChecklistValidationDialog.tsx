import React from 'react';
import { AlertCircle, CheckSquare, ArrowRight, X } from 'lucide-react';

interface ChecklistValidationDialogProps {
  isOpen: boolean;
  incompleteCount: number;
  onClose: () => void;
  onViewChecklist: () => void;
  onAdminOverride?: () => void;
}

export const ChecklistValidationDialog: React.FC<ChecklistValidationDialogProps> = ({
  isOpen,
  incompleteCount,
  onClose,
  onViewChecklist,
  onAdminOverride,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 w-full max-w-md overflow-hidden p-6 text-center">
        {/* Icon */}
        <div className="w-14 h-14 bg-amber-100 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Checklist Incomplete
        </h3>

        <div className="my-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-sm">
          <p className="font-semibold text-amber-800">
            {incompleteCount} required checklist item{incompleteCount === 1 ? '' : 's'} still incomplete.
          </p>
          <p className="text-xs text-amber-700 mt-1">
            All mandatory hardware verification and safety tasks must be completed before signing off this installation as <strong>Completed</strong>.
          </p>
        </div>

        <p className="text-xs text-slate-500 mb-6">
          Complete the required checklist items on the job detail page to finalize installation sign-off.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onViewChecklist}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            View Checklist
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          {onAdminOverride && (
            <button
              onClick={onAdminOverride}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Manager Override Sign-off
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
