import { AdminShell } from '../../../../components/layout/AdminShell';
import { PurchaseOrderForm } from '../../../../components/purchase-orders/PurchaseOrderForm';

export default function NewPurchaseOrderPage() {
  return (
    <AdminShell title="New Purchase Order">
      <PurchaseOrderForm />
    </AdminShell>
  );
}