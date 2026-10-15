import React, { useState } from 'react';
import { Technician, TechnicianStatus } from '../types/installation';
import { TechnicianStatusBadge } from './shared/StatusBadge';
import { TechnicianDetail } from './TechnicianDetail';
import {
  Users,
  Search,
  Phone,
  Mail,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';

export const TechnicianList: React.FC = () => {
  const {
    technicians,
    selectedTechnicianId,
    setSelectedTechnicianId,
    getTechnicianWorkload,
  } = useOperations();

  const [techStatusFilter, setTechStatusFilter] = useState<TechnicianStatus | 'All'>('All');
  const [search, setSearch] = useState<string>('');

  const selectedTechnician = technicians.find((t) => t.id === selectedTechnicianId);

  if (selectedTechnician) {
    return (
      <TechnicianDetail
        technician={selectedTechnician}
        onBack={() => setSelectedTechnicianId(null)}
      />
    );
  }

  // Filter technicians
  const filteredTechnicians = technicians.filter((tech) => {
    if (techStatusFilter !== 'All' && tech.status !== techStatusFilter) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchName = tech.displayName.toLowerCase().includes(q);
      const matchEmp = tech.id.toLowerCase().includes(q);
      if (!matchName && !matchEmp) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 mx-auto pb-12 animate-in fade-in duration-200">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Technicians / Installers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Certified telematics installers, daily workloads, availability status, and booking conflicts.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technician name, ID, or depot..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={techStatusFilter}
            onChange={(e) => setTechStatusFilter(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">Status: All Statuses</option>
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="Busy">Busy</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Technician Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Technician</th>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-4">Contact (Phone & Email)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Current Jobs</th>
                <th className="py-3.5 px-4 text-center">Upcoming</th>
                <th className="py-3.5 px-4 text-center">Completed</th>
                <th className="py-3.5 px-4">Current Availability</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTechnicians.map((tech) => {
                const workload = getTechnicianWorkload(tech.id);
                const isFreeToday = workload.today === 0 && tech.status !== 'On_Leave';

                return (
                  <tr
                    key={tech.id}
                    onClick={() => setSelectedTechnicianId(tech.id)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                  >
                    {/* Technician Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
                          {(`${tech.firstName} ${tech.lastName}`).slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-blue-600">
                            {tech.displayName}
                          </p>
                          <p className="text-[11px] text-slate-500">Technician</p>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {`${tech.firstName} ${tech.lastName}`}
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <p className="text-slate-800 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {tech.phone ?? "-"}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {tech.email}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <TechnicianStatusBadge status={tech.status} />
                    </td>

                    {/* Current Jobs */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100">
                        {workload.today}
                      </span>
                    </td>

                    {/* Upcoming Jobs */}
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {workload.thisWeek}
                    </td>

                    {/* Completed Jobs */}
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                      {workload.completed}
                    </td>

                    {/* Current Availability */}
                    <td className="py-3.5 px-4">
                      {tech.status === 'On_Leave' ? (
                        <span className="text-[11px] text-slate-400 font-medium">
                          On Leave
                        </span>
                      ) : isFreeToday ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Open for bookings
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {workload.today} job{workload.today === 1 ? '' : 's'} assigned
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTechnicianId(tech.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Schedule
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};