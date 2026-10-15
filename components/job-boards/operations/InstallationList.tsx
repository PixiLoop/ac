import React, { useState } from 'react';
import { InstallationJob, InstallationStatus, HardwareModel } from '../types/installation';
import { StatusBadge, ScheduleBadge } from './shared/StatusBadge';
import { ChecklistProgress } from './shared/ChecklistProgress';
import { JobScheduleCard } from './shared/JobScheduleCard';
import { ScheduleJobDialog } from './ScheduleJobDialog';
import { StatusChangeDialog } from './StatusChangeDialog';
import {
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Clock,
  MapPin,
  User,
  ArrowRight,
  CheckCircle2,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

export const InstallationList: React.FC = () => {
  const {
    jobs,
    technicians,
    customers,
    projects,
    statusFilter,
    setStatusFilter,
    scheduleStatusFilter,
    setScheduleStatusFilter,
    technicianFilter,
    setTechnicianFilter,
    searchQuery,
    setSearchQuery,
    installationsViewMode,
    setInstallationsViewMode,
    setSelectedJobId,
    getStatusCounts,
    getChecklistStats,
    createInstallationJob,
  } = useOperations();

  const [schedulingJob, setSchedulingJob] = useState<InstallationJob | null>(null);
  const [statusChangingJob, setStatusChangingJob] = useState<InstallationJob | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form state for creating a new job
  const [newCustId, setNewCustId] = useState<string>(customers[0]?.id || '');
  const [newProjId, setNewProjId] = useState<string>(projects[0]?.id || '');
  const [newLocation, setNewLocation] = useState<string>('Sydney Central Depot — Bay 1');
  const [newRego, setNewRego] = useState<string>('XY-99-ZZ');
  const [newFleet, setNewFleet] = useState<string>('TRUCK-501');
  const [newVin, setNewVin] = useState<string>('1HD1KRE12FB998811');
  const [newMake, setNewMake] = useState<string>('Kenworth T610');
  const [selectedHwList, setSelectedHwList] = useState<HardwareModel[]>(['MIX4000', 'HD Camera', 'SIM']);

  const statusCounts = getStatusCounts();

  const statuses: (InstallationStatus | 'All')[] = [
    'All',
    'Not Actioned',
    'Workshop Setup',
    'Waiting Install',
    'Installed',
    'Invoiced',
    'Completed',
  ];

  // Filtering
  const filteredJobs = jobs.filter((job) => {
    // Status filter
    if (statusFilter !== 'All' && job.status !== statusFilter) return false;

    // Schedule status filter
    if (scheduleStatusFilter === 'Scheduled' && !job.isScheduled) return false;
    if (scheduleStatusFilter === 'Unscheduled' && job.isScheduled) return false;

    // Technician filter
    if (technicianFilter !== 'All' && job.technicianId !== technicianFilter) return false;

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchId = job.id.toLowerCase().includes(q);
      const matchCust = job.customerName.toLowerCase().includes(q);
      const matchRego = job.vehicle.rego.toLowerCase().includes(q);
      const matchTech = (job.technicianName || '').toLowerCase().includes(q);
      const matchLoc = job.location.toLowerCase().includes(q);
      if (!matchId && !matchCust && !matchRego && !matchTech && !matchLoc) return false;
    }

    return true;
  });

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === newCustId);
    const proj = projects.find((p) => p.id === newProjId);

    const createdId = await createInstallationJob({
      jobNumber: `JOB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: newCustId,
      customerName: cust ? cust.name : 'ABC Transport Pty Ltd',
      customerContact: cust?.contactPerson,
      customerPhone: cust?.phone,
      projectId: newProjId,
      projectName: proj ? proj.name : 'Fleet Overhaul',
      location: newLocation,
      vehicle: {
        rego: newRego,
        fleetNumber: newFleet,
        vin: newVin,
        makeModel: newMake,
      },
      hardware: selectedHwList.map((m, idx) => ({
        id: `hw-new-${idx}-${Date.now()}`,
        model: m,
        name: `${m} Telematics Component`,
        serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
        category:
          m === 'MIX4000' || m === 'FM3306'
            ? 'Telematics Unit'
            : m === 'HD Camera' || m === 'Standard Camera'
            ? 'Camera & Video'
            : m === 'SIM'
            ? 'Connectivity'
            : 'Sensors',
      })),
      isScheduled: false,
      status: 'Not Actioned',
      notes: 'Freshly raised work order.',
    });

    setShowCreateModal(false);
    setSelectedJobId(createdId);
  };

  const toggleHardwareSelect = (m: HardwareModel) => {
    setSelectedHwList((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  return (
    <div className="space-y-6 mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Installation Jobs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track hardware fitting, auto-generated checklists, technician assignments, and progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle (List vs Board) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setInstallationsViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                installationsViewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setInstallationsViewMode('board')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                installationsViewMode === 'board'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Board
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Installation
          </button>
        </div>
      </div>

      {/* Status Counters Tab Bar (Requirement #29) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {statuses.map((st) => {
            const count = statusCounts[st] || 0;
            const isActive = statusFilter === st;

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by job ID, customer, rego, or technician..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Schedule Status Filter (Requirement #34) */}
        <div>
          <select
            value={scheduleStatusFilter}
            onChange={(e) => setScheduleStatusFilter(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">Schedule: All</option>
            <option value="Scheduled">Schedule: Scheduled Only</option>
            <option value="Unscheduled">Schedule: Unscheduled Only</option>
          </select>
        </div>

        {/* Technician Filter (Requirement #13) */}
        <div>
          <select
            value={technicianFilter}
            onChange={(e) => setTechnicianFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">Technician: All Installers</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName} ({t.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: List View or Board View */}
      {installationsViewMode === 'list' ? (
        /* TABLE LIST VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Job / Vehicle</th>
                  <th className="py-3.5 px-4">Customer & Depot</th>
                  <th className="py-3.5 px-4">Installer</th>
                  <th className="py-3.5 px-4">Schedule Date & Time</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Checklist Progress</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No installation jobs match your current filters.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const stats = getChecklistStats(job);

                    return (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                      >
                        {/* Job ID & Vehicle */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600">
                              {job.id}
                            </span>
                            <ScheduleBadge isScheduled={job.isScheduled} />
                          </div>
                          <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                            {job.vehicle.rego} • {job.vehicle.makeModel}
                          </p>
                        </td>

                        {/* Customer & Location */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 line-clamp-1">
                            {job.customerName}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {job.location}
                          </p>
                        </td>

                        {/* Installer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-slate-800">
                              {job.technicianName || (
                                <span className="text-amber-600 italic">Unassigned</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Schedule Date & Time */}
                        <td className="py-3.5 px-4">
                          {job.installationDate ? (
                            <div>
                              <div className="font-medium text-slate-800 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {job.installationDate}
                              </div>
                              {job.startTime && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {job.startTime} – {job.endTime}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not Booked</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <StatusBadge status={job.status} />
                        </td>

                        {/* Checklist */}
                        <td className="py-3.5 px-4 min-w-[150px]">
                          <ChecklistProgress stats={stats} compact={true} />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setSchedulingJob(job)}
                              title="Schedule / Reschedule"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <CalendarCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setStatusChangingJob(job)}
                              title="Update Status"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedJobId(job.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN / BOARD VIEW (Requirement #30) */
        <div className="overflow-x-auto pb-4">
          <div className="grid grid-cols-6 gap-4 min-w-[1250px]">
            {(
              [
                'Not Actioned',
                'Workshop Setup',
                'Waiting Install',
                'Installed',
                'Invoiced',
                'Completed',
              ] as InstallationStatus[]
            ).map((columnStatus) => {
              const columnJobs = filteredJobs.filter((j) => j.status === columnStatus);

              return (
                <div
                  key={columnStatus}
                  className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200 flex flex-col max-h-[78vh]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {columnStatus}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                      {columnJobs.length}
                    </span>
                  </div>

                  {/* Cards container */}
                  <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                    {columnJobs.length === 0 ? (
                      <div className="p-6 text-center text-[11px] text-slate-400">
                        No jobs in this phase
                      </div>
                    ) : (
                      columnJobs.map((job) => (
                        <JobScheduleCard
                          key={job.id}
                          job={job}
                          onClick={() => setSelectedJobId(job.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule Dialog */}
      {schedulingJob && (
        <ScheduleJobDialog
          job={schedulingJob}
          isOpen={!!schedulingJob}
          onClose={() => setSchedulingJob(null)}
        />
      )}

      {/* Status Change Dialog */}
      {statusChangingJob && (
        <StatusChangeDialog
          job={statusChangingJob}
          isOpen={!!statusChangingJob}
          onClose={() => setStatusChangingJob(null)}
        />
      )}

      {/* New Installation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Create Installation Job</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Customer
                </label>
                <select
                  value={newCustId}
                  onChange={(e) => setNewCustId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Project
                </label>
                <select
                  value={newProjId}
                  onChange={(e) => setNewProjId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Vehicle Rego
                  </label>
                  <input
                    type="text"
                    value={newRego}
                    onChange={(e) => setNewRego(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Fleet Number
                  </label>
                  <input
                    type="text"
                    value={newFleet}
                    onChange={(e) => setNewFleet(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Installation Depot Location
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs"
                  required
                />
              </div>

              {/* Hardware Selection (Demonstrating requirement #1 & #6) */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Select Hardware Components (Auto-attaches Checklists)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'MIX4000',
                      'FM3306',
                      'HD Camera',
                      'Standard Camera',
                      'SIM',
                      'GPS Unit',
                      'Base Unit',
                    ] as HardwareModel[]
                  ).map((model) => {
                    const isSelected = selectedHwList.includes(model);
                    return (
                      <button
                        type="button"
                        key={model}
                        onClick={() => toggleHardwareSelect(model)}
                        className={`p-2 rounded-xl text-xs font-semibold border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{model}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecting hardware will generate the combined installation checklist sections.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedHwList.length === 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  Create & Generate Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
