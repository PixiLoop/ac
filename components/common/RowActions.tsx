'use client';

import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';

type RowActionsProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  disableDelete?: boolean;
  idDeletable?: boolean
};

export default function RowActions({
  onView,
  onEdit,
  onDelete,
  disableDelete = false, //default value
  idDeletable = true
}: RowActionsProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <button title="View" onClick={onView} className="p-0.5 rounded-full border">
        <Eye size={16} />
      </button>

      {onEdit && (
        <button title="Edit" onClick={onEdit} className="p-0.5 rounded-full border">
          <Edit2 size={16} />
        </button>
      )}

      {idDeletable && <button
        title="Delete"
        onClick={onDelete}
        disabled={disableDelete} //disable Delete button
        className={`p-0.5 rounded-full border text-rose-600 ${disableDelete ? 'opacity-40 cursor-not-allowed' : ''
          }`}
      >
        <Trash2 size={16} />
      </button>}
    </div>
  );
}
