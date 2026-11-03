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
import { UserContractor, UserSubContractor } from '../providers/OperationsContext';
import { baseURL } from './api-client';

/** Nest / job-book error bodies → readable string (never "[object Object]"). */
export function formatJobBookError(err: any, fallback = 'Request failed'): string {
    const candidates = [
        err?.response?.data?.message,
        err?.response?.data?.error,
        err?.message,
        err?.error,
        err?.data?.message,
        err,
    ];

    let text = '';
    for (const raw of candidates) {
        if (typeof raw === 'string' && raw.trim()) {
            text = raw.trim();
            break;
        }
        if (Array.isArray(raw)) {
            const joined = raw.filter((p) => typeof p === 'string').join(', ').trim();
            if (joined) {
                text = joined;
                break;
            }
        }
        if (raw && typeof raw === 'object') {
            if (typeof raw.message === 'string' && raw.message.trim()) {
                text = raw.message.trim();
                break;
            }
            if (Array.isArray(raw.message)) {
                const joined = raw.message.filter((p: unknown) => typeof p === 'string').join(', ').trim();
                if (joined) {
                    text = joined;
                    break;
                }
            }
        }
    }

    if (!text) return fallback;

    // Friendlier wording for common infra / Prisma failures
    if (/InstallationJobItem does not exist/i.test(text)) {
        return 'Line items are not set up on this server yet. Ask an admin to run database migrations.';
    }
    if (/Unknown argument ['"]backOrderQty['"]/i.test(text)) {
        return 'Line item save failed due to a server/schema mismatch. Please redeploy the API.';
    }
    if (/^\s*Invalid `?this\.prisma/i.test(text) || /invocation in \//i.test(text)) {
        const tableMissing = text.match(/table [`']?[\w.]+[`']? does not exist/i)?.[0];
        if (tableMissing) {
            return `Database setup incomplete: ${tableMissing}. Ask an admin to run migrations.`;
        }
        // Prefer the last actionable line of Prisma dumps
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        const actionable = [...lines].reverse().find((l) =>
            /does not exist|Unique constraint|Foreign key|Argument|required/i.test(l),
        );
        if (actionable) return actionable;
    }

    // Avoid dumping huge Prisma stacks into the toast
    if (text.length > 280) {
        const short = text.split('\n').map((l) => l.trim()).filter(Boolean);
        const last = short[short.length - 1];
        return last && last.length < 280 ? last : `${text.slice(0, 260)}…`;
    }

    return text;
}

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
            payload: { technicianId: string; assignedTo: "technician" | "contractor" | "subcontractor", date: string; startTime: string; endTime: string; notes?: string }
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
        regenerateChecklist: async (id: string) => {
            return request<InstallationJob>(`/installations/${id}/checklist/regenerate`, {
                method: 'POST',
            });
        },
        addLineItem: async (id: string, item: {
            productId: string;
            partNo?: string;
            productCode?: string;
            description?: string;
            quantity?: number;
            unitPrice?: number;
            discountPct?: number;
            landedCost?: number;
        }) => {
            return request<InstallationJob>(`/installations/${id}/line-items`, {
                method: 'POST',
                body: JSON.stringify(item),
            });
        },
        updateLineItem: async (
            id: string,
            itemId: string,
            item: {
                description?: string;
                quantity?: number;
                unitPrice?: number;
                discountPct?: number;
            },
        ) => {
            return request<InstallationJob>(`/installations/${id}/line-items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify(item),
            });
        },
        removeLineItem: async (id: string, itemId: string) => {
            return request<InstallationJob>(`/installations/${id}/line-items/${itemId}`, {
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
        addChecklistComment: async (
            id: string,
            sectionId: string,
            itemId: string,
            payload: { text: string; authorName?: string },
        ) => {
            return request<{ comment: any; job: InstallationJob }>(
                `/installations/${id}/checklist/${sectionId}/items/${itemId}/comments`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload),
                },
            );
        },
        deleteChecklistComment: async (
            id: string,
            sectionId: string,
            itemId: string,
            commentId: string,
        ) => {
            return request<{ success: boolean; job: InstallationJob }>(
                `/installations/${id}/checklist/${sectionId}/items/${itemId}/comments/${commentId}`,
                { method: 'DELETE' },
            );
        },
        uploadChecklistPhoto: async (
            id: string,
            sectionId: string,
            itemId: string,
            file: File,
        ) => {
            try {
                const token = localStorage.getItem('accessToken');
                const fd = new FormData();
                fd.append('photo', file);
                const res = await fetch(
                    `${baseURL}/installations/${id}/checklist/${sectionId}/items/${itemId}/photos`,
                    {
                        method: 'POST',
                        headers: {
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: fd,
                    },
                );
                const body = await res.json().catch(() => ({}));
                if (!res.ok) return { error: body, status: res.status };
                return { data: body.data !== undefined ? body.data : body, status: res.status };
            } catch (err: any) {
                return { error: { message: err.message }, status: 500 };
            }
        },
        deleteChecklistPhoto: async (
            id: string,
            sectionId: string,
            itemId: string,
            photoId: string,
        ) => {
            return request<{ success: boolean; job: InstallationJob }>(
                `/installations/${id}/checklist/${sectionId}/items/${itemId}/photos/${photoId}`,
                { method: 'DELETE' },
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

    contractor: {
        list: async (params: Record<string, string> = {}) => {
            return request<{ items: UserContractor[]; total: number }>(`/contractor`);
        },
    },

    subContractor: {
        list: async (params: Record<string, string> = {}) => {
            return request<{ items: UserSubContractor[]; total: number }>(`/subcontractor`);
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
        reschedule: async (payload: {
            jobId: string;
            newDate: string;
            newStartTime: string;
            newEndTime: string;
            technicianId?: string;
            notes?: string;
        }) => {
            // No /calendar/reschedule API — reuse installations schedule endpoint
            if (!payload.technicianId) {
                return {
                    data: null,
                    error: { message: 'Technician is required to reschedule' },
                    status: 400,
                } as any;
            }
            return request<InstallationJob>(`/installations/${payload.jobId}/schedule`, {
                method: 'PUT',
                body: JSON.stringify({
                    technicianId: payload.technicianId,
                    date: payload.newDate,
                    startTime: payload.newStartTime,
                    endTime: payload.newEndTime,
                    notes: payload.notes || 'Rescheduled via calendar',
                }),
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

    jobs: {
        list: async (params: Record<string, string> = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request<{ data: InstallationJob[]; total: number }>(`/jobs/assigned${qs ? `?${qs}` : ''}`);
        },
    },

    fmSegments: {
        list: async (params: Record<string, string> = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request<any[]>(`/fm-segments${qs ? `?${qs}` : ''}`);
        },
    },
};
