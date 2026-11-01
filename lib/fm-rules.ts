export const CAMERA_BASE_REQUIRED = 'Camera base unit is required.';
export const INSTALL_TYPE_REQUIRED = 'Installation type is required.';
export const INVALID_SERVICE_CODE = 'Invalid service code.';
export const NO_ITEMS = 'At least one item is required.';
export const NOT_AN_FM_CUSTOMER = 'Selected customer is not an FM customer.';
export const DETAILS_NOT_COMPLETE = 'Installation details are not complete.';

export function supportsCamera(itemOrCode: any): boolean {
  if (!itemOrCode) return false;
  const str = String(
    itemOrCode?.code ||
      itemOrCode?.model ||
      itemOrCode?.partNo ||
      itemOrCode?.description ||
      itemOrCode ||
      ''
  ).toUpperCase();
  return str.includes('CAM') || str.includes('MIX') || str.includes('HD');
}

export function missingInvoiceFields(detail: any): string[] {
  const missing: string[] = [];
  if (!detail) return ['All installation details'];
  if (!detail.installDate && !detail.installationDate) missing.push('Installation Date');
  if (!detail.rego && !detail.vehicleRego) missing.push('Vehicle Rego');
  return missing;
}
