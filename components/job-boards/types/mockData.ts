import {
  ChecklistTemplate,
  Customer,
  HardwareModel,
  InstallationJob,
  Project,
  Technician,
  ChecklistSection,
} from '../types/installation';



export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'ABC Transport Pty Ltd',
    contactPerson: 'Marcus Vance',
    email: 'm.vance@abctransport.com.au',
    phone: '+61 2 9876 5432',
    address: '42 Logistics Parkway, Eastern Creek, NSW 2766',
    activeProjects: 3,
  },
  {
    id: 'cust-2',
    name: 'XYZ Logistics Australia',
    contactPerson: 'Helena Troy',
    email: 'htroy@xyzlogistics.com.au',
    phone: '+61 3 9123 4567',
    address: '15 Paramount Boulevard, Derrimut, VIC 3026',
    activeProjects: 2,
  },
  {
    id: 'cust-3',
    name: 'Metro Couriers Group',
    contactPerson: 'Greg Thompson',
    email: 'greg@metrocouriers.com.au',
    phone: '+61 2 8333 4455',
    address: '88 Botany Road, Mascot, NSW 2020',
    activeProjects: 1,
  },
  {
    id: 'cust-4',
    name: 'Coastline Haulage',
    contactPerson: 'Brenda Walsh',
    email: 'bwalsh@coastlinehaul.com.au',
    phone: '+61 7 3456 7890',
    address: '10 Port Drive, Lytton, QLD 4178',
    activeProjects: 2,
  },
  {
    id: 'cust-5',
    name: 'Apex Mining Fleet',
    contactPerson: 'Clint Eastwood',
    email: 'c.eastwood@apexmining.com.au',
    phone: '+61 8 9481 0000',
    address: '200 St Georges Terrace, Perth, WA 6000',
    activeProjects: 1,
  },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    code: 'PRJ-SYD-2026-01',
    name: 'ABC Transport 120-Truck Telematics Overhaul',
    customerId: 'cust-1',
    customerName: 'ABC Transport Pty Ltd',
    status: 'In Progress',
    startDate: '2026-09-01',
    targetEndDate: '2026-11-30',
    totalInstallations: 120,
    completedInstallations: 42,
  },
  {
    id: 'proj-2',
    code: 'PRJ-MEL-2026-04',
    name: 'XYZ Logistics Cold Chain Camera Rollout',
    customerId: 'cust-2',
    customerName: 'XYZ Logistics Australia',
    status: 'In Progress',
    startDate: '2026-09-15',
    targetEndDate: '2026-12-15',
    totalInstallations: 65,
    completedInstallations: 28,
  },
  {
    id: 'proj-3',
    code: 'PRJ-SYD-2026-09',
    name: 'Metro Couriers Last-Mile GPS Fleet',
    customerId: 'cust-3',
    customerName: 'Metro Couriers Group',
    status: 'Active',
    startDate: '2026-10-01',
    targetEndDate: '2026-10-31',
    totalInstallations: 30,
    completedInstallations: 6,
  },
  {
    id: 'proj-4',
    code: 'PRJ-QLD-2026-03',
    name: 'Coastline Haulage Interstate Prime Movers',
    customerId: 'cust-4',
    customerName: 'Coastline Haulage',
    status: 'In Progress',
    startDate: '2026-09-20',
    targetEndDate: '2026-11-10',
    totalInstallations: 40,
    completedInstallations: 14,
  },
];

/**
 * Helper to build initial checklist sections for given hardware models
 */
export function buildChecklistForHardware(
  hardwareModels: HardwareModel[] | string[],
  templates: ChecklistTemplate[]
): ChecklistSection[] {
  const sections: ChecklistSection[] = [];
  const templatesList = Array.isArray(templates) ? templates : [];

  for (const model of hardwareModels) {
    const mStr = String(model || '').trim().toLowerCase();
    if (!mStr) continue;

    // 1. Find matching template
    let tmpl = templatesList.find(
      (t) =>
        t.FMServiceSegment?.code?.toLowerCase() === mStr ||
        t.FMServiceSegment?.label?.toLowerCase() === mStr ||
        t.hardwareId?.toLowerCase() === mStr ||
        t.name?.toLowerCase().includes(mStr) ||
        (t as any).hardwareModel?.toLowerCase() === mStr
    );

    // 2. If no exact match, try matching any active template
    if (!tmpl && templatesList.length > 0) {
      tmpl = templatesList.find((t) => t.status === 'ACTIVE') || templatesList[0];
    }

    if (tmpl && tmpl.sections?.length > 0) {
      for (const sec of tmpl.sections) {
        sections.push({
          id: `sec-${mStr.replace(/[^a-z0-9]/g, '-')}-${sec.id}-${Date.now().toString().slice(-4)}`,
          title: `${tmpl.name || model} — ${sec.title}`,
          hardwareModel: model as any,
          hardwareName: tmpl.FMServiceSegment?.label || tmpl.name || String(model),
          items: (sec.items || []).map((item, idx) => ({
            id: `item-${mStr}-${sec.id}-${item.id || idx}`,
            templateItemId: item.id,
            title: item.title,
            description: item.description,
            section: sec.title,
            hardwareModel: model as any,
            isRequired: item.isRequired ?? true,
            displayOrder: item.displayOrder ?? idx + 1,
            completed: false,
            notes: '',
            photos: [],
            comments: [],
          })),
        });
      }
    }
  }

  // 3. Fallback only if no templates exist in the system at all
  if (sections.length === 0) {
    const defaultSecs = [
      {
        title: 'Pre-Installation Inspection',
        items: [
          { title: 'Verify vehicle ignition OFF and isolate auxiliary battery', isRequired: true, description: 'Essential safety check' },
          { title: 'Inspect physical mounting clearance behind dashboard/trim', isRequired: true, description: 'Ensure adequate airflow' },
          { title: 'Confirm unit serial number & SIM allocation match work order', isRequired: true, description: 'Verify hardware matches records' },
        ],
      },
      {
        title: 'Mounting & Wiring Harness',
        items: [
          { title: 'Securely mount unit bracket using automotive-grade ties/hardware', isRequired: true, description: 'Vibration-resistant mounting' },
          { title: 'Connect constant 12V/24V power, chassis ground, and ignition sense', isRequired: true, description: 'Inline blade fuse connection' },
          { title: 'Position GPS & cellular antenna with clear line-of-sight to sky', isRequired: true, description: 'Clear sky line of sight' },
        ],
      },
      {
        title: 'Function Testing & Evidence Sign-Off',
        items: [
          { title: 'Cycle vehicle ignition and verify status LED indicators', isRequired: true, description: 'Solid satellite & cellular lock' },
          { title: 'Capture photographic evidence of installed hardware & fuse tap', isRequired: true, description: 'Upload verification photo' },
          { title: 'Tidy wiring loom with loom tape and reinstall all trim panels', isRequired: true, description: 'OEM clean vehicle cabin' },
        ],
      },
    ];

    const modelName = hardwareModels[0] || 'MIX4000';
    for (const sec of defaultSecs) {
      sections.push({
        id: `sec-def-${sec.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`,
        title: `${modelName} Checklist — ${sec.title}`,
        hardwareModel: modelName as any,
        hardwareName: `${modelName} Telematics System`,
        items: sec.items.map((it, idx) => ({
          id: `item-def-${idx}-${Date.now().toString().slice(-4)}`,
          title: it.title,
          description: it.description,
          section: sec.title,
          hardwareModel: modelName as any,
          isRequired: it.isRequired,
          displayOrder: idx + 1,
          completed: false,
          notes: '',
          photos: [],
          comments: [],
        })),
      });
    }
  }

  return sections;
}


export const INITIAL_INSTALLATION_JOBS: InstallationJob[] = [];