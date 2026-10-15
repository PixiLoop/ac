'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

import DataTable from '../../common/DataTable';
import RowActions from '../../common/RowActions';
import { CustomerDispatchForm, DISPATCH_METHOD_OPTIONS } from '../forms/CustomerDispatchForm';

const methodLabel = (code: string) =>
  DISPATCH_METHOD_OPTIONS.find(o => o.value === code)?.label ?? code;

export function CustomerDispatchesTable({
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
      setRows(res.data.data?.dispatches || []);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load dispatches',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  // 🔑 listen for create event
  useEffect(() => {
    const handler = () =>
      setEditing({ __mode: 'create' });

    document.addEventListener('dispatch:create', handler);
    return () =>
      document.removeEventListener('dispatch:create', handler);
  }, []);

  const remove = async (id: string) => {
    const updated = rows.filter(r => r.id !== id);

    await api.patch(`/customers/${customerId}/dispatches`, {
      dispatches: updated,
    });

    showToast({
      type: 'success',
      title: 'Dispatch removed',
    });

    load();
  };

  return (
    <div className="space-y-3">
      <DataTable
        loading={loading}
        data={rows}
        columns={[
          { key: 'method', title: 'Method', render: row => methodLabel(row.method) },
          { key: 'accountNo', title: 'Account No' },
          { key: 'accountName', title: 'Account Name' },
          {
            key: 'charge',
            title: 'Charge',
            render: row =>
              row.charge != null ? `$${row.charge}` : '',
          },
          {
            key: 'isDefault',
            title: 'Default',
            render: row => (row.isDefault ? 'Yes' : ''),
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
          <CustomerDispatchForm
            key={`${editing.id ?? 'new'}-${editing.__mode}`}
            customerId={customerId}
            initialData={
              editing.__mode === 'create' ? null : editing
            }
            existingDispatches={rows}
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
