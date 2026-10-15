'use client';

import { AdminShell } from '../../../components/layout/AdminShell';
import { BulkImport } from '../../../components/inventory/BulkImport';

export default function InventoryBulkImportPage() {
  return (
    <AdminShell title="Inventory Bulk Import">
      <BulkImport />
    </AdminShell>
  );
}
