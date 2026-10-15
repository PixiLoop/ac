import { useAuth } from '../providers/auth-provider';

export function useHasPermission(permission: string): boolean {
  const { permissions } = useAuth();
  return permissions?.includes(permission) ?? false;
}
