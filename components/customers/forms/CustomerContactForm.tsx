'use client';

import { useState } from 'react';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Button } from '../../ui/button';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\-\s]{6,20}$/;

export function CustomerContactForm({
  customerId,
  initialData,
  existingContacts,
  onSaved,
  onClose,
  readOnly = false,
  onSwitchToEdit,
}: {
  customerId: string;
  initialData: any | null;
  existingContacts: any[];
  onSaved: () => void;
  onClose: () => void;
  readOnly?: boolean;
  onSwitchToEdit?: () => void;
}) {
  const { showToast } = useToast();

  const [form, setForm] = useState({
    id: initialData?.id,
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    role: initialData?.role || 'GENERAL',
    isPrimary: initialData?.isPrimary || false,
  });

  const save = async () => {
    if (!form.firstName.trim()) {
      showToast({ type: 'error', title: 'First Name is required' });
      return;
    }

    if (!form.lastName.trim()) {
      showToast({ type: 'error', title: 'Last Name is required' });
      return;
    }

    //if (!emailRegex.test(form.email)) {
    if (form.email.trim() && !emailRegex.test(form.email)) {
      showToast({ type: 'error', title: 'Invalid email address' });
      return;
    }

    if (form.phone && !phoneRegex.test(form.phone)) {
      showToast({ type: 'error', title: 'Invalid phone number' });
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      showToast({ type: 'error', title: 'Email or Phone is required' });
      return;
    }

    //merge with existing contacts
    const updatedContacts = existingContacts
      .filter(c => c.id !== form.id)
      .map(c => ({
        ...c,
        isPrimary: form.isPrimary ? false : c.isPrimary,
      }));

    updatedContacts.push(form);

    try {
      await api.patch(`/customers/${customerId}/contacts`, {
        contacts: updatedContacts,
      });

      showToast({ type: 'success', title: 'Contact saved' });
      onSaved();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err?.response?.data?.message,
      });
    }
  };

  return (
    <div className="mt-4 rounded-md border p-4 space-y-4 bg-slate-50">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First Name"
          sanitizeType="name"
          value={form.firstName}
          onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
          readOnly={readOnly}
        />

        <Input
          label="Last Name"
          sanitizeType="name"
          value={form.lastName}
          onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
          readOnly={readOnly}
        />

        <Input
          label="Email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          readOnly={readOnly}
        />

        <Input
          label="Phone"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          readOnly={readOnly}
        />
      </div>

      <Checkbox
        label="Primary contact"
        checked={form.isPrimary}
        onChange={v => setForm(f => ({ ...f, isPrimary: v }))}
        disabled={readOnly}
      />

      <div className="flex justify-end gap-2">
        {readOnly ? (
          <>
            <Button variant="outline" onClick={() => onSwitchToEdit?.()}>Edit</Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </>
        )}
      </div>
    </div>
  );
}
