import {
  ChecklistTemplate,
  Customer,
  HardwareModel,
  InstallationJob,
  Project,
  Technician,
  ChecklistSection,
} from '../types/installation';


export const INITIAL_CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'tmpl-mix4000',
    name: 'MIX4000 Installation Checklist',
    hardwareType: 'Telematics Gateway',
    hardwareModel: 'MIX4000',
    category: 'Telematics Unit',
    description: 'Full installation and telematics gateway commissioning procedure for MIX4000 units.',
    version: 'v2.4',
    status: 'ACTIVE',
    lastUpdated: '2026-09-18',
    sections: [
      {
        id: 'sec-m4k-setup',
        title: 'Device Setup',
        items: [
          { id: 'm4k-1', title: 'Mount MIX4000 securely in cabin', description: 'Ensure unit is mounted away from airbags and heat sources behind lower dash.', section: 'Device Setup', isRequired: true, displayOrder: 1 },
          { id: 'm4k-2', title: 'Connect constant power (12V/24V) with inline 3A fuse', description: 'Solder and heat-shrink terminal connection to vehicle ignition loom.', section: 'Device Setup', isRequired: true, displayOrder: 2 },
          { id: 'm4k-3', title: 'Connect ignition sense line', description: 'Verify True Ignition voltage using multimeter.', section: 'Device Setup', isRequired: true, displayOrder: 3 },
          { id: 'm4k-4', title: 'Secure harness wiring with nylon cable ties', description: 'Prevent any chafing along metallic dash brackets.', section: 'Device Setup', isRequired: false, displayOrder: 4 },
        ],
      },
      {
        id: 'sec-m4k-test',
        title: 'Testing',
        items: [
          { id: 'm4k-5', title: 'Power-on diagnostic LED sequence check', description: 'Observe solid green power LED within 30 seconds of ignition.', section: 'Testing', isRequired: true, displayOrder: 5 },
          { id: 'm4k-6', title: 'Cellular communication packet transmission test', description: 'Verify ping received in backend telematics portal.', section: 'Testing', isRequired: true, displayOrder: 6 },
          { id: 'm4k-7', title: 'Ignition on/off state telemetry confirmation', description: 'Cycle vehicle key twice and verify state changes.', section: 'Testing', isRequired: true, displayOrder: 7 },
        ],
      },
      {
        id: 'sec-m4k-verif',
        title: 'Verification',
        items: [
          { id: 'm4k-8', title: 'Scan and match IMEI & Serial Number barcode', description: 'Record against vehicle registration number in the app.', section: 'Verification', isRequired: true, displayOrder: 8 },
          { id: 'm4k-9', title: 'Confirm vehicle odometer sync calibration', description: 'Match dash dashboard cluster reading.', section: 'Verification', isRequired: true, displayOrder: 9 },
          { id: 'm4k-10', title: 'Apply tamper-evident security seal on loom', description: 'Record seal serial number in installation notes.', section: 'Verification', isRequired: false, displayOrder: 10 },
        ],
      },
      {
        id: 'sec-m4k-confirm',
        title: 'Installation Confirmation',
        items: [
          { id: 'm4k-11', title: 'Installer physical inspection and cabin cleanup', description: 'Leave driver footwell and fascia clean and secure.', section: 'Installation Confirmation', isRequired: true, displayOrder: 11 },
          { id: 'm4k-12', title: 'Fleet supervisor sign-off confirmation', description: 'Customer representative verifies dash integrity.', section: 'Installation Confirmation', isRequired: true, displayOrder: 12 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-fm3306',
    name: 'FM3306 Installation Checklist',
    hardwareType: 'Vehicle Tracker',
    hardwareModel: 'FM3306',
    category: 'Telematics Unit',
    description: 'Standard installation and wire harness calibration for FM3306 heavy vehicle GPS units.',
    version: 'v1.8',
    status: 'ACTIVE',
    lastUpdated: '2026-08-22',
    sections: [
      {
        id: 'sec-fm-setup',
        title: 'Device Setup',
        items: [
          { id: 'fm-1', title: 'Mount FM3306 unit with vibration dampeners', description: 'Position behind instrument cluster or glove compartment.', section: 'Device Setup', isRequired: true, displayOrder: 1 },
          { id: 'fm-2', title: 'Connect primary power & ground harness', description: 'Ensure reliable chassis ground bonding.', section: 'Device Setup', isRequired: true, displayOrder: 2 },
          { id: 'fm-3', title: 'Connect analog & digital I/O lines', description: 'Hook up PTO / emergency beacon inputs if requested.', section: 'Device Setup', isRequired: false, displayOrder: 3 },
        ],
      },
      {
        id: 'sec-fm-test',
        title: 'Testing',
        items: [
          { id: 'fm-4', title: 'Power test & internal battery backup health check', description: 'Ensure internal battery charges to >3.7V.', section: 'Testing', isRequired: true, displayOrder: 4 },
          { id: 'fm-5', title: 'GPRS server socket communication test', description: 'Confirm server heartbeat acknowledged.', section: 'Testing', isRequired: true, displayOrder: 5 },
        ],
      },
      {
        id: 'sec-fm-verif',
        title: 'Verification',
        items: [
          { id: 'fm-6', title: 'Verify unit serial and vehicle VIN association', description: 'Check barcode label against build sheet.', section: 'Verification', isRequired: true, displayOrder: 6 },
          { id: 'fm-7', title: 'Check configuration profile firmware revision', description: 'Must run FW 03.28 or later.', section: 'Verification', isRequired: true, displayOrder: 7 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-hd-cam',
    name: 'HD Camera Checklist',
    hardwareType: 'AI Dashcam / ADAS',
    hardwareModel: 'HD Camera',
    category: 'Camera & Video',
    description: 'Road-facing and driver-facing dual HD camera mounting, calibration and video feed validation.',
    version: 'v3.1',
    status: 'ACTIVE',
    lastUpdated: '2026-09-30',
    sections: [
      {
        id: 'sec-cam-setup',
        title: 'Camera Setup',
        items: [
          { id: 'cam-1', title: 'Clean windscreen and adhere 3M bracket in wiper sweep', description: 'Within top 150mm of windshield in the wiper sweep path.', section: 'Camera Setup', isRequired: true, displayOrder: 1 },
          { id: 'cam-2', title: 'Route USB-C/Fakra coaxial lead through A-pillar trim', description: 'Do not obstruct side curtain airbag deployment envelope.', section: 'Camera Setup', isRequired: true, displayOrder: 2 },
          { id: 'cam-3', title: 'Lock camera angle pitch with security Torx screw', description: 'Horizon line centered at 40% height of lens view.', section: 'Camera Setup', isRequired: true, displayOrder: 3 },
        ],
      },
      {
        id: 'sec-cam-test',
        title: 'Camera Testing',
        items: [
          { id: 'cam-4', title: 'Perform camera live view horizon alignment', description: 'Verify view from mobile calibration web tool.', section: 'Camera Testing', isRequired: true, displayOrder: 4 },
          { id: 'cam-5', title: 'Simulate harsh braking / event trigger test', description: 'Trigger g-force sensor and verify video clip uploaded to cloud.', section: 'Camera Testing', isRequired: true, displayOrder: 5 },
          { id: 'cam-6', title: 'Format high-endurance SD card (128GB+)', description: 'Initialize storage partition in camera interface.', section: 'Camera Testing', isRequired: true, displayOrder: 6 },
        ],
      },
      {
        id: 'sec-cam-verif',
        title: 'Verification',
        items: [
          { id: 'cam-7', title: 'Driver vision compliance test (no obstruction)', description: 'Ensure driver road perspective conforms to transport regulations.', section: 'Verification', isRequired: true, displayOrder: 7 },
          { id: 'cam-8', title: 'Upload test snapshot to job record', description: 'Capture camera live preview snapshot in app.', section: 'Verification', isRequired: false, displayOrder: 8 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-std-cam',
    name: 'Standard Camera Checklist',
    hardwareType: 'Standard Dashcam',
    hardwareModel: 'Standard Camera',
    category: 'Camera & Video',
    description: 'Standard single-channel forward-facing dashcam installation.',
    version: 'v1.2',
    status: 'ACTIVE',
    lastUpdated: '2026-07-14',
    sections: [
      {
        id: 'sec-stdcam-setup',
        title: 'Camera Mounting',
        items: [
          { id: 'scam-1', title: 'Mount camera behind rearview mirror', description: 'Ensure firm suction/adhesive bond.', section: 'Camera Mounting', isRequired: true, displayOrder: 1 },
          { id: 'scam-2', title: 'Tuck power wiring behind headliner', description: 'Protect wire from sharp metal edges.', section: 'Camera Mounting', isRequired: true, displayOrder: 2 },
        ],
      },
      {
        id: 'sec-stdcam-calib',
        title: 'Calibration & Verification',
        items: [
          { id: 'scam-3', title: 'Check horizon line preview on display', description: 'Camera level within +/- 3 degrees.', section: 'Calibration & Verification', isRequired: true, displayOrder: 3 },
          { id: 'scam-4', title: 'Confirm auto-record upon key-on', description: 'Camera initiates recording within 5 seconds.', section: 'Calibration & Verification', isRequired: true, displayOrder: 4 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-sim',
    name: 'SIM Installation Checklist',
    hardwareType: 'M2M SIM Card',
    hardwareModel: 'SIM',
    category: 'Connectivity',
    description: 'Telematics M2M roaming SIM card insertion, APN configuration and carrier latching.',
    version: 'v1.5',
    status: 'ACTIVE',
    lastUpdated: '2026-08-10',
    sections: [
      {
        id: 'sec-sim-install',
        title: 'SIM Installation',
        items: [
          { id: 'sim-1', title: 'Inspect SIM gold contacts for dust or damage', description: 'Use clean dry cloth if necessary.', section: 'SIM Installation', isRequired: false, displayOrder: 1 },
          { id: 'sim-2', title: 'Insert 4G/5G Micro/Nano SIM into SIM tray', description: 'Ensure click lock engages completely.', section: 'SIM Installation', isRequired: true, displayOrder: 2 },
          { id: 'sim-3', title: 'Fasten SIM tray protective hatch door & seal', description: 'Ensure IP67 rubber gasket is seated properly.', section: 'SIM Installation', isRequired: true, displayOrder: 3 },
        ],
      },
      {
        id: 'sec-sim-verif',
        title: 'SIM Verification',
        items: [
          { id: 'sim-4', title: 'Confirm network registration on 4G/LTE band', description: 'Verify RSRP signal quality is better than -95 dBm.', section: 'SIM Verification', isRequired: true, displayOrder: 4 },
          { id: 'sim-5', title: 'Verify ICCID matches job manifest', description: 'Scan 19-digit ICCID barcode into device record.', section: 'SIM Verification', isRequired: true, displayOrder: 5 },
          { id: 'sim-6', title: 'Validate private APN IP address assignment', description: 'Confirm static/dynamic APN IP received from carrier gateway.', section: 'SIM Verification', isRequired: true, displayOrder: 6 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-gps',
    name: 'GPS Installation Checklist',
    hardwareType: 'External GNSS Antenna',
    hardwareModel: 'GPS Unit',
    category: 'Sensors',
    description: 'External multi-constellation GNSS active antenna placement and satellite fix verification.',
    version: 'v2.0',
    status: 'ACTIVE',
    lastUpdated: '2026-09-05',
    sections: [
      {
        id: 'sec-gps-setup',
        title: 'Antenna Mounting',
        items: [
          { id: 'gps-1', title: 'Mount GPS antenna with clear sky view', description: 'Under dashboard plastic deck or external roof with magnetic/adhesive base.', section: 'Antenna Mounting', isRequired: true, displayOrder: 1 },
          { id: 'gps-2', title: 'Ensure antenna is mounted horizontal and face-up', description: 'Must have at least 120-degree unobstructed upward view cone.', section: 'Antenna Mounting', isRequired: true, displayOrder: 2 },
          { id: 'gps-3', title: 'Tighten SMA/FAKRA coaxial connector firmly', description: 'Finger-tight plus 1/4 turn, or audible Fakra snap.', section: 'Antenna Mounting', isRequired: true, displayOrder: 3 },
        ],
      },
      {
        id: 'sec-gps-test',
        title: 'Signal Acquisition',
        items: [
          { id: 'gps-4', title: 'Acquire 3D GNSS fix in under 120 seconds', description: 'Minimum 8 active satellite locks (GPS + GLONASS/Galileo).', section: 'Signal Acquisition', isRequired: true, displayOrder: 4 },
          { id: 'gps-5', title: 'Verify HDOP (Horizontal Dilution of Precision) < 1.8', description: 'Check accuracy metric on commissioning interface.', section: 'Signal Acquisition', isRequired: true, displayOrder: 5 },
        ],
      },
      {
        id: 'sec-gps-verif',
        title: 'Verification',
        items: [
          { id: 'gps-6', title: 'Confirm map pin accurately reflects depot bay coordinates', description: 'Cross-check latitude/longitude against physical address.', section: 'Verification', isRequired: true, displayOrder: 6 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-base-unit',
    name: 'Base Unit Installation Checklist',
    hardwareType: 'Core Power Unit',
    hardwareModel: 'Base Unit',
    category: 'Core Unit',
    description: 'Master power loom distribution box and auxiliary battery isolator commissioning.',
    version: 'v1.6',
    status: 'ACTIVE',
    lastUpdated: '2026-07-28',
    sections: [
      {
        id: 'sec-base-power',
        title: 'Power Loom Setup',
        items: [
          { id: 'base-1', title: 'Mount heavy-duty fuse holder within 300mm of battery terminal', description: 'Install rated 15A mini blade fuse.', section: 'Power Loom Setup', isRequired: true, displayOrder: 1 },
          { id: 'base-2', title: 'Route main power loom through firewall rubber grommet', description: 'Use split conduit loom protection.', section: 'Power Loom Setup', isRequired: true, displayOrder: 2 },
        ],
      },
      {
        id: 'sec-base-verif',
        title: 'Final Check',
        items: [
          { id: 'base-3', title: 'Test voltage drop under simulated 5A load', description: 'Ensure drop does not exceed 0.2V.', section: 'Final Check', isRequired: true, displayOrder: 3 },
          { id: 'base-4', title: 'Apply anti-corrosion dielectric grease to exposed battery terminals', description: 'Prevent galvanic terminal oxidation.', section: 'Final Check', isRequired: false, displayOrder: 4 },
        ],
      },
    ],
  },
];


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
  hardwareModels: HardwareModel[],
  templates: ChecklistTemplate[]
): ChecklistSection[] {
  const sections: ChecklistSection[] = [];

  for (const model of hardwareModels) {
    const tmpl = templates.find((t) => t.hardwareModel === model);
    if (!tmpl) continue;

    for (const sec of tmpl.sections) {
      sections.push({
        id: `sec-${model.toLowerCase().replace(/\s+/g, '-')}-${sec.id}-${Date.now().toString().slice(-4)}`,
        title: `${model} Checklist — ${sec.title}`,
        hardwareModel: model,
        hardwareName: tmpl.hardwareType,
        items: sec.items.map((item, idx) => ({
          id: `item-${model}-${sec.id}-${idx}`,
          templateItemId: item.id,
          title: item.title,
          description: item.description,
          section: sec.title,
          hardwareModel: model,
          isRequired: item.isRequired,
          displayOrder: item.displayOrder,
          completed: false,
          notes: '',
        })),
      });
    }
  }

  return sections;
}


export const INITIAL_INSTALLATION_JOBS: InstallationJob[] = [];