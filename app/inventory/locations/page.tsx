// apps/web/src/app/inventory/locations/page.tsx

import { AdminShell } from '../../../components/layout/AdminShell';
import { LocationsManager } from '../../../components/inventory/LocationsManager';

export default function LocationsPage() {
  return (
    <AdminShell title="Warehouse Locations">
      <LocationsManager />
    </AdminShell>
  );
}
