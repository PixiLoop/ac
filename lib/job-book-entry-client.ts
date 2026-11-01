import { baseURL } from './api-client';
import type { JobBookEntry, JobBookEntryFormState } from '../components/job-boards/job-book-entry/types';

async function request<T>(path: string, init?: RequestInit): Promise<{ data?: T; error?: any; status: number }> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const res = await fetch(`${baseURL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body, status: res.status };
    const data = body?.data !== undefined ? body.data : body;
    return { data, status: res.status };
  } catch (err: any) {
    return { error: { message: err?.message || 'Request failed' }, status: 500 };
  }
}

export const jobBookEntryApi = {
  list: (search = '') =>
    request<{ data: JobBookEntry[]; total: number } | JobBookEntry[]>(
      `/job-book-entries${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),
  get: (id: string) => request<JobBookEntry>(`/job-book-entries/${id}`),
  create: (payload: JobBookEntryFormState) =>
    request<JobBookEntry>('/job-book-entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: JobBookEntryFormState) =>
    request<JobBookEntry>(`/job-book-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<{ success: boolean }>(`/job-book-entries/${id}`, { method: 'DELETE' }),
  lookupCustomer: (number: string) =>
    request<Partial<JobBookEntryFormState>>(
      `/job-book-entries/customer-lookup?number=${encodeURIComponent(number)}`,
    ),
};
