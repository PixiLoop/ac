export function handleApiError(err: any, showToast: any) {
  const status = err?.response?.status;

  if (status === 403) {
    showToast({
      type: 'warning',
      title: 'Access denied',
      message: 'You do not have permission to perform this action.',
    });
    return true;
  }

  return false;
}
