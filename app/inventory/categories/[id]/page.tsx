'use client';

import { useParams } from 'next/navigation';
import { AdminShell } from '../../../../components/layout/AdminShell';
import { CategoryForm } from '../../../../components/inventory/CategoryForm';

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AdminShell title="Edit Category">
      <CategoryForm categoryId={id} />
    </AdminShell>
  );
}
