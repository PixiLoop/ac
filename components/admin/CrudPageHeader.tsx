'use client';

import React from 'react';
import { Button } from '../ui/button';

type CrudPageHeaderProps = {
  sectionPath?: string; // e.g. "Admin / Users"
  title: string;
  subtitle?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  showExport?: boolean;
};

export function CrudPageHeader({
  sectionPath,
  title,
  subtitle,
  primaryActionLabel,
  onPrimaryAction,
  showExport = false,
}: CrudPageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        {sectionPath && (
          <p className="text-[11px] text-slate-500">{sectionPath}</p>
        )}
        <h2 className="text-[14px] font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] text-slate-600 max-w-xl">
            {subtitle}
          </p>
        )}
      </div>

      {(primaryActionLabel || showExport) && (
        <div className="flex items-center gap-2">
          {showExport && (
            <Button
              variant="outline"
              className="hidden md:inline-flex text-[11px] border-slate-200"
            >
              Export
            </Button>
          )}
          {primaryActionLabel && onPrimaryAction && (
            <Button
              variant="primary"
              className="text-[11px]"
              onClick={onPrimaryAction}
            >
              {primaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
