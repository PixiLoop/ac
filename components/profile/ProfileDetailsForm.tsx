'use client';
import React from 'react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { PhoneInput } from '../../components/ui/PhoneInput';

type Props = {
  editing: boolean;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  onChangeFirst: (v: string) => void;
  onChangeLast: (v: string) => void;
  onChangeDisplay: (v: string) => void;
  onChangePhone: (v: string) => void;
  error?: string | null;
};

export default function ProfileDetailsForm({
  editing,
  firstName,
  lastName,
  displayName,
  phone,
  onChangeFirst,
  onChangeLast,
  onChangeDisplay,
  onChangePhone,
  error,
}: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label>First name</Label>
        {editing ? (
          <Input value={firstName} sanitizeType="name" onChange={(e) => onChangeFirst(e.target.value)} placeholder='First name'/>
        ) : (
          <div className="rounded border border-slate-100 bg-slate-50 p-2">{firstName || <span className="text-slate-400">—</span>}</div>
        )}
      </div>

      <div>
        <Label>Last name</Label>
        {editing ? (
          <Input value={lastName} sanitizeType="name" onChange={(e) => onChangeLast(e.target.value)} placeholder='Last name'/>
        ) : (
          <div className="rounded border border-slate-100 bg-slate-50 p-2">{lastName || <span className="text-slate-400">—</span>}</div>
        )}
      </div>

      <div>
        <Label>Display name</Label>
        {editing ? (
          <Input value={displayName} sanitizeType="name" onChange={(e) => onChangeDisplay(e.target.value)} placeholder='Display name'/>
        ) : (
          <div className="rounded border border-slate-100 bg-slate-50 p-2">{displayName || <span className="text-slate-400">—</span>}</div>
        )}
      </div>

      <div>
        <Label>Phone</Label>
        {editing ? (
          // <Input value={phone} onChange={(e) => onChangePhone(e.target.value)} />

          <PhoneInput
            value={phone}
            onChange={onChangePhone}
            required
            maxLength={11}
            minLength={7}
            //countryCode="+91"
            showMask
            onErrorChange={(err) => {
              /*  error to parent */
            }}
          />
          
        ) : (
          <div className="rounded border border-slate-100 bg-slate-50 p-2">{phone || <span className="text-slate-400">—</span>}</div>
        )}
      </div>

      {error && <div className="md:col-span-2"><Alert type="error">{error}</Alert></div>}
    </div>
  );
}
