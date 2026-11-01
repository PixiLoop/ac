export function fmHardwarePrefill(product: any): Record<string, any> {
  if (!product) return {};
  const prefill: Record<string, any> = {};

  if (product.model || product.hardwareModel) {
    prefill.hardwareModel = product.model || product.hardwareModel;
  }
  if (product.code || product.productCode) {
    prefill.productCode = product.code || product.productCode;
  }
  if (product.description) {
    prefill.description = product.description;
  }
  if (product.serialNumber) {
    prefill.serialNumber = product.serialNumber;
  }
  if (product.imei) {
    prefill.imei = product.imei;
  }

  return prefill;
}
