/** Copy an inventory item's FM hardware defaults onto an FM Preinstall. */
export function fmHardwarePrefill(product: any): Record<string, any> {
  if (!product) return {};
  const hardware = product.isFmHardware || product.status === 'FM Service';
  if (!hardware) return {};

  const next: Record<string, any> = {};
  if (product.fmUnitCode) next.fmUnitCode = product.fmUnitCode;
  if (product.fourGUnitModem) next.modem4G = true;
  if (product.mixUnitSim || product.fmSim1Type) next.mixSim1 = true;
  if (product.fmSim1Type) next.sim1Type = product.fmSim1Type;
  if (product.fmVisionType) {
    next.visionType = product.fmVisionType;
    next.isVision = true;
  }
  if (product.fmCameraType) next.cameraType = product.fmCameraType;
  if (product.cameraCount) next.cameraCount = Number(product.cameraCount);
  if (product.mixVisSim || product.vision4GModem || product.fmSim2Type) next.mixSim2 = true;
  if (product.fmSim2Type) next.sim2Type = product.fmSim2Type;
  if (product.aiOption) next.aiOption = true;
  if (product.tmaOption) next.tmaOption = true;
  if (product.rimOption) next.rimOption = true;
  if (product.nrcOption) next.nrc = true;
  if (product.internSim) next.intSim = true;
  return next;
}
