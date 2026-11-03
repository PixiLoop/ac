"use client"
import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChecklistSection,
  ChecklistTemplate,
  Customer,
  HardwareItem,
  HardwareModel,
  InstallationJob,
  InstallationLineItem,
  InstallationStatus,
  Project,
  Technician,
  TimelineEvent,
} from '../components/job-boards/types/installation';
import {
  buildChecklistForHardware,
  INITIAL_INSTALLATION_JOBS,
} from '../components/job-boards/types/mockData';
import { api, formatJobBookError } from '../lib/job-book-client';
import { useAuth } from './auth-provider';

export interface UnitCode {
  id: string;
  segment: number;
  type: string;
  code: string;
  label: string;
  mixCode: string;
  mixIndex: number;
  dependsOn: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  productId: string | null;
}

export interface UserContractor {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  profilePhotoUrl: string | null;
  passwordHash: string;
  isActive: boolean;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  secretQuestion: string | null;
  secretAnswerHash: string | null;
  lastLoginAt: string | null; // or Date if you parse it
  createdAt: string;           // or Date if you parse it
  updatedAt: string;           // or Date if you parse it
  defaultLandingPage: string;
  deletedAt: string | null;    // or Date if you parse it
  status: string;
}


export interface UserSubContractor {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  profilePhotoUrl: string | null;
  passwordHash: string;
  isActive: boolean;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  secretQuestion: string | null;
  secretAnswerHash: string | null;
  lastLoginAt: string | null; // or Date if you parse it
  createdAt: string;           // or Date if you parse it
  updatedAt: string;           // or Date if you parse it
  defaultLandingPage: string;
  deletedAt: string | null;    // or Date if you parse it
  status: string;
}

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
    assignedTo: "technician" | "contractor" | "subcontractor",
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
  uploadChecklistPhoto: (
    jobId: string,
    sectionId: string,
    itemId: string,
    file: File,
  ) => Promise<{ success: boolean; message?: string }>;
  deleteChecklistPhoto: (
    jobId: string,
    sectionId: string,
    itemId: string,
    photoId: string,
  ) => Promise<{ success: boolean; message?: string }>;
  addChecklistComment: (
    jobId: string,
    sectionId: string,
    itemId: string,
    text: string,
    authorName?: string,
  ) => Promise<{ success: boolean; message?: string }>;
  deleteChecklistComment: (
    jobId: string,
    sectionId: string,
    itemId: string,
    commentId: string,
  ) => Promise<{ success: boolean; message?: string }>;

  addHardwareToJob: (jobId: string, hardware: HardwareItem) => Promise<void>;
  removeHardwareFromJob: (jobId: string, hardwareId: string) => Promise<void>;
  regenerateJobChecklist: (jobId: string) => Promise<{ success: boolean; message?: string }>;
  addLineItemToJob: (
    jobId: string,
    item: {
      productId: string;
      partNo?: string;
      productCode?: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      discountPct?: number;
      landedCost?: number;
    },
  ) => Promise<void>;
  updateJobLineItem: (
    jobId: string,
    itemId: string,
    patch: Partial<Pick<InstallationLineItem, 'description' | 'quantity' | 'unitPrice' | 'discountPct'>>,
  ) => Promise<void>;
  removeLineItemFromJob: (jobId: string, itemId: string) => Promise<void>;
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
  contractors: UserContractor[];
  setContractors: React.Dispatch<React.SetStateAction<UserContractor[]>>;
  subContractors: UserSubContractor[];
  setSubContractors: React.Dispatch<React.SetStateAction<UserSubContractor[]>>;
  assignedJobs: InstallationJob[];
  setAssignedJobs: React.Dispatch<React.SetStateAction<InstallationJob[]>>;
  fmSegments: UnitCode[];
  setFmSegments: React.Dispatch<React.SetStateAction<UnitCode[]>>;
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

export const OperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<InstallationJob[]>([]);
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

  const [contractors, setContractors] = useState<UserContractor[]>([])
  const [subContractors, setSubContractors] = useState<UserSubContractor[]>([])
  const [assignedJobs, setAssignedJobs] = useState<InstallationJob[]>([])

  const [fmSegments, setFmSegments] = useState<UnitCode[]>([])


  const fetchFmSegments = useCallback(
    async () => {
      const res = await api.fmSegments.list()

      if (res.data && (res.data as any).length > 0) {
        setFmSegments(res.data as any)
      }
    },
    [api.fmSegments],
  )

  useEffect(() => {
    fetchFmSegments()
  }, [fetchFmSegments, user])

  // sync contractors with backed
  const fetchAssignedJobs = useCallback(
    async () => {
      try {
        const res = await api.jobs.list();
        const asArray = <T,>(payload: any): T[] => {
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload?.data)) return payload.data;
          if (Array.isArray(payload?.items)) return payload.items;
          return [];
        };
        const items = asArray<InstallationJob>(res?.data);
        if (items.length > 0) {
          setAssignedJobs(items);
        }
      } catch (e) {
        console.warn('Failed to fetch assigned jobs:', e);
      }
    },
    [api.jobs],
  )

  useEffect(() => {
    fetchAssignedJobs()
  }, [fetchAssignedJobs, user])

  // sync contractors with backed
  const fetchContractors = useCallback(
    async () => {
      const data = await api.contractor.list()
      if (data?.data?.items && data?.data?.items?.length > 0) {
        setContractors(data.data.items)
      }
    },
    [api.contractor],
  )

  // sync subcontractors with backed
  const fetchSubContractors = useCallback(
    async () => {
      const data = await api.subContractor.list()
      if (data?.data?.items && data?.data?.items?.length > 0) {
        setSubContractors(data.data.items)
      }
    },
    [api.subContractor],
  )

  useEffect(() => {
    fetchContractors()
  }, [fetchContractors, user])

  useEffect(() => {
    fetchSubContractors()
  }, [fetchSubContractors, user])

  const selectedJob = useMemo(() => {
    if (!selectedJobId) return null;
    return jobs.find((j) => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);


  // Initial sync with backend REST APIs
  const refreshFromApi = async () => {
    // Unwrap { data: T } | T | { data: T[]; total } from job-book-client + ResponseInterceptor
    const asArray = <T,>(payload: any): T[] => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.items)) return payload.items;
      return [];
    };

    try {
      const [jobsRes, techRes, tmplRes, custRes, projRes] = await Promise.all([
        api.installations.list(),
        api.technicians.list(),
        api.templates.list(),
        api.customers.list(),
        api.projects.list(),
      ]);

      const apiJobs = asArray<InstallationJob>(jobsRes.data);
      // Always apply API result (including empty) so we don't keep a stale blank list
      // when the response shape is a bare array after interceptor unwrap.
      setJobs((prev) => {
        if (apiJobs.length === 0 && prev.length > 0 && jobsRes.error) {
          return prev;
        }
        const merged = [...apiJobs];
        for (const localJob of prev) {
          if (!merged.some((j) => j.id === localJob.id)) {
            merged.push(localJob);
          }
        }
        return merged;
      });

      const techItems = asArray<any>(techRes.data);
      if (techItems.length) {
        setTechnicians(
          techItems.map((t: any) => ({
            ...t,
            displayName:
              t.displayName ||
              `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() ||
              t.email ||
              t.id,
          })),
        );
      }

      const templates = asArray(tmplRes?.data);
      if (templates.length) setChecklistTemplates(templates as any);

      const customers = asArray(custRes.data);
      if (customers.length) setCustomers(customers as any);

      const projects = asArray(projRes.data);
      if (projects.length) setProjects(projects as any);

      setIsApiConnected(!jobsRes.error);

      // Also refresh assigned jobs, contractors, subcontractors, and FM segments
      await Promise.allSettled([
        fetchAssignedJobs(),
        fetchContractors(),
        fetchSubContractors(),
        fetchFmSegments(),
      ]);
    } catch (err) {
      console.warn('API sync warning; utilizing resilient offline cache:', err);
      setIsApiConnected(false);
    }
  };

  useEffect(() => {
    refreshFromApi();
  }, [user]);

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
    assignedTo: "technician" | "contractor" | "subcontractor",
    technicianId: string,
    date: string,
    startTime: string,
    endTime: string,
    notes?: string
  ) => {
    // Call backend API
    const res = await api.installations.schedule(jobId, {
      assignedTo,
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
    const techName =
      tech?.displayName ||
      `${tech?.firstName ?? ''} ${tech?.lastName ?? ''}`.trim() ||
      'Assigned Technician';
    setJobs((prevJobs) =>
      prevJobs.map((job) => {
        if (job.id !== jobId) return job;
        const nextStatus = job.status === 'Not Actioned' ? 'Waiting Install' : job.status;
        return {
          ...job,
          technicianId,
          technicianName: techName,
          installationDate: date,
          startTime,
          endTime,
          isScheduled: true,
          status: nextStatus,
          notes: notes ? `${job.notes ? `${job.notes}\n` : ''}${notes}` : job.notes,
          timeline: [
            {
              id: `tl-sched-${Date.now()}`,
              status: nextStatus,
              timestamp: new Date().toISOString(),
              updatedBy: 'Scheduler',
              note: `Scheduled with technician ${techName} for ${date} (${startTime} - ${endTime})`,
            },
            ...(job.timeline || []),
          ],
        };
      })
    );

    return { success: true };
  };

  // Reschedule Job via API (uses installations/:id/schedule — no separate calendar route)
  const rescheduleJob = async (
    jobId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ) => {
    const job = jobs.find((j) => j.id === jobId);
    const technicianId = job?.technicianId || technicians[0]?.id;
    if (!technicianId) {
      return {
        success: false,
        conflict: {
          hasConflict: true,
          message: 'Assign a technician before rescheduling.',
        },
      };
    }

    const res = await api.calendar.reschedule({
      jobId,
      newDate,
      newStartTime,
      newEndTime,
      technicianId,
      notes: `Rescheduled to ${newDate} (${newStartTime} – ${newEndTime})`,
    });

    if (res.status === 409 || res.error) {
      const raw = res.error?.message ?? res.error;
      const message =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? raw.filter((p) => typeof p === 'string').join(', ')
            : 'Could not reschedule job.';
      return {
        success: false,
        conflict: {
          hasConflict: true,
          message,
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
    const prevSnapshot = jobs.find((j) => j.id === jobId);

    const trimmedNote = String(note ?? '').trim();
    const timelineNote = trimmedNote || `Status transitioned to ${newStatus}`;

    // Optimistic: header badge + timeline update immediately
    const updatedJobsFn = (prev: InstallationJob[]) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          status: newStatus,
          canInvoice:
            newStatus === 'Installed' ||
            newStatus === 'Completed' ||
            newStatus === 'Invoiced' ||
            j.canInvoice,
          timeline: [
            {
              id: `tl-local-${Date.now()}`,
              status: newStatus,
              timestamp: new Date().toISOString(),
              updatedBy,
              note: timelineNote,
            },
            ...(j.timeline || []),
          ],
        };
      });
    setJobs(updatedJobsFn);
    setAssignedJobs(updatedJobsFn);

    const res = await api.installations.updateStatus(jobId, {
      newStatus,
      note: trimmedNote || undefined,
      updatedBy,
      bypassValidation,
    });

    if (res.status === 422) {
      if (prevSnapshot) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? prevSnapshot : j)));
      }
      return {
        success: false,
        requiresChecklistCompletion: true,
        incompleteCount: res.error?.requiredIncompleteCount || 1,
      };
    }

    if (res.error || (res.status >= 400 && res.status !== 422)) {
      if (prevSnapshot) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? prevSnapshot : j)));
      }
      return {
        success: false,
        message: res.error?.message || 'Failed to update status',
      };
    }

    const updatedJob = (res.data as any)?.id ? res.data : (res.data as any)?.data;
    if (updatedJob?.id) {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== jobId) return j;
          const merged = { ...j, ...updatedJob };
          // Keep optimistic timeline (incl. user comment) if API payload omits it
          if (!Array.isArray(updatedJob.timeline) || !updatedJob.timeline.length) {
            merged.timeline = j.timeline;
          }
          return merged;
        }),
      );
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
    const checklistUpdater = (prev: InstallationJob[]) =>
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
      });
    setJobs(checklistUpdater);
    setAssignedJobs(checklistUpdater);

    // Call API in background
    await api.installations.updateChecklistItem(jobId, sectionId, itemId, {
      completed,
      notes,
      completedBy: technicianName,
    });
  };

  const applyJobUpdate = (jobId: string, job: InstallationJob | undefined) => {
    if (!job?.id) return;
    const updateFn = (prev: InstallationJob[]) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, ...job, lineItems: job.lineItems ?? j.lineItems ?? [] } : j,
      );
    setJobs(updateFn);
    setAssignedJobs(updateFn);
  };

  const uploadChecklistPhoto = async (
    jobId: string,
    sectionId: string,
    itemId: string,
    file: File,
  ) => {
    const res = await api.installations.uploadChecklistPhoto(jobId, sectionId, itemId, file);
    if (res.error || res.status >= 400) {
      return {
        success: false,
        message: formatJobBookError(res.error, 'Failed to upload photo'),
      };
    }
    const payload = res.data as any;
    const job = payload?.job ?? payload;
    applyJobUpdate(jobId, job);
    return { success: true };
  };

  const deleteChecklistPhoto = async (
    jobId: string,
    sectionId: string,
    itemId: string,
    photoId: string,
  ) => {
    const res = await api.installations.deleteChecklistPhoto(jobId, sectionId, itemId, photoId);
    if (res.error || res.status >= 400) {
      return {
        success: false,
        message: formatJobBookError(res.error, 'Failed to remove photo'),
      };
    }
    const payload = res.data as any;
    const job = payload?.job ?? payload;
    applyJobUpdate(jobId, job);
    return { success: true };
  };

  const addChecklistComment = async (
    jobId: string,
    sectionId: string,
    itemId: string,
    text: string,
    authorName?: string,
  ) => {
    const res = await api.installations.addChecklistComment(jobId, sectionId, itemId, {
      text,
      authorName,
    });
    if (res.error || res.status >= 400) {
      return {
        success: false,
        message: formatJobBookError(res.error, 'Failed to post comment'),
      };
    }
    const payload = res.data as any;
    const job = payload?.job ?? payload;
    applyJobUpdate(jobId, job);
    return { success: true };
  };

  const deleteChecklistComment = async (
    jobId: string,
    sectionId: string,
    itemId: string,
    commentId: string,
  ) => {
    const res = await api.installations.deleteChecklistComment(
      jobId,
      sectionId,
      itemId,
      commentId,
    );
    if (res.error || res.status >= 400) {
      return {
        success: false,
        message: formatJobBookError(res.error, 'Failed to remove comment'),
      };
    }
    const payload = res.data as any;
    const job = payload?.job ?? payload;
    applyJobUpdate(jobId, job);
    return { success: true };
  };

  // Add hardware to job via API -> Automatically attaches hardware checklist
  const addHardwareToJob = async (jobId: string, hardware: HardwareItem) => {
    const res = await api.installations.addHardware(jobId, hardware);
    if (res.data) {
      applyJobUpdate(jobId, res.data);
      return;
    }

    // Local fallback
    const tmpl = checklistTemplates.find((t) => t.FMServiceSegment?.label === hardware.model);
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
              hardwareName: tmpl.FMServiceSegment?.label ?? "",
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
                photos: [],
              })),
            });
          }
        }
        return { ...job, hardware: [...job.hardware, hardware], checklistSections: newSections };
      })
    );
  };

  const regenerateJobChecklist = async (jobId: string) => {
    const res = await api.installations.regenerateChecklist(jobId);
    if (res.error || res.status >= 400 || !res.data) {
      // Local fallback: build from in-memory templates + job hardware
      const job = jobs.find((j) => j.id === jobId);
      if (!job?.hardware?.length) {
        return {
          success: false,
          message: formatJobBookError(
            res.error,
            'Add hardware first, then generate the checklist.',
          ),
        };
      }
      const models = job.hardware.map((h) => h.model);
      const built = buildChecklistForHardware(models, checklistTemplates);
      if (!built.length) {
        return {
          success: false,
          message:
            'No active checklist template matches the hardware on this job. Create a template under Checklist Templates first.',
        };
      }
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== jobId) return j;
          const existingModels = new Set(j.checklistSections.map((s) => s.hardwareModel));
          const toAdd = built.filter((s) => !existingModels.has(s.hardwareModel));
          return {
            ...j,
            checklistSections: [...j.checklistSections, ...toAdd],
          };
        }),
      );
      return { success: true };
    }
    applyJobUpdate(jobId, res.data);
    return { success: true };
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

  const addLineItemToJob = async (
    jobId: string,
    item: {
      productId: string;
      partNo?: string;
      productCode?: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      discountPct?: number;
      landedCost?: number;
    },
  ) => {
    const res = await api.installations.addLineItem(jobId, item);
    if (res.data) {
      applyJobUpdate(jobId, res.data);
      return;
    }
    throw new Error(formatJobBookError(res.error, 'Failed to add line item'));
  };

  const updateJobLineItem = async (
    jobId: string,
    itemId: string,
    patch: Partial<Pick<InstallationLineItem, 'description' | 'quantity' | 'unitPrice' | 'discountPct'>>,
  ) => {
    const res = await api.installations.updateLineItem(jobId, itemId, patch);
    if (res.data) {
      applyJobUpdate(jobId, res.data);
      return;
    }
    throw new Error(formatJobBookError(res.error, 'Failed to update line item'));
  };

  const removeLineItemFromJob = async (jobId: string, itemId: string) => {
    const res = await api.installations.removeLineItem(jobId, itemId);
    if (res.data) {
      applyJobUpdate(jobId, res.data);
      return;
    }
    throw new Error(formatJobBookError(res.error, 'Failed to remove line item'));
  };

  // Create installation job via API
  const createInstallationJob = async (
    jobData: Omit<InstallationJob, 'id' | 'checklistSections' | 'timeline' | 'createdAt' | 'canInvoice'>
  ): Promise<string> => {
    const res = await api.installations.create(jobData);
    if (res.data) {
      let createdJob = res.data;

      // Older API builds ignored hardware/checklist — backfill if needed
      if ((!createdJob.hardware || createdJob.hardware.length === 0) && jobData.hardware?.length) {
        for (const hw of jobData.hardware) {
          const hwRes = await api.installations.addHardware(createdJob.id, hw);
          if (hwRes.data) createdJob = hwRes.data;
        }
      } else if (
        (!createdJob.checklistSections || createdJob.checklistSections.length === 0) &&
        (createdJob.hardware?.length || jobData.hardware?.length)
      ) {
        const regen = await api.installations.regenerateChecklist(createdJob.id);
        if (regen.data) createdJob = regen.data;
      }

      setJobs((prev) => [createdJob, ...prev.filter((j) => j.id !== createdJob.id)]);
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
      jobNumber: jobData.jobNumber || (jobData.isWhiteboard ? `WB-2026-${nextNum}` : `JOB-2026-${nextNum}`),
      isWhiteboard: jobData.isWhiteboard ?? true,
      jobType: jobData.jobType ?? (jobData.isWhiteboard ? 'Whiteboard' : 'Standard'),
      jobSource: jobData.jobSource ?? 'Whiteboard',
      sourceType: jobData.sourceType ?? 'WHITEBOARD',
      checklistSections,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: jobData.status,
          timestamp: new Date().toISOString(),
          updatedBy: 'Operations Dispatch',
          note: jobData.isWhiteboard
            ? `Whiteboard job created with hardware checklists.`
            : `Created with hardware checklists.`,
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

  /** Deep-clone sections/items so reused templates never share references. */
  const cloneTemplateSections = (
    sections: ChecklistTemplate['sections'] | undefined
  ): ChecklistTemplate['sections'] => {
    const stamp = Date.now();
    return (sections || []).map((sec, sIdx) => ({
      id: `sec-clone-${stamp}-${sIdx}`,
      title: sec.title,
      items: (sec.items || []).map((it, iIdx) => ({
        id: `item-clone-${stamp}-${sIdx}-${iIdx}`,
        title: it.title,
        description: it.description,
        section: sec.title,
        isRequired: it.isRequired,
        displayOrder: it.displayOrder ?? iIdx + 1,
      })),
    }));
  };

  // Template management actions via API
  const createChecklistTemplate = async (
    templateData: Omit<ChecklistTemplate, 'id' | 'lastUpdated'>
  ): Promise<string> => {
    // Always clone payload sections so source templates stay untouched
    const isolatedSections = cloneTemplateSections(templateData.sections);
    const payload = { ...templateData, sections: isolatedSections };

    const res = await api.templates.create(payload);
    if (res.data) {
      const created = res.data as ChecklistTemplate;
      // Prefer API-returned sections (real DB ids); fall back to isolated clone
      const createdTmpl: ChecklistTemplate = {
        ...created,
        sections:
          Array.isArray(created.sections) && created.sections.length > 0
            ? created.sections
            : isolatedSections,
      };
      setChecklistTemplates((prev) => [createdTmpl, ...prev]);
      return createdTmpl.id;
    }

    const newId = `tmpl-${Date.now()}`;
    const newTmpl: ChecklistTemplate = {
      ...payload,
      id: newId,
      lastUpdated: new Date().toISOString().split('T')[0],
      sections: isolatedSections,
    };
    setChecklistTemplates((prev) => [newTmpl, ...prev]);
    return newId;
  };

  const addTemplateSection = async (templateId: string, sectionTitle: string) => {
    const res = await api.templates.addSection(templateId, sectionTitle);
    const created = (res as any)?.data ?? res;
    const sectionId =
      created?.id || created?.data?.id || `sec-custom-${Date.now()}`;
    setChecklistTemplates((prev) =>
      prev.map((tmpl) => {
        if (tmpl.id !== templateId) return tmpl;
        return {
          ...tmpl,
          lastUpdated: new Date().toISOString().split('T')[0],
          sections: [
            ...tmpl.sections,
            {
              id: sectionId,
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
    let createdItemId = `item-${Date.now()}`;
    if (sec) {
      const res = await api.templates.addItem(templateId, sec.id, item);
      const created = (res as any)?.data ?? res;
      createdItemId = created?.id || created?.data?.id || createdItemId;
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
              id: createdItemId,
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
        uploadChecklistPhoto,
        deleteChecklistPhoto,
        addChecklistComment,
        deleteChecklistComment,
        addHardwareToJob,
        removeHardwareFromJob,
        regenerateJobChecklist,
        addLineItemToJob,
        updateJobLineItem,
        removeLineItemFromJob,
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
        contractors,
        setContractors,
        subContractors,
        setSubContractors,
        assignedJobs,
        setAssignedJobs,
        fmSegments,
        setFmSegments
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