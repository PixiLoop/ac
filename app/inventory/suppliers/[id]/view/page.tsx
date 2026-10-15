'use client';

import { useParams, useRouter } from 'next/navigation';

import { AdminShell } from '../../../../../components/layout/AdminShell';
import { Button } from '../../../../../components/ui/button';
import { SupplierView } from '../../../../../components/inventory/SupplierView';
import { suppliers } from '../../../../../components/inventory/data';

export default function SupplierViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const supplier = suppliers.find((s) => s.id === id);

  return (
    <AdminShell title={supplier ? `${supplier.name} — Orders & Receipts` : 'Supplier'}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Supplier orders and stock receipts</p>
          <Button variant="outline" onClick={() => router.push('/inventory/suppliers')}>
            Back to Suppliers
          </Button>
        </div>
        <SupplierView supplierId={id} />
      </div>
    </AdminShell>
  );
}
