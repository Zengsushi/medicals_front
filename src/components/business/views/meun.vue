<template>
  <div style="display: flex; align-items: center; gap: 10px;">
    <a-menu
      v-model:selectedKeys="current"
      :items="menuItems"
      mode="horizontal"
      class="user_menu"
      :overflowedIndicator="$slots.overflowedIndicator"
      @click="handleMenu"
      style="flex: 1;"
    />
    <a-button size="small" type="primary" @click="debugRefreshMenu" style="flex-shrink: 0;">
      刷新菜单
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { ref, h, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  HomeOutlined,
  SettingOutlined,
  TeamOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  DashboardOutlined,
  UserOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  MenuOutlined,
  LockOutlined,
  CloudServerOutlined
} from '@ant-design/icons-vue';
import { useRoute, useRouter } from 'vue-router';
import { useMenuStore } from '../../../stores/menu';
import { useAuthStore } from '../../../stores/auth';
import { loadDynamicRoutes } from '../../../router';

const route = useRoute();
const router = useRouter();
const menuStore = useMenuStore();
const authStore = useAuthStore();

const props = defineProps({
  meunArr: {
    type: Array,
    default: () => []
  },
  adminMeunArr: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['menuRouter']);

function icon(Comp: any) {
  return () => h(Comp);
}

const STATIC_MENU_ITEMS = [
  {
    key: '/user/home',
    label: '用户首页',
    title: '用户首页',
    icon: () => h(HomeOutlined),
    path: '/user/home'
  },
  {
    key: '/admin/home',
    label: '管理首页',
    title: '管理首页',
    icon: () => h(SettingOutlined),
    path: '/admin/home'
  },
  {
    key: '/user/manage',
    label: '用户管理',
    title: '用户管理',
    icon: () => h(TeamOutlined),
    path: '/user/manage',
    children: [
      { key: '/user/manage/list', label: '用户列表', title: '用户列表', path: '/user/manage/list' },
      { key: '/user/manage/add', label: '添加用户', title: '添加用户', path: '/user/manage/add' },
      { key: '/user/manage/detail', label: '用户详情', title: '用户详情', path: '/user/manage/detail' }
    ]
  },
  {
    key: '/admin/settings',
    label: '系统设置',
    title: '系统设置',
    icon: () => h(SettingOutlined),
    path: '/admin/settings/menus',
    children: [
      {
        key: '/admin/settings/menus',
        label: '菜单列表',
        title: '菜单列表',
        path: '/admin/settings/menus'
      },
      {
        key: '/admin/settings/permissions',
        label: '🔒 权限管理',
        title: '权限管理',
        path: '/admin/settings/permissions'
      }
    ]
  },
  {
    key: '/database/manage',
    label: '数据源管理',
    title: '数据源管理',
    icon: () => h(DatabaseOutlined),
    path: '/database/manage'
  },
  {
    key: '/cluster/manage',
    label: '集群管理',
    title: '集群管理',
    icon: () => h(CloudServerOutlined),
    path: '/cluster/manage'
  }
];

const ICON_MAP: Record<string, any> = {
  'HomeOutlined': icon(HomeOutlined),
  'SettingOutlined': icon(SettingOutlined),
  'TeamOutlined': icon(TeamOutlined),
  'DatabaseOutlined': icon(DatabaseOutlined),
  'BarChartOutlined': icon(BarChartOutlined),
  'UnorderedListOutlined': icon(UnorderedListOutlined),
  'DashboardOutlined': icon(DashboardOutlined),
  'UserOutlined': icon(UserOutlined),
  'PlusOutlined': icon(PlusOutlined),
  'SafetyCertificateOutlined': icon(SafetyCertificateOutlined),
  'BookOutlined': icon(BookOutlined),
  'MenuOutlined': icon(MenuOutlined),
  'LockOutlined': icon(LockOutlined),
  'CloudServerOutlined': icon(CloudServerOutlined)
};

function convertApiMenu(apiMenu: any) {
  if (!apiMenu) return null;

  // 过滤"可视化大屏"菜单项
  if (apiMenu.path === '/visual/large' || apiMenu.path === '/' && apiMenu.name === '可视化大屏' || apiMenu.name === '可视化大屏' || apiMenu.name === '医疗可视化大屏') {
    return null;
  }

  console.log('[菜单转换] 处理菜单:', apiMenu);

  // 确保有一个唯一的key
  const menuKey = apiMenu.path || apiMenu.key || `menu_${apiMenu.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const item: any = {
    key: menuKey,
    label: apiMenu.name || apiMenu.label || '未命名',
    title: apiMenu.title || apiMenu.name || '未命名',
    path: apiMenu.path || apiMenu.key || menuKey
  };

  // 保留原始icon属性，如果没有再从ICON_MAP中查找
  if (apiMenu.icon) {
    if (typeof apiMenu.icon === 'function') {
      item.icon = apiMenu.icon;
    } else if (ICON_MAP[apiMenu.icon]) {
      item.icon = ICON_MAP[apiMenu.icon];
    } else {
      console.warn(`[菜单] 图标 ${apiMenu.icon} 未找到，使用默认图标`);
      item.icon = ICON_MAP['SettingOutlined'];
    }
  } else {
    // 如果没有图标，使用默认的SettingOutlined
    item.icon = ICON_MAP['SettingOutlined'];
  }

  // 处理子菜单
  if (apiMenu.children?.length > 0) {
    const children = apiMenu.children.map((c: any) => convertApiMenu(c)).filter(Boolean);
    if (children.length > 0) {
      item.children = children;
      console.log('[菜单转换] 添加子菜单:', item.label, children);
    }
  }

  console.log('[菜单转换] 转换结果:', item);
  return item;
}

const menuItems = computed(() => {
  console.log('[菜单计算] 开始计算菜单项...');
  console.log('[菜单计算] store中的菜单树:', menuStore.menuTree);
  console.log('[菜单计算] props.meunArr:', props.meunArr);
  console.log('[菜单计算] props.adminMeunArr:', props.adminMeunArr);
  
  // 首先使用store中的菜单数据（动态菜单）
  const apiMenus = menuStore.menuTree;
  if (apiMenus?.length > 0) {
    console.log('[菜单计算] 使用来自API的动态菜单，数量:', apiMenus.length);
    const converted = apiMenus.map((m: any) => {
      const item = convertApiMenu(m);
      console.log('[菜单计算] 转换的API菜单项:', item);
      return item;
    }).filter(Boolean);
    console.log('[菜单计算] 最终使用的动态菜单项:', converted);
    return converted;
  }
  
  // 其次使用props传递的菜单数据
  if (props.meunArr?.length > 0 || props.adminMeunArr?.length > 0) {
    console.log('[菜单计算] 使用来自props的菜单数据');
    const convertedMeunArr = (props.meunArr || []).map((m: any) => {
      const item = convertApiMenu(m);
      console.log('[菜单计算] 转换的菜单项:', item);
      return item;
    }).filter(Boolean);
    const convertedAdminMeunArr = (props.adminMeunArr || []).map((m: any) => {
      const item = convertApiMenu(m);
      console.log('[菜单计算] 转换的管理员菜单项:', item);
      return item;
    }).filter(Boolean);
    const result = [...convertedMeunArr, ...convertedAdminMeunArr];
    console.log('[菜单计算] 最终使用的props菜单项:', result);
    return result;
  }

  // 最后使用静态菜单作为兜底
  console.log('[菜单计算] 使用静态菜单项作为兜底:', STATIC_MENU_ITEMS);
  return STATIC_MENU_ITEMS;
});

const current = ref<string[]>(['/']);

watch(() => route.path, (path) => {
  console.log('[菜单] 路由路径变化:', path);
  // 尝试找到对应的菜单key
  const matchedKey = findMenuKeyByPath(path);
  console.log('[菜单] 匹配的菜单key:', matchedKey);
  current.value = [matchedKey || path];
}, { immediate: true });

// 根据路由路径查找对应的菜单key
function findMenuKeyByPath(path: string): string | null {
  // 优先检查props传递的菜单
  const allMenus = [...props.meunArr, ...props.adminMeunArr];
  for (const menu of allMenus) {
    if (menu.path === path || menu.key === path) {
      return menu.key;
    }
  }
  
  // 检查静态菜单
  for (const menu of STATIC_MENU_ITEMS) {
    if (menu.path === path || menu.key === path) {
      return menu.key;
    }
    // 检查子菜单
    if (menu.children) {
      for (const child of menu.children) {
        if (child.path === path || child.key === path) {
          return child.key;
        }
      }
    }
  }
  
  return null;
}

const handleMenu = (e: any) => {
  console.log('[菜单] 菜单点击事件:', e);
  const key = e.key || e;
  console.log('[菜单] 触发菜单路由事件:', key);
  // 立即更新selectedKeys，确保菜单选中状态及时更新
  current.value = [key];
  
  // 尝试找到对应的菜单项，使用其path属性进行跳转
  const menuItem = findMenuItemByKey(key);
  if (menuItem && menuItem.path) {
    console.log('[菜单] 找到菜单项，使用path跳转:', menuItem.path);
    emit('menuRouter', menuItem.path);
  } else {
    // 尝试从静态菜单中查找
    const staticMenuItem = STATIC_MENU_ITEMS.find(item => item.key === key);
    if (staticMenuItem && staticMenuItem.path) {
      console.log('[菜单] 从静态菜单中找到菜单项，使用path跳转:', staticMenuItem.path);
      emit('menuRouter', staticMenuItem.path);
    } else {
      console.log('[菜单] 未找到菜单项，使用key跳转:', key);
      emit('menuRouter', key);
    }
  }
};

// 根据key查找对应的菜单项
function findMenuItemByKey(key: string) {
  // 检查props传递的菜单
  const allMenus = [...props.meunArr, ...props.adminMeunArr];
  for (const menu of allMenus) {
    if (menu.key === key) {
      return menu;
    }
    if (menu.children) {
      for (const child of menu.children) {
        if (child.key === key) {
          return child;
        }
      }
    }
  }
  
  // 检查静态菜单
  for (const menu of STATIC_MENU_ITEMS) {
    if (menu.key === key) {
      return menu;
    }
    if (menu.children) {
      for (const child of menu.children) {
        if (child.key === key) {
          return child;
        }
      }
    }
  }
  
  return null;
}

const rebuildMenu = () => {
  current.value = [route.path || '/'];
  // 重新加载菜单数据
  loadMenuData();
};

const debugRefreshMenu = async () => {
  console.log('========== 调试刷新菜单 ==========');
  console.log('当前菜单树:', menuStore.menuTree);
  console.log('当前菜单长度:', menuStore.menuTree?.length);
  
  // 强制刷新
  await loadMenuData();
  
  console.log('刷新后的菜单树:', menuStore.menuTree);
  console.log('刷新后的菜单长度:', menuStore.menuTree?.length);
  console.log('计算后的菜单项:', menuItems.value);
  console.log('================================');
};

const loadMenuData = async () => {
  if (!authStore.isAuthenticated) return;
  try {
    console.log('[菜单] 开始强制刷新菜单数据...');
    await menuStore.FETCH_ADMIN_MENUS(true);
    console.log('[菜单] 刷新后的菜单树:', menuStore.menuTree);
    // 加载动态路由
    loadDynamicRoutes(menuStore.menuTree);
  } catch (e) {
    console.error('[菜单] 加载菜单数据错误:', e);
  }
};

onMounted(async () => {
  if (!authStore.isAuthenticated) return;
  try {
    if (menuStore.menuTree.length === 0) {
      await loadMenuData();
    }
  } catch (e) {
    console.error('[菜单] 加载错误:', e);
  }
  
  // 监听菜单更新事件
  window.addEventListener('menuUpdated', loadMenuData);
});

onBeforeUnmount(() => {
  // 移除菜单更新事件监听器
  window.removeEventListener('menuUpdated', loadMenuData);
});

defineExpose({ rebuildMenu });
</script>

<style>
/* 强制水平菜单不换行 - 使用非 scoped 样式确保覆盖 Ant Design 内部样式 */
.user_menu {
  background: transparent !important;
  border: none !important;
  font-weight: 500 !important;
}

.user_menu.ant-menu-horizontal {
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.user_menu.ant-menu-horizontal::-webkit-scrollbar {
  display: none !important;
}

.user_menu.ant-menu-horizontal > .ant-menu-item,
.user_menu.ant-menu-horizontal > .ant-menu-submenu {
  float: none !important;
  display: inline-block !important;
  vertical-align: top !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
}

.user_menu.ant-menu-horizontal .ant-menu-item,
.user_menu.ant-menu-horizontal .ant-menu-submenu-title {
  padding: 0 14px !important;
  font-size: 14px !important;
  white-space: nowrap !important;
}

.user_menu.ant-menu-horizontal .ant-menu-item:hover,
.user_menu.ant-menu-horizontal .ant-menu-item-selected {
  background: linear-gradient(135deg, #e6f7ff, #f0f5ff) !important;
  border-radius: 6px !important;
  color: #1890ff !important;
}
</style>

<style>
/* 调整树节点开关图标的位置 */
.ant-tree-switcher-icon {
  transform: translateY(2px) !important;
  margin-top: 6px !important;
}
</style>