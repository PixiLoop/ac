'use client';

import { AdminShell } from '../../components/layout/AdminShell';
import { InventoryList } from '../../components/inventory/InventoryList';
import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission';

export default function InventoryPage() {
  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);

  if (!has('inventory.view') && !has('inventory.create')) {
    return (
      <AdminShell title="Inventory">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Inventory" showTableDensity>
      <InventoryList />
    </AdminShell>
  );
}
