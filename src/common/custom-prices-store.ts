export interface CustomPriceRecord {
  id: string;
  customerId: string;
  productId: string;
  customPrice: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    customerNumber: string;
    name: string;
    priceLevel?: string;
  };
  product?: {
    id: string;
    productCode: string;
    name: string;
    retailPrice?: number;
    tradePrice?: number;
    salesPartnerPrice?: number;
    agentPrice?: number;
    status?: string;
  };
}

class InMemoryCustomPriceStore {
  private store = new Map<string, CustomPriceRecord>();

  constructor() {
    // Seed with a few initial custom prices for demonstration if available
  }

  private key(customerId: string, productId: string) {
    return `${customerId}:::${productId}`;
  }

  getByCustomer(customerId: string): CustomPriceRecord[] {
    return Array.from(this.store.values()).filter(r => r.customerId === customerId);
  }

  getByProduct(productId: string): CustomPriceRecord[] {
    return Array.from(this.store.values()).filter(r => r.productId === productId);
  }

  get(customerId: string, productId: string): CustomPriceRecord | null {
    return this.store.get(this.key(customerId, productId)) ?? null;
  }

  getById(id: string): CustomPriceRecord | null {
    return Array.from(this.store.values()).find(r => r.id === id) ?? null;
  }

  upsert(
    customerId: string,
    productId: string,
    customPrice: number,
    notes?: string,
    customerMeta?: any,
    productMeta?: any,
    existingId?: string,
  ): CustomPriceRecord {
    const k = this.key(customerId, productId);
    const existing = this.store.get(k);
    const now = new Date().toISOString();
    const id = existing?.id || existingId || `cpp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const record: CustomPriceRecord = {
      id,
      customerId,
      productId,
      customPrice: Number(customPrice),
      notes: notes ?? existing?.notes ?? '',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      customer: customerMeta || existing?.customer,
      product: productMeta || existing?.product,
    };

    this.store.set(k, record);
    return record;
  }

  delete(id: string): boolean {
    const entry = Array.from(this.store.entries()).find(([_, r]) => r.id === id);
    if (entry) {
      this.store.delete(entry[0]);
      return true;
    }
    return false;
  }

  deleteByCustomerAndProduct(customerId: string, productId: string): boolean {
    const k = this.key(customerId, productId);
    return this.store.delete(k);
  }
}

export const customPriceStore = new InMemoryCustomPriceStore();
