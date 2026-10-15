'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';
import { useToast } from '../components/ui/toast';
import { useHasPermission } from '../hooks/useHasPermission';

export function useRequirePermission(permission: string) {
  const hasPermission = useHasPermission(permission);
  const { showToast } = useToast();
  const shownRef = React.useRef(false);

  useEffect(() => {
    if (!hasPermission && !shownRef.current) {
      shownRef.current = true;
      showToast({
        type: 'error',
        title: 'Access denied',
        message: 'You do not have permission to view this page.',
      });
    }
  }, [hasPermission, showToast]);

  return hasPermission;
}


// export function useRequirePermission(permission: string) {
//   const { permissions, loading } = useAuth();
//   const router = useRouter();
//   const { showToast } = useToast();
//   useEffect(() => {
//     if (loading) return;

//     if (!permissions.includes(permission)) {
//       //router.replace('/403'); 

//       showToast({
//         type: 'error',
//         title: 'Access denied',
//         message: 'You do not have permission to view this page.',
//       });
//       return;
      
//     }
//   }, [permission, permissions, loading, router]);
// }
