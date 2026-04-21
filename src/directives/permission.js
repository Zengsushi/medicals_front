import { useAuthStore } from '../stores/auth';
import { useCan } from '../composables/useCan';

const auditEvents = [];
const MAX_AUDIT_EVENTS = 500;

function recordDirectiveAudit(el, permissionCode, result, mode) {
  const entry = {
    timestamp: Date.now(),
    tag: el.tagName,
    permissionCode,
    granted: result,
    mode,
    textContent: (el.textContent || '').slice(0, 50)
  };
  auditEvents.unshift(entry);
  if (auditEvents.length > MAX_AUDIT_EVENTS) {
    auditEvents.pop();
  }
}

function checkPermission(permissionCode) {
  if (!permissionCode) return true;
  const authStore = useAuthStore();
  return authStore.hasPermission(permissionCode);
}

function checkPermissionAny(permissions) {
  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) return true;
  const authStore = useAuthStore();
  return authStore.hasAnyPermission(permissions);
}

function checkPermissionAll(permissions) {
  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) return true;
  const authStore = useAuthStore();
  return authStore.hasAllPermissions(permissions);
}

function applyHideMode(el, hasAuth, permissionCode) {
  if (!hasAuth) {
    el.style.display = 'none';
    el.setAttribute('data-permission-hidden', permissionCode || 'true');
    el.parentElement?.classList?.add('permission-hidden');
  } else {
    el.style.display = '';
    el.removeAttribute('data-permission-hidden');
    el.parentElement?.classList?.remove('permission-hidden');
  }
}

function applyDisableMode(el, hasAuth, permissionCode) {
  if (!hasAuth) {
    el.disabled = true;
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('data-permission-disabled', permissionCode || 'true');
    el.classList.add('permission-disabled');

    if (el.tagName === 'BUTTON' || el.tagName === 'A') {
      el.classList.add('ant-btn-disabled');
    }

    if (!el.getAttribute('data-permission-tooltip')) {
      el.setAttribute('title', `权限不足: 需要 [${permissionCode}] 权限`);
      el.setAttribute('data-permission-tooltip', 'set');
      el.style.cursor = 'not-allowed';
      el.style.opacity = '0.5';
    }

    const preventHandler = (e) => {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }
      console.warn(`[v-permission] 操作被阻止 - 权限不足: ${permissionCode}`);
      recordDirectiveAudit(el, permissionCode, false, 'disable_block');
    };

    el._permissionPreventHandler = preventHandler;
    el.addEventListener('click', preventHandler, true);
  } else {
    el.disabled = false;
    el.removeAttribute('aria-disabled');
    el.removeAttribute('data-permission-disabled');
    el.classList.remove('permission-disabled');
    el.classList.remove('ant-btn-disabled');
    el.removeAttribute('data-permission-tooltip');
    el.style.cursor = '';
    el.style.opacity = '';

    if (el._permissionPreventHandler) {
      el.removeEventListener('click', el._permissionPreventHandler, true);
      delete el._permissionPreventHandler;
    }
  }
}

function applyDualMode(el, hasAuth, permissionCode) {
  applyHideMode(el, hasAuth, permissionCode);
  if (!hasAuth && el.style.display !== 'none') {
    applyDisableMode(el, hasAuth, permissionCode);
  }
}

const vPermission = {
  mounted(el, binding) {
    const { value, modifiers } = binding;

    let hasAuth;
    let permCode = value;

    if (Array.isArray(value)) {
      hasAuth = checkPermissionAny(value);
      permCode = value.join('|');
    } else {
      hasAuth = checkPermission(value);
    }

    const mode = modifiers.strict ? 'strict' :
                 modifiers.disable ? 'disable' :
                 modifiers.dual ? 'dual' :
                 modifiers.alert ? 'alert' : 'hide';

    recordDirectiveAudit(el, permCode, hasAuth, mode);

    switch (mode) {
      case 'dual':
        applyDualMode(el, hasAuth, permCode);
        break;
      case 'disable':
        applyDisableMode(el, hasAuth, permCode);
        break;
      case 'strict':
        if (!hasAuth) {
          el.remove();
          return;
        }
        break;
      case 'alert':
        if (!hasAuth) {
          el.addEventListener('click', () => {
            console.warn('[v-permission] 权限不足:', permCode);
          }, { once: true });
        }
        break;
      default:
        applyHideMode(el, hasAuth, permCode);
    }

    el._permissionValue = value;
    el._permissionMode = mode;
  },

  updated(el, binding) {
    const { value, modifiers } = binding;

    let hasAuth;
    let permCode = value;

    if (Array.isArray(value)) {
      hasAuth = checkPermissionAny(value);
      permCode = value.join('|');
    } else {
      hasAuth = checkPermission(value);
    }

    const mode = modifiers.strict ? 'strict' :
                 modifiers.disable ? 'disable' :
                 modifiers.dual ? 'dual' :
                 modifiers.alert ? 'alert' : 'hide';

    switch (mode) {
      case 'dual':
        applyDualMode(el, hasAuth, permCode);
        break;
      case 'disable':
        applyDisableMode(el, hasAuth, permCode);
        break;
      case 'strict':
        if (!hasAuth) {
          el.remove();
          return;
        }
        break;
      default:
        applyHideMode(el, hasAuth, permCode);
    }

    recordDirectiveAudit(el, permCode, hasAuth, `${mode}_updated`);
  },

  unmounted(el) {
    if (el._permissionPreventHandler) {
      el.removeEventListener('click', el._permissionPreventHandler, true);
    }
    el.classList.remove('permission-hidden', 'permission-disabled', 'ant-btn-disabled');
  }
};

const vPermissionAny = {
  mounted(el, binding) {
    const permissions = binding.value;

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return;
    }

    const hasAuth = checkPermissionAny(permissions);
    recordDirectiveAudit(el, permissions.join('|'), hasAuth, 'any');

    applyHideMode(el, hasAuth, permissions.join('|'));
  },

  updated(el, binding) {
    const permissions = binding.value;

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return;
    }

    const hasAuth = checkPermissionAny(permissions);
    applyHideMode(el, hasAuth, permissions.join('|'));
  }
};

const vPermissionAll = {
  mounted(el, binding) {
    const permissions = binding.value;

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return;
    }

    const hasAuth = checkPermissionAll(permissions);
    recordDirectiveAudit(el, permissions.join('|'), hasAuth, 'all');

    applyHideMode(el, hasAuth, permissions.join('|'));
  },

  updated(el, binding) {
    const permissions = binding.value;

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return;
    }

    const hasAuth = checkPermissionAll(permissions);
    applyHideMode(el, hasAuth, permissions.join('|'));
  }
};

export function getDirectiveAuditLog(filterMode = null) {
  if (filterMode) {
    return auditEvents.filter(e => e.mode?.includes(filterMode));
  }
  return [...auditEvents];
}

export function clearDirectiveAudit() {
  auditEvents.length = 0;
}

export const permission = {
  install(app) {
    app.directive('permission', vPermission);
    app.directive('permission-any', vPermissionAny);
    app.directive('permission-all', vPermissionAll);
  }
};

export default permission;