'use client';
import React, { ChangeEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';

type Props = {
  avatarPreview?: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  avatarFile?: File | null;
  uploading?: boolean;
  error?: string | null;
  onSelectFile: (file: File | null) => void;
  onTriggerSelect: () => void;
  onUndo?: () => void;
};

export default function ProfileAvatarUpload({
  avatarPreview,
  fileInputRef,
  avatarFile,
  uploading,
  error,
  onSelectFile,
  onTriggerSelect,
  onUndo,
}: Props) {
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    onSelectFile(f);
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-ink text-white flex items-center justify-center text-[18px] font-semibold overflow-hidden">
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="uppercase">U</span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInput} />
            <Button size="sm" variant="ghost" onClick={onTriggerSelect}>Change picture</Button>
            {avatarFile && <Button size="sm" variant="ghost" onClick={onUndo}>Undo</Button>}
            {uploading && <div className="text-xs text-slate-500 self-center">Uploading…</div>}
          </div>
          {error && <div className="mt-2 text-xs text-rose-600">{error}</div>}
          <div className="mt-1 text-[10px] text-slate-500">PNG/JPG, max 2MB. Changes are saved immediately when you click Save.</div>
        </div>
      </div>
    </div>
  );
}
