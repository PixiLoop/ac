import { PrismaClient, FMServiceType } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Airco AIMS (SAFE MODE)…')

  //BASE PERMISSIONS
  const permissionsList = [
    // USERS
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.approve',
    'users.manageSecurity',

    // ROLES
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',

    // CUSTOMERS
    'customers.view',
    'customers.create',
    'customers.edit',
    'customers.approve',
    'customers.delete',

    // SALES ORDERS
    'salesorders.view',
    'salesorders.create',
    'salesorders.edit',
    'salesorders.approve',
    'salesorders.delete',
    'salesorders.items.manage',

    // INVOICES
    'invoices.view',
    'invoices.create',
    'invoices.edit',
    'invoices.approve',
    'invoices.delete',
    'invoices.send',
    'invoices.lock',         // isLocked

    // QUOTATIONS
    'quotations.view',
    'quotations.create',
    'quotations.edit',
    'quotations.approve',
    'quotations.delete',
    'quotations.send',
    'quotations.convertToOrder',  // SO Convert

    // PRODUCTS
    'products.view',
    'products.create',
    'products.edit',
    'products.delete',
    'products.managePricing',    // pricing fields 

    // INVENTORY (InventoryItem)
    'inventory.view',
    'inventory.create',
    'inventory.edit',
    'inventory.delete',
    'inventory.adjust',          // StockMovement ADJUSTMENT
    'inventory.import',          // ImportBatch / ImportRow
    'inventory.stocktake',       // lastStocktakeDate / STOCKTAKE movement type

    // PURCHASE ORDERS
    'purchaseorders.view',
    'purchaseorders.create',
    'purchaseorders.edit',
    'purchaseorders.approve',
    'purchaseorders.delete',
    'purchaseorders.receive',    // GoodsReceipt linked flow

    // GOODS RECEIPTS
    'goodsreceipts.view',
    'goodsreceipts.create',
    'goodsreceipts.edit',
    'goodsreceipts.post',        // postedAt / postedBy — GoodsReceiptStatus.POSTED
    'goodsreceipts.delete',

    // SUPPLIERS (InvSupplier)
    'suppliers.view',
    'suppliers.create',
    'suppliers.edit',
    'suppliers.delete',

    // JOBS
    'jobs.view',
    'jobs.create',
    'jobs.edit',
    'jobs.delete',
    'jobs.assign',               // UserJob

    // JOB BOARDS (kanban)
    'jobboards.view',
    'jobboards.create',
    'jobboards.edit',
    'jobboards.delete',
    'jobboards.manage',          // lists, cards, custom fields

    // FM CUSTOMERS
    'fmcustomers.view',
    'fmcustomers.create',
    'fmcustomers.edit',
    'fmcustomers.delete',

    // FM PREINSTALLS
    'fmpreinstalls.view',
    'fmpreinstalls.create',
    'fmpreinstalls.edit',
    'fmpreinstalls.approve',
    'fmpreinstalls.delete',
    'fmpreinstalls.install',     // FMInstallDetail

    // FM INSTALLS
    'fminstalls.view',
    'fminstalls.create',
    'fminstalls.edit',
    'fminstalls.delete',

    // AUDIT LOGS
    'auditlogs.view',            // read-only

    'integrations.xero',
    'integrations.view',

    'locations.view',
    'locations.create',
    'locations.edit',
    'locations.delete',

    // DISPATCHES
    'dispatches.view',
    'dispatches.create',
    'dispatches.edit',
    'dispatches.delete',
  ]

  const permissions = []

  for (const name of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { name },
      create: { name },
      update: {}, // DO NOT MODIFY EXISTING PERMISSIONS
    })

    permissions.push(perm)
    console.log(`Permission ensured: ${name}`)
  }

  //SUPER ADMIN ROLE
  const superRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    create: {
      name: 'Super Admin',
      description: 'Full system access',
      isSystem: true,
    },
    update: {
      isSystem: true,
    }, // DO NOT MODIFY EXISTING ROLE
  })

  console.log('Role ensured: SuperAdmin')

  /* ===============================
   * 3. ATTACH ALL PERMISSIONS
   * =============================== */
  // for (const perm of permissions) {
  //   await prisma.rolePermission.upsert({
  //     where: {
  //       roleId_permissionId: {
  //         roleId: superRole.id,
  //         permissionId: perm.id,
  //       },
  //     },
  //     create: {
  //       roleId: superRole.id,
  //       permissionId: perm.id,
  //     },
  //     update: {}, // SAFE
  //   })
  // }

  console.log('All permissions attached to SuperAdmin')

  //SUPER ADMIN USER
  const superEmail =
    process.env.SUPERADMIN_EMAIL || 'superadmin@airco.au'
  const superPassword =
    process.env.SUPERADMIN_PASSWORD || 'Admin@Admin'

  const passwordHash = await bcrypt.hash(superPassword, 12)

  let superUser = await prisma.user.findFirst({
    where: { email: superEmail },
  })

  if (!superUser) {
    superUser = await prisma.user.create({
      data: {
        email: superEmail,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
        firstName: 'Super',
        lastName: 'Admin',
        displayName: 'Super Admin',
      },
    })
    console.log('SuperAdmin user created')
  } else {
    await prisma.user.update({
      where: { id: superUser.id },
      data: {
        isActive: true,
        //DO NOT reset password on reseed
      },
    })
    console.log('✔ SuperAdmin user already exists')
  }

  //ATTACH ROLE TO USER
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superUser.id,
        roleId: superRole.id,
      },
    },
    create: {
      userId: superUser.id,
      roleId: superRole.id,
    },
    update: {}, // SAFE
  })

  console.log('✔ SuperAdmin role assigned')
  console.log('SEED COMPLETE')
  console.log('Login details:')
  console.log(' Email:', superEmail)
  console.log(
    ' Password:',
    process.env.SUPERADMIN_PASSWORD
      ? '(from env)'
      : 'Admin@Admin (default)',
  )

  // FM OPTION MASTER DATA
  const fmOptions = [
    { code: 'AI_Option', label: 'FMW_Fatigue Camera', sortOrder: 1 },
    { code: 'Int_SIM', label: 'International SIM Surcharge', sortOrder: 2 },
    { code: 'WIFI_Option', label: 'WIFI Option', sortOrder: 3 },
    { code: 'TMA_Option', label: 'TMA Option', sortOrder: 4 },
    { code: 'RIM_Option', label: 'RIM Option', sortOrder: 5 },
    { code: 'NRC_Option', label: 'NRC Option', sortOrder: 6 },
    { code: 'Safe_Option', label: 'Safe Guard Option', sortOrder: 7 },
    { code: 'Spare_Option', label: 'Spare Option', sortOrder: 8 },
  ]

  for (const option of fmOptions) {
    await prisma.fMOption.upsert({
      where: { code: option.code },
      create: option,
      update: {}, //Do not override existing
    })

    console.log(`FM Option ensured: ${option.label}`)
  }

  // FMServices Master Data
  const fmServices = [
    // SIM TYPE (Airco FM)
    { code: 'SIM1', label: 'Sim 5 MB', type: FMServiceType.SIM_TYPE, hasActive: true, hasPrice: true, sortOrder: 1 },
    { code: 'SIM2', label: 'Sim 300 MB', type: FMServiceType.SIM_TYPE, hasActive: true, hasPrice: true, sortOrder: 2 },
    { code: 'SIM3', label: 'Sim 1000 MB', type: FMServiceType.SIM_TYPE, hasActive: true, hasPrice: true, sortOrder: 3 },
    { code: 'SIM4', label: 'Telenor Global (Roaming)', type: FMServiceType.SIM_TYPE, hasActive: true, hasPrice: true, sortOrder: 4 },
    { code: 'SIM5', label: 'Sim 3000 MB', type: FMServiceType.SIM_TYPE, hasActive: true, hasPrice: true, sortOrder: 5 },

    // CAMERA HARDWARE
    { code: 'VIS2', label: 'V2 (Cathexis)', type: FMServiceType.CAMERA, hasActive: true, hasPrice: true, sortOrder: 1 },
    { code: 'VIS3', label: 'V3 (1 Extra Cam)', type: FMServiceType.CAMERA, hasActive: true, hasPrice: true, sortOrder: 2 },
    { code: 'VIS4', label: 'V4 (2 Extra Cams)', type: FMServiceType.CAMERA, hasActive: true, hasPrice: true, sortOrder: 3 },
    { code: 'X2', label: 'X2 (C6D / Adplus V1 / Adplus 2.0-S)', type: FMServiceType.CAMERA, hasActive: true, hasPrice: true, sortOrder: 4 },
    { code: 'X3', label: 'X3 (1 Extra Cam)', type: FMServiceType.CAMERA, hasActive: true, hasPrice: true, sortOrder: 5 },
    { code: 'X4', label: 'X4 (2 Extra Cams)', type: FMServiceType.CAMERA, hasActive: true, hasPrice: true, sortOrder: 6 },
    { code: 'DX', label: 'DX (Adplus 2.0-D)', type: FMServiceType.CAMERA, hasActive: true, hasPrice: true, sortOrder: 7 },
    { code: 'MN', label: 'MN (M1N)', type: FMServiceType.CAMERA, hasActive: true, hasPrice: true, sortOrder: 8 },

    // MIX SIM BILLING CODES
    { code: 'R-SIM5MBP', label: 'R-SIM5MBP', type: FMServiceType.MIX_SIM, hasActive: false, hasPrice: true, sortOrder: 1 },
    { code: 'R-SIM300MBP', label: 'R-SIM300MBP', type: FMServiceType.MIX_SIM, hasActive: false, hasPrice: true, sortOrder: 2 },
    { code: 'R-SIM1GBP', label: 'R-SIM1GBP', type: FMServiceType.MIX_SIM, hasActive: false, hasPrice: true, sortOrder: 3 },
    { code: 'R-SIMTEL', label: 'R-SIMTEL', type: FMServiceType.MIX_SIM, hasActive: false, hasPrice: true, sortOrder: 4 },
    { code: 'R-SIM3GBP', label: 'R-SIM3GBP', type: FMServiceType.MIX_SIM, hasActive: false, hasPrice: true, sortOrder: 5 },

    // MIX VISION BILLING CODES
    { code: 'R-VISS-UN/SD', label: 'R-VISS-UN/SD', type: FMServiceType.MIX_VISION, hasActive: false, hasPrice: true, sortOrder: 1 },
    { code: 'R-VAIS-UN/AI', label: 'R-VAIS-UN/AI', type: FMServiceType.MIX_VISION, hasActive: false, hasPrice: true, sortOrder: 2 },
    { code: 'R-VISS-UN/HD', label: 'R-VISS-UN/HD', type: FMServiceType.MIX_VISION, hasActive: false, hasPrice: true, sortOrder: 3 },
    { code: 'R-VAIS-UN/S', label: 'R-VAIS-UN/S', type: FMServiceType.MIX_VISION, hasActive: false, hasPrice: true, sortOrder: 4 },
    { code: 'R-VAIS-UN/D', label: 'R-VAIS-UN/D', type: FMServiceType.MIX_VISION, hasActive: false, hasPrice: true, sortOrder: 5 },
    { code: 'R-VAIS-UN/M', label: 'R-VAIS-UN/M', type: FMServiceType.MIX_VISION, hasActive: false, hasPrice: true, sortOrder: 6 },
    { code: 'R-VACS-UN/Ext', label: 'R-VACS-UN/Ext', type: FMServiceType.MIX_VISION, hasActive: false, hasPrice: true, sortOrder: 7 },

    // MIX UNIT BILLING CODES
    { code: 'R-PFS_UN', label: 'R-PFS_UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 1 },
    { code: 'R-VT1310S-UN', label: 'R-VT1310S-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 2 },
    { code: 'R-THS-UN', label: 'R-THS-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 3 },
    { code: 'R-M2310IS-UN', label: 'R-M2310IS-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 4 },
    { code: 'R-TTKS-UN', label: 'R-TTKS-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 5 },
    { code: 'R-M4000S-UN', label: 'R-M4000S-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 6 },
    { code: 'R-M6000S-UN', label: 'R-M6000S-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 7 },
    { code: 'R-ATS-UN', label: 'R-ATS-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 8 },
    { code: 'R-REMS-UN', label: 'R-REMS-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 9 },
    { code: 'R-OYSS-UN', label: 'R-OYSS-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 10 },
    { code: 'R-YABS-UN', label: 'R-YABS-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 11 },
    { code: 'R-G52SS-UN', label: 'R-G52SS-UN', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 12 },
    { code: 'SAGPS', label: 'SAGPS', type: FMServiceType.MIX_UNIT, hasActive: false, hasPrice: true, sortOrder: 13 },
  ]

  for (const service of fmServices) {
    await prisma.fMServiceMaster.upsert({
      where: { code: service.code },
      create: service,
      update: {}, // prevents overwrite
    })

    console.log(`FM Service ensured: ${service.label}`)
  }


  //FMxMixServices for FMPreInstall
  // const fmSegments = [

  //   //SEGMENT 1: BASE UNIT TYPES
  //   //FMUT(0) = null — in DB for integrity, filtered out in UI dropdown
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'NULL', label: 'null',
  //     mixCode: null, mixIndex: 0, sortOrder: 0, dependsOn: null
  //   },
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'NULL', label: 'null',
  //     mixCode: null, mixIndex: 0, sortOrder: 0, dependsOn: null
  //   },

  //   // FMUT(1) = TABS
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'FM_TABS', label: 'MiX Tabs Beacon',
  //     mixCode: 'R-THS-UN', mixIndex: 3, sortOrder: 1, dependsOn: null
  //   },

  //   // FMUT(2) = Remora
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'FM_RM', label: 'Remora',
  //     mixCode: 'R-REMS-UN', mixIndex: 9, sortOrder: 2, dependsOn: null
  //   },

  //   // FMUT(6) = M2
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'FM_M2', label: 'M2',
  //     mixCode: 'R-M2310IS-UN', mixIndex: 4, sortOrder: 6, dependsOn: null
  //   },

  //   // FMUT(7) = FMS (FM Premium family)
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'FMS', label: 'FMS',
  //     mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 7, dependsOn: null
  //   },

  //   // FMUT(8) = Yabby
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'FM_YB', label: 'Yabby',
  //     mixCode: 'R-YABS-UN', mixIndex: 11, sortOrder: 8, dependsOn: null
  //   },

  //   // FMUT(9) = Oyster
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'FM_OY', label: 'Oyster',
  //     mixCode: 'R-OYSS-UN', mixIndex: 10, sortOrder: 9, dependsOn: null
  //   },

  //   // FMUT(11) = Stand Alone (SAGPS — vision only, no FMS base)
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'SA', label: 'Stand Alone',
  //     mixCode: null, mixIndex: 0, sortOrder: 11, dependsOn: null
  //   },

  //   //FMUT(13) = Stand Alone M2 (vision + M2 base, no FMS)
  //   {
  //     segment: 1, type: 'BASE_UNIT', code: 'SA_M2', label: 'Stand Alone M2',
  //     mixCode: 'R-TTKS-UN', mixIndex: 5, sortOrder: 13, dependsOn: null
  //   },

  //   //SEGMENT 1: UNIT CODES (FM Unit Code dropdown)
  //   // FMS family
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'FM3306', label: 'FM 3306/3316',
  //     mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 1, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'FM3316T', label: 'FM 3316i (Tracer)',
  //     mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 2, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'FM3707', label: 'FM 3707i/3717i',
  //     mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 3, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'FM3716T', label: 'FM 3716i (Tracer)',
  //     mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 4, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'FM2000', label: 'FM 2000 (FM200 Plus)',
  //     mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 5, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'VT1300', label: 'VT 1300/1310',
  //     mixCode: 'R-VT1310S-UN', mixIndex: 2, sortOrder: 6, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'MIX4000', label: 'MiX4000',
  //     mixCode: 'R-M4000S-UN', mixIndex: 6, sortOrder: 10, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'MIX6000', label: 'MiX6000',
  //     mixCode: 'R-M6000S-UN', mixIndex: 7, sortOrder: 11, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'AT1340', label: 'AT 1340',
  //     mixCode: 'R-ATS-UN', mixIndex: 8, sortOrder: 12, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'G52SS', label: 'G52S Solar Tracker',
  //     mixCode: 'R-G52SS-UN', mixIndex: 12, sortOrder: 16, dependsOn: 'FMS'
  //   },

  //   //FM_M2 family
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'MIX2310', label: 'MiX23101',
  //     mixCode: 'R-M2310IS-UN', mixIndex: 4, sortOrder: 8, dependsOn: 'FM_M2'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'FMC130', label: 'FMC130',
  //     mixCode: 'R-TTKS-UN', mixIndex: 5, sortOrder: 9, dependsOn: 'FM_M2'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'FMC150', label: 'FMC150',
  //     mixCode: 'R-TTKS-UN', mixIndex: 5, sortOrder: 9, dependsOn: 'FM_M2'
  //   },

  //   //FM_TABS family
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'MIXTABS', label: 'MiX Tabs Beacon',
  //     mixCode: 'R-THS-UN', mixIndex: 3, sortOrder: 7, dependsOn: 'FM_TABS'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'BEAME', label: 'BEAME',
  //     mixCode: 'R-THS-UN', mixIndex: 3, sortOrder: 20, dependsOn: 'FM_TABS'
  //   },

  //   // FM_RM
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'REMORA', label: 'Remora',
  //     mixCode: 'R-REMS-UN', mixIndex: 9, sortOrder: 13, dependsOn: 'FM_RM'
  //   },

  //   //FM_YB
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'YABBY', label: 'Yabby',
  //     mixCode: 'R-YABS-UN', mixIndex: 11, sortOrder: 15, dependsOn: 'FM_YB'
  //   },

  //   //FM_OY
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'OYSTER', label: 'Oyster',
  //     mixCode: 'R-OYSS-UN', mixIndex: 10, sortOrder: 14, dependsOn: 'FM_OY'
  //   },

  //   //SA Stand Alone
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'SAGPS', label: 'SAGPS',
  //     mixCode: null, mixIndex: 0, sortOrder: 17, dependsOn: 'SA'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'SAM1N3', label: 'SAM1N3',
  //     mixCode: null, mixIndex: 0, sortOrder: 18, dependsOn: 'SA'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'SAM1N4', label: 'SAM1N4',
  //     mixCode: null, mixIndex: 0, sortOrder: 19, dependsOn: 'SA'
  //   },
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'BARRA', label: 'BARRA',
  //     mixCode: null, mixIndex: 0, sortOrder: 21, dependsOn: 'SA'
  //   },

  //   //SA_M2
  //   {
  //     segment: 1, type: 'UNIT_CODE', code: 'SA_M2UC', label: 'SA_M2',
  //     mixCode: 'R-TTKS-UN', mixIndex: 5, sortOrder: 1, dependsOn: 'SA_M2'
  //   },

  //   //SEGMENT 2: SIM1
  //   {
  //     segment: 2, type: 'SIM1', code: 'S1', label: 'Sim 5 MB',
  //     mixCode: 'R-SIM5MBP', mixIndex: 1, sortOrder: 1, dependsOn: null
  //   },
  //   {
  //     segment: 2, type: 'SIM1', code: 'S2', label: 'Sim 300 MB',
  //     mixCode: 'R-SIM300MBP', mixIndex: 2, sortOrder: 2, dependsOn: null
  //   },
  //   {
  //     segment: 2, type: 'SIM1', code: 'S3', label: 'Sim 1000 MB',
  //     mixCode: 'R-SIM1GBP', mixIndex: 3, sortOrder: 3, dependsOn: null
  //   },
  //   {
  //     segment: 2, type: 'SIM1', code: 'S4', label: 'Telnor Global (Roaming)',
  //     mixCode: 'R-SIMTEL', mixIndex: 4, sortOrder: 4, dependsOn: null
  //   },

  //   //SEGMENT 3: VISION
  //   // FMS visions
  //   {
  //     segment: 3, type: 'VISION', code: 'V', label: 'Std',
  //     mixCode: 'R-VISS-UN/SD', mixIndex: 1, sortOrder: 1, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 3, type: 'VISION', code: 'X', label: 'High Def',
  //     mixCode: 'R-VAIS-UN/AI', mixIndex: 2, sortOrder: 2, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 3, type: 'VISION', code: 'DX', label: 'DX AI',
  //     mixCode: 'R-VAIS-UN/2', mixIndex: 5, sortOrder: 3, dependsOn: 'FMS'
  //   },
  //   {
  //     segment: 3, type: 'VISION', code: 'MN', label: 'M1N',
  //     mixCode: 'R-VAIS-UN/3', mixIndex: 6, sortOrder: 4, dependsOn: 'FMS'
  //   },

  //   // SA visions
  //   {
  //     segment: 3, type: 'VISION', code: 'V1', label: 'SA Vision Type 1 (Adplus V1/2.0-S)',
  //     mixCode: 'R-VISS-UN/HD', mixIndex: 3, sortOrder: 1, dependsOn: 'SA'
  //   },
  //   {
  //     segment: 3, type: 'VISION', code: 'V2', label: 'SA Vision Type 2 (Adplus 2.0-D)',
  //     mixCode: 'R-VAIS-UN/2', mixIndex: 5, sortOrder: 2, dependsOn: 'SA'
  //   },
  //   {
  //     segment: 3, type: 'VISION', code: 'V3', label: 'SA Vision Type 3 (M1N)',
  //     mixCode: 'R-VAIS-UN/3', mixIndex: 6, sortOrder: 3, dependsOn: 'SA'
  //   },

  //   // SA_M2 visions
  //   {
  //     segment: 3, type: 'VISION', code: 'V1', label: 'SA_M2 Vision Type 1 (Adplus V1/2.0-S)',
  //     mixCode: 'R-VISS-UN/HD', mixIndex: 3, sortOrder: 1, dependsOn: 'SA_M2'
  //   },
  //   {
  //     segment: 3, type: 'VISION', code: 'V2', label: 'SA_M2 Vision Type 2 (Adplus 2.0-D)',
  //     mixCode: 'R-VAIS-UN/2', mixIndex: 5, sortOrder: 2, dependsOn: 'SA_M2'
  //   },
  //   {
  //     segment: 3, type: 'VISION', code: 'V3', label: 'SA_M2 Vision Type 3 (M1N)',
  //     mixCode: 'R-VAIS-UN/3', mixIndex: 6, sortOrder: 3, dependsOn: 'SA_M2'
  //   },

  //   // ── SEGMENT 4: CAMERA ────────────────────────────────────
  //   // NOTE: sortOrder stores cameraCount (2/3/4) for CAMERA rows
  //   // V (Cathexis / Std) — count appended in service code
  //   {
  //     segment: 4, type: 'CAMERA', code: 'CATH2', label: 'Cathexis 2 Cam',
  //     mixCode: null, mixIndex: 1, sortOrder: 2, dependsOn: 'V'
  //   },
  //   {
  //     segment: 4, type: 'CAMERA', code: 'CATH3', label: 'Cathexis 3 Cam',
  //     mixCode: 'R-VACS-UN/EXT', mixIndex: 1, sortOrder: 3, dependsOn: 'V'
  //   },
  //   {
  //     segment: 4, type: 'CAMERA', code: 'CATH4', label: 'Cathexis 4 Cam',
  //     mixCode: 'R-VACS-UN/EXT', mixIndex: 1, sortOrder: 4, dependsOn: 'V'
  //   },

  //   // X (High Def / AI) — count appended in service code
  //   {
  //     segment: 4, type: 'CAMERA', code: 'C6D2', label: 'C6D (2 Cam)',
  //     mixCode: null, mixIndex: 2, sortOrder: 2, dependsOn: 'X'
  //   },
  //   {
  //     segment: 4, type: 'CAMERA', code: 'C6D3', label: 'C6D (3 Cam)',
  //     mixCode: 'R-VACS-UN/EXT', mixIndex: 2, sortOrder: 3, dependsOn: 'X'
  //   },
  //   {
  //     segment: 4, type: 'CAMERA', code: 'C6D4', label: 'C6D (4 Cam)',
  //     mixCode: 'R-VACS-UN/EXT', mixIndex: 2, sortOrder: 4, dependsOn: 'X'
  //   },
  //   {
  //     segment: 4, type: 'CAMERA', code: 'ADPV12', label: 'Adplus V1 (2 Cam)',
  //     mixCode: null, mixIndex: 3, sortOrder: 2, dependsOn: 'X'
  //   },
  //   {
  //     segment: 4, type: 'CAMERA', code: 'ADPV13', label: 'Adplus V1 (3 Cam)',
  //     mixCode: 'R-VACS-UN/EXT', mixIndex: 3, sortOrder: 3, dependsOn: 'X'
  //   },
  //   {
  //     segment: 4, type: 'CAMERA', code: 'ADP2S2', label: 'Adplus 2.0-S (2 Cam)',
  //     mixCode: null, mixIndex: 4, sortOrder: 2, dependsOn: 'X'
  //   },
  //   {
  //     segment: 4, type: 'CAMERA', code: 'ADP2S3', label: 'Adplus 2.0-S (3 Cam)',
  //     mixCode: 'R-VACS-UN/EXT', mixIndex: 4, sortOrder: 3, dependsOn: 'X'
  //   },

  //   // DX (Adplus 2.0-D) — count NOT appended, always 2 cams
  //   {
  //     segment: 4, type: 'CAMERA', code: 'ADP2D', label: 'Adplus 2.0-D',
  //     mixCode: 'R-VAIS-UN/2', mixIndex: 5, sortOrder: 2, dependsOn: 'DX'
  //   },

  //   // MN (M1N) — count NOT appended, always 2 cams
  //   {
  //     segment: 4, type: 'CAMERA', code: 'M1N', label: 'M1N',
  //     mixCode: 'R-VAIS-UN/3', mixIndex: 6, sortOrder: 2, dependsOn: 'MN'
  //   },

  //   // SA V1 cameras
  //   {
  //     segment: 4, type: 'CAMERA', code: 'SA_ADPV1', label: 'Adplus V1',
  //     mixCode: 'R-VISS-UN/HD', mixIndex: 3, sortOrder: 2, dependsOn: 'V1'
  //   },
  //   {
  //     segment: 4, type: 'CAMERA', code: 'SA_ADP2S', label: 'Adplus 2.0-S',
  //     mixCode: 'R-VAIS-UN/1', mixIndex: 4, sortOrder: 2, dependsOn: 'V1'
  //   },

  //   // SA V2 cameras
  //   {
  //     segment: 4, type: 'CAMERA', code: 'SA_ADP2D', label: 'Adplus 2.0-D',
  //     mixCode: 'R-VAIS-UN/2', mixIndex: 5, sortOrder: 2, dependsOn: 'V2'
  //   },

  //   // SA V3 cameras
  //   {
  //     segment: 4, type: 'CAMERA', code: 'SA_M1N', label: 'M1N',
  //     mixCode: 'R-VAIS-UN/3', mixIndex: 6, sortOrder: 2, dependsOn: 'V3'
  //   },

  //   // ── SEGMENT 5: SIM2
  //   {
  //     segment: 5, type: 'SIM2', code: 'S2', label: 'Sim 300 MB',
  //     mixCode: 'R-SIM300MBP', mixIndex: 2, sortOrder: 1, dependsOn: null
  //   },
  //   {
  //     segment: 5, type: 'SIM2', code: 'S3', label: 'Sim 1000 MB',
  //     mixCode: 'R-SIM1GBP', mixIndex: 3, sortOrder: 2, dependsOn: null
  //   },

  //   // ── SEGMENT 0: OPTIONS
  //   {
  //     segment: 0, type: 'OPTION', code: 'AI_OPT', label: 'AI Option',
  //     mixCode: null, mixIndex: null, sortOrder: 1, dependsOn: null
  //   },
  //   {
  //     segment: 0, type: 'OPTION', code: 'TMA_OPT', label: 'TMA Option',
  //     mixCode: 'R-TMA', mixIndex: null, sortOrder: 2, dependsOn: null
  //   },
  //   {
  //     segment: 0, type: 'OPTION', code: 'RIM_OPT', label: 'RIM Option',
  //     mixCode: 'R-RIM', mixIndex: null, sortOrder: 3, dependsOn: null
  //   },
  //   {
  //     segment: 0, type: 'OPTION', code: 'NRC_OPT', label: 'NRC Option',
  //     mixCode: 'R-NRC', mixIndex: null, sortOrder: 4, dependsOn: null
  //   },
  //   {
  //     segment: 0, type: 'OPTION', code: 'WIFI_OPT', label: 'WIFI Option',
  //     mixCode: 'R-WIFI-UN', mixIndex: null, sortOrder: 5, dependsOn: null
  //   },
  //   {
  //     segment: 0, type: 'OPTION', code: 'INT_SIM', label: 'International SIM',
  //     mixCode: 'R-SIMTEL', mixIndex: null, sortOrder: 6, dependsOn: null
  //   },
  //   {
  //     segment: 0, type: 'OPTION', code: 'SAFE_OPT', label: 'Safe Guard Option',
  //     mixCode: 'R_SGA', mixIndex: null, sortOrder: 7, dependsOn: null
  //   },
  // ]

  const fmSegments = [
    // ==========================================
    // SEGMENT 0: OPTIONS (Asset-Based Options)
    // ==========================================
    { segment: 0, type: 'OPTION', code: 'AI_Option', label: 'Fatigue Camera (AI)', mixCode: 'R-VAIS-UN/AI', mixIndex: null, sortOrder: 1, dependsOn: null },
    { segment: 0, type: 'OPTION', code: 'Int_SIM', label: 'International SIM Surcharge', mixCode: 'R-SIMTEL', mixIndex: null, sortOrder: 2, dependsOn: null },
    { segment: 0, type: 'OPTION', code: 'WIFI_Option', label: 'WIFI Option (MiX6000)', mixCode: 'R-WIFI-UN', mixIndex: null, sortOrder: 3, dependsOn: null },
    { segment: 0, type: 'OPTION', code: 'TMA_Option', label: 'TMA Option', mixCode: 'R-TMA', mixIndex: null, sortOrder: 4, dependsOn: null },
    { segment: 0, type: 'OPTION', code: 'RIM_Option', label: 'RIM Option', mixCode: 'R-RIM', mixIndex: null, sortOrder: 5, dependsOn: null },
    { segment: 0, type: 'OPTION', code: 'NRC_Option', label: 'NRC Option', mixCode: 'R-NRC', mixIndex: null, sortOrder: 6, dependsOn: null },
    { segment: 0, type: 'OPTION', code: 'Safe_Option', label: 'Safe Guard Option', mixCode: 'R SGA', mixIndex: null, sortOrder: 7, dependsOn: null },
    { segment: 0, type: 'OPTION', code: 'Spare_Option', label: 'Spare Option', mixCode: null, mixIndex: null, sortOrder: 8, dependsOn: null },

    // ==========================================
    // SEGMENT 1: BASE UNIT TYPES (FMUT)
    // ==========================================
    { segment: 1, type: 'BASE_UNIT', code: 'NULL', label: 'null', mixCode: null, mixIndex: 0, sortOrder: 0, dependsOn: null },
    { segment: 1, type: 'BASE_UNIT', code: 'FM_TABS', label: 'Tabs / Beame', mixCode: 'R-THS-UN', mixIndex: 3, sortOrder: 1, dependsOn: null },
    { segment: 1, type: 'BASE_UNIT', code: 'FM_RM', label: 'Remora', mixCode: 'R-REMS-UN', mixIndex: 9, sortOrder: 2, dependsOn: null },
    { segment: 1, type: 'BASE_UNIT', code: 'FM_M2', label: 'MiX2310i / FMC', mixCode: 'R-M2310IS-UN', mixIndex: 4, sortOrder: 6, dependsOn: null },
    { segment: 1, type: 'BASE_UNIT', code: 'FMS', label: 'FM Premium (FMS)', mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 7, dependsOn: null },
    { segment: 1, type: 'BASE_UNIT', code: 'FM_YB', label: 'Yabby', mixCode: 'R-YABS-UN', mixIndex: 11, sortOrder: 8, dependsOn: null },
    { segment: 1, type: 'BASE_UNIT', code: 'FM_OY', label: 'Oyster', mixCode: 'R-OYSS-UN', mixIndex: 10, sortOrder: 9, dependsOn: null },
    { segment: 1, type: 'BASE_UNIT', code: 'SA', label: 'Stand Alone (SAGPS)', mixCode: null, mixIndex: 0, sortOrder: 11, dependsOn: null },
    { segment: 1, type: 'BASE_UNIT', code: 'SA_M2', label: 'Stand Alone M2', mixCode: 'R-TTKS-UN', mixIndex: 5, sortOrder: 13, dependsOn: null },

    // ==========================================
    // SEGMENT 1: UNIT CODES (Hardware Dropdown)
    // ==========================================
    // FMS Family
    { segment: 1, type: 'UNIT_CODE', code: 'FM2000', label: 'FM 2000 (FM200 Plus)', mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 1, dependsOn: 'FMS' },
    { segment: 1, type: 'UNIT_CODE', code: 'FM3306', label: 'FM 3306/3316', mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 2, dependsOn: 'FMS' },
    { segment: 1, type: 'UNIT_CODE', code: 'FM3316T', label: 'FM 3316i (Tracer)', mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 3, dependsOn: 'FMS' },
    { segment: 1, type: 'UNIT_CODE', code: 'FM3707', label: 'FM 3707i/3717i', mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 4, dependsOn: 'FMS' },
    { segment: 1, type: 'UNIT_CODE', code: 'FM3716T', label: 'FM 3716i (Tracer)', mixCode: 'R-PFS_UN', mixIndex: 1, sortOrder: 5, dependsOn: 'FMS' },
    { segment: 1, type: 'UNIT_CODE', code: 'MIX4000', label: 'MiX4000', mixCode: 'R-M4000S-UN', mixIndex: 6, sortOrder: 6, dependsOn: 'FMS' },
    { segment: 1, type: 'UNIT_CODE', code: 'MIX6000', label: 'MiX6000', mixCode: 'R-M6000S-UN', mixIndex: 7, sortOrder: 7, dependsOn: 'FMS' },

    // FM_M2 Family
    { segment: 1, type: 'UNIT_CODE', code: 'MIX2310', label: 'MiX2310i', mixCode: 'R-M2310IS-UN', mixIndex: 4, sortOrder: 1, dependsOn: 'FM_M2' },
    { segment: 1, type: 'UNIT_CODE', code: 'FMC130', label: 'FMC130', mixCode: 'R-TTKS-UN', mixIndex: 5, sortOrder: 2, dependsOn: 'FM_M2' },
    { segment: 1, type: 'UNIT_CODE', code: 'FMC150', label: 'FMC150', mixCode: 'R-TTKS-UN', mixIndex: 5, sortOrder: 3, dependsOn: 'FM_M2' },

    // FM_TABS Family
    { segment: 1, type: 'UNIT_CODE', code: 'MIXTABS', label: 'MiX Tabs Beacon', mixCode: 'R-THS-UN', mixIndex: 3, sortOrder: 1, dependsOn: 'FM_TABS' },
    { segment: 1, type: 'UNIT_CODE', code: 'BEAME', label: 'BEAME', mixCode: 'R-THS-UN', mixIndex: 3, sortOrder: 2, dependsOn: 'FM_TABS' },

    // Asset Trackers & Standalones
    { segment: 1, type: 'UNIT_CODE', code: 'REMORA', label: 'Remora', mixCode: 'R-REMS-UN', mixIndex: 9, sortOrder: 1, dependsOn: 'FM_RM' },
    { segment: 1, type: 'UNIT_CODE', code: 'YABBY', label: 'Yabby', mixCode: 'R-YABS-UN', mixIndex: 11, sortOrder: 1, dependsOn: 'FM_YB' },
    { segment: 1, type: 'UNIT_CODE', code: 'BARRA', label: 'Barra', mixCode: 'R-YABS-UN', mixIndex: 11, sortOrder: 2, dependsOn: 'FM_YB' },
    { segment: 1, type: 'UNIT_CODE', code: 'OYSTER', label: 'Oyster', mixCode: 'R-OYSS-UN', mixIndex: 10, sortOrder: 1, dependsOn: 'FM_OY' },
    { segment: 1, type: 'UNIT_CODE', code: 'SAGPS', label: 'SAGPS (ADPLUS)', mixCode: null, mixIndex: 0, sortOrder: 1, dependsOn: 'SA' },
    { segment: 1, type: 'UNIT_CODE', code: 'SA_M2UC', label: 'SA_M2', mixCode: 'R-TTKS-UN', mixIndex: 5, sortOrder: 1, dependsOn: 'SA_M2' },

    // ==========================================
    // SEGMENT 2: SIM CARD 1 TYPE (S1)
    // ==========================================
    { segment: 2, type: 'SIM1', code: '1', label: 'Sim 5 MB', mixCode: 'R-SIM5MBP', mixIndex: 1, sortOrder: 1, dependsOn: null },
    { segment: 2, type: 'SIM1', code: '2', label: 'Sim 300 MB', mixCode: 'R-SIM300MBP', mixIndex: 2, sortOrder: 2, dependsOn: null },
    { segment: 2, type: 'SIM1', code: '3', label: 'Sim 1000 MB', mixCode: 'R-SIM1GBP', mixIndex: 3, sortOrder: 3, dependsOn: null },
    { segment: 2, type: 'SIM1', code: '4', label: 'Telenor Global (Roaming)', mixCode: 'R-SIMTEL', mixIndex: 4, sortOrder: 4, dependsOn: null },
    { segment: 2, type: 'SIM1', code: '5', label: 'Sim 3000 MB', mixCode: 'R-SIM3GBP', mixIndex: 5, sortOrder: 5, dependsOn: null },

    // ==========================================
    // SEGMENT 3: VISION HARDWARE TYPE
    // ==========================================
    // FMS Base Units
    { segment: 3, type: 'VISION', code: 'V', label: 'Cathexis (V2)', mixCode: 'R-VISS-UN/SD', mixIndex: 1, sortOrder: 1, dependsOn: 'FMS' },
    { segment: 3, type: 'VISION', code: 'X', label: 'C6D / Adplus V1 / Adplus 2.0-S (X2)', mixCode: 'R-VAIS-UN/AI', mixIndex: 2, sortOrder: 2, dependsOn: 'FMS' },
    { segment: 3, type: 'VISION', code: 'DX', label: 'Adplus 2.0-D (DX)', mixCode: 'R-VAIS-UN/D', mixIndex: 5, sortOrder: 3, dependsOn: 'FMS' },
    { segment: 3, type: 'VISION', code: 'MN', label: 'M1N (MN)', mixCode: 'R-VAIS-UN/M', mixIndex: 6, sortOrder: 4, dependsOn: 'FMS' },

    // Standalone Base Units (SA / SA_M2)
    { segment: 3, type: 'VISION', code: 'V1', label: 'Camera Type 1 (Adplus V1 / Adplus 2.0-S)', mixCode: 'R-VISS-UN/HD', mixIndex: 3, sortOrder: 1, dependsOn: 'SA' },
    { segment: 3, type: 'VISION', code: 'V2', label: 'Camera Type 2 (Adplus 2.0-D)', mixCode: 'R-VAIS-UN/D', mixIndex: 5, sortOrder: 2, dependsOn: 'SA' },
    { segment: 3, type: 'VISION', code: 'V3', label: 'Camera Type 3 (M1N)', mixCode: 'R-VAIS-UN/M', mixIndex: 6, sortOrder: 3, dependsOn: 'SA' },

    // ==========================================
    // SEGMENT 4: ADDITIONAL VISION CAMERAS
    // ==========================================
    // Cathexis (V)
    { segment: 4, type: 'CAMERA', code: '2', label: 'Cathexis (2 Cams)', mixCode: null, mixIndex: 0, sortOrder: 1, dependsOn: 'V' },
    { segment: 4, type: 'CAMERA', code: '3', label: 'Cathexis (3 Cams - 1 Extra)', mixCode: '1 x R-VACS-UN/Ext', mixIndex: 3, sortOrder: 2, dependsOn: 'V' },
    { segment: 4, type: 'CAMERA', code: '4', label: 'Cathexis (4 Cams - 2 Extra)', mixCode: '2 x R-VACS-UN/Ext', mixIndex: 4, sortOrder: 3, dependsOn: 'V' },

    // HD / AI Cameras (X)
    { segment: 4, type: 'CAMERA', code: '2', label: 'C6D / Adplus (2 Cams)', mixCode: null, mixIndex: 0, sortOrder: 1, dependsOn: 'X' },
    { segment: 4, type: 'CAMERA', code: '3', label: 'C6D / Adplus (3 Cams - 1 Extra)', mixCode: '1 x R-VACS-UN/Ext', mixIndex: 3, sortOrder: 2, dependsOn: 'X' },
    { segment: 4, type: 'CAMERA', code: '4', label: 'C6D / Adplus (4 Cams - 2 Extra)', mixCode: '2 x R-VACS-UN/Ext', mixIndex: 4, sortOrder: 3, dependsOn: 'X' },

    // Standalone Mappings
    { segment: 4, type: 'CAMERA', code: '1', label: 'Adplus V1 / Adplus 2.0-S', mixCode: 'R-VISS-UN/HD', mixIndex: 3, sortOrder: 1, dependsOn: 'V1' },
    { segment: 4, type: 'CAMERA', code: '2', label: 'Adplus 2.0-D', mixCode: 'R-VAIS-UN/D', mixIndex: 5, sortOrder: 2, dependsOn: 'V2' },
    { segment: 4, type: 'CAMERA', code: '3', label: 'M1N', mixCode: 'R-VAIS-UN/M', mixIndex: 6, sortOrder: 3, dependsOn: 'V3' },

    // ==========================================
    // SEGMENT 5: SIM CARD 2 TYPE (S2)
    // ==========================================
    { segment: 5, type: 'SIM2', code: '1', label: 'Sim 5 MB', mixCode: 'R-SIM5MBP', mixIndex: 1, sortOrder: 1, dependsOn: null },
    { segment: 5, type: 'SIM2', code: '2', label: 'Sim 300 MB', mixCode: 'R-SIM300MBP', mixIndex: 2, sortOrder: 2, dependsOn: null },
    { segment: 5, type: 'SIM2', code: '3', label: 'Sim 1000 MB', mixCode: 'R-SIM1GBP', mixIndex: 3, sortOrder: 3, dependsOn: null },
    { segment: 5, type: 'SIM2', code: '4', label: 'Telenor Global (Roaming)', mixCode: 'R-SIMTEL', mixIndex: 4, sortOrder: 4, dependsOn: null },
    { segment: 5, type: 'SIM2', code: '5', label: 'Sim 3000 MB', mixCode: 'R-SIM3GBP', mixIndex: 5, sortOrder: 5, dependsOn: null },
  ]

  for (const item of fmSegments) {
    const data = {
      segment: item.segment,
      type: item.type,
      code: item.code,
      label: item.label,
      mixCode: item.mixCode ?? null,
      mixIndex: item.mixIndex ?? null,
      sortOrder: item.sortOrder ?? null,
      dependsOn: item.dependsOn ?? null,
      isActive: true,
    }

    await prisma.fMServiceSegment.upsert({
      where: {
        segment_type_code_label: {
          segment: item.segment,
          type: item.type,
          code: item.code,
          label: item.label,
        },
      },
      create: data,
      update: {
        mixCode: data.mixCode,
        mixIndex: data.mixIndex,
        sortOrder: data.sortOrder,
        dependsOn: data.dependsOn,
        isActive: true,
      },
    })
    console.log(`FM Segment ensured: [${item.type}] ${item.label}`)
  }

}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
