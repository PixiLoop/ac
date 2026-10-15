import React from 'react';
import { Button } from '../../components/ui/button';

export default function RoleTable({ roles, loading, onEdit, onDelete }: any) {
  if (loading) return <div className="py-6 text-center">Loading...</div>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>
              <th className="text-left font-semibold px-6 py-3">Role</th>
              <th className="text-left font-semibold px-6 py-3">Description</th>
              <th className="text-left font-semibold px-6 py-3">Permissions</th>
              <th className="text-right font-semibold px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                <td className="px-6 py-3 text-sm font-medium text-slate-900">{r.name}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{r.description ?? '—'}</td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-2">
                    {(r.permissions ?? r.rolePermissions ?? []).map((p:any) => (
                      <span key={p.id} className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-700">{p.name}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => onEdit(r)}
                      className="inline-flex items-center gap-2 border border-slate-200 rounded px-3 py-1 text-sm"
                      title="Edit role"
                    >
                      {/* pencil svg (no dependency) */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="#0f172a" strokeWidth="0" fill="#0f172a" />
                        <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#0f172a"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="inline-flex items-center gap-2 border border-slate-200 rounded px-3 py-1 text-sm text-rose-700"
                      title="Delete role"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">No roles</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
