'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import { useAuth } from '../../../providers/auth-provider';
import { createPermissionChecker } from '../../../lib/permission';

export default function XeroConfigPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [hasRecord, setHasRecord] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus]     = useState<any>(null);

  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);
  const canView = has('integrations.view');
  const canEdit = has('integrations.xero'); 

  const [form, setForm] = useState({
    clientId: '', clientSecret: '', tenantId: '', redirectUri: '', isActive: false,
  });

  const update = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const loadStatus = async () => {
    try {
      const res = await api.get('/admin/xero-config/status');
      setStatus(res.data?.data ?? res.data);
    } catch {}
  };

  useEffect(() => {
    // Check if returning from Xero OAuth
    if (searchParams.get('authorized') === 'true') {
      showToast({ type: 'success', title: 'Xero Connected!', message: 'Successfully authorized with Xero.' });
    }

    api.get('/admin/xero-config')
      .then(res => {
        const d = res.data?.data ?? res.data;
        if (d) {
          setHasRecord(true);
          setForm({
            clientId:     d.clientId     ?? '',
            clientSecret: d.clientSecret ?? '',
            tenantId:     d.tenantId     ?? '',
            redirectUri:  d.redirectUri  ?? '',
            isActive:     d.isActive     ?? false,
          });
        } else {
          setIsEditing(true);
        }
      })
      .catch(() => setIsEditing(true))
      .finally(() => setLoading(false));

    loadStatus();
  }, []);

  const handleSave = async () => {
    if (!form.clientId.trim()) {
      showToast({ type: 'error', title: 'Validation', message: 'Client ID is required' });
      return;
    }
    if (!form.clientSecret.trim()) {
      showToast({ type: 'error', title: 'Validation', message: 'Client Secret is required' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/xero-config', form);
      showToast({ type: 'success', title: 'Saved', message: 'Xero configuration saved successfully' });
      setHasRecord(true);
      setIsEditing(false);
      await loadStatus();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err?.response?.data?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleAuthorize = async () => {
    try {
      const res = await api.get('/admin/xero-config/auth-url');
      const url = res.data?.data?.url ?? res.data?.url;
      if (url) window.location.href = url;
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to get authorization URL' });
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.post('/admin/xero-config/disconnect', {});
      showToast({ type: 'success', title: 'Disconnected', message: 'Xero disconnected successfully' });
      await loadStatus();
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to disconnect' });
    }
  };

  if (loading) return (
    <AdminShell title="Xero Configuration">
      <div className="p-6 text-sm text-slate-500">Loading…</div>
    </AdminShell>
  );

  if (!canView) {
    return (
      <AdminShell title="Xero Configuration">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    );
  }

  const isAuthorized = status?.authorized && !status?.isExpired;

  return (
    <AdminShell title="Xero Configuration">
      <div className="max-w-2xl mx-auto mt-6 space-y-4">

        {/* Main Card */}
        <div className="border rounded-lg overflow-hidden">

          {/* Header */}
          <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: '#13B5EA', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14,
              }}>X</div>
              <div>
                <h2 className="font-semibold text-sm">Xero Integration</h2>
                <p className="text-xs text-slate-500">Connect your Xero account to sync invoices</p>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              isAuthorized
                ? 'bg-green-100 text-green-700'
                : hasRecord
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {isAuthorized ? '● Connected' : hasRecord ? '◐ Configured' : '○ Not Set Up'}
            </span>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-4">

            {/* View mode */}
            {hasRecord && !isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 mb-1 uppercase font-medium tracking-wide">Client ID</p>
                    <p className="font-mono bg-slate-50 px-3 py-2 rounded border text-slate-700">{form.clientId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1 uppercase font-medium tracking-wide">Client Secret</p>
                    <p className="font-mono bg-slate-50 px-3 py-2 rounded border text-slate-400">••••••••••••</p>
                  </div>
                  {form.tenantId && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1 uppercase font-medium tracking-wide">Tenant ID</p>
                      <p className="font-mono bg-slate-50 px-3 py-2 rounded border text-slate-700">{form.tenantId}</p>
                    </div>
                  )}
                  {form.redirectUri && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1 uppercase font-medium tracking-wide">Redirect URI</p>
                      <p className="font-mono bg-slate-50 px-3 py-2 rounded border text-slate-700 text-xs truncate">{form.redirectUri}</p>
                    </div>
                  )}
                </div>

                {/* Token status */}
                {status?.authorized && (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-700">
                    <p className="font-semibold mb-1">✓ Authorized with Xero</p>
                    {status.tenantId && <p>Tenant ID: <strong>{status.tenantId}</strong></p>}
                    {status.tokenExpiry && (
                      <p>Token expires: <strong>{new Date(status.tokenExpiry).toLocaleString('en-AU')}</strong>
                        {status.isExpired && <span className="ml-2 text-red-600 font-bold">⚠ Expired — Re-authorize needed</span>}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit Configuration
                  </Button>
                  {!isAuthorized ? (
                    <Button onClick={handleAuthorize}>
                      🔗 Authorize with Xero
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleDisconnect}
                      className="text-red-600 border-red-200 hover:bg-red-50">
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Edit mode */
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Input label="Client ID *" value={form.clientId}
                    onChange={e => update('clientId', e.target.value)}
                    placeholder="Enter your Xero Client ID" />
                  <Input label="Client Secret *" type="password" value={form.clientSecret}
                    onChange={e => update('clientSecret', e.target.value)}
                    placeholder={hasRecord ? 'Leave as is or enter new secret' : 'Enter your Xero Client Secret'} />
                  <Input label="Redirect URI" value={form.redirectUri}
                    onChange={e => update('redirectUri', e.target.value)}
                    placeholder="e.g. https://yourapp.com/api/admin/xero-config/callback" />
                  <Input label="Tenant ID (optional)" value={form.tenantId}
                    onChange={e => update('tenantId', e.target.value)}
                    placeholder="Auto-filled after authorization" />
                </div>

                {/* Active toggle */}
                <div className="flex items-center gap-3 pt-1">
                  <button type="button" onClick={() => update('isActive', !form.isActive)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.isActive ? 'bg-green-500' : 'bg-slate-200'
                    }`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      form.isActive ? 'translate-x-4' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="text-sm text-slate-600">Enable Xero Integration</span>
                </div>

                {/* Help */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Where to find these credentials:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to <strong>developer.xero.com</strong> → My Apps</li>
                    <li>Create a new app or select existing</li>
                    <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                    <li>Set Redirect URI to: <strong>{form.redirectUri || 'https://yourapp.com/api/admin/xero-config/callback'}</strong></li>
                  </ol>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : hasRecord ? 'Update Configuration' : 'Save Configuration'}
                  </Button>
                  {hasRecord && (
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OAuth Flow explanation */}
        {hasRecord && !isAuthorized && (
          <div className="border rounded-lg px-6 py-4 bg-slate-50 text-sm">
            <p className="font-semibold text-slate-700 mb-2">How Authorization Works</p>
            <div className="flex items-start gap-3 text-xs text-slate-500 space-y-2">
              <ol className="list-decimal pl-4 space-y-2">
                <li>Click <strong>Authorize with Xero</strong></li>
                <li>You'll be redirected to <strong>Xero's login page</strong></li>
                <li>Login and click <strong>Allow Access</strong></li>
                <li>You'll be redirected back here — <strong>done!</strong></li>
              </ol>
            </div>
          </div>
        )}

      </div>
    </AdminShell>
  );
}