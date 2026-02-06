import { useContext } from 'react';
import { UserContext } from '../contexts/app-context';

export function usePermissions() {
  const user = useContext(UserContext);

  console.log('user', user);

  const hasPermission = (allowedPermission: string | string[]) => {
    if (!user || !user.permission) return false;

    if (Array.isArray(allowedPermission)) {
      return allowedPermission.some(perm => user.permission.includes(perm));
    }

    return user.permission.includes(allowedPermission);
  };

  return { hasPermission, permissions: user?.permission || [] };
}
