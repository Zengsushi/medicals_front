import { ref, computed, reactive } from 'vue';
import { useAuthStore } from '../stores/auth';
import { usePermission } from './usePermission';

const PERMISSION_ACTION_MAP = {
  view: 'view',
  create: 'create',
  add: 'create',
  update: 'update',
  edit: 'update',
  delete: 'delete',
  remove: 'delete',
  export: 'export',
  import: 'import',
  authorize: 'authorize',
  manage: 'manage',
  large: 'large'
};

const RESOURCE_PREFIX_MAP = {
  user: 'users',
  users: 'users',
  role: 'role',
  roles: 'role',
  permission: 'permission',
  permissions: 'permission',
  menu: 'menu',
  menus: 'menu',
  dict: 'dict',
  dicts: 'dict',
  source: 'source',
  sources: 'source',
  visual: 'visual',
  visuals: 'visuals',
  admin: 'admins',
  admins: 'admins'
};

const auditLog = ref([]);
const AUDIT_MAX_SIZE = 200;

function normalizeResource(resource) {
  if (!resource) return null;
  return RESOURCE_PREFIX_MAP[resource.toLowerCase()] || resource.toLowerCase();
}

function normalizeAction(action) {
  if (!action) return 'view';
  return PERMISSION_ACTION_MAP[action.toLowerCase()] || action.toLowerCase();
}

function buildPermissionCode(resource, action = 'view') {
  const normRes = normalizeResource(resource);
  const normAct = normalizeAction(action);
  if (normRes && normAct) {
    return `${normRes}:${normAct}`;
  }
  return typeof resource === 'string' ? resource : null;
}

function recordAudit(entry) {
  const record = {
    timestamp: Date.now(),
    ...entry
  };
  auditLog.value.unshift(record);
  if (auditLog.value.length > AUDIT_MAX_SIZE) {
    auditLog.value.pop();
  }
}

export function useCan() {
  const authStore = useAuthStore();
  const { hasPermission: permHasPerm, hasAnyPermission, hasAllPermissions, isAdmin } = usePermission();

  function can(permissionCode) {
    if (!permissionCode) return true;
    if (!authStore.isAuthenticated) return false;

    const result = authStore.hasPermission(permissionCode);
    recordAudit({
      type: 'check',
      code: permissionCode,
      granted: result,
      source: 'client'
    });
    return result;
  }

  function canNot(permissionCode) {
    return !can(permissionCode);
  }

  function canResource(resource, action = 'view') {
    const code = buildPermissionCode(resource, action);
    return can(code);
  }

  function canView(resource) { return canResource(resource, 'view'); }
  function canCreate(resource) { return canResource(resource, 'create'); }
  function canUpdate(resource) { return canResource(resource, 'update'); }
  function canDelete(resource) { return canResource(resource, 'delete'); }
  function canExport(resource) { return canResource(resource, 'export'); }
  function canImport(resource) { return canResource(resource, 'import'); }
  function canManage(resource) { return canResource(resource, 'manage'); }

  function canAny(codes) {
    if (!codes || codes.length === 0) return true;
    return hasAnyPermission(codes);
  }

  function canAll(codes) {
    if (!codes || codes.length === 0) return true;
    return hasAllPermissions(codes);
  }

  function assertCan(permissionCode, failMessage = null) {
    const allowed = can(permissionCode);
    if (!allowed) {
      const msg = failMessage || `权限不足: 需要权限 [${permissionCode}]`;
      recordAudit({
        type: 'assert_failed',
        code: permissionCode,
        message: msg,
        source: 'client_assert'
      });
      const error = new Error(msg);
      error.permissionCode = permissionCode;
      error.isPermissionError = true;
      throw error;
    }
    return true;
  }

  function assertCanResource(resource, action = 'view') {
    const code = buildPermissionCode(resource, action);
    return assertCan(code);
  }

  function withPermission(permissionCode, fn) {
    return (...args) => {
      assertCan(permissionCode);
      return fn(...args);
    };
  }

  function guardNavigation(to, requiredPermissions = []) {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return { allowed: true };
    }

    for (const perm of requiredPermissions) {
      if (!can(perm)) {
        recordAudit({
          type: 'nav_blocked',
          path: to?.path,
          code: perm,
          source: 'navigation_guard'
        });
        return {
          allowed: false,
          reason: 'PERMISSION_DENIED',
          missingPermission: perm
        };
      }
    }

    return { allowed: true };
  }

  function getAvailableActions(resource) {
    const actions = ['view', 'create', 'update', 'delete', 'export', 'import'];
    return actions.filter(action => canResource(resource, action));
  }

  function buildMatrix(resources) {
    const matrix = {};
    const allActions = ['view', 'create', 'update', 'delete', 'export', 'import'];
    (resources || []).forEach(res => {
      matrix[res] = {};
      allActions.forEach(act => {
        matrix[res][act] = canResource(res, act);
      });
    });
    return matrix;
  }

  function getAuditLog(filterType = null) {
    if (filterType) {
      return auditLog.value.filter(e => e.type === filterType);
    }
    return [...auditLog.value];
  }

  function clearAudit() {
    auditLog.value = [];
  }

  const stats = computed(() => ({
    totalChecks: auditLog.value.filter(e => e.type === 'check').length,
    totalDenied: auditLog.value.filter(e => e.type === 'check' && !e.granted).length,
    totalAssertFails: auditLog.value.filter(e => e.type === 'assert_failed').length,
    navBlocked: auditLog.value.filter(e => e.type === 'nav_blocked').length
  }));

  return {
    can,
    canNot,
    canResource,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canExport,
    canImport,
    canManage,
    canAny,
    canAll,
    assertCan,
    assertCanResource,
    withPermission,
    guardNavigation,
    getAvailableActions,
    buildMatrix,
    getAuditLog,
    clearAudit,
    stats,
    buildPermissionCode,
    normalizeResource,
    normalizeAction
  };
}

export default useCan;