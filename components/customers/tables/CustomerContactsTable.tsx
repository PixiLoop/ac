'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

import DataTable from '../../common/DataTable';
import RowActions from '../../common/RowActions';
import { CustomerContactForm } from '../forms/CustomerContactForm';

export function CustomerContactsTable({
  customerId,
}: {
  customerId: string;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const isReadOnly = editing?.__mode === 'view';
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const res = await api.get(`/customers/${customerId}`);
      setRows(res.data.data?.contacts || []);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load contacts',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  // 🔑 listen to header Add Contact button
  useEffect(() => {
    const handler = () =>
      setEditing({ __mode: 'create' });

    document.addEventListener(
      'contact:create',
      handler,
    );
    return () =>
      document.removeEventListener(
        'contact:create',
        handler,
      );
  }, []);

  const remove = async (id: string) => {
    await api.patch(`/customers/${customerId}/contacts`, {
      contacts: rows.filter(r => r.id !== id),
    });
    showToast({ type: 'success', title: 'Contact removed' });
    load();
  };

  return (
    <div className="space-y-3">
      <DataTable
        loading={loading}
        data={rows}
        columns={[
          {
            key: 'name',
            title: 'Full Name',
            render: row =>
              `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
          },
          { key: 'email', title: 'Email' },
          { key: 'phone', title: 'Phone' },
          {
            key: 'isPrimary',
            title: 'Primary',
            render: row => (row.isPrimary ? 'Yes' : ''),
          },
          {
            key: 'actions',
            title: 'Actions',
            render: row => (
              <RowActions
                onView={() => setEditing({ ...row, __mode: 'view' })}
                onEdit={() =>
                  setEditing({ ...row, __mode: 'edit' })
                }
                onDelete={() => remove(row.id)}
              />
            ),
          },
        ]}
        page={1}
        pageSize={10}
        total={rows.length}
      />

      {editing && (
        <div className="border-t pt-3">
          <CustomerContactForm
            key={`${editing.id ?? 'new'}-${editing.__mode}`}
            customerId={customerId}
            initialData={
              editing.__mode === 'create' ? null : editing
            }
            existingContacts={rows}
            readOnly={isReadOnly}
            onClose={() => setEditing(null)}
            onSwitchToEdit={() => setEditing(prev => ({ ...prev, __mode: 'edit' }))}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        </div>
      )}
    </div>
  );
}
