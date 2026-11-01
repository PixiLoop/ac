export const DETAILS_NOT_COMPLETE = 'Details Not Complete';
export const INVALID_SERVICE_CODE = 'Invalid Service Code';
export const NOT_AN_FM_CUSTOMER = 'Not an FM Customer';
export const INSTALL_TYPE_REQUIRED = 'An Install Type Would Help, Select Type then Press Enter';
export const NO_ITEMS = 'No Items';
export const CAMERA_BASE_REQUIRED = 'Base Unit must be SA, SA_M2, M2 or FMS to support a Camera System';
export const DECOM_FIRST = 'Set Install Record to Decom. First';
export const ACTIVATE_FIRST = 'Install Record Set to Decom. Activate First';
export const SETUP_FM_CUSTOMER_FIRST = 'Setup FM Customer First';
export const INVALID_SERVICE = 'Invalid Service';
export const INVALID_FM_CUS_NUM = 'Invalid FMCusNum';
export const INVALID_MIX_SERVICE_CODE = 'Invalid MIXService_Code';
export const DEFAULT_MIX_CODE = '0_0_0_0_0_0';
export const GST_FREE_WARNING = 'Export Sales with Zero G.S.T';
export const ORDER_NUMBER_REQUIRED = 'Order number is required';
export const CHARGE_ALREADY_ON_SUBSCRIPTION = 'This charge is already on a subscription';
export const SUBSCRIPTION_COVERAGE = 'Every Service, Option and Organisation Option must be on one subscription';

export const CAMERA_BASE_UNITS = new Set(['SA', 'SA_M2', 'M2', 'FMS']);

export function blank(value: unknown) {
  return value == null || String(value).trim() === '';
}

export function missingInvoiceFields(form: any, detail: any): string[] {
  const d = detail ?? {};
  const missing: string[] = [];
  if (blank(d.assetNumber)) missing.push('assetNumber');
  if (blank(d.fleetNumber) && blank(d.regoNumber)) {
    missing.push('fleetNumber', 'regoNumber');
  }
  if (blank(form?.depotId)) missing.push('depotId');
  if (blank(d.vehicleMake)) missing.push('vehicleMake');
  if (blank(d.vehicleModel)) missing.push('vehicleModel');
  if (blank(form?.installLocation ?? d.installLocation)) missing.push('installLocation');
  if (blank(form?.installer ?? d.installer)) missing.push('installer');
  if (d.mixSim1 && blank(d.unitSim)) missing.push('unitSim');
  if (blank(d.unitSerial)) missing.push('unitSerial');
  if (blank(d.unitIMEI)) missing.push('unitIMEI');
  const camera = !blank(d.visionType) || !blank(d.cameraType);
  if (camera) {
    if (blank(d.visSim)) missing.push('visSim');
    if (blank(d.vis1Serial)) missing.push('vis1Serial');
    if (blank(d.visIMEI)) missing.push('visIMEI');
  }
  return missing;
}

export function supportsCamera(unitType?: string | null) {
  const code = String(unitType ?? '').trim().toUpperCase();
  return CAMERA_BASE_UNITS.has(code);
}

export function mixSim1Enabled(unitType?: string | null) {
  const code = String(unitType ?? '').trim().toUpperCase();
  if (!code) return false;
  return code !== 'TABS' && !code.startsWith('TAB');
}

export function isMix4000(unitType?: string | null) {
  return String(unitType ?? '').toUpperCase().includes('MIX4000') || String(unitType ?? '').toUpperCase().includes('MIX 4000');
}

export function allowsTacho(unitType?: string | null) {
  const code = String(unitType ?? '').trim().toUpperCase();
  return ['FMS', 'SA', 'M1N', 'M2', 'SA_M2'].includes(code);
}

export function isCathexis(camera?: string | null) {
  return /cathexis/i.test(String(camera ?? ''));
}

export function optionEnabled(options: any[], needles: string[]) {
  return (options ?? []).some((option) => {
    if (!option?.enabled) return false;
    const hay = `${option.code ?? ''} ${option.label ?? ''}`.toUpperCase();
    return needles.some((needle) => hay.includes(needle.toUpperCase()));
  });
}

export function targetAssetMessage(type: string, install: any, fmWebNumber?: string | null) {
  const owner = String(install?.fmCustomerNum ?? '').trim();
  const selected = String(fmWebNumber ?? '').trim();
  if (owner && selected && owner.toLowerCase() !== selected.toLowerCase()) {
    return `Record belongs to FMCus ${owner}`;
  }
  const status = String(install?.status ?? '').toUpperCase();
  if (type === 'TRANSFER_UNIT' && status !== 'DECOMMISSIONED') return DECOM_FIRST;
  if (['MODIFIED_INSTALL', 'WARRANTY', 'REPLACEMENT'].includes(type) && status === 'DECOMMISSIONED') {
    return ACTIVATE_FIRST;
  }
  return null;
}
