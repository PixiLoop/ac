export interface JobBookEntry {
  id: string;
  entryNumber: string;
  customerId?: string | null;
  customerNumber: string;
  customerName?: string | null;
  orderNumber?: string;
  abn?: string;
  termsOfTrade?: string;
  shippingName?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingAddress3?: string;
  accountName?: string;
  accountAddress1?: string;
  accountAddress2?: string;
  accountAddress3?: string;
  lastEntryDate?: string;
  jobNum?: string;
  inHouse?: string;
  contactName?: string;
  phoneNumber?: string;
  completionTime?: string;
  previousJob?: string;
  warranty?: boolean;
  inwardFreight?: string;
  freightMethod?: string;
  outwardFreight?: string;
  itemDetails?: string;
  regoFleetNum?: string;
  odometers?: string;
  serialNumber?: string;
  constantK?: string;
  serviceDetails?: string;
  userName?: string;
  repairer?: string;
  jobNumber?: string;
  invoiceNum?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type JobBookEntryFormState = Omit<JobBookEntry, 'id' | 'entryNumber' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  entryNumber?: string;
};

export const emptyJobBookEntry = (): JobBookEntryFormState => ({
  customerNumber: '',
  customerId: '',
  customerName: '',
  orderNumber: '',
  abn: '',
  termsOfTrade: '',
  shippingName: '',
  shippingAddress1: '',
  shippingAddress2: '',
  shippingAddress3: '',
  accountName: '',
  accountAddress1: '',
  accountAddress2: '',
  accountAddress3: '',
  lastEntryDate: new Date().toISOString().slice(0, 10),
  jobNum: '',
  inHouse: '',
  contactName: '',
  phoneNumber: '',
  completionTime: '',
  previousJob: '',
  warranty: false,
  inwardFreight: '',
  freightMethod: '',
  outwardFreight: '',
  itemDetails: '',
  regoFleetNum: '',
  odometers: '',
  serialNumber: '',
  constantK: '',
  serviceDetails: '',
  userName: '',
  repairer: '',
  jobNumber: '',
  invoiceNum: '',
});
