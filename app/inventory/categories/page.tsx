'use client';

import { AdminShell } from '../../../components/layout/AdminShell';
import { CategoryList } from '../../../components/inventory/CategoryList';

export default function CategoriesPage() {
  return (
    <AdminShell title="Inventory Categories" showTableDensity>
      <CategoryList />
    </AdminShell>
  );
}
