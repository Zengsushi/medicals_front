import { usePermission } from '../composables/usePermission';
import { useAuthStore } from '../stores/auth';

const checkPermission = (permissionCode) => {
  if (!permissionCode) return true;
  const authStore = useAuthStore();
  return authStore.hasPermission(permissionCode);
};

const getPermissionReason = (permissionCode) => {
  if (!permissionCode) return '';

  const authStore = useAuthStore();
  
  if (authStore.isAdmin) return '';

  if (authStore.hasPermission(permissionCode)) {
    return '';
  }

  const actionMap = {
    'view': '查看',
    'create': '创建',
    'update': '修改',
    'delete': '删除',
    'export': '导出',
    'import': '导入',
    'authorize': '授权'
  };

  const [resource, action] = permissionCode.split(':');
  const actionText = actionMap[action] || action;

  return `需要${actionText}权限才能操作`;
};

const vPermissionTooltip = {
  mounted(el, binding) {
    const { value, modifiers } = binding;

    const mode = modifiers.disable ? 'disable' : modifiers.hide ? 'hide' : 'tooltip';

    const hasAuth = checkPermission(value);

    if (mode === 'hide') {
      if (!hasAuth) {
        el.style.display = 'none';
      }
      return;
    }

    if (mode === 'disable') {
      if (!hasAuth) {
        el.disabled = true;
        el.classList.add('permission-disabled');
      }
      return;
    }

    if (!hasAuth) {
      el.classList.add('permission-tooltip-wrapper');

      const tooltip = document.createElement('div');
      tooltip.className = 'permission-tooltip';
      tooltip.textContent = getPermissionReason(value);
      tooltip.style.cssText = `
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.75);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 9999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
      `;

      el.style.position = 'relative';
      el.appendChild(tooltip);

      el.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
      });

      el.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
    }
  },

  updated(el, binding) {
    const { value, modifiers } = binding;

    const mode = modifiers.disable ? 'disable' : modifiers.hide ? 'hide' : 'tooltip';
    const hasAuth = checkPermission(value);

    if (mode === 'hide') {
      el.style.display = hasAuth ? '' : 'none';
    } else if (mode === 'disable') {
      el.disabled = !hasAuth;
      el.classList.toggle('permission-disabled', !hasAuth);
    }
  }
};

const vNoPermission = {
  mounted(el, binding) {
    const permissionCode = binding.value;

    if (!permissionCode) return;

    const hasAuth = checkPermission(permissionCode);

    if (hasAuth) return;

    el.style.display = 'none';
  }
};

export const permissionTooltip = {
  install(app) {
    app.directive('permission-tooltip', vPermissionTooltip);
    app.directive('no-permission', vNoPermission);
  }
};

export { checkPermission, getPermissionReason };

export default permissionTooltip;
