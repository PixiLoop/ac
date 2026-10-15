/**
 * Installation Operations Types
 */

export type InstallationStatus =
  | 'Not Actioned'
  | 'Workshop Setup'
  | 'Waiting Install'
  | 'Installed'
  | 'Invoiced'
  | 'Completed';

export type TechnicianStatus =
  | 'Available'
  | 'Assigned'
  | 'Busy'
  | 'On_Leave'
  | 'Inactive';

export type HardwareModel =
  | 'MIX4000'
  | 'FM3306'
  | 'HD Camera'
  | 'Standard Camera'
  | 'Base Unit'
  | 'SIM'
  | 'GPS Unit'
  | 'CAN Bus Interface'
  | 'Driver ID Keypad'
  | (string & {});

export interface HardwareItem {
  id: string;
  model: HardwareModel;
  name: string;
  serialNumber?: string;
  imei?: string;
  category: 'Telematics Unit' | 'Camera & Video' | 'Connectivity' | 'Sensors' | 'Accessories' | 'Core Unit';
}

export interface ChecklistItem {
  id: string;
  templateItemId?: string;
  title: string;
  description?: string;
  section: string;
  hardwareModel?: HardwareModel;
  isRequired: boolean;
  displayOrder: number;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  hardwareModel?: HardwareModel;
  hardwareName?: string;
  items: ChecklistItem[];
}

export interface ChecklistTemplateItem {
  id: string;
  title: string;
  description?: string;
  section: string;
  isRequired: boolean;
  displayOrder: number;
}

export interface ChecklistTemplateSection {
  id: string;
  title: string;
  items: ChecklistTemplateItem[];
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  hardwareType: string;
  hardwareModel: HardwareModel;
  category: string;
  description: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  lastUpdated: string;
  sections: ChecklistTemplateSection[];
}

export interface TimelineEvent {
  id: string;
  status: InstallationStatus;
  timestamp: string;
  updatedBy: string;
  note?: string;
}

export interface InstallationJob {
  id: string; // e.g. INSTALL-1042
  jobNumber: string;
  customerId: string;
  customerName: string;
  customerContact?: string;
  customerPhone?: string;
  projectId: string;
  projectName: string;
  location: string;
  vehicle: {
    rego: string;
    fleetNumber: string;
    vin: string;
    makeModel: string;
  };
  hardware: HardwareItem[];
  technicianId?: string;
  technicianName?: string;
  installationDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isScheduled: boolean;
  status: InstallationStatus;
  checklistSections: ChecklistSection[];
  timeline: TimelineEvent[];
  notes?: string;
  createdAt: string;
  canInvoice: boolean;
  invoiceId?: string;
}

export interface Technician {
  id: string,
  tenantId: string | null,
  email: string,
  firstName: string,
  lastName: string,
  displayName: string,
  phone: string | null,
  profilePhotoUrl: string | null,
  passwordHash: string,
  isActive: boolean,
  mustChangePassword: boolean,
  mfaEnabled: boolean,
  mfaSecret: boolean,
  secretQuestion: string | null,
  secretAnswerHash: string | null,
  lastLoginAt: string | null,
  createdAt: string,
  updatedAt: string,
  defaultLandingPage: string | null,
  deletedAt: string | null,
  status: TechnicianStatus
}

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  activeProjects: number;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  customerId: string;
  customerName: string;
  status: 'In Progress' | 'Active' | 'Completed';
  startDate: string;
  targetEndDate: string;
  totalInstallations: number;
  completedInstallations: number;
}
