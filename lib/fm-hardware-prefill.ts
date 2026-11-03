/** Copy an inventory item's FM hardware defaults onto an FM Preinstall / Install detail. */
export function fmHardwarePrefill(product: any): Record<string, any> {
  if (!product) return {};
  const hardware = product.isFmHardware || product.status === 'FM Service';
  if (!hardware) return {};

  const next: Record<string, any> = {};
  if (product.fmUnitType) next.fmUnitType = product.fmUnitType;
  if (product.fmUnitCode) next.fmUnitCode = product.fmUnitCode;
  if (product.fmMixCode) next.mixCode = product.fmMixCode;
  if (product.fmRuleCode) next.serviceCode = product.fmRuleCode;
  if (product.fourGUnitModem) next.modem4G = true;
  if (product.mixUnitSim || product.fmSim1Type) next.mixSim1 = true;
  if (product.fmSim1Type) next.sim1Type = product.fmSim1Type;
  if (product.isVision || product.fmVisionType || product.standardVision || product.highDefinition) {
    next.isVision = true;
  }
  if (product.fmVisionType) next.visionType = product.fmVisionType;
  else if (product.highDefinition) next.visionType = 'HD';
  else if (product.standardVision) next.visionType = 'STANDARD';
  if (product.vision4GDevice || product.vision4GModem) next.vision4GModem = true;
  if (product.fmCameraType) next.cameraType = product.fmCameraType;
  if (product.cameraCount) next.cameraCount = Number(product.cameraCount);
  if (product.mixVisSim || product.vision4GModem || product.fmSim2Type) next.mixSim2 = true;
  if (product.fmSim2Type) next.sim2Type = product.fmSim2Type;
  if (product.aiOption) next.aiOption = true;
  if (product.tmaOption) next.tmaOption = true;
  if (product.rimOption) next.rimOption = true;
  if (product.nrcOption) next.nrc = true;
  if (product.internSim) next.intSim = true;
  if (product.fuelRebate) next.fuelRebate = true;
  if (product.isMonitor) next.isMonitor = true;
  return next;
}

const VISION_NO_COUNT = new Set(['DX', 'MN']);

/** Same Service / MIX code rules as FM Preinstall (defaults for inventory items). */
export function generateFmHardwareCodes(input: {
  fmUnitType?: string | null;
  fmUnitCode?: string | null;
  mixSim1?: boolean;
  sim1Type?: string | number | null;
  visionType?: string | null;
  cameraCount?: number | null;
  mixSim2?: boolean;
  sim2Type?: string | number | null;
  baseUnits?: any[];
  unitCodes?: any[];
  visionList?: any[];
}) {
  const f = input;
  const baseItem = (f.baseUnits ?? []).find((u: any) => u.code === f.fmUnitType);
  const codeItem = (f.unitCodes ?? []).find((c: any) => c.code === f.fmUnitCode);
  const muIndex = codeItem?.mixIndex ?? baseItem?.mixIndex ?? 0;
  const visItem = (f.visionList ?? []).find((v: any) => v.code === f.visionType);
  const voIndex = visItem?.mixIndex ?? 0;
  const hasVis = !!f.visionType;
  const noCount = VISION_NO_COUNT.has(String(f.visionType ?? ''));
  const camCount = Number(f.cameraCount ?? 2) || 2;
  const s1Idx = f.mixSim1 ? Number(f.sim1Type ?? 0) || 0 : 0;
  const s2Idx = f.mixSim2 ? Number(f.sim2Type ?? 0) || 0 : 0;
  let cPlus = 0;
  if (hasVis && !noCount && camCount > 2) cPlus = camCount;

  let serviceCode = f.fmUnitType ?? '';
  if (f.mixSim1 && f.sim1Type) serviceCode += `S${f.sim1Type}`;
  if (hasVis && f.visionType) serviceCode += f.visionType;
  if (hasVis && !noCount) serviceCode += String(camCount);
  if (f.mixSim2 && f.sim2Type) serviceCode += f.sim2Type;

  const mixCode = [muIndex, s1Idx, hasVis ? 1 : 0, voIndex, cPlus, s2Idx].join('_');
  return { serviceCode, mixCode };
}

export function validateFmHardwareDefaults(input: {
  isFmHardware?: boolean;
  status?: string | null;
  fmUnitType?: string | null;
  fmUnitCode?: string | null;
  mixUnitSim?: boolean;
  fmSim1Type?: string | null;
  fmVisionType?: string | null;
  fmCameraType?: string | null;
  mixVisSim?: boolean;
  fmSim2Type?: string | null;
}): string[] {
  const on = input.isFmHardware || input.status === 'FM Service';
  if (!on) return [];
  const errors: string[] = [];
  if (!String(input.fmUnitType ?? '').trim()) errors.push('FM Unit Type is required');
  if (!String(input.fmUnitCode ?? '').trim()) errors.push('FM Unit Code is required');
  if (input.mixUnitSim && !String(input.fmSim1Type ?? '').trim()) {
    errors.push('Sim Card Size is required when Mix Unit SIM is checked');
  }
  if (input.fmVisionType && !String(input.fmCameraType ?? '').trim()) {
    errors.push('Camera Type is required when Vision is selected');
  }
  if (input.mixVisSim && !String(input.fmSim2Type ?? '').trim()) {
    errors.push('Vision Mix SIM type is required when Mix Vis SIM is checked');
  }
  return errors;
}
