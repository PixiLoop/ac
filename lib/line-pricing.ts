export const MAX_PRICE_ADJUSTMENT = 10;

export function clampPriceAdjustment(raw: number, admin = false): { value: number; message: string | null } {
  if (!Number.isFinite(raw)) return { value: 0, message: null };
  if (admin) return { value: raw, message: null };
  if (raw < -MAX_PRICE_ADJUSTMENT) {
    return { value: -MAX_PRICE_ADJUSTMENT, message: 'Max Price Increase 10%' };
  }
  if (raw > MAX_PRICE_ADJUSTMENT) {
    return { value: MAX_PRICE_ADJUSTMENT, message: 'Max Price Discount 10%' };
  }
  return { value: raw, message: null };
}

export function catalogSlot(product: any, level?: string | null): number {
  switch (level) {
    case 'TRADE':
      return Number(product?.tradePrice ?? 0);
    case 'SALES_PARTNER':
      return Number(product?.salesPartnerPrice ?? 0);
    case 'AGENT':
      return Number(product?.agentPrice ?? 0);
    default:
      return Number(product?.retailPrice ?? 0);
  }
}

export function isFmPricedProduct(product: any): boolean {
  return Boolean(product?.isFmHardware)
    || product?.status === 'FM Service'
    || Boolean(product?.fieldServiceType);
}

export interface CustomPriceMatch {
  customPrice: number;
  notes?: string;
  source: 'CUSTOMER_SPECIFIC';
}

export function resolveCustomerPrice(productId?: string | null, form?: any): CustomPriceMatch | null {
  if (!productId || !form) return null;
  const list: any[] = form.customPrices || form.customerCustomPrices || form.customer?.customPrices || [];
  if (!Array.isArray(list) || list.length === 0) return null;

  const found = list.find((item: any) => {
    if (!item) return false;
    if (item.productId && item.productId === productId) return true;
    if (item.product?.id && item.product.id === productId) return true;
    return false;
  });

  if (found && found.customPrice != null && found.customPrice !== '') {
    const val = Number(found.customPrice);
    if (Number.isFinite(val) && val >= 0) {
      return {
        customPrice: val,
        notes: found.notes || undefined,
        source: 'CUSTOMER_SPECIFIC',
      };
    }
  }
  return null;
}

export function isCustomerSpecificPrice(productId: string | null | undefined, form: any): boolean {
  return resolveCustomerPrice(productId, form) != null;
}

export function defaultPricedList(product: any, form: any): number {
  const useFm = isFmPricedProduct(product) && form?.fmPriceLevel;
  const level = useFm ? form.fmPriceLevel : form?.priceLevel;
  const factorRaw = Number(useFm ? form?.fmPriceFactor : form?.salesFactor);
  const multiplier = Number.isFinite(factorRaw) && factorRaw !== 0 ? factorRaw / 1000 : 1;
  return catalogSlot(product, level) * multiplier;
}

export function pricedList(product: any, form: any): number {
  const custom = resolveCustomerPrice(product?.id || product?.productId, form);
  if (custom) {
    return custom.customPrice;
  }
  return defaultPricedList(product, form);
}

export function netUnit(listPrice: number, discountPct: number): number {
  return listPrice * (1 - (Number(discountPct) || 0) / 100);
}

export function marginRatio(price: number, landed: number): number | null {
  if (!landed) return null;
  return price / landed;
}

export function marginTone(ratio: number | null): 'red' | 'yellow' | 'green' | 'none' {
  if (ratio == null || !Number.isFinite(ratio)) return 'none';
  const percent = (ratio - 1) * 100;
  if (percent < 5) return 'red';
  if (percent < 10) return 'yellow';
  return 'green';
}

export function isDoNotOrder(status?: string | null): boolean {
  return /do\s*not\s*order/i.test(status || '');
}

export function accountPricingFields(customer: any) {
  return {
    gstExempt: !!customer?.gstExempt,
    fmPriceLevel: customer?.fmCustomer?.priceLevel || '',
    fmPriceFactor: customer?.fmCustomer?.priceFactor ?? '',
    priceLevel: customer?.priceLevel || '',
    salesFactor: customer?.salesFactor ?? '',
    customPrices: customer?.customPrices || [],
  };
}

/** Keep a stored selling price until the user changes it.
 *  Older rows stored the list price in unitPrice and applied the discount in lineTotal.
 */
export function savedLinePrice(row: any) {
  const unit = Number(row?.unitPrice) || 0;
  const disc = Number(row?.discountPct) || 0;
  const qty = Number(row?.quantity ?? row?.qty) || 0;
  const storedTotal = row?.lineTotal != null && row?.lineTotal !== '' ? Number(row.lineTotal) : null;
  const grossTotal = qty * unit;
  const discountedTotal = qty * unit * (1 - disc / 100);
  if (
    storedTotal != null &&
    qty !== 0 &&
    Math.abs(storedTotal - discountedTotal) < 0.05 &&
    Math.abs(storedTotal - grossTotal) > 0.05
  ) {
    return { listPrice: unit, unitPrice: storedTotal / qty, priceOverridden: true as const };
  }
  const divisor = 1 - disc / 100;
  return {
    listPrice: divisor > 0 ? unit / divisor : unit,
    unitPrice: unit,
    priceOverridden: true as const,
  };
}
