import { ACCESS_DENIED_MESSAGE } from './access-message';

export function handleApiError(err: any, showToast: any) {
  const status = err?.response?.status;

  if (status === 403) {
    const raw = err?.response?.data?.message;
    const text = typeof raw === 'string' ? raw : raw?.message;
    showToast({
      type: 'warning',
      title: 'Access denied',
      message: text || ACCESS_DENIED_MESSAGE,
    });
    return true;
  }

  return false;
}
