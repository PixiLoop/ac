import React, { useState, useMemo } from 'react';
import { InstallationJob, InstallationStatus } from '../types/installation';
import { useOperations } from '../../../providers/OperationsContext';
import { StatusBadge } from './shared/StatusBadge';
import { RescheduleDialog } from './RescheduleDialog';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Filter,
  CheckCircle2,
  CalendarCheck,
  ChevronDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export const OperationsCalendar: React.FC = () => {
  const router = useRouter()
  const {
    jobs,
    technicians,
    projects,
    customers,
    setSelectedJobId,
  } = useOperations();

  // Calendar View mode: Month, Week, Day (Requirement #20)
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');

  // Calendar base date: 2026-10-05 (Current working week in mock)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 5)); // Oct 5, 2026

  // Filters (Requirement #21 & #22)
  const [selectedStatuses, setSelectedStatuses] = useState<InstallationStatus[]>([
    'Waiting Install',
    'Workshop Setup',
    'Installed',
  ]);
  const [selectedTechFilter, setSelectedTechFilter] = useState<string>('All');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('All');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('All');

  // Reschedule dialog state (Requirement #24)
  const [rescheduleJobTarget, setRescheduleJobTarget] = useState<InstallationJob | null>(null);

  const allStatuses: InstallationStatus[] = [
    'Not Actioned',
    'Workshop Setup',
    'Waiting Install',
    'Installed',
    'Invoiced',
    'Completed',
  ];

  const toggleStatusFilter = (st: InstallationStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  // Filter jobs based on calendar filter controls
  const filteredCalendarJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Must have date to show on calendar
      if (!job.installationDate) return false;

      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(job.status)) {
        return false;
      }

      // Tech filter
      if (selectedTechFilter !== 'All' && job.technicianId !== selectedTechFilter) {
        return false;
      }

      // Project filter
      if (selectedProjectFilter !== 'All' && job.projectId !== selectedProjectFilter) {
        return false;
      }

      // Customer filter
      if (selectedCustomerFilter !== 'All' && job.customerId !== selectedCustomerFilter) {
        return false;
      }

      return true;
    });
  }, [jobs, selectedStatuses, selectedTechFilter, selectedProjectFilter, selectedCustomerFilter]);

  // Navigate calendar
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (calendarView === 'month') next.setMonth(next.getMonth() - 1);
    else if (calendarView === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (calendarView === 'month') next.setMonth(next.getMonth() + 1);
    else if (calendarView === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 5));
  };

  // Helper for formatting YYYY-MM-DD
  const formatDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: Month days generation
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Fill previous month days to start on Monday (or Sunday)
    const startDayIndex = (firstDay.getDay() + 6) % 7; // Monday = 0
    for (let i = startDayIndex; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({ date: d, dateStr: formatDateString(d), isCurrentMonth: false });
    }

    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, dateStr: formatDateString(d), isCurrentMonth: true });
    }

    // Days of next month to complete grid (42 days total)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, dateStr: formatDateString(d), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Helper: Week days generation (7 days from Monday of the week)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayIndex);

    const days: { date: Date; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push({ date: day, dateStr: formatDateString(day) });
    }
    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 mx-auto pb-12 animate-in fade-in duration-200">
      {/* Calendar Header with views and navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            Operations Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet telematics installation scheduling, technician assignments, and fitting timeline.
          </p>
        </div>

        {/* View Mode Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-xs p-1">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
            >
              Today (Oct 5)
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center">
            {monthName}
          </span>

          {/* Month / Week / Day toggles */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${calendarView === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Month
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${calendarView === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${calendarView === 'day'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* Top Filter Bar (Requirements #21 & #22) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        {/* Status multi-filter pill selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Filter by Status (Multi-select)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedStatuses(allStatuses)}
                className="text-[11px] text-blue-600 font-medium hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={() => setSelectedStatuses([])}
                className="text-[11px] text-slate-500 font-medium hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {allStatuses.map((st) => {
              const isSelected = selectedStatuses.includes(st);
              return (
                <button
                  key={st}
                  onClick={() => toggleStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-400'
                      }`}
                  />
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropdowns for Technician, Project, Customer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Technician
            </label>
            <select
              value={selectedTechFilter}
              onChange={(e) => setSelectedTechFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Technicians</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName} ({t.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Project
            </label>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Customer
            </label>
            <select
              value={selectedCustomerFilter}
              onChange={(e) => setSelectedCustomerFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. MONTH VIEW */}
      {calendarView === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Month 6x7 Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {monthDays.map(({ date, dateStr, isCurrentMonth }) => {
              const dayJobs = filteredCalendarJobs.filter(
                (j) => j.installationDate === dateStr
              );
              const isToday = dateStr === '2026-10-05';

              return (
                <div
                  key={dateStr}
                  className={`min-h-[125px] p-2 flex flex-col transition-colors ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400'
                    } ${isToday ? 'bg-blue-50/30 ring-1 ring-blue-400/50 inset-0' : ''}`}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isToday
                          ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                          : isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayJobs.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-500">
                        {dayJobs.length} job{dayJobs.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  {/* Calendar Event Cards (Requirement #23) */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[140px] pr-0.5">
                    {dayJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => router.push(`/job-boards/job/${job.id}`)
                        }
                        className={`group p-2 rounded-xl border text-left cursor-pointer transition-all shadow-2xs hover:shadow-xs relative ${job.status === 'Completed'
                            ? 'bg-teal-50/80 border-teal-200 hover:border-teal-400'
                            : job.status === 'Installed'
                              ? 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-400'
                              : job.status === 'Waiting Install'
                                ? 'bg-blue-50/80 border-blue-200 hover:border-blue-400'
                                : 'bg-amber-50/80 border-amber-200 hover:border-amber-400'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-mono font-bold text-[11px] text-slate-900 truncate">
                            {job.id}
                          </span>
                          <span className="text-[10px] font-mono text-slate-600 shrink-0 font-medium">
                            {job.startTime || 'TBD'}
                          </span>
                        </div>

                        <p className="text-[11px] font-semibold text-slate-800 line-clamp-1">
                          {job.customerName}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1 pt-1 border-t border-slate-200/50">
                          <span className="truncate">{job.technicianName}</span>
                          <span className="font-semibold text-slate-700 shrink-0">
                            {job.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. WEEK VIEW (Requirement #20) */}
      {calendarView === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center divide-x divide-slate-200">
            {weekDays.map(({ date, dateStr }) => {
              const isToday = dateStr === '2026-10-05';
              return (
                <div key={dateStr} className={`py-3 px-2 ${isToday ? 'bg-blue-50/60' : ''}`}>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span
                    className={`inline-block mt-0.5 text-base font-extrabold ${isToday
                        ? 'text-white bg-blue-600 px-2 py-0.5 rounded-lg'
                        : 'text-slate-800'
                      }`}
                  >
                    {date.getDate()} {date.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[460px]">
            {weekDays.map(({ dateStr }) => {
              const dayJobs = filteredCalendarJobs.filter(
                (j) => j.installationDate === dateStr
              );

              return (
                <div key={dateStr} className="p-2 space-y-2.5 bg-white">
                  {dayJobs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[11px] text-slate-300 py-8">
                      No jobs
                    </div>
                  ) : (
                    dayJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => router.push(`/job-boards/job/${job.id}`)}
                        className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer transition-all shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {job.id}
                          </span>
                          <StatusBadge status={job.status} />
                        </div>

                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                          {job.customerName}
                        </p>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {job.startTime} – {job.endTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{job.technicianName}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRescheduleJobTarget(job);
                          }}
                          className="w-full text-center text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 py-1 rounded-lg border border-slate-200 mt-1 transition-colors"
                        >
                          Reschedule
                        </button>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DAY VIEW (Requirement #20) */}
      {calendarView === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Detailed Timeline for{' '}
                {currentDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <p className="text-xs text-slate-500">
                Technician slots, bays, and sequential work schedules.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              {
                filteredCalendarJobs.filter(
                  (j) => j.installationDate === formatDateString(currentDate)
                ).length
              }{' '}
              installations scheduled
            </span>
          </div>

          <div className="space-y-3">
            {filteredCalendarJobs
              .filter((j) => j.installationDate === formatDateString(currentDate))
              .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
              .map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/job-boards/job/${job.id}`)}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors shadow-2xs"
                >
                  <div className="flex items-start gap-4">
                    <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-center min-w-[90px]">
                      <span className="block font-mono text-sm font-bold text-slate-900">
                        {job.startTime}
                      </span>
                      <span className="block font-mono text-[10px] text-slate-400">
                        to {job.endTime}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {job.id}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {job.customerName}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {job.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 justify-end">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {job.technicianName}
                      </span>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {job.vehicle.rego} • {job.vehicle.fleetNumber}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRescheduleJobTarget(job);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg shadow-2xs"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}

            {filteredCalendarJobs.filter(
              (j) => j.installationDate === formatDateString(currentDate)
            ).length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No installations scheduled for this day under active filters.
                </div>
              )}
          </div>
        </div>
      )}

      {/* Reschedule Confirmation Dialog (Requirement #24) */}
      {rescheduleJobTarget && (
        <RescheduleDialog
          job={rescheduleJobTarget}
          isOpen={!!rescheduleJobTarget}
          onClose={() => setRescheduleJobTarget(null)}
        />
      )}
    </div>
  );
};
