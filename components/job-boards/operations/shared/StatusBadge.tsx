import React from 'react';
import { InstallationStatus, TechnicianStatus } from '../../types/installation';

export const StatusBadge: React.FC<{ status: InstallationStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const getColors = () => {
    switch (status) {
      case 'Not Actioned':
        return 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-400/20';
      case 'Workshop Setup':
        return 'bg-amber-50 text-amber-800 border-amber-300 ring-amber-400/20';
      case 'Waiting Install':
        return 'bg-blue-50 text-blue-800 border-blue-300 ring-blue-400/20';
      case 'Installed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-400/20';
      case 'Invoiced':
        return 'bg-purple-50 text-purple-800 border-purple-300 ring-purple-400/20';
      case 'Completed':
        return 'bg-teal-50 text-teal-800 border-teal-300 ring-teal-400/20';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs ${getColors()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
};

export const ScheduleBadge: React.FC<{ isScheduled: boolean; className?: string }> = ({
  isScheduled,
  className = '',
}) => {
  if (isScheduled) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Scheduled
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Unscheduled
    </span>
  );
};

export const TechnicianStatusBadge: React.FC<{ status: TechnicianStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const getBadge = () => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Assigned':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Busy':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'On_Leave':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      case 'Inactive':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadge()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
};
