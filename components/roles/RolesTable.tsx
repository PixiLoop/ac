import React from 'react';
import { Pencil, ArrowRight, Trash2 } from 'lucide-react';

type PermissionDto = { id: string; name: string; description?: string | null; };
type RoleDto = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  permissions: PermissionDto[];
  userCount?: number;
};

export default function RolesTable({
  roles,
  loading,
  onEdit,
  onDelete,
}: {
  roles: RoleDto[];
  loading: boolean;
  onEdit: (r: RoleDto) => void;
  onDelete: (id: string) => void;
}) {
  const permNames = (r: RoleDto) => (r.permissions && r.permissions.length ? r.permissions.map(p => p.name).join(', ') : '—');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50">
            <tr className="text-[12px] text-slate-500">
              <th className="px-6 py-3 text-left font-semibold">Role</th>
              <th className="px-6 py-3 text-left font-semibold">Description</th>
              <th className="px-6 py-3 text-left font-semibold">Permissions</th>
              <th className="px-6 py-3 text-left font-semibold">Assigned</th>
              <th className="px-6 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">Loading roles…</td>
              </tr>
            )}

            {!loading && roles.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">No roles found.</td>
              </tr>
            )}

            {!loading && roles.map(r => {
              const assigned = (r.userCount ?? 0) > 0;
              return (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 align-middle">
                    <div className="font-medium text-slate-900">{r.name}</div>
                  </td>

                  <td className="px-6 py-3 align-middle text-slate-700">
                    {r.description ?? '—'}
                  </td>

                  <td className="px-6 py-3 align-middle text-slate-700">
                    <div className="text-sm text-slate-600">{permNames(r)}</div>
                  </td>

                  <td className="px-6 py-3 align-middle text-slate-600">
                    {assigned ? `${r.userCount} user(s)` : '—'}
                  </td>

                  <td className="px-6 py-3 align-middle text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        title="Edit role"
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1 text-sm"
                        onClick={() => onEdit(r)}
                      >
                        <Pencil size={16} />
                      </button>

                      {/* hide or disable delete when role assigned to any users */}
                      {assigned ? (
                        <button
                          type="button"
                          title="Role assigned — cannot delete"
                          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1 text-sm opacity-50 cursor-not-allowed"
                          disabled
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Delete role"
                          className="inline-flex items-center gap-2 rounded-md border border-rose-100 text-rose-600 px-3 py-1 text-sm"
                          onClick={() => onDelete(r.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
