import { useMenuStore } from '../../stores/menu';
import { useAuthStore } from '../../stores/auth';
import RouteLoader from '../../routes/RouteLoader';

const WHITE_LIST = ['/login', '/404', '/403'];

export function hasPermission(permission) {
  if (!permission) return true;

  const authStore = useAuthStore();
  return authStore.hasPermission(permission);
}

export function hasAnyPermission(permissions) {
  if (!permissions || permissions.length === 0) return true;
  
  const authStore = useAuthStore();
  return permissions.some(p => authStore.hasPermission(p));
}

export function hasAllPermissions(permissions) {
  if (!permissions || permissions.length === 0) return true;
  
  const authStore = useAuthStore();
  return permissions.every(p => authStore.hasPermission(p));
}

export function hasRole(roleCode) {
  const authStore = useAuthStore();
  return authStore.hasRole(roleCode);
}

export function canAccess(path) {
  const authStore = useAuthStore();
  return authStore.canAccess(path);
}

export function checkRoutePermission(to) {
  const path = to.path;
  const authStore = useAuthStore();

  if (WHITE_LIST.includes(path)) {
    return { allowed: true, reason: 'white_list' };
  }

  if (RouteLoader.isPublicRoute(path)) {
    return { allowed: true, reason: 'public_route' };
  }

  if (!authStore.isAuthenticated) {
    return { allowed: false, reason: 'not_logged_in', redirect: '/login' };
  }

  return { allowed: true, reason: 'ok' };
}

export function createPermissionGuard(router) {
  return (to, from, next) => {
    const checkResult = checkRoutePermission(to);
    const authStore = useAuthStore();

    if (checkResult.allowed) {
      if (to.path === '/login' || to.path === '/403') {
        return next({ name: 'home', replace: true });
      }
      return next();
    }

    return next(checkResult.redirect);
  };
}

export function setupPermissionGuard(router) {
  router.beforeEach(createPermissionGuard(router));

  router.afterEach((to) => {
    if (to.meta?.title) {
      document.title = `${to.meta.title} - 医疗数据分析系统`;
    }

    if (to.meta?.menuId) {
      localStorage.setItem('lastActiveMenuId', to.meta.menuId.toString());
    }

    localStorage.setItem('lastActivePath', to.path);
  });
}

export function getMenuIdFromRoute(to) {
  return to.meta?.menuId || null;
}

export function getParentMenuId(menuId) {
  return null;
}

export function getBreadcrumbFromRoute(to) {
  const path = to.path;
  const menuStore = useMenuStore();
  const menus = menuStore.menuTree || [];

  function findMenuPath(menuList, targetPath, currentPath = []) {
    for (const menu of menuList) {
      const pathSoFar = [...currentPath, { name: menu.name, path: menu.path, id: menu.id }];

      if (menu.path === targetPath) {
        return pathSoFar;
      }

      if (menu.children?.length > 0) {
        const found = findMenuPath(menu.children, targetPath, pathSoFar);
        if (found) return found;
      }
    }
    return null;
  }

  const result = findMenuPath(menus, path);
  return result || [{ name: to.meta?.title || '首页', path: '/', id: null }];
}

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  canAccess,
  checkRoutePermission,
  createPermissionGuard,
  setupPermissionGuard,
  getMenuIdFromRoute,
  getParentMenuId,
  getBreadcrumbFromRoute,
  WHITE_LIST
};