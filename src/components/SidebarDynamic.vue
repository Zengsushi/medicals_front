<template>
  <a-layout-sider
    :collapsed="collapsed"
    :collapsed-width="64"
    :width="220"
    :trigger="null"
    collapsible
    :theme="theme"
    class="dynamic-sidebar"
  >
    <div class="logo" :class="{ 'collapsed': collapsed }">
      <img v-if="!collapsed" src="@/assets/logo.png" alt="logo" class="logo-img" />
      <span v-if="!collapsed" class="logo-text">医疗系统</span>
      <span v-else class="logo-icon-only">医</span>
    </div>

    <a-menu
      v-model:selectedKeys="selectedKeys"
      v-model:openKeys="openKeys"
      :mode="collapsed ? 'vertical' : 'inline'"
      :theme="theme"
      :inline-collapsed="collapsed"
      :items="menuItemsCache"
      @click="handleMenuClick"
      @openChange="handleOpenChange"
      class="sidebar-menu"
    >
      <template #itemIcon="{ item }">
        <component :is="getIcon(item.icon)" v-if="item.icon" />
        <span v-else>{{ item.name?.charAt(0) }}</span>
      </template>
    </a-menu>

    <div class="sidebar-footer" v-if="!collapsed">
      <a-button type="text" block @click="toggleCollapse" class="collapse-btn">
        <LeftOutlined v-if="!collapsed" />
        <RightOutlined v-else />
        <span v-if="!collapsed">收起</span>
      </a-button>
    </div>
  </a-layout-sider>
</template>

<script setup>
import { ref, computed, watch, shallowRef, markRaw } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue';
import * as antIcons from '@ant-design/icons-vue';
import iconsConfig from '../config/icons.json';

const props = defineProps({
  menus: {
    type: Array,
    default: () => []
  },
  collapsed: {
    type: Boolean,
    default: false
  },
  theme: {
    type: String,
    default: 'dark'
  }
});

const emit = defineEmits(['select', 'collapse', 'update:collapsed']);

const router = useRouter();
const route = useRoute();

const selectedKeys = ref([]);
const openKeys = ref([]);
const menuMapCache = new Map();
const iconCache = new Map();

const normalizePath = (path) => {
  if (!path) return '';
  if (path === '/data/sync') return '/database/sync';
  return path;
};

const resolvePath = (menuPath, parentPath = '') => {
  if (!menuPath) return '';
  const normalized = normalizePath(menuPath);
  if (normalized.startsWith('/')) return normalized;
  const base = normalizePath(parentPath || '').replace(/\/$/, '');
  return base ? `${base}/${normalized}`.replace(/\/+/g, '/') : `/${normalized}`.replace(/\/+/g, '/');
};

const buildMenuItems = (menus, parentPath = '') => {
  if (!menus || !Array.isArray(menus)) {
    return [];
  }

  const result = [];

  for (const menu of menus) {
    const cacheKey = menu.id || menu.path;
    if (menuMapCache.has(cacheKey)) {
      result.push(menuMapCache.get(cacheKey));
      continue;
    }

    const normalizedPath = resolvePath(menu.path, menu.parent_path || parentPath);
    const item = {
      key: normalizedPath || menu.path || menu.id,
      label: menu.name,
      icon: menu.icon,
      path: normalizedPath || menu.path,
      permission: menu.permission,
      order: menu.order || 0
    };

    if (menu.children && menu.children.length > 0) {
      const children = buildMenuItems(menu.children, normalizedPath || parentPath);
      if (children.length > 0) {
        item.children = children;
      }
    }

    menuMapCache.set(cacheKey, item);
    result.push(item);
  }

  return result.sort((a, b) => a.order - b.order);
};

const menuItemsCache = computed(() => {
  menuMapCache.clear();
  return buildMenuItems(props.menus);
});

const getIcon = (iconName) => {
  if (!iconName) return null;

  if (iconCache.has(iconName)) {
    return iconCache.get(iconName);
  }

  const iconConfig = iconsConfig.iconMap?.[iconName];
  let icon = null;

  if (iconConfig?.component) {
    icon = antIcons[iconConfig.component];
  }

  if (!icon) {
    icon = antIcons[iconName];
  }

  if (!icon) {
    const PascalCaseName = iconName.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
    icon = antIcons[PascalCaseName + 'Outlined'] || antIcons[PascalCaseName];
  }

  if (icon) {
    iconCache.set(iconName, markRaw(icon));
    return icon;
  }

  return null;
};

const findMenuByPath = (menus, path) => {
  const normalizedTarget = normalizePath(path);
  for (const menu of menus) {
    const currentPath = resolvePath(menu.path, menu.parent_path || '');
    if (menu.path === normalizedTarget || currentPath === normalizedTarget || String(menu.id) === String(path)) return menu;
    if (menu.children && menu.children.length > 0) {
      const found = findMenuByPath(menu.children, path);
      if (found) return found;
    }
  }
  return null;
};

const handleMenuClick = ({ key }) => {
  const target = normalizePath(String(key || ''));
  if (target.startsWith('/')) {
    router.push(target);
    const menu = findMenuByPath(props.menus, target);
    if (menu) emit('select', menu);
    return;
  }
  const menu = findMenuByPath(props.menus, key);
  const finalPath = menu ? resolvePath(menu.path, menu.parent_path || '') : '';
  if (menu && finalPath) {
    router.push(finalPath);
    emit('select', menu);
  }
};

const handleOpenChange = (keys) => {
  openKeys.value = keys;
  try {
    localStorage.setItem('sidebar-expanded-keys', JSON.stringify(keys));
  } catch (error) {
    console.error('保存展开状态失败:', error);
  }
};

const updateSelectedKeys = () => {
  const currentPath = normalizePath(route.path);
  selectedKeys.value = [currentPath];

  const menu = findMenuByPath(props.menus, currentPath);
  if (menu) {
    const parentKeys = [];
    const findParentKeys = (menus, targetMenu, parents = []) => {
      for (const m of menus) {
        if (m.id === targetMenu.id) {
          parentKeys.push(...parents.map(p => p.path));
          return true;
        }
        if (m.children && m.children.length > 0) {
          if (findParentKeys(m.children, targetMenu, [...parents, m])) {
            return true;
          }
        }
      }
      return false;
    };
    findParentKeys(props.menus, menu);
    openKeys.value = parentKeys;
  }
};

const loadExpandedKeys = () => {
  try {
    const saved = localStorage.getItem('sidebar-expanded-keys');
    if (saved) {
      openKeys.value = JSON.parse(saved);
    }
  } catch (error) {
    console.error('加载展开状态失败:', error);
  }
};

watch(() => route.path, () => {
  updateSelectedKeys();
}, { immediate: true });

watch(() => props.menus, () => {
  updateSelectedKeys();
}, { deep: false });

watch(() => props.collapsed, () => {
  loadExpandedKeys();
});

loadExpandedKeys();
</script>

<script>
export default {
  name: 'SidebarDynamic'
}
</script>

<style scoped>
.dynamic-sidebar {
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  overflow-y: auto;
  transition: all 0.2s;
}

.dynamic-sidebar::-webkit-scrollbar {
  width: 4px;
}

.dynamic-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo.collapsed {
  padding: 0;
}

.logo-img {
  width: 32px;
  height: 32px;
  margin-right: 8px;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.logo-icon-only {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.sidebar-menu {
  border-right: none !important;
}

.sidebar-menu :deep(.ant-menu-item) {
  margin: 4px 8px;
  border-radius: 6px;
  height: 44px;
  line-height: 44px;
}

.sidebar-menu :deep(.ant-menu-item-selected) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
}

.sidebar-menu :deep(.ant-menu-item:hover) {
  background: rgba(255, 255, 255, 0.1) !important;
}

.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.collapse-btn {
  color: rgba(255, 255, 255, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.collapse-btn:hover {
  color: #fff !important;
}

:deep(.ant-layout-sider-dark) {
  background: #001529;
}

:deep(.ant-layout-sider-light) {
  background: #fff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

:deep(.ant-layout-sider-light) .logo {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

:deep(.ant-layout-sider-light) .collapse-btn {
  color: rgba(0, 0, 0, 0.65);
}

:deep(.ant-layout-sider-light) .collapse-btn:hover {
  color: rgba(0, 0, 0, 0.85) !important;
}
</style>
