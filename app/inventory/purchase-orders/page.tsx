import { AdminShell } from '../../../components/layout/AdminShell';
import { PurchaseOrderList } from '../../../components/purchase-orders/PurchaseOrderList';

export default function PurchaseOrdersPage() {
  return (
    <AdminShell title="Purchase Orders">
      <PurchaseOrderList />
    </AdminShell>
  );
}