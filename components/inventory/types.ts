export type ItemStatus = "Sundry" | "Airco Kit" | "FM Service" | "Valid Item";
export type OrderRank = "Committed Only" | "Fixed Stock" | "Auto >> Fixed" | "Full Auto";
export type ItemType = "Item" | "BOG";

export type ComponentItem = {
  partNo: string;
  desc: string;
  qty: number;
  uom: string;
};

export type InventoryItem = {
  id: string;
  desc: string;
  invoiceDetails: string;
  supplier: string;
  supplierNo: string;
  supplierPart: string;
  status: ItemStatus;
  itemType: ItemType;
  orderRank: OrderRank;
  inventoryStatus: boolean;
  aircoGroup: string;
  xGroup?: string;
  price: number;
  stock: number;
  alias: string;
  similarItem: string;
  bogFlag: boolean;
  location1: number;
  location2: number;
  bin: string;
  components: ComponentItem[];
  landedFactor: number;
  basePrice: number;
  removeGst: boolean;
  importDuty: number;
  landedCost: number;
  inStoreCost: number;
  agentFactor: number;
  agentPrice: number;
  partnerFactor: number;
  partnerPrice: number;
  tradeFactor: number;
  tradePrice: number;
  retailFactor: number;
  retailPrice: number;
  lastEditDate: string;
  lastSupplyOrder: string;
  lastSalesInvoice: string;
  currentStock: number;
  autoMax: number;
  autoMin: number;
  fixedMax: number;
  fixedMin: number;
  orderQty: number;
  packSize: number;
  itemCost: number;
  stockCost: number;
  committed: number;
  totalOrders: number;
  futureOrders: number;
  lastSupply: string;
  lastOrder: string;
  lastSale: string;
  leadTime: number;
  grade: number;
  salesYear: number;
  salesLastYear: number;
  salesAverageY2Y3: number;
  salesTotal: number;
  mixServiceHardware?: boolean;
  isMonitorItem?: boolean;
  isVisionItem?: boolean;
  fmUnitType?: string;
  fmUnitTypeNo?: string;
  fmUnitCode?: string;
  fmUnitCodeNo?: string;
  unitModem?: boolean;
  mixUnitSim?: boolean;
  fmRuleCode?: string;
};

export type Supplier = {
  id: string;
  code: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  suburb: string;
  status: "Active" | "On Hold";
  paymentTerms: string;
  activeSupplierForAai?: boolean;
  expenseTypeCode?: string;
  expenseTypeKey?: string;
  abn?: string;
  deliveryAddress1?: string;
  deliveryAddress2?: string;
  deliveryAddress3?: string;
  postalAddress1?: string;
  postalAddress2?: string;
  postalAddress3?: string;
  serviceRep?: string;
  fax?: string;
  orderPhone?: string;
  orderEmail?: string;
  ordersClose?: string;
  minOrderValue?: string;
  freightCost?: string;
  freightCutsAt?: string;
  airBagClose?: string;
  airBagCost?: string;
  orderLandedFactor?: string;
  orderMethod?: "Post" | "Fax" | "Email";
  dispatchMethod?: "Supplier Carrier" | "Supplier Air Bag" | "Airco Carrier";
  useSupplierPartNumber?: boolean;
  // Representative
  repContactName?: string;
  repContactPhone?: string;
  repContactMobile?: string;
  repContactEmail?: string;
  // Accounts Dept
  accContactName?: string;
  accContactPhone?: string;
  accContactFax?: string;
  accContactEmail?: string;
  // Warranty Dept
  warContactName?: string;
  warContactPhone?: string;
  warContactFax?: string;
  warContactEmail?: string;
  // Account Status
  currentBalance?: number;
  creditLimit?: number;
  lastInvoice?: string;
  lastPayment?: string;
  lastTransaction?: string;
  lastExpRecord?: string;
  tradingTerms?: string;
  paymentMethod?: string;
  billerCodeBsb?: string;
  accountReference?: string;
  transactionHistory?: { purchases: number; payments: number }[];
};

export type SupplierOrder = {
  id: string;
  supplier: string;
  orderDate: string;
  expectedDate: string;
  status: "Draft" | "Ordered" | "Part Received" | "Received" | "Closed";
  lines: number;
  total: number;
};

export type StockReceipt = {
  id: string;
  supplier: string;
  orderNo: string;
  receiptDate: string;
  status: "Draft" | "Posted";
  lines: number;
};

export type BulkImportResult = {
  fileName: string;
  imported: number;
  skippedExisting: number;
  failed: number;
  warnings: number;
  rows: Array<{
    rowNo: number;
    partNo: string;
    result: "Imported" | "Skipped Existing" | "Failed" | "Warning";
    message: string;
  }>;
};

export type BackOrderItem = {
  partNo: string;
  description: string;
  customer: string;
  orderNo: string;
  qtyBackordered: number;
  expectedDate: string;
  supplier: string;
};

export type GroupFactorRow = {
  label: string;
  a: number;
  k: number;
};

export type XGroupRow = {
  code: string;
  agent: number;
  partner: number;
  trade: number;
  retail: number;
};

export type SortKey = "id" | "desc" | "supplier" | "retailPrice" | "currentStock";
export type SortDirection = "asc" | "desc";
