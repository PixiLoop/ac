import React from 'react';
import { ChecklistStats } from '../../../../providers/OperationsContext';

interface ChecklistProgressProps {
  stats: ChecklistStats;
  compact?: boolean;
  showStatusLabel?: boolean;
  className?: string;
}

export const ChecklistProgress: React.FC<ChecklistProgressProps> = ({
  stats,
  compact = false,
  showStatusLabel = true,
  className = '',
}) => {
  const getStatusBadge = () => {
    switch (stats.status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Not Started':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getBarColor = () => {
    if (stats.percent === 100) return 'bg-emerald-500';
    if (stats.percent > 50) return 'bg-blue-600';
    if (stats.percent > 0) return 'bg-amber-500';
    return 'bg-slate-300';
  };

  if (compact) {
    return (
      <div className={`space-y-1.5 whitespace-nowrap text-nowrap ${className}`}>
        <div className="flex items-center justify-between text-xs text-slate-600 whitespace-nowrap text-nowrap">
          <span className="font-medium text-slate-700 whitespace-nowrap text-nowrap">Checklist</span>
          <div className="flex items-center gap-2 whitespace-nowrap text-nowrap">
            <span className="font-semibold text-slate-900 whitespace-nowrap text-nowrap">
              {stats.completed} / {stats.total}
            </span>
            {showStatusLabel && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border whitespace-nowrap text-nowrap ${getStatusBadge()}`}>
                {stats.status}
              </span>
            )}
          </div>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 whitespace-nowrap text-nowrap">
          <div
            className={`h-full transition-all duration-300 whitespace-nowrap text-nowrap ${getBarColor()}`}
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 shadow-xs whitespace-nowrap text-nowrap ${className}`}>
      <div className="flex items-center justify-between mb-2 whitespace-nowrap text-nowrap">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-nowrap">
            Checklist Progress
          </span>
          <div className="flex items-baseline gap-2 mt-0.5 whitespace-nowrap text-nowrap">
            <span className="text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap text-nowrap">
              {stats.completed} <span className="text-base font-normal text-slate-400 whitespace-nowrap text-nowrap">/ {stats.total}</span>
            </span>
            <span className="text-sm font-semibold text-slate-600 whitespace-nowrap text-nowrap">
              ({stats.percent}% completed)
            </span>
          </div>
        </div>
        <div className="text-right whitespace-nowrap text-nowrap">
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap text-nowrap ${getStatusBadge()}`}>
            {stats.status}
          </span>
          {stats.requiredIncomplete > 0 ? (
            <p className="text-[11px] text-amber-600 font-medium mt-1 whitespace-nowrap text-nowrap">
              {stats.requiredIncomplete} required remaining
            </p>
          ) : stats.total > 0 ? (
            <p className="text-[11px] text-emerald-600 font-medium mt-1 whitespace-nowrap text-nowrap">
              ✓ All required items checked
            </p>
          ) : null}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden p-0.5 whitespace-nowrap text-nowrap">
        <div
          className={`h-full rounded-full transition-all duration-500 shadow-xs whitespace-nowrap text-nowrap ${getBarColor()}`}
          style={{ width: `${stats.percent}%` }}
        />
      </div>
    </div>
  );
};
