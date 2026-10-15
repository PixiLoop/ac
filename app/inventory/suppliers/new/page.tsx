'use client';

import { AdminShell } from '../../../../components/layout/AdminShell';
import { SupplierForm } from '../../../../components/inventory/SupplierForm';

export default function NewSupplierPage() {
  return (
    <AdminShell title="Add Supplier">
      <SupplierForm />
    </AdminShell>
  );
}
