/**
 * usePermissions — React hook for RBAC permission checks.
 *
 * Usage:
 *   const { can, canAccessMenu, canAccessPage, role } = usePermissions();
 *   if (can('orders.create')) { ... }
 */
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { createPermissionChecker } from '../config/permissions';

export function usePermissions() {
  const { user } = useAuth();
  return useMemo(() => {
    if (!user?.role) {
      return {
        can: () => false,
        canAccessMenu: () => false,
        canAccessPage: () => false,
        role: null,
      };
    }
    return createPermissionChecker(user.role);
  }, [user?.role]);
}

export default usePermissions;
