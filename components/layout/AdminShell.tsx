'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Menu, LayoutDashboard, Calendar, Users, CheckSquare } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  HelpCircle,
  Search,
  User as UserIcon,
  Users as UsersIcon,
  Shield,
  Wrench,
  ChevronDown,
  ChevronRight,
  Building2,
  ClipboardList,
  FileText,
  Receipt,
  PackageCheck,
  Hammer,
  BarChart3,
  Briefcase,
  Boxes,
  Package,
  Upload,
  Truck,
  Users2,
  MapPin
} from 'lucide-react';

import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import Logo from '../../components/common/Logo';

import { TableDensityProvider } from '../common/TableDensityContext';
import { TableDensityToolbar } from '../common/TableDensityToolbar';

/* ================= HELP CONTENT ================= */

const HELP_CONTENT = {
  dashboard: {
    title: 'Help – Dashboard',
    lines: [
      'Use the left menu to access all modules.',
      'Dashboard widgets show KPIs and recent activity.',
      'Click a widget to open the full module.',
    ],
  },
  profile: {
    title: 'Help – My Profile',
    lines: [
      'View and update your personal information.',
      'Change your password and security settings.',
    ],
  },
  users: {
    title: 'Help – User Management',
    lines: [
      'Manage users and access permissions.',
      'Search by name, email or status.',
      'All changes are logged in audit history.',
    ],
  },
  roles: {
    title: 'Help – Role Management',
    lines: [
      'Create and manage system roles.',
      'Assign permissions to control access.',
    ],
  },
  customers: {
    title: 'Help – Customer Management',
    lines: [
      'General Account shows all customer records.',
      'Create, edit and view customer details.',
      'Manage contacts, addresses, accounts and payments.',
      'FM Account will be enabled in a future phase.',
    ],
  },
  generic: {
    title: 'Help – User Guide',
    lines: ['Use the left navigation to move between modules.'],
  },
};

const NAV_ITEMS = [
  //{ href: '/profile', label: 'My Profile', icon: <UserIcon className="h-4 w-4" /> },
  //{ href: '/admin/users', label: 'Users', icon: <UsersIcon className="h-4 w-4" /> },
  //{ href: '/admin/roles', label: 'Roles', icon: <Shield className="h-4 w-4" /> },  
  { href: '/quotations', label: 'Quotations', icon: <FileText className="h-4 w-4" /> },
  { href: '/salesorders', label: 'Salesorders', icon: <ClipboardList className="h-4 w-4" /> },
  { href: '/invoices', label: 'Invoices', icon: <Receipt className="h-4 w-4" /> },
  { href: '/fm-preinstall', label: 'FM Preinstall', icon: <Wrench className="h-4 w-4" /> },
  { href: '/fm-install', label: 'FM Install', icon: <Hammer className="h-4 w-4" /> },
  { href: '/web-reports', label: 'Web Reports', icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/field-services', label: 'Airco Services', icon: <Wrench className="h-4 w-4" /> },
  { href: '/admin/job-boards', label: 'Job Book', icon: <Briefcase className="h-4 w-4" /> },
];

export function AdminShell({ title, children, showTableDensity }: any) {

  const { user, logout, permissions, isSystem } = useAuth() as any;
  const { has } = createPermissionChecker(permissions, isSystem);

  // Permission checks
  const canViewCustomers = has('customers.view') || has('customers.create');
  const canViewFMCustomers = has('fmcustomers.view') || has('fmcustomers.create');
  const canViewInventory = has('inventory.view') || has('inventory.create');
  const canViewQuotations = has('quotations.view') || has('quotations.create');
  const canViewSalesOrders = has('salesorders.view') || has('salesorders.create');
  const canViewInvoices = has('invoices.view') || has('invoices.create');
  const canViewFMPreinstall = has('fmpreinstalls.view') || has('fmpreinstalls.create');
  const canViewFMInstall = has('fminstalls.view') || has('fminstalls.create');
  const canViewUsers = has('users.view') || has('users.create');
  const canViewRoles = has('roles.view') || has('roles.create');
  const canViewXero = has('integrations.view') || has('integrations.xero');
  const canViewJobs = has('jobboards.view') || has('jobboards.create');
  const canImport = has('inventory.import');

  const canViewPurchaseOrders = has('purchaseorders.view') || has('purchaseorders.create');
  const canViewPickingSlips = has('picking-slips.view') || has('picking-slips.create');

  const canViewDispatchMethods = has('dispatchmethods.view') || has('dispatchmethods.create');
  const canViewOrganizations = has('organizations.view') || has('organizations.create');
  const canViewDispatches = has('dispatches.view') || has('dispatches.create');
  const showMasterDataMenu = canViewDispatchMethods || canViewDispatches || canViewOrganizations;

  const showCustomerMenu = canViewCustomers || canViewFMCustomers;
  const showInventoryMenu = canViewInventory;
  const showAdminMenu = canViewUsers || canViewRoles || canViewXero;

  const router = useRouter();
  const pathname = usePathname();
  //const { user, logout } = useAuth() as any;

  const [collapsed, setCollapsed] = useState(false);  //Default should be true for sidebar closed
  const [hoverLogo, setHoverLogo] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [masterDataMenuOpen, setMasterDataMenuOpen] = useState(false);
  const [jobBoardMenuOpen, setJobBoardMenuOpen] = useState(false)
  const help =
    pathname?.startsWith('/customers') ? HELP_CONTENT.customers
      : pathname?.startsWith('/profile') ? HELP_CONTENT.profile
        : pathname?.startsWith('/admin/roles') ? HELP_CONTENT.roles
          : pathname?.startsWith('/admin/users') ? HELP_CONTENT.users
            : HELP_CONTENT.generic;

  const openSidebar = (cb?: () => void) => {
    setCollapsed(false);
    setTimeout(() => cb?.(), 220);
  };

  const handleNav = (href: string) => { //Not using
    if (collapsed) openSidebar(() => router.push(href));
    else router.push(href);
  };

  const initials =
    (user?.displayName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.email ||
      '?')
      .split(' ')
      .map((p: string) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  //   useEffect(() => {
  //   // Customer
  //   if (pathname?.startsWith('/customers')) {
  //     setCustomerMenuOpen(true);
  //   } else {
  //     setCustomerMenuOpen(false);
  //   }

  //   //Administration
  //   if (pathname?.startsWith('/admin')) {
  //     setAdminMenuOpen(true);
  //   } else {
  //     setAdminMenuOpen(false);
  //   }
  // }, [pathname]);

  useEffect(() => {
    // CUSTOMER MANAGEMENT
    if (
      pathname?.startsWith('/customers') ||
      pathname?.startsWith('/admin/fm-customers')
    ) {
      setCustomerMenuOpen(true);
    } else {
      setCustomerMenuOpen(false);
    }

    // INVENTORY
    if (pathname?.startsWith('/inventory')) {
      setInventoryMenuOpen(true);
    } else {
      setInventoryMenuOpen(false);
    }

    // ADMINISTRATION (exclude fm-customers, exclude master-data screens)
    if (
      pathname?.startsWith('/admin') &&
      !pathname?.startsWith('/admin/fm-customers') &&
      !pathname?.startsWith('/admin/dispatch-methods')
    ) {
      setAdminMenuOpen(true);
    } else {
      setAdminMenuOpen(false);
    }

    // MASTER DATA
    if (pathname?.startsWith('/admin/dispatches')) {
      setMasterDataMenuOpen(true);
    } else if (pathname?.startsWith('/admin/dispatch-methods')) {
      setMasterDataMenuOpen(true);
    } else {
      setMasterDataMenuOpen(false);
    }
  }, [pathname]);



  return (
    <div className="h-screen bg-surface overflow-hidden">
      {/* ================= SIDEBAR ================= */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 border-r bg-white transition-all duration-200 flex flex-col',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        {/* LOGO */}
        <div
          className={cn(
            "h-14 flex items-center relative border-b transition-all",
            collapsed ? "justify-center" : "justify-start pl-3"
          )}
          onMouseEnter={() => setHoverLogo(true)}
          onMouseLeave={() => setHoverLogo(false)}
        >
          <Logo collapsed={collapsed} />

          {collapsed && hoverLogo && (
            <button
              onClick={() => openSidebar()}
              className="absolute inset-0 flex items-center justify-center bg-white/70"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {!collapsed && (
            <button
              className="absolute right-2 h-8 w-8 border rounded-full flex items-center justify-center"
              onClick={() => setCollapsed(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* NAV */}
        <nav className="flex-1 px-2 mt-2 overflow-y-auto">


          {/* CUSTOMER */}
          {showCustomerMenu && (
            <div className="mt-1">
              <button
                onClick={() => collapsed ? openSidebar() : setCustomerMenuOpen(!customerMenuOpen)}
                className={cn("flex w-full items-center gap-2 px-2 py-2 text-[11px]", collapsed && "justify-center")}
              >
                <UsersIcon className="h-4 w-4" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Customer Management</span>
                    {customerMenuOpen ? <ChevronDown /> : <ChevronRight />}
                  </>
                )}
              </button>
              {!collapsed && customerMenuOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  {canViewCustomers && (
                    <Link href="/customers" className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                      <Building2 className="h-3.5 w-3.5" />
                      General Account
                    </Link>
                  )}
                  {canViewFMCustomers && (
                    <Link href="/admin/fm-customers"
                      className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]",
                        pathname.startsWith('/admin/fm-customers') && "bg-slate-100 rounded")}
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      FM Account
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* INVENTORY */}
          {showInventoryMenu && (
            <div className="mt-1">
              <button
                onClick={() => collapsed ? openSidebar() : setInventoryMenuOpen(!inventoryMenuOpen)}
                className={cn("flex w-full items-center gap-2 px-2 py-2 text-[11px]",
                  collapsed && "justify-center",
                  pathname?.startsWith('/inventory') && "bg-slate-100 rounded")}
              >
                <Boxes className="h-4 w-4" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Inventory</span>
                    {inventoryMenuOpen ? <ChevronDown /> : <ChevronRight />}
                  </>
                )}
              </button>
              {!collapsed && inventoryMenuOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  <Link href="/inventory" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px] w-full rounded", pathname === '/inventory' && "bg-slate-100")}>
                    <Package className="h-3.5 w-3.5" />Items
                  </Link>
                  <Link href="/inventory/groups" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px] w-full rounded", pathname?.startsWith('/inventory/groups') && "bg-slate-100")}>
                    <Boxes className="h-3.5 w-3.5" />Groups
                  </Link>
                  {canImport && (
                    <Link href="/inventory/bulk-import" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px] w-full rounded",
                      pathname?.startsWith('/inventory/bulk-import') && "bg-slate-100")}>
                      <Upload className="h-3.5 w-3.5" />Bulk Import
                    </Link>
                  )}
                  <Link href="/inventory/suppliers" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px] w-full rounded", pathname?.startsWith('/inventory/suppliers') && "bg-slate-100")}>
                    <Truck className="h-3.5 w-3.5" />Suppliers
                  </Link>
                  <Link href="/inventory/categories" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px] w-full rounded", pathname?.startsWith('/inventory/categories') && "bg-slate-100")}>
                    <Truck className="h-3.5 w-3.5" />Categories
                  </Link>
                  <Link href="/inventory/locations" className={cn('flex items-center gap-2 px-2 py-1.5 text-[11px] w-full rounded', pathname?.startsWith('/inventory/locations') && 'bg-slate-100')}>
                    <MapPin className="h-3.5 w-3.5" />Locations
                  </Link>
                  {canViewPurchaseOrders && (
                    <Link
                      href="/inventory/purchase-orders"
                      className={cn('flex items-center gap-2 px-2 py-1.5 text-[11px] w-full rounded',
                        pathname?.startsWith('/inventory/purchase-orders') && 'bg-slate-100')}
                    >
                      <PackageCheck className="h-3.5 w-3.5" />Purchase Orders
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* {NAV_ITEMS.map((i) => (
            <button
              key={i.href}
              onClick={() => handleNav(i.href)}
              className={cn(
                'flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded',
                pathname.startsWith(i.href) && 'bg-slate-100',
                collapsed && 'justify-center',
              )}
            >
              {i.icon}
              {!collapsed && i.label}
            </button>
          ))} */}

          {/* {NAV_ITEMS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                'flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded',
                pathname.startsWith(i.href) && 'bg-slate-100',
                collapsed && 'justify-center',
              )}
            >
              {i.icon}
              {!collapsed && i.label}
            </Link>
          ))} */}

          {canViewQuotations && (
            <Link key="/quotations" href="/quotations" className={cn('flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded', pathname.startsWith('/quotations') && 'bg-slate-100', collapsed && 'justify-center')}>
              <FileText className="h-4 w-4" />{!collapsed && 'Quotations'}
            </Link>
          )}
          {canViewSalesOrders && (
            <Link key="/salesorders" href="/salesorders" className={cn('flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded', pathname.startsWith('/salesorders') && 'bg-slate-100', collapsed && 'justify-center')}>
              <ClipboardList className="h-4 w-4" />{!collapsed && 'Salesorders'}
            </Link>
          )}
          {canViewInvoices && (
            <Link key="/invoices" href="/invoices" className={cn('flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded', pathname.startsWith('/invoices') && 'bg-slate-100', collapsed && 'justify-center')}>
              <Receipt className="h-4 w-4" />{!collapsed && 'Invoices'}
            </Link>
          )}
          {canViewPickingSlips && (
            <Link key="/picking-slips" href="/picking-slips" className={cn('flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded', pathname.startsWith('/picking-slips') && 'bg-slate-100', collapsed && 'justify-center')}>
              <PackageCheck className="h-4 w-4" />{!collapsed && 'Picking Slip'}
            </Link>
          )}
          {canViewFMPreinstall && (
            <Link key="/fm-preinstall" href="/fm-preinstall" className={cn('flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded', pathname.startsWith('/fm-preinstall') && 'bg-slate-100', collapsed && 'justify-center')}>
              <Wrench className="h-4 w-4" />{!collapsed && 'FM Preinstall'}
            </Link>
          )}
          {canViewFMInstall && (
            <Link key="/fm-install" href="/fm-install" className={cn('flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded', pathname.startsWith('/fm-install') && 'bg-slate-100', collapsed && 'justify-center')}>
              <Hammer className="h-4 w-4" />{!collapsed && 'FM Install'}
            </Link>
          )}
          {canViewFMCustomers && (
            <Link key="/web-reports" href="/web-reports" className={cn('flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded', pathname.startsWith('/web-reports') && 'bg-slate-100', collapsed && 'justify-center')}>
              <BarChart3 className="h-4 w-4" />{!collapsed && 'Web Reports'}
            </Link>
          )}
          {canViewJobs && (
            <Link key="/admin/job-boards" href="/admin/job-boards" className={cn('flex w-full items-center gap-2 px-2 py-2 text-[11px] rounded', pathname.startsWith('/admin/job-boards') && 'bg-slate-100', collapsed && 'justify-center')}>
              <Briefcase className="h-4 w-4" />{!collapsed && 'Job Book'}
            </Link>
          )}

          <div className="mt-1">
            <button
              onClick={() => collapsed ? openSidebar() : setJobBoardMenuOpen(!jobBoardMenuOpen)}
              className={cn("flex w-full items-center gap-2 px-2 py-2 text-[11px]", collapsed && "justify-center")}
            >
              <Boxes className="h-4 w-4" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Job Book</span>
                  {jobBoardMenuOpen ? <ChevronDown /> : <ChevronRight />}
                </>
              )}
            </button>
            {!collapsed && jobBoardMenuOpen && (
              <div className="ml-6 mt-1 space-y-1">
                <Link href="/job-boards/dashboard" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/job-boards/dashboard') && "bg-slate-100 rounded")}>
                  <LayoutDashboard className="h-3.5 w-3.5" />Operations Dashboard
                </Link>
                <Link href="/job-boards/installations" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/job-boards/installations') && "bg-slate-100 rounded")}>
                  <Wrench className="h-3.5 w-3.5" />Installation Jobs
                </Link>
                <Link href="/job-boards/calendar" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/job-boards/calendar') && "bg-slate-100 rounded")}>
                  <Calendar className="h-3.5 w-3.5" />Operations Calendar
                </Link>
                <Link href="/job-boards/technicians" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/job-boards/technicians') && "bg-slate-100 rounded")}>
                  <Users className="h-3.5 w-3.5" />Technicians / Installers
                </Link>
                <Link href="/job-boards/checklists" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/job-boards/checklists') && "bg-slate-100 rounded")}>
                  <CheckSquare className="h-3.5 w-3.5" />Checklist Templates
                </Link>
              </div>
            )}
          </div>


          {/* MASTER DATA */}
          {showMasterDataMenu && (
            <div className="mt-1">
              <button
                onClick={() => collapsed ? openSidebar() : setMasterDataMenuOpen(!masterDataMenuOpen)}
                className={cn("flex w-full items-center gap-2 px-2 py-2 text-[11px]", collapsed && "justify-center")}
              >
                <Boxes className="h-4 w-4" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Master Data</span>
                    {masterDataMenuOpen ? <ChevronDown /> : <ChevronRight />}
                  </>
                )}
              </button>
              {!collapsed && masterDataMenuOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  {canViewDispatches && (
                    <Link href="/admin/dispatches" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/admin/dispatches') && "bg-slate-100 rounded")}>
                      <PackageCheck className="h-3.5 w-3.5" />Dispatches
                    </Link>
                  )}
                  {canViewDispatchMethods && (
                    <Link href="/admin/dispatch-methods" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/admin/dispatch-methods') && "bg-slate-100 rounded")}>
                      <Truck className="h-3.5 w-3.5" />Dispatch Methods
                    </Link>
                  )}
                  {canViewOrganizations && (
                    <Link href="/admin/organizations" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/admin/organizations') && "bg-slate-100 rounded")}>
                      <Building2 className="h-3.5 w-3.5" />Organizations
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ADMINISTRATION */}
          {showAdminMenu && (
            <div className="mt-1">
              <button
                onClick={() => collapsed ? openSidebar() : setAdminMenuOpen(!adminMenuOpen)}
                className={cn("flex w-full items-center gap-2 px-2 py-2 text-[11px]", collapsed && "justify-center")}
              >
                <Shield className="h-4 w-4" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Administration</span>
                    {adminMenuOpen ? <ChevronDown /> : <ChevronRight />}
                  </>
                )}
              </button>
              {!collapsed && adminMenuOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  {canViewUsers && (
                    <Link href="/admin/users" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/admin/users') && "bg-slate-100 rounded")}>
                      <UsersIcon className="h-3.5 w-3.5" />Users
                    </Link>
                  )}
                  {canViewRoles && (
                    <Link href="/admin/roles" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/admin/roles') && "bg-slate-100 rounded")}>
                      <Shield className="h-3.5 w-3.5" />Roles
                    </Link>
                  )}
                  {canViewXero && (
                    <Link href="/admin/xero" className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", pathname.startsWith('/admin/xero') && "bg-slate-100 rounded")}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#13B5EA' }}>✕</span>Xero
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

        </nav>

        {/* USER MENU */}
        <div className="border-t px-2 py-2">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-2 py-2 text-[11px]"
          >
            <div className="h-8 w-8 rounded-full bg-ink text-white flex items-center justify-center text-xs">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 text-left truncate">
                {user?.displayName || user?.email}
              </div>
            )}
          </button>

          {userMenuOpen && (
            <div className="mt-1 rounded border bg-white">
              <button
                className="w-full text-left px-3 py-2 text-[11px]"
                onClick={() => router.push('/profile')}
              >
                Profile
              </button>
              <button
                className="w-full text-left px-3 py-2 text-[11px] text-rose-600"
                onClick={() => logout()}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <TableDensityProvider>
        <div
          className="flex flex-col h-full"
          style={{ marginLeft: collapsed ? 72 : 256 }}
        >
          {/* HEADER */}
          <header className="fixed top-0 right-0 z-30 h-14 border-b bg-white flex items-center justify-between px-6"
            style={{ left: collapsed ? 72 : 256 }}
          >
            <h1 className="text-[15px] font-semibold">{title}</h1>
            <div className="flex items-center gap-2">
              {showTableDensity && <TableDensityToolbar />}
              <button className="h-8 w-8 border rounded-full flex items-center justify-center">
                <Search className="h-4 w-4" />
              </button>
              <button className="h-8 w-8 border rounded-full flex items-center justify-center">
                <Bell className="h-4 w-4" />
              </button>
              <button
                className="h-8 w-8 border rounded-full flex items-center justify-center"
                onClick={() => setHelpOpen(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* CONTENT */}
          <main className="flex-1 overflow-y-auto px-6 py-4 pt-16">
            {children}
          </main>
        </div>
      </TableDensityProvider>

      {/* HELP */}
      {helpOpen && (
        <>
          <div className="fixed inset-0 bg-black/20" onClick={() => setHelpOpen(false)} />
          <aside className="fixed right-0 top-0 h-full w-[320px] bg-white border-l z-50">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{help.title}</h2>
              <button
                className="h-8 w-8 border rounded-full flex items-center justify-center"
                onClick={() => setHelpOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 text-xs space-y-2">
              <ol className="list-decimal pl-4 space-y-1">
                {help.lines.map((l: string, i: number) => (
                  <li key={i}>{l}</li>
                ))}
              </ol>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
