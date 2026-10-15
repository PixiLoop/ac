'use client';

import { AdminShell } from '../../../components/layout/AdminShell';
import { SupplierList } from '../../../components/inventory/SupplierList';

export default function InventorySuppliersPage() {
  return (
    <AdminShell title="Suppliers" showTableDensity>
      <SupplierList />
    </AdminShell>
  );
}
