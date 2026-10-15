'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

import { AdminShell } from '../../components/layout/AdminShell';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { useToast } from '../../components/ui/toast';
import { useAuth } from '../../providers/auth-provider';
import { api } from '../../lib/api-client';

import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileDetailsForm from '../../components/profile/ProfileDetailsForm';
import ProfileChangePassword from '../../components/profile/ProfileChangePassword';
import ProfileMFASettings from '../../components/profile/ProfileMFASettings';
import ProfileSecurityTabs from '../../components/profile/ProfileSecurityTabs';
import DefaultLandingSelector, { LandingOption } from '../../components/profile/DefaultLandingSelector';

type TabKey = 'password' | 'mfa';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, error, syncUser } = useAuth();
  const { showToast } = useToast();

  // ---------- TOP-LEVEL STATE ----------
  const [activeTab, setActiveTab] = useState<TabKey>('password');

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [pfFirstName, setPfFirstName] = useState('');
  const [pfLastName, setPfLastName] = useState('');
  const [pfDisplayName, setPfDisplayName] = useState('');
  const [pfPhone, setPfPhone] = useState('');
  const [pfSaving, setPfSaving] = useState(false);
  const [pfError, setPfError] = useState<string | null>(null);

  // Avatar state
  const DEFAULT_AVATAR = '/avatar-default.png';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // can be objectURL or resolved server url
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);

  // change-password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaPhase, setMfaPhase] = useState<'idle' | 'setup'>('idle');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaOtpUrl, setMfaOtpUrl] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  

  function resolveAvatarUrl(
    path?: string | null,
    opts?: { cacheBust?: boolean }
  ) {
    if (!path) return DEFAULT_AVATAR;

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return opts?.cacheBust ? `${path}?t=${Date.now()}` : path;
    }

    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.API_BASE_URL ??
      '';

    const url = `${apiBase}${path}`;
    return opts?.cacheBust ? `${url}?t=${Date.now()}` : url;
  }


  // Helper to resolve avatar path to accessible URL
  function resolvePublicUrl(path?: string | null, { cacheBust = false } = {}) {
    if (!path) return null;
  
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const url = `${apiBase}${path}`;
    return cacheBust ? `${url}?t=${Date.now()}` : url;
  }

  // ---------- EFFECTS ----------
  useEffect(() => {
    if (!loading) {
      if (!user && !error) {
        router.replace('/login');
      }
    }
  }, [loading, user, error, router]);

  // initialise form fields and avatar when user changes
  useEffect(() => {
    if (!user) return;

    const serverPath =
    (user.profilePhotoUrl as string | undefined) ??
    (user.avatarUrl as string | undefined) ??
    null;

    setAvatarUrl(resolveAvatarUrl(serverPath));
    setAvatarPreview(null);

    setPfFirstName(user.firstName ?? '');
    setPfLastName(user.lastName ?? '');
    setPfDisplayName(user.displayName ?? '');
    setPfPhone(user.phone ?? '');
    setSecretQuestion(user.secretQuestion ?? '');
    setSecretAnswer('');
    setMfaEnabled(!!user.mfaEnabled);
    setMfaPhase('idle');
    setMfaSecret('');
    setMfaOtpUrl('');
    setMfaCode('');
    setAvatarFile(null);
    setAvatarError(null);

    const serverAvatarPath = (user.profilePhotoUrl as string | undefined) ?? (user.avatarUrl as string | undefined) ?? null;
    setAvatarPreview(resolvePublicUrl(serverAvatarPath));
  }, [user]);

  // ---------- HELPERS ----------
  const fullName = useMemo(
    () =>
      user?.displayName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.email ||
      '',
    [user],
  );

  // ---------- PROFILE SAVE ----------
  const handleStartEdit = () => {
    if (!user) return;
    setEditingProfile(true);
    setPfError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    if (user) {
      setPfFirstName(user.firstName ?? '');
      setPfLastName(user.lastName ?? '');
      setPfDisplayName(user.displayName ?? '');
      setPfPhone(user.phone ?? '');
    }
    // revert preview to current server avatar
    const serverAvatarPath = (user?.profilePhotoUrl as string | undefined) ?? (user?.avatarUrl as string | undefined) ?? null;
    setAvatarPreview(resolvePublicUrl(serverAvatarPath));
    setAvatarFile(null);
    setEditingProfile(false);
    setPfError(null);
    setAvatarError(null);
  };

  const validateProfile = () => {
    setPfError(null);
    if (!pfDisplayName.trim() && !pfFirstName.trim() && !pfLastName.trim()) {
      setPfError('Please provide a display name or first/last name.');
      return false;
    }
    if (pfPhone && pfPhone.length < 6) {
      setPfError('Please provide a valid phone number or leave blank.');
      return false;
    }
    return true;
  };

  // helper to refresh /auth/me
  const refreshAndSyncAuth = async (opts?: { cacheBustAvatar?: boolean }) => {
    try {
      const meRes = await api.get('/auth/me');
      const mePayload = meRes.data?.data ?? meRes.data;
      if (typeof syncUser === 'function') {
        try {
          await syncUser(mePayload);
        } catch {
          await syncUser(); // fallback revalidate
        }
      }
      const freshUser = mePayload?.user ?? null;
      if (freshUser) {
        setPfFirstName(freshUser.firstName ?? '');
        setPfLastName(freshUser.lastName ?? '');
        setPfDisplayName(freshUser.displayName ?? '');
        setPfPhone(freshUser.phone ?? '');
        const newAvatar = (freshUser.profilePhotoUrl ?? freshUser.avatarUrl) ?? null;
        setAvatarPreview(resolvePublicUrl(newAvatar, { cacheBust: !!opts?.cacheBustAvatar }));
      }
      return mePayload;
    } catch (err) {
      console.error('refreshAndSyncAuth failed', err);
      return null;
    }
  };


const setDefaultLanding = async (value: string) => {
  if (!user) return;
  try {
    setPfSaving(true);
    await api.patch(`/users/${user.id}`, { defaultLandingPage: value });
    // revalidate /auth/me and sync UI cache
    if (typeof syncUser === 'function') {
      try {
        await syncUser(); // re-fetch /auth/me
      } catch (err) {
        console.warn('syncUser failed after defaultLanding update', err);
      }
    }
    showToast({ type: 'success', title: 'Saved', message: 'Default landing page updated.' });
  } catch (err: any) {
    console.error('Failed to set default landing', err);
    showToast({ type: 'error', title: 'Save failed', message: 'Unable to save default landing page.' });
  } finally {
    setPfSaving(false);
  }
};



  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    if (!validateProfile()) return;

    setPfSaving(true);
    setPfError(null);

    try {
      //avatar upload first (if user selected one)
      // if (avatarFile) {
      //   setAvatarUploading(true);
      //   setAvatarError(null);
      //   try {
      //     const fd = new FormData();
      //     fd.append('avatar', avatarFile);
      //     await api.post(`/users/${user.id}/avatar`, fd, {
      //       headers: { 'Content-Type': 'multipart/form-data' },
      //     });
      //     // refresh profile and cache, cache-bust avatar
      //     await refreshAndSyncAuth({ cacheBustAvatar: true });
      //   } catch (err: any) {
      //     console.error('Avatar upload failed', err);
      //     setAvatarError('Unable to upload avatar. Try again.');
      //     showToast({ type: 'error', title: 'Upload failed', message: 'Avatar upload failed.' });
      //     setAvatarUploading(false);
      //     setPfSaving(false);
      //     return;
      //   } finally {
      //     setAvatarUploading(false);
      //   }
      // }


      if (avatarFile) {
        setAvatarUploading(true);

        try {
          const fd = new FormData();
          fd.append('avatar', avatarFile);

          const res = await api.post(
            `/users/${user.id}/avatar`,
            fd,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );

          // backend MUST return the stored path/url
          const newPath =
            res.data?.data?.profilePhotoUrl ??
            res.data?.profilePhotoUrl;

          if (newPath) {
            setAvatarUrl(resolveAvatarUrl(newPath, { cacheBust: true }));
          }

          setAvatarPreview(null);
          setAvatarFile(null);
        } catch {
          setAvatarError('Avatar upload failed.');
          showToast({
            type: 'error',
            title: 'Upload failed',
            message: 'Unable to upload avatar.',
          });
          return;
        } finally {
          setAvatarUploading(false);
        }
      }


      //update profile fields
      const payload: any = {
        firstName: pfFirstName.trim() || undefined,
        lastName: pfLastName.trim() || undefined,
        displayName: pfDisplayName.trim() || undefined,
        phone: pfPhone.trim() || undefined,
      };

      await api.patch(`/users/${user.id}`, payload);

      // refresh auth and UI
      await refreshAndSyncAuth({ cacheBustAvatar: !!avatarFile });

      showToast({ type: 'success', title: 'Profile updated', message: 'Your profile was updated.' });
      setEditingProfile(false);
      setAvatarFile(null);
    } catch (err: any) {
      console.error('Profile update failed', err);
      const payload = err?.response?.data;
      let msg = 'Unable to update profile.';
      if (payload?.message) msg = typeof payload.message === 'string' ? payload.message : payload.message.message ?? msg;
      setPfError(msg);
      showToast({ type: 'error', title: 'Update failed', message: msg });
    } finally {
      setPfSaving(false);
    }
    
  };

  // ---------- AVATAR SELECT / PREVIEW ----------
  // const onSelectAvatar = (file?: File | null) => {
  //   setAvatarError(null);
  //   setAvatarFile(null);
  //   setAvatarPreview(null);

  //   if (!file) return;

  //   if (!file.type.startsWith('image/')) {
  //     setAvatarError('Please select an image file (png, jpg, gif).');
  //     return;
  //   }
  //   const maxBytes = 2 * 1024 * 1024; // 2MB
  //   if (file.size > maxBytes) {
  //     setAvatarError('Image too large (max 2 MB). Please choose a smaller file.');
  //     return;
  //   }

  //   const url = URL.createObjectURL(file);
  //   setAvatarPreview(url);
  //   setAvatarFile(file);
  // };

  const onSelectAvatar = (file?: File | null) => {
    setAvatarError(null);

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image too large (max 2MB).');
      return;
    }

    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarFile(file);
  };



  const handleAvatarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    onSelectAvatar(f);
  };


  const triggerAvatarInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // ---------- PASSWORD VALIDATION & SUBMIT ----------
  const validatePasswordForm = () => {
    let ok = true;
    setPwError(null);
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setConfirmPasswordError(null);

    if (!currentPassword) {
      setCurrentPasswordError('Current password is required.');
      ok = false;
    }

    if (!newPassword) {
      setNewPasswordError('New password is required.');
      ok = false;
    } else {
      if (newPassword.length < 8) {
        setNewPasswordError('Password must be at least 8 characters long.');
        ok = false;
      } else {
        const reUpper = /[A-Z]/;
        const reLower = /[a-z]/;
        const reDigit = /[0-9]/;
        const reSpecial = /[^A-Za-z0-9]/;
        if (!(reUpper.test(newPassword) && reLower.test(newPassword) && reDigit.test(newPassword) && reSpecial.test(newPassword))) {
          setNewPasswordError('Password must include upper & lower case letters, a number, and a symbol.');
          ok = false;
        }
      }

      if (currentPassword && newPassword === currentPassword) {
        setNewPasswordError('New password must be different from your current password.');
        ok = false;
      }
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password.');
      ok = false;
    } else if (newPassword && confirmPassword !== newPassword) {
      setConfirmPasswordError('Passwords do not match.');
      ok = false;
    }

    if ((secretQuestion && !secretAnswer) || (!secretQuestion && secretAnswer)) {
      setPwError('If you set a secret question, you must also provide a secret answer (and vice versa).');
      ok = false;
    }

    if (!ok && !pwError) {
      setPwError('Please fix the highlighted fields and try again.');
    }

    return ok;
  };

  const refreshAuthUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const payload = res.data?.data ?? res.data;
      await syncUser(payload);
      return payload?.user ?? payload;
    } catch (err) {
      console.error('Failed to refresh auth user', err);
      return null;
    }
  };


  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSecretQuestion(user?.secretQuestion ?? '');
    setSecretAnswer('');
    setPwError(null);
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setConfirmPasswordError(null);
  };

  //const handlePasswordSubmit = async (e: React.FormEvent) => {
    //e.preventDefault();
    //if (!user) return;
    //if (!validatePasswordForm()) return;
  const handlePasswordSubmit = async () => {
    setPwLoading(true);
    setPwError(null);

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        secretQuestion: secretQuestion || undefined,
        secretAnswer: secretAnswer || undefined,
      });

      showToast({
        type: 'success',
        title: 'Password updated',
        message: 'Your password has been changed successfully.',
      });

      resetPasswordForm();
    } catch (err: any) {
      const payload = err?.response?.data;
      let msg = 'Change password failed. Please try again.';
      if (payload?.message) {
        if (typeof payload.message === 'string') msg = payload.message;
        else if (payload.message.message) msg = payload.message.message;
      } else if (typeof err?.message === 'string') {
        msg = err.message;
      }

      setPwError(msg);
      showToast({
        type: 'error',
        title: 'Change password failed',
        message: msg,
      });
    } finally {
      setPwLoading(false);
    }
  };

  // ---------- MFA HANDLERS ----------
  const beginMfaSetup = async () => {
    setMfaLoading(true);
    setMfaError(null);
    try {
      const res = await api.post('/auth/mfa/setup');
      const data = res.data?.data ?? res.data;
      setMfaSecret(data.secret);
      setMfaOtpUrl(data.otpauthUrl);
      setMfaPhase('setup');
      setMfaCode('');
    } catch (err: any) {
      const payload = err?.response?.data;
      let msg = 'MFA setup failed. Please try again.';
      if (payload?.message) {
        if (typeof payload.message === 'string') msg = payload.message;
        else if (payload.message.message) msg = payload.message.message;
      } else if (typeof err?.message === 'string') {
        msg = err.message;
      }
      setMfaError(msg);
      showToast({
        type: 'error',
        title: 'MFA setup failed',
        message: msg,
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleToggleMfa = async (checked: boolean) => {
    if (checked) {
      if (!mfaEnabled) {
        await beginMfaSetup();
      }
    } else {
      if (!mfaEnabled) {
        setMfaPhase('idle');
        setMfaSecret('');
        setMfaOtpUrl('');
        setMfaCode('');
        return;
      }

      setMfaLoading(true);
      setMfaError(null);
      try {
        await api.post('/auth/mfa/disable');
        await refreshAuthUser();  //Auto refresh MFA flag
        //setMfaEnabled(false); 
        setMfaPhase('idle');
        setMfaSecret('');
        setMfaOtpUrl('');
        setMfaCode('');
        showToast({
          type: 'success',
          title: '2FA disabled',
          message: 'Multi-factor authentication has been disabled.',
        });
      } catch (err: any) {
        const payload = err?.response?.data;
        let msg = 'Unable to disable MFA.';
        if (payload?.message) {
          if (typeof payload.message === 'string') msg = payload.message;
          else if (payload.message.message) msg = payload.message.message;
        } else if (typeof err?.message === 'string') {
          msg = err.message;
        }
        setMfaError(msg);
        showToast({
          type: 'error',
          title: 'MFA disable failed',
          message: msg,
        });
      } finally {
        setMfaLoading(false);
      }
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) {
      setMfaError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setMfaLoading(true);
    setMfaError(null);

    try {
      await api.post('/auth/mfa/verify', { code: mfaCode.trim() });

      //setMfaEnabled(true);
      await refreshAuthUser(); //Auto refresh MFA flag
      setMfaPhase('idle');
      setMfaSecret('');
      setMfaOtpUrl('');
      setMfaCode('');

      showToast({
        type: 'success',
        title: '2FA enabled',
        message: 'Multi-factor authentication has been enabled.',
      });
    } catch (err: any) {
      const payload = err?.response?.data;
      let msg = 'Invalid code. Please try again.';
      if (payload?.message) {
        if (typeof payload.message === 'string') msg = payload.message;
        else if (payload.message.message) msg = payload.message.message;
      } else if (typeof err?.message === 'string') {
        msg = err.message;
      }
      setMfaError(msg);
      showToast({
        type: 'error',
        title: 'MFA verification failed',
        message: msg,
      });
    } finally {
      setMfaLoading(false);
    }
  };

  // ---------- RENDER GUARDS ----------
  if (loading || (!user && !error)) {
    return <div className="p-6">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-red-600 text-sm">
          Session error. Please{' '}
          <a href="/login" className="underline">sign in again</a>.
        </p>
      </div>
    );
  }

  // ---------- RENDER ----------
  return (
    <AdminShell title="My Profile" subtitle="Airco – Auto Instruments Management System" helpKey="profile">
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <section className="bg-white rounded-xl shadow-card p-5 space-y-4">
          {/* Header with avatar + change button */}
          <div className="flex items-start gap-4">
            <div className="relative">
              {/* <div className="h-20 w-20 rounded-full bg-ink text-white flex items-center justify-center text-[18px] font-semibold overflow-hidden">
                {avatarPreview ? (
                  // avatarPreview can be object URL or resolved server URL
                  <img key={avatarPreview} src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="uppercase">{fullName.charAt(0) || user.email.charAt(0)}</span>
                )}
              </div> */}

              <div className="h-20 w-20 rounded-full overflow-hidden bg-slate-200">
                <img
                  src={avatarPreview ?? avatarUrl}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              </div>


              <div className="mt-2 flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarInput} />
                <button type="button" onClick={triggerAvatarInput} className="rounded border px-2 py-1 text-sm">Change picture</button>
                {/* {avatarFile && <button type="button" onClick={() => { setAvatarFile(null); const serverAvatarPath = (user.profilePhotoUrl as string | undefined) ?? (user.avatarUrl as string | undefined) ?? null; setAvatarPreview(resolvePublicUrl(serverAvatarPath)); }} className="rounded border px-2 py-1 text-sm">Undo</button>} */}

                {avatarFile && (
                  <button
                    type="button"
                    onClick={() => {
                      if (avatarPreview?.startsWith('blob:')) {
                        URL.revokeObjectURL(avatarPreview);
                      }
                      setAvatarPreview(null);
                      setAvatarFile(null);
                    }}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    Undo
                  </button>
                )}



                {avatarUploading && <div className="text-xs text-slate-500 self-center">Uploading…</div>}
              </div>

              {avatarError && <p className="mt-2 text-xs text-rose-600">{avatarError}</p>}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-slate-900">{fullName}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                </div>

                <div className="flex gap-2">
                  {!editingProfile ? (
                    <button type="button" onClick={handleStartEdit} className="rounded border px-3 py-1 text-sm">Edit</button>
                  ) : (
                    <>
                      <button type="button" onClick={handleCancelEdit} className="rounded border px-3 py-1 text-sm">Cancel</button>
                      <button type="button" onClick={handleSaveProfile} className="rounded bg-aqua px-3 py-1 text-sm text-white" disabled={pfSaving || avatarUploading}>
                        {pfSaving ? 'Saving…' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-600">
                <div>Status: <span className={user.isActive ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{user.isActive ? 'Active' : 'Inactive'}</span></div>
                <div className="mt-1 text-[10px] text-slate-500">Tip: update display name to control how your name appears across the app.</div>
              </div>
            </div>
          </div>

          {/* Details form (read-only OR editable) */}
          <ProfileDetailsForm
            editing={editingProfile}
            firstName={pfFirstName}
            lastName={pfLastName}
            displayName={pfDisplayName}
            phone={pfPhone}
            onChangeFirst={setPfFirstName}
            onChangeLast={setPfLastName}
            onChangeDisplay={setPfDisplayName}
            onChangePhone={setPfPhone}
            error={pfError}
          />

          <DefaultLandingSelector
            value={user?.defaultLandingPage ?? null}
            options={[
              { key: 'Dashboard', label: 'Dashboard', description: 'Standard admin dashboard' },
              { key: 'FieldServices', label: 'Field Services', description: 'Technician mobile-first view' },
            ]}
            saving={pfSaving}
            onChange={async (newValue: string) => {
              // delegate to the same handler
              await setDefaultLanding(newValue);
            }}
          />


        </section>
                    
        <section className="bg-white rounded-xl shadow-card p-5 space-y-4">
          <ProfileSecurityTabs activeTab={activeTab} onChangeTab={setActiveTab} />
          {activeTab === 'password' ? (
            <ProfileChangePassword
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              secretQuestion={secretQuestion}
              secretAnswer={secretAnswer}
              loading={pwLoading}
              onChangeCurrent={setCurrentPassword}
              onChangeNew={setNewPassword}
              onChangeConfirm={setConfirmPassword}
              onChangeSecretQuestion={setSecretQuestion}
              onChangeSecretAnswer={setSecretAnswer}
              onSubmit={handlePasswordSubmit}
            />
          ) : (
            <ProfileMFASettings
              mfaEnabled={mfaEnabled}
              mfaPhase={mfaPhase}
              mfaSecret={mfaSecret}
              mfaOtpUrl={mfaOtpUrl}
              mfaCode={mfaCode}
              mfaLoading={mfaLoading}
              mfaError={mfaError}
              beginSetup={beginMfaSetup}
              toggleMfa={handleToggleMfa}
              verifyMfa={handleVerifyMfa}
              onChangeCode={setMfaCode}
            />
          )}
        </section> 
      </div>
    </AdminShell>
  );
}
