import {
    ChecklistTemplate,
    Customer,
    HardwareItem,
    InstallationJob,
    InstallationStatus,
    Project,
    Technician,
    TechnicianStatus,
} from '../components/job-boards/types/installation';
import { baseURL } from './api-client';


async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ data?: T; error?: any; status: number }> {
    try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${baseURL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : undefined,
                ...options.headers,
            },
            ...options,
        });

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
            return { error: body, status: res.status };
        }

        return { data: body.data !== undefined ? body.data : body, status: res.status };
    } catch (err: any) {
        return { error: { message: err.message }, status: 500 };
    }
}

export const api = {
    installations: {
        list: async (params: Record<string, string> = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request<{ data: InstallationJob[]; total: number }>(`/installations${qs ? `?${qs}` : ''}`);
        },
        get: async (id: string) => {
            return request<InstallationJob>(`/installations/${id}`);
        },
        create: async (jobData: any) => {
            return request<InstallationJob>('/installations', {
                method: 'POST',
                body: JSON.stringify(jobData),
            });
        },
        schedule: async (
            id: string,
            payload: { technicianId: string; date: string; startTime: string; endTime: string; notes?: string }
        ) => {
            return request<InstallationJob>(`/installations/${id}/schedule`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
        },
        updateStatus: async (
            id: string,
            payload: { newStatus: InstallationStatus; note?: string; updatedBy?: string; bypassValidation?: boolean }
        ) => {
            return request<InstallationJob>(`/installations/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
        },
        addHardware: async (id: string, hardware: HardwareItem) => {
            return request<InstallationJob>(`/installations/${id}/hardware`, {
                method: 'POST',
                body: JSON.stringify(hardware),
            });
        },
        removeHardware: async (id: string, hardwareId: string) => {
            return request<InstallationJob>(`/installations/${id}/hardware/${hardwareId}`, {
                method: 'DELETE',
            });
        },
        updateChecklistItem: async (
            id: string,
            sectionId: string,
            itemId: string,
            payload: { completed?: boolean; notes?: string; completedBy?: string }
        ) => {
            return request<{ item: any; checklistStats: any }>(
                `/installations/${id}/checklist/${sectionId}/items/${itemId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                }
            );
        },
    },

    technicians: {
        list: async (params: Record<string, string> = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request<{ items: Technician[]; total: number }>(`/technicians${qs ? `?${qs}` : ''}`);
        },
        get: async (id: string) => {
            return request<Technician>(`/technicians/${id}`);
        },
        create: async (techData: any) => {
            return request<Technician>('/technicians', {
                method: 'POST',
                body: JSON.stringify(techData),
            });
        },
        updateStatus: async (id: string, status: TechnicianStatus) => {
            return request<Technician>(`/technicians/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
        },
        checkConflict: async (id: string, date: string, startTime: string, endTime: string, excludeJobId?: string) => {
            const qs = new URLSearchParams({
                date,
                startTime,
                endTime,
                ...(excludeJobId ? { excludeJobId } : {}),
            }).toString();
            return request<{ conflict: { hasConflict: boolean; message?: string; conflictingJob?: any } }>(
                `/technicians/${id}/conflicts?${qs}`
            );
        },
    },

    templates: {
        list: async (params: Record<string, string> = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request<{ data: ChecklistTemplate[]; total: number }>(`/templates${qs ? `?${qs}` : ''}`);
        },
        get: async (id: string) => {
            return request<ChecklistTemplate>(`/templates/${id}`);
        },
        create: async (tmplData: any) => {
            return request<ChecklistTemplate>('/templates', {
                method: 'POST',
                body: JSON.stringify(tmplData),
            });
        },
        update: async (id: string, tmplData: any) => {
            return request<ChecklistTemplate>(`/templates/${id}`, {
                method: 'PUT',
                body: JSON.stringify(tmplData),
            });
        },
        delete: async (id: string) => {
            return request<ChecklistTemplate>(`/templates/${id}`, {
                method: 'DELETE',
            });
        },
        addSection: async (id: string, title: string) => {
            return request<any>(`/templates/${id}/sections`, {
                method: 'POST',
                body: JSON.stringify({ title }),
            });
        },
        deleteSection: async (id: string, sectionId: string) => {
            return request<any>(`/templates/${id}/sections/${sectionId}`, {
                method: 'DELETE',
            });
        },
        addItem: async (id: string, sectionId: string, item: any) => {
            return request<any>(`/templates/${id}/sections/${sectionId}/items`, {
                method: 'POST',
                body: JSON.stringify(item),
            });
        },
        updateItem: async (id: string, sectionId: string, itemId: string, item: any) => {
            return request<any>(`/templates/${id}/sections/${sectionId}/items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify(item),
            });
        },
        deleteItem: async (id: string, sectionId: string, itemId: string) => {
            return request<any>(`/templates/${id}/sections/${sectionId}/items/${itemId}`, {
                method: 'DELETE',
            });
        },
    },

    calendar: {
        getEvents: async (params: Record<string, string> = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request<{ data: any[]; count: number }>(`/calendar/events${qs ? `?${qs}` : ''}`);
        },
        reschedule: async (payload: { jobId: string; newDate: string; newStartTime: string; newEndTime: string }) => {
            return request<InstallationJob>('/calendar/reschedule', {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
        },
    },

    dashboard: {
        getStats: async () => {
            return request<any>('/dashboard/stats');
        },
    },

    projects: {
        list: async () => {
            return request<{ data: Project[]; total: number }>('/projects');
        },
        getSchedule: async (id: string, params: Record<string, string> = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request<{ project: Project; schedule: InstallationJob[]; total: number }>(
                `/projects/${id}/schedule${qs ? `?${qs}` : ''}`
            );
        },
    },

    invoices: {
        list: async () => {
            return request<{ data: any[]; total: number }>('/invoices');
        },
        generate: async (jobId: string, amount?: number, notes?: string) => {
            return request<{ invoice: any; job: InstallationJob }>('/invoices/generate', {
                method: 'POST',
                body: JSON.stringify({ jobId, amount, notes }),
            });
        },
    },

    customers: {
        list: async () => {
            return request<{ data: Customer[]; total: number }>('/customers');
        },
    },
};
