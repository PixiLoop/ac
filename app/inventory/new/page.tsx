'use client';

import { AdminShell } from '../../../components/layout/AdminShell';
import { InventoryItemForm } from '../../../components/inventory/InventoryItemForm';

export default function NewInventoryItemPage() {
  return (
    <AdminShell title="Add Inventory Item">
      <InventoryItemForm />
    </AdminShell>
  );
}
