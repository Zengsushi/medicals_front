/**
 * 权限管理 Composables
 *
 * 权限数据从 API 获取，不再持久化到 localStorage
 * 角色信息从 JWT Token 解码获取
 */

import { ref, computed } from 'vue';
import request from '../utils/requestUtil';
import {
  getToken,
  decodeToken,
  getUsernameFromToken,
  getRoleFromToken
} from '../utils/storageUtil';
import { setTempUserInfo, clearTempUserInfo } from '../utils/userUtil';

const permissions = ref([]);
const menus = ref([]);
const userInfo = ref(null);
const isLoading = ref(false);

export function usePermission() {
  const role = computed(() => {
    const tokenRole = getRoleFromToken();
    if (tokenRole) return tokenRole;
    return userInfo.value?.role || 'guest';
  });
  const username = computed(() => {
    const tokenUsername = getUsernameFromToken();
    if (tokenUsername) return tokenUsername;
    return userInfo.value?.username || '';
  });

  const hasPermission = (permissionCode) => {
    if (!permissionCode) return true;
    if (role.value === 'superadmin') return true;
    return permissions.value.includes(permissionCode);
  };

  const hasAnyPermission = (permissionCodes) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    if (role.value === 'superadmin') return true;
    return permissionCodes.some(code => permissions.value.includes(code));
  };

  const hasAllPermissions = (permissionCodes) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    if (role.value === 'superadmin') return true;
    return permissionCodes.every(code => permissions.value.includes(code));
  };

  const hasRole = (roleCode) => {
    if (!roleCode) return false;
    const adminRoles = ['superadmin', 'admin'];
    if (adminRoles.includes(roleCode) && adminRoles.includes(role.value)) {
      return true;
    }
    return role.value === roleCode;
  };

  const hasAnyRole = (roleCodes) => {
    if (!roleCodes || roleCodes.length === 0) return false;
    const adminRoles = ['superadmin', 'admin'];
    if (roleCodes.some(r => adminRoles.includes(r)) && adminRoles.includes(role.value)) {
      return true;
    }
    return roleCodes.includes(role.value);
  };

  const canAccessMenu = (path) => {
    if (role.value === 'superadmin' || role.value === 'admin') return true;

    const findMenu = (menuList, targetPath) => {
      for (const menu of menuList) {
        if (menu.path === targetPath) return true;
        if (menu.children && menu.children.length > 0) {
          if (findMenu(menu.children, targetPath)) return true;
        }
      }
      return false;
    };

    return findMenu(menus.value, path);
  };

  const cannot = (permissionCode) => {
    return !hasPermission(permissionCode);
  };

  const canView = (resource) => {
    return hasPermission(`${resource}:view`);
  };

  const canCreate = (resource) => {
    return hasPermission(`${resource}:create`);
  };

  const canUpdate = (resource) => {
    return hasPermission(`${resource}:update`);
  };

  const canDelete = (resource) => {
    return hasPermission(`${resource}:delete`);
  };

  const canExport = (resource) => {
    return hasPermission(`${resource}:export`);
  };

  const canImport = (resource) => {
    return hasPermission(`${resource}:import`);
  };

  const availableActions = (resource) => {
    const actions = [];
    const actionChecks = [
      { name: 'view', check: canView },
      { name: 'create', check: canCreate },
      { name: 'update', check: canUpdate },
      { name: 'delete', check: canDelete },
      { name: 'export', check: canExport },
      { name: 'import', check: canImport },
    ];

    actionChecks.forEach(({ name, check }) => {
      if (check(resource)) {
        actions.push(name);
      }
    });

    return actions;
  };

  const buildPermissionMatrix = (resources) => {
    const matrix = {};

    resources.forEach(resource => {
      matrix[resource] = {
        view: canView(resource),
        create: canCreate(resource),
        update: canUpdate(resource),
        delete: canDelete(resource),
        export: canExport(resource),
        import: canImport(resource),
      };
    });

    return matrix;
  };

  const loadPermissions = async () => {
    if (!getToken()) return;

    isLoading.value = true;
    try {
      const res = await request.get('/user/permissions');
      if (res.success && res.code === 200) {
        permissions.value = res.data || [];
      }
    } catch (error) {
      console.error('加载权限失败:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const loadMenus = async () => {
    if (!getToken()) return;

    isLoading.value = true;
    try {
      // 使用普通菜单接口，避免422错误
      const res = await request.get('/menus');
      if (res.success && res.code === 200) {
        menus.value = res.data?.menus || [];
      }
    } catch (error) {
      // 忽略令牌过期相关的错误，避免显示技术性错误信息
      const errorMessage = error?.userMessage || error?.message || '';
      if (errorMessage.includes('令牌') || errorMessage.includes('token') || errorMessage.includes('登录')) {
        console.warn('菜单加载跳过: 登录状态已过期');
      } else {
        console.error('加载菜单失败:', error);
      }
    } finally {
      isLoading.value = false;
    }
  };

  const loadUserInfo = async () => {
    if (!getToken()) return;

    isLoading.value = true;
    try {
      const res = await request.get('/user/info');
      if (res.success && res.code === 200) {
        userInfo.value = res.data || null;
        setTempUserInfo(userInfo.value);
      }
    } catch (error) {
      // 忽略令牌过期相关的错误
      const errorMessage = error?.userMessage || error?.message || '';
      if (errorMessage.includes('令牌') || errorMessage.includes('token') || errorMessage.includes('登录')) {
        console.warn('用户信息加载跳过: 登录状态已过期');
      } else {
        console.error('加载用户信息失败:', error);
      }
    } finally {
      isLoading.value = false;
    }
  };

  const loadAll = async () => {
    await Promise.all([
      loadPermissions(),
      loadMenus(),
      loadUserInfo()
    ]);
  };

  const clearPermissions = () => {
    permissions.value = [];
    menus.value = [];
    userInfo.value = null;
    clearTempUserInfo();
  };

  const isAdmin = computed(() => {
    return role.value === 'superadmin' || role.value === 'admin';
  });

  return {
    permissions,
    menus,
    userInfo,
    role,
    username,
    isLoading,
    isAdmin,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    canAccessMenu,
    cannot,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canExport,
    canImport,
    availableActions,
    buildPermissionMatrix,
    loadPermissions,
    loadMenus,
    loadUserInfo,
    loadAll,
    clearPermissions
  };
}

export const PERMISSION_ACTIONS = [
  { key: 'view', label: '查看', icon: 'eye' },
  { key: 'create', label: '创建', icon: 'plus' },
  { key: 'update', label: '修改', icon: 'edit' },
  { key: 'delete', label: '删除', icon: 'delete' },
  { key: 'export', label: '导出', icon: 'download' },
  { key: 'import', label: '导入', icon: 'upload' },
];

export const RESOURCE_PERMISSIONS = {
  users: '用户管理',
  roles: '角色管理',
  permissions: '权限管理',
  menus: '菜单管理',
  dicts: '字典管理',
  sources: '数据源管理',
  visuals: '可视化',
  admins: '系统管理',
};

export default usePermission;
