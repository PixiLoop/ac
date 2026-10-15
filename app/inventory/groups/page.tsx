'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../components/layout/AdminShell';
import { GroupManagement } from '../../../components/inventory/GroupManagement';
import { useAuth } from '../../../providers/auth-provider';
import { createPermissionChecker } from '../../../lib/permission';

export default function InventoryGroupsPage() {
  const router = useRouter();
  const { permissions, isSystem, loading, user } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);
  

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-400">
        Loading...
      </div>
    );
  }

  if (!has('inventory.view') && !has('inventory.edit') && !has('products.managePricing')) {
    return (
      <AdminShell title="Inventory Groups">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Inventory Groups">
      <GroupManagement />
    </AdminShell>
  );
}
