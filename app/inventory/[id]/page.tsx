'use client';

import { useParams } from 'next/navigation';

import { AdminShell } from '../../../components/layout/AdminShell';
import { InventoryItemForm } from '../../../components/inventory/InventoryItemForm';

export default function EditInventoryItemPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <AdminShell title="Edit Inventory Item">
      <InventoryItemForm itemId={id} />
    </AdminShell>
  );
}
