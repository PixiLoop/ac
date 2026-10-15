'use client';

import { AdminShell } from '../../../../components/layout/AdminShell';
import { CategoryForm } from '../../../../components/inventory/CategoryForm';

export default function NewCategoryPage() {
  return (
    <AdminShell title="Add Category">
      <CategoryForm />
    </AdminShell>
  );
}
