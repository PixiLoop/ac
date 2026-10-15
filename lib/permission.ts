export const createPermissionChecker = (
  permissions: string[],
  isSystem: boolean
) => {
  const has = (perm: string) =>
    isSystem || permissions.includes(perm);

  const any = (perms: string[]) =>
    isSystem || perms.some(p => permissions.includes(p));

  const all = (perms: string[]) =>
    isSystem || perms.every(p => permissions.includes(p));

  return { has, any, all };
};