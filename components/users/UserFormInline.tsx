'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MultiSelect } from '../ui/MultiSelect';
import { PasswordInput } from '../ui/PasswordInput';
import { api } from '../../lib/api-client';
import { useToast } from '../ui/toast';
import { useFormValidation } from '../../lib/use-form-validation';
import {
  isRequired,
  isValidEmail,
  isStrongPassword,
} from '../../lib/validators';

/* ================= TYPES ================= */

type RoleDto = { id: string; name: string };

type UserDto = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  roles?: RoleDto[];
};

type Props = {
  user: UserDto | null;
  mode: 'create' | 'edit' | 'view';
  onCancel: () => void;
  onSaved: () => void;
};

type Fields =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'password'
  | 'roles';

/* ================= COMPONENT ================= */

export default function UserFormInline({
  user,
  mode,
  onCancel,
  onSaved,
}: Props) {
  const { showToast } = useToast();
  const { invalidate, clear, has } = useFormValidation<Fields>();

  const isCreate = mode === 'create';
  const isView = mode === 'view';

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleDto[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [originalMfaEnabled, setOriginalMfaEnabled] = useState(false);
  const [formMfaEnabled, setFormMfaEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ---------- LOAD ROLES ---------- */

  useEffect(() => {
    api.get('/roles').then(res => {
      const data = res.data?.data ?? res.data;
      setRoleOptions(data.items ?? data);
    });
  }, []);

  /* ---------- HYDRATE ---------- */

  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setRoles((user.roles ?? []).map(r => r.id));
    setIsActive(user.isActive);
    setFormMfaEnabled(user.mfaEnabled);
    setOriginalMfaEnabled(user.mfaEnabled);
  }, [user]);

  /* ---------- SUBMIT ---------- */

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error =
      invalidate({
        ...(isRequired(firstName)
          ? {}
          : { firstName: 'First name is required' }),
        ...(isRequired(lastName)
          ? {}
          : { lastName: 'Last name is required' }),
        ...(isValidEmail(email)
          ? {}
          : { email: 'Enter a valid email address' }),
        ...(isRequired(roles)
          ? {}
          : { roles: 'At least one role is required' }),
        ...(isCreate && !isStrongPassword(password)
          ? {
              password:
                'Password must be 8+ chars, include upper, lower & number',
            }
          : {}),
      }) || null;

    if (error) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: error,
      });
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        email,
        firstName,
        lastName,
        roleIds: roles,
        isActive,
        ...(isCreate
          ? { defaultPassword: password }
          : { mfaEnabled: formMfaEnabled }),
      };

      isCreate
        ? await api.post('/users', payload)
        : await api.patch(`/users/${user!.id}`, payload);

      onSaved();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err?.response?.data?.message ?? 'Something went wrong',
      });
    } finally {
      setSaving(false);
    }
  };

  /* ================= RENDER ================= */

  return (
    <form onSubmit={submit} className="rounded-xl border bg-white p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>First name *</Label>
          <Input
            value={firstName}
            error={has('firstName')}
            disabled={isView}
            onChange={e => {
              setFirstName(e.target.value);
              clear('firstName');
            }}
          />
        </div>

        <div>
          <Label>Last name *</Label>
          <Input
            value={lastName}
            error={has('lastName')}
            disabled={isView}
            onChange={e => {
              setLastName(e.target.value);
              clear('lastName');
            }}
          />
        </div>

        <div>
          <Label>Email *</Label>
          <Input
            value={email}
            error={has('email')}
            disabled={isView}
            onChange={e => {
              setEmail(e.target.value);
              clear('email');
            }}
          />
        </div>

        {isCreate && (
          <div>
            <Label>Password *</Label>
            <PasswordInput
              value={password}
              error={has('password')}
              showRules
              onChange={v => {
                setPassword(v);
                clear('password');
              }}
            />
          </div>
        )}

        <div className="md:col-span-2">
          <Label>Roles *</Label>
          <div className={has('roles') ? 'border border-rose-500 rounded-md p-1' : ''}>
            <MultiSelect
              value={roles}
              disabled={isView}
              onChange={v => {
                setRoles(v);
                clear('roles');
              }}
              options={roleOptions.map(r => ({
                label: r.name,
                value: r.id,
              }))}
            />
          </div>
        </div>
      </div>

      {/* MFA + Active untouched */}
      {!isCreate && (
        <div className="flex gap-8 pt-3 border-t">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                disabled={isView}
                onChange={e => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Active user 
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Inactive users cannot log in
            </p>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formMfaEnabled}
                disabled={isView || !originalMfaEnabled}
                onChange={e => !e.target.checked && setFormMfaEnabled(false)}
                className="h-4 w-4 accent-indigo-600"
              />
              MFA enabled
            </label>
            <p className="text-xs text-slate-500 mt-1">
              MFA can only be enabled by the user during login
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {!isView && (
          <Button type="submit" loading={saving}>
            {isCreate ? 'Create user' : 'Update user'}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
