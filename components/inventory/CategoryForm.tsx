'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../ui/toast';
import { Card, CardHeader, CardTitle, CardContent, Checkbox } from './shared-ui';

type Props = { categoryId?: string };

export function CategoryForm({ categoryId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = !!categoryId;

  const [code,        setCode]        = useState('');
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [isActive,    setIsActive]    = useState(true);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!categoryId) return;
    api.get(`/inventory/categories/${categoryId}`)
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setCode(d.code ?? '');
        setName(d.name ?? '');
        setDescription(d.description ?? '');
        setIsActive(d.isActive ?? true);
      })
      .catch(() => showToast({ type: 'error', title: 'Failed to load category' }));
  }, [categoryId]);

  async function handleSave() {
    if (!code.trim()) { showToast({ type: 'error', title: 'Code is required' }); return; }
    if (!name.trim()) { showToast({ type: 'error', title: 'Name is required' }); return; }

    const payload = { code: code.trim(), name: name.trim(), description: description.trim() || undefined, isActive };

    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/inventory/categories/${categoryId}`, payload);
      } else {
        await api.post('/inventory/categories', payload);
      }
      showToast({ type: 'success', title: `Category ${isEdit ? 'updated' : 'created'} successfully` });
      router.push('/inventory/categories');
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to save category' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{isEdit ? 'Edit Category' : 'Add Category'}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/inventory/categories')}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Code <span className="text-red-500">*</span></Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. AC-UNIT" />
            </div>
            <div className="space-y-2">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Air Conditioning Units" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isActive} onCheckedChange={() => setIsActive((v) => !v)} />
            Active
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-6 border-t">
          <Button variant="outline" onClick={() => router.push('/inventory/categories')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
