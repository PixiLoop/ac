import { AdminShell } from '../../../../components/layout/AdminShell';
import { PurchaseOrderForm } from '../../../../components/purchase-orders/PurchaseOrderForm';

export default function PurchaseOrderPage({ params }: { params: { id: string } }) {
  return (
    <AdminShell title="Purchase Order">
      <PurchaseOrderForm poId={params.id} />
    </AdminShell>
  );
}