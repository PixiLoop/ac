'use client';

import { useParams } from 'next/navigation';

import { AdminShell } from '../../../../components/layout/AdminShell';
import { SupplierForm } from '../../../../components/inventory/SupplierForm';

export default function EditSupplierPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <AdminShell title="Edit Supplier">
      <SupplierForm supplierId={id} />
    </AdminShell>
  );
}
