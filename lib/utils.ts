export function cn(...inputs: any[]) {
  return inputs
    .flat(Infinity)
    .filter(Boolean)
    .join(' ');
}

export function getLastInvoicePeriod(isoString: any) {
  const date = new Date(isoString);
  const monthName = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const year = date.getUTCFullYear();

  return `${monthName}-${year}`;
}