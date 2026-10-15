"use client"
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  ChecklistSection,
  ChecklistTemplate,
  Customer,
  HardwareItem,
  HardwareModel,
  InstallationJob,
  InstallationStatus,
  Project,
  Technician,
  TimelineEvent,
} from '../components/job-boards/types/installation';
import {
  buildChecklistForHardware,
  INITIAL_INSTALLATION_JOBS,
} from '../components/job-boards/types/mockData';
import { api } from '../lib/job-book-client';

export interface ChecklistStats {
  completed: number;
  total: number;
  requiredTotal: number;
  requiredCompleted: number;
  requiredIncomplete: number;
  percent: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface SchedulingConflictResult {
  hasConflict: boolean;
  conflictingJob?: InstallationJob;
  message?: string;
}

interface OperationsContextType {
  // Data
  jobs: InstallationJob[];
  technicians: Technician[];
  checklistTemplates: ChecklistTemplate[];
  customers: Customer[];
  projects: Project[];
  isApiConnected: boolean;
  
  // Selection & Navigation
  selectedJobId: string | null;
  selectedJob: InstallationJob | null;
  setSelectedJobId: (id: string | null) => void;
  selectedTechnicianId: string | null;
  setSelectedTechnicianId: (id: string | null) => void;
  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  
  // Filtering & View state
  installationsViewMode: 'list' | 'board';
  setInstallationsViewMode: (mode: 'list' | 'board') => void;
  statusFilter: InstallationStatus | 'All';
  setStatusFilter: (status: InstallationStatus | 'All') => void;
  scheduleStatusFilter: 'All' | 'Scheduled' | 'Unscheduled';
  setScheduleStatusFilter: (status: 'All' | 'Scheduled' | 'Unscheduled') => void;
  technicianFilter: string | 'All';
  setTechnicianFilter: (techId: string | 'All') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Actions
  scheduleJob: (
    jobId: string,
    technicianId: string,
    date: string,
    startTime: string,
    endTime: string,
    notes?: string
  ) => Promise<{ success: boolean; conflict?: SchedulingConflictResult }>;
  
  rescheduleJob: (
    jobId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ) => Promise<{ success: boolean; conflict?: SchedulingConflictResult }>;
  
  checkTechnicianConflict: (
    technicianId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeJobId?: string
  ) => SchedulingConflictResult;
  
  getTechnicianJobsForDate: (technicianId: string, date: string) => InstallationJob[];
  
  changeJobStatus: (
    jobId: string,
    newStatus: InstallationStatus,
    note?: string,
    updatedBy?: string,
    bypassValidation?: boolean
  ) => Promise<{ success: boolean; requiresChecklistCompletion?: boolean; incompleteCount?: number }>;
  
  toggleChecklistItem: (
    jobId: string,
    sectionId: string,
    itemId: string,
    completed: boolean,
    notes?: string,
    technicianName?: string
  ) => Promise<void>;
  
  addHardwareToJob: (jobId: string, hardware: HardwareItem) => Promise<void>;
  removeHardwareFromJob: (jobId: string, hardwareId: string) => Promise<void>;
  createInstallationJob: (job: Omit<InstallationJob, 'id' | 'checklistSections' | 'timeline' | 'createdAt' | 'canInvoice'>) => Promise<string>;
  addTechnician: (technician: Omit<Technician, 'id'>) => Promise<string>;
  
  // Template actions
  createChecklistTemplate: (template: Omit<ChecklistTemplate, 'id' | 'lastUpdated'>) => Promise<string>;
  updateChecklistTemplate: (templateId: string, templateData: Partial<ChecklistTemplate>) => Promise<void>;
  deleteChecklistTemplate: (templateId: string) => Promise<void>;
  addTemplateSection: (templateId: string, sectionTitle: string) => Promise<void>;
  deleteTemplateSection: (templateId: string, sectionId: string) => Promise<void>;
  addTemplateItem: (
    templateId: string,
    sectionTitle: string,
    item: { title: string; description?: string; isRequired: boolean }
  ) => Promise<void>;
  updateTemplateItem: (
    templateId: string,
    sectionId: string,
    itemId: string,
    item: { title?: string; description?: string; isRequired?: boolean }
  ) => Promise<void>;
  deleteTemplateItem: (templateId: string, sectionId: string, itemId: string) => Promise<void>;
  
  // Helpers
  getChecklistStats: (job: InstallationJob) => ChecklistStats;
  getTechnicianWorkload: (technicianId: string) => {
    today: number;
    thisWeek: number;
    completed: number;
    pending: number;
  };
  getStatusCounts: () => Record<string, number>;
  refreshFromApi: () => Promise<void>;
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

export const OperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<InstallationJob[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('operations_installation_jobs');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_INSTALLATION_JOBS;
  });
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isApiConnected, setIsApiConnected] = useState<boolean>(true);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [activeNavTab, setActiveNavTab] = useState<string>('installations');
  const [installationsViewMode, setInstallationsViewMode] = useState<'list' | 'board'>('list');
  const [statusFilter, setStatusFilter] = useState<InstallationStatus | 'All'>('All');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'All' | 'Scheduled' | 'Unscheduled'>('All');
  const [technicianFilter, setTechnicianFilter] = useState<string | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedJob = useMemo(() => {
    if (!selectedJobId) return null;
    return jobs.find((j) => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  // Save jobs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('operations_installation_jobs', JSON.stringify(jobs));
      } catch (e) {}
    }
  }, [jobs]);

  // Initial sync with backend REST APIs
  const refreshFromApi = async () => {
    try {
      const [jobsRes, techRes, tmplRes, custRes, projRes] = await Promise.all([
        api.installations.list(),
        api.technicians.list(),
        api.templates.list(),
        api.customers.list(),
        api.projects.list(),
      ]);

      if (jobsRes.data?.data && Array.isArray(jobsRes.data.data) && jobsRes.data.data.length > 0) {
        setJobs((prev) => {
          const apiJobs = jobsRes.data!.data;
          const merged = [...apiJobs];
          for (const localJob of prev) {
            if (!merged.some((j) => j.id === localJob.id)) {
              merged.push(localJob);
            }
          }
          return merged;
        });
      }

      if (techRes.data?.items) {
        setTechnicians(techRes.data.items);
      }

      if (tmplRes?.data) {
        setChecklistTemplates(tmplRes.data as any);
      }
      if (custRes.data?.data) {
        setCustomers(custRes.data.data);
      }
      if (projRes.data?.data) {
        setProjects(projRes.data.data);
      }
      setIsApiConnected(true);
    } catch (err) {
      console.warn('API sync warning; utilizing resilient offline cache:', err);
      setIsApiConnected(false);
    }
  };

  useEffect(() => {
    refreshFromApi();
  }, []);

  // Helper to parse time string "HH:mm" to minutes since midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Client-side quick conflict check
  const checkTechnicianConflict = (
    technicianId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeJobId?: string
  ): SchedulingConflictResult => {
    const tech = technicians.find((t) => t.id === technicianId);
    const techName = tech ? tech.displayName : 'Technician';

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      return {
        hasConflict: true,
        message: 'End time must be after start time.',
      };
    }

    const conflicting = jobs.find((job) => {
      if (excludeJobId && job.id === excludeJobId) return false;
      if (job.technicianId !== technicianId) return false;
      if (job.installationDate !== date) return false;
      if (!job.startTime || !job.endTime) return false;
      if (job.status === 'Completed') return false;

      const jobStart = parseTimeToMinutes(job.startTime);
      const jobEnd = parseTimeToMinutes(job.endTime);

      return startMinutes < jobEnd && endMinutes > jobStart;
    });

    if (conflicting) {
      return {
        hasConflict: true,
        conflictingJob: conflicting,
        message: `${techName} already has a job scheduled (${conflicting.id}) from ${conflicting.startTime} to ${conflicting.endTime}.`,
      };
    }

    return { hasConflict: false };
  };

  const getTechnicianJobsForDate = (technicianId: string, date: string): InstallationJob[] => {
    return jobs
      .filter((j) => j.technicianId === technicianId && j.installationDate === date)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  };

  // Checklist statistics calculator
  const getChecklistStats = (job: InstallationJob): ChecklistStats => {
    let completed = 0;
    let total = 0;
    let requiredTotal = 0;
    let requiredCompleted = 0;

    for (const sec of job.checklistSections || []) {
      for (const item of sec.items || []) {
        total++;
        if (item.isRequired) requiredTotal++;
        if (item.completed) {
          completed++;
          if (item.isRequired) requiredCompleted++;
        }
      }
    }

    const requiredIncomplete = requiredTotal - requiredCompleted;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    let status: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
    if (completed === 0) {
      status = 'Not Started';
    } else if (requiredIncomplete === 0 && (total === 0 || completed === total)) {
      status = 'Completed';
    } else {
      status = 'In Progress';
    }

    return {
      completed,
      total,
      requiredTotal,
      requiredCompleted,
      requiredIncomplete,
      percent,
      status,
    };
  };

  // Schedule Job via API
  const scheduleJob = async (
    jobId: string,
    technicianId: string,
    date: string,
    startTime: string,
    endTime: string,
    notes?: string
  ) => {
    // Call backend API
    const res = await api.installations.schedule(jobId, {
      technicianId,
      date,
      startTime,
      endTime,
      notes,
    });

    if (res.status === 409 || res.error) {
      return {
        success: false,
        conflict: {
          hasConflict: true,
          message: res.error?.message || 'Technician has an overlap scheduling conflict.',
        },
      };
    }

    if (res.data) {
      const updatedJob = res.data;
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updatedJob : j)));
      return { success: true };
    }

    // Fallback local update
    const conflict = checkTechnicianConflict(technicianId, date, startTime, endTime, jobId);
    if (conflict.hasConflict) {
      return { success: false, conflict };
    }

    const tech = technicians.find((t) => t.id === technicianId);
    setJobs((prevJobs) =>
      prevJobs.map((job) => {
        if (job.id !== jobId) return job;
        return {
          ...job,
          technicianId,
          technicianName: tech ? tech.displayName : 'Assigned Technician',
          installationDate: date,
          startTime,
          endTime,
          isScheduled: true,
          status: job.status === 'Not Actioned' ? 'Waiting Install' : job.status,
          notes: notes ? `${job.notes ? `${job.notes}\n` : ''}${notes}` : job.notes,
        };
      })
    );

    return { success: true };
  };

  // Reschedule Job via API
  const rescheduleJob = async (
    jobId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ) => {
    const res = await api.calendar.reschedule({
      jobId,
      newDate,
      newStartTime,
      newEndTime,
    });

    if (res.status === 409 || res.error) {
      return {
        success: false,
        conflict: {
          hasConflict: true,
          message: res.error?.message || 'Technician has an overlap scheduling conflict.',
        },
      };
    }

    if (res.data) {
      const updatedJob = res.data;
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updatedJob : j)));
      return { success: true };
    }

    return { success: true };
  };

  // Change Job Status via API
  const changeJobStatus = async (
    jobId: string,
    newStatus: InstallationStatus,
    note?: string,
    updatedBy: string = 'Current User',
    bypassValidation: boolean = false
  ) => {
    const res = await api.installations.updateStatus(jobId, {
      newStatus,
      note,
      updatedBy,
      bypassValidation,
    });

    if (res.status === 422) {
      return {
        success: false,
        requiresChecklistCompletion: true,
        incompleteCount: res.error?.requiredIncompleteCount || 1,
      };
    }

    if (res.data) {
      const updatedJob = res.data;
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updatedJob : j)));
      return { success: true };
    }

    return { success: true };
  };

  // Toggle checklist item via API
  const toggleChecklistItem = async (
    jobId: string,
    sectionId: string,
    itemId: string,
    completed: boolean,
    notes?: string,
    technicianName: string = 'John Smith'
  ) => {
    // Optimistic UI update
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        const updatedSections = j.checklistSections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const updatedItems = sec.items.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              completed,
              completedBy: completed ? technicianName : undefined,
              completedAt: completed ? new Date().toISOString() : undefined,
              notes: notes !== undefined ? notes : item.notes,
            };
          });
          return { ...sec, items: updatedItems };
        });

        return { ...j, checklistSections: updatedSections };
      })
    );

    // Call API in background
    await api.installations.updateChecklistItem(jobId, sectionId, itemId, {
      completed,
      notes,
      completedBy: technicianName,
    });
  };

  // Add hardware to job via API -> Automatically attaches hardware checklist
  const addHardwareToJob = async (jobId: string, hardware: HardwareItem) => {
    const res = await api.installations.addHardware(jobId, hardware);
    if (res.data) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? res.data! : j)));
      return;
    }

    // Local fallback
    const tmpl = checklistTemplates.find((t) => t.hardwareModel === hardware.model);
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        let newSections = [...job.checklistSections];
        if (tmpl && !newSections.some((s) => s.hardwareModel === hardware.model)) {
          for (const sec of tmpl.sections) {
            newSections.push({
              id: `sec-${hardware.model.toLowerCase()}-${sec.id}-${Date.now().toString().slice(-4)}`,
              title: `${hardware.model} Checklist — ${sec.title}`,
              hardwareModel: hardware.model,
              hardwareName: tmpl.hardwareType,
              items: sec.items.map((item, idx) => ({
                id: `item-${hardware.model}-${sec.id}-${idx}-${Date.now().toString().slice(-4)}`,
                templateItemId: item.id,
                title: item.title,
                description: item.description,
                section: sec.title,
                hardwareModel: hardware.model,
                isRequired: item.isRequired,
                displayOrder: item.displayOrder,
                completed: false,
                notes: '',
              })),
            });
          }
        }
        return { ...job, hardware: [...job.hardware, hardware], checklistSections: newSections };
      })
    );
  };

  // Remove hardware from job via API
  const removeHardwareFromJob = async (jobId: string, hardwareId: string) => {
    const res = await api.installations.removeHardware(jobId, hardwareId);
    if (res.data) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? res.data! : j)));
      return;
    }

    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, hardware: j.hardware.filter((h) => h.id !== hardwareId) } : j))
    );
  };

  // Create installation job via API
  const createInstallationJob = async (
    jobData: Omit<InstallationJob, 'id' | 'checklistSections' | 'timeline' | 'createdAt' | 'canInvoice'>
  ): Promise<string> => {
    const res = await api.installations.create(jobData);
    if (res.data) {
      const createdJob = res.data;
      setJobs((prev) => [createdJob, ...prev]);
      return createdJob.id;
    }

    // Local fallback
    const nextNum = 1070 + jobs.length;
    const newId = `INSTALL-${nextNum}`;
    const hardwareModels = jobData.hardware.map((h) => h.model);
    const checklistSections = buildChecklistForHardware(hardwareModels, checklistTemplates);
    const fallbackJob: InstallationJob = {
      ...jobData,
      id: newId,
      jobNumber: `JOB-2026-${nextNum}`,
      checklistSections,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: jobData.status,
          timestamp: new Date().toISOString(),
          updatedBy: 'Operations Dispatch',
          note: `Created with hardware checklists.`,
        },
      ],
      createdAt: new Date().toISOString(),
      canInvoice: false,
    };
    setJobs((prev) => [fallbackJob, ...prev]);
    return newId;
  };

  // Add technician via API
  const addTechnician = async (techData: Omit<Technician, 'id'>): Promise<string> => {
    const res = await api.technicians.create(techData);
    if (res.data) {
      const createdTech = res.data;
      setTechnicians((prev) => [...prev, createdTech]);
      return createdTech.id;
    }

    const nextNum = 120 + technicians.length;
    const newId = `tech-${Date.now()}`;
    const fallbackTech: Technician = {
      ...techData,
      id: ""
    };
    setTechnicians((prev) => [...prev, fallbackTech]);
    return newId;
  };

  // Template management actions via API
  const createChecklistTemplate = async (
    templateData: Omit<ChecklistTemplate, 'id' | 'lastUpdated'>
  ): Promise<string> => {
    const res = await api.templates.create(templateData);
    if (res.data) {
      const createdTmpl: ChecklistTemplate = {
        ...res.data,
        sections: templateData.sections || res.data.sections || [],
      };
      setChecklistTemplates((prev) => [createdTmpl, ...prev]);
      return createdTmpl.id;
    }

    const newId = `tmpl-${Date.now()}`;
    const newTmpl: ChecklistTemplate = {
      ...templateData,
      id: newId,
      lastUpdated: new Date().toISOString().split('T')[0],
      sections: templateData.sections || [],
    };
    setChecklistTemplates((prev) => [newTmpl, ...prev]);
    return newId;
  };

  const addTemplateSection = async (templateId: string, sectionTitle: string) => {
    await api.templates.addSection(templateId, sectionTitle);
    setChecklistTemplates((prev) =>
      prev.map((tmpl) => {
        if (tmpl.id !== templateId) return tmpl;
        return {
          ...tmpl,
          lastUpdated: new Date().toISOString().split('T')[0],
          sections: [
            ...tmpl.sections,
            {
              id: `sec-custom-${Date.now()}`,
              title: sectionTitle,
              items: [],
            },
          ],
        };
      })
    );
  };

  const addTemplateItem = async (
    templateId: string,
    sectionTitle: string,
    item: { title: string; description?: string; isRequired: boolean }
  ) => {
    const tmpl = checklistTemplates.find((t) => t.id === templateId);
    const sec = tmpl?.sections.find((s) => s.title === sectionTitle);
    if (sec) {
      await api.templates.addItem(templateId, sec.id, item);
    }

    setChecklistTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          lastUpdated: new Date().toISOString().split('T')[0],
          sections: t.sections.map((s) => {
            if (s.title !== sectionTitle) return s;
            const newItem = {
              id: `item-${Date.now()}`,
              title: item.title,
              description: item.description,
              section: sectionTitle,
              isRequired: item.isRequired,
              displayOrder: s.items.length + 1,
            };
            return { ...s, items: [...s.items, newItem] };
          }),
        };
      })
    );
  };

  const updateChecklistTemplate = async (
    templateId: string,
    templateData: Partial<ChecklistTemplate>
  ) => {
    await api.templates.update(templateId, templateData);
    setChecklistTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          ...templateData,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
      })
    );
  };

  const deleteChecklistTemplate = async (templateId: string) => {
    await api.templates.delete(templateId);
    setChecklistTemplates((prev) => prev.filter((t) => t.id !== templateId));
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null);
    }
  };

  const deleteTemplateSection = async (templateId: string, sectionId: string) => {
    await api.templates.deleteSection(templateId, sectionId);
    setChecklistTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          lastUpdated: new Date().toISOString().split('T')[0],
          sections: t.sections.filter((s) => s.id !== sectionId),
        };
      })
    );
  };

  const updateTemplateItem = async (
    templateId: string,
    sectionId: string,
    itemId: string,
    item: { title?: string; description?: string; isRequired?: boolean }
  ) => {
    await api.templates.updateItem(templateId, sectionId, itemId, item);
    setChecklistTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          lastUpdated: new Date().toISOString().split('T')[0],
          sections: t.sections.map((s) => {
            if (s.id !== sectionId) return s;
            return {
              ...s,
              items: s.items.map((i) => {
                if (i.id !== itemId) return i;
                return {
                  ...i,
                  ...(item.title !== undefined ? { title: item.title } : {}),
                  ...(item.description !== undefined ? { description: item.description } : {}),
                  ...(item.isRequired !== undefined ? { isRequired: item.isRequired } : {}),
                };
              }),
            };
          }),
        };
      })
    );
  };

  const deleteTemplateItem = async (templateId: string, sectionId: string, itemId: string) => {
    await api.templates.deleteItem(templateId, sectionId, itemId);
    setChecklistTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          lastUpdated: new Date().toISOString().split('T')[0],
          sections: t.sections.map((s) => {
            if (s.id !== sectionId) return s;
            return {
              ...s,
              items: s.items.filter((i) => i.id !== itemId),
            };
          }),
        };
      })
    );
  };

  // Technician workload calculation
  const getTechnicianWorkload = (technicianId: string) => {
    const techJobs = jobs.filter((j) => j.technicianId === technicianId);
    const todayDate = '2026-10-05';

    const today = techJobs.filter((j) => j.installationDate === todayDate).length;
    const thisWeek = techJobs.filter(
      (j) => j.installationDate && j.installationDate >= '2026-10-05' && j.installationDate <= '2026-10-11'
    ).length;
    const completed = techJobs.filter(
      (j) => j.status === 'Completed' || j.status === 'Invoiced' || j.status === 'Installed'
    ).length;
    const pending = techJobs.filter((j) => j.status !== 'Completed' && j.status !== 'Invoiced').length;

    return { today, thisWeek, completed, pending };
  };

  // Status counts for tabs
  const getStatusCounts = () => {
    const counts: Record<string, number> = {
      All: jobs.length,
      'Not Actioned': 0,
      'Workshop Setup': 0,
      'Waiting Install': 0,
      Installed: 0,
      Invoiced: 0,
      Completed: 0,
    };

    jobs.forEach((j) => {
      if (counts[j.status] !== undefined) {
        counts[j.status]++;
      }
    });

    return counts;
  };

  return (
    <OperationsContext.Provider
      value={{
        jobs,
        technicians,
        checklistTemplates,
        customers,
        projects,
        isApiConnected,
        selectedJobId,
        selectedJob,
        setSelectedJobId,
        selectedTechnicianId,
        setSelectedTechnicianId,
        selectedTemplateId,
        setSelectedTemplateId,
        selectedProjectId,
        setSelectedProjectId,
        activeNavTab,
        setActiveNavTab,
        installationsViewMode,
        setInstallationsViewMode,
        statusFilter,
        setStatusFilter,
        scheduleStatusFilter,
        setScheduleStatusFilter,
        technicianFilter,
        setTechnicianFilter,
        searchQuery,
        setSearchQuery,
        scheduleJob,
        rescheduleJob,
        checkTechnicianConflict,
        getTechnicianJobsForDate,
        changeJobStatus,
        toggleChecklistItem,
        addHardwareToJob,
        removeHardwareFromJob,
        createInstallationJob,
        addTechnician,
        createChecklistTemplate,
        updateChecklistTemplate,
        deleteChecklistTemplate,
        addTemplateSection,
        deleteTemplateSection,
        addTemplateItem,
        updateTemplateItem,
        deleteTemplateItem,
        getChecklistStats,
        getTechnicianWorkload,
        getStatusCounts,
        refreshFromApi,
      }}
    >
      {children}
    </OperationsContext.Provider>
  );
};

export const useOperations = () => {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
};