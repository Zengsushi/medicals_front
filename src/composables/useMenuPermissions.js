import { computed } from 'vue';
import { useMenuStore } from '../stores/menu';
import { usePermission } from './usePermission';

export function useMenuPermissions() {
  const menuStore = useMenuStore();
  const { hasPermission, role } = usePermission();

  const menuTree = computed(() => {
    return menuStore.menuTree || [];
  });

  const flattenedMenus = computed(() => {
    return menuStore.flattenedMenus || [];
  });

  const canAccess = (path) => {
    if (!path) return true;

    if (role.value === 'superadmin' || role.value === 'admin') {
      return true;
    }

    const menu = getMenuByPath(path);
    if (!menu) return true;

    const permCode = menu.permission || menu.permission_code || menu.permissionCode;
    if (!permCode) return true;

    return hasPermission(permCode);
  };

  const getMenuByPath = (path) => {
    if (!path) return null;

    const findMenu = (menus) => {
      for (const menu of menus) {
        if (menu.path === path) return menu;
        if (menu.children && menu.children.length > 0) {
          const found = findMenu(menu.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findMenu(menuTree.value);
  };

  const getMenuById = (id) => {
    if (!id) return null;

    const findMenu = (menus) => {
      for (const menu of menus) {
        if (menu.id === id) return menu;
        if (menu.children && menu.children.length > 0) {
          const found = findMenu(menu.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findMenu(menuTree.value);
  };

  const getParentMenus = (path) => {
    const parents = [];
    if (!path) return parents;

    const findParents = (menus, targetPath, currentParents = []) => {
      for (const menu of menus) {
        if (menu.path === targetPath) {
          parents.push(...currentParents);
          return true;
        }
        if (menu.children && menu.children.length > 0) {
          if (findParents(menu.children, targetPath, [...currentParents, menu])) {
            return true;
          }
        }
      }
      return false;
    };

    findParents(menuTree.value, path);
    return parents;
  };

  const filteredMenus = computed(() => {
    const filter = (menus) => {
      const result = [];
      for (const menu of menus) {
        // 隐藏"可视化大屏"菜单项
        if (menu.path === '/visual/large' || menu.name === '可视化大屏') {
          continue;
        }
        
        if (menu.is_visible === false) {
          continue;
        }

        const menuPerm = menu.permission || menu.permission_code || menu.permissionCode;
        if (!(role.value === 'superadmin' || role.value === 'admin')) {
          if (menuPerm && !hasPermission(menuPerm)) {
            continue;
          }
        }

        if (menu.children && menu.children.length > 0) {
          const filteredChildren = filter(menu.children);
          if (filteredChildren.length > 0) {
            result.push({
              ...menu,
              children: filteredChildren
            });
          }
        } else {
          result.push(menu);
        }
      }
      return result;
    };

    return filter(menuTree.value);
  });

  const hasVisibleChildren = (menu) => {
    if (!menu.children || menu.children.length === 0) {
      return false;
    }

    if (role.value === 'superadmin' || role.value === 'admin') {
      return true;
    }

    return menu.children.some(child => {
      if (child.is_visible === false) {
        return false;
      }
      const childPerm = child.permission || child.permission_code || child.permissionCode;
      if (childPerm && !hasPermission(childPerm)) {
        return false;
      }
      return true;
    });
  };

  const getMenuPermissions = (path) => {
    const menu = getMenuByPath(path);
    if (!menu) return [];
    const perm = menu.permission || menu.permission_code || menu.permissionCode;
    return perm ? [perm] : [];
  };

  const isMenuVisible = (menu) => {
    if (menu.is_visible === false) {
      return false;
    }
    const menuPerm = menu.permission || menu.permission_code || menu.permissionCode;
    if (menuPerm && !hasPermission(menuPerm)) {
      return false;
    }
    return true;
  };

  const getBreadcrumbs = (path) => {
    const breadcrumbs = [];
    const menu = getMenuByPath(path);

    if (menu) {
      breadcrumbs.push(menu);
      const parents = getParentMenus(path);
      breadcrumbs.unshift(...parents);
    }

    return breadcrumbs;
  };

  return {
    menuTree,
    flattenedMenus,
    filteredMenus,
    canAccess,
    getMenuByPath,
    getMenuById,
    getParentMenus,
    hasVisibleChildren,
    getMenuPermissions,
    isMenuVisible,
    getBreadcrumbs
  };
}

export default useMenuPermissions;
