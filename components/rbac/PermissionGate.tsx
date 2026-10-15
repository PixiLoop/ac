'use client';

import React from 'react';
import { useAuth } from '../../providers/auth-provider';

type Props = {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: Props) {
  const { permissions, loading } = useAuth();

  if (loading) return null;

  if (!permissions.includes(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
