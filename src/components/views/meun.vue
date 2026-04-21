<template>
  <a-menu
    v-model:selectedKeys="current"
    :items="menuItems"
    mode="horizontal"
    class="user_menu"
    :disabledOverflow="true"
    @click="handleMenu"
  />
</template>

<script setup lang="ts">
import { ref, h, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  FundOutlined,
  UserOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  QuestionCircleOutlined,
  MenuOutlined,
  DatabaseOutlined,
  SettingOutlined,
  LockOutlined,
  TeamOutlined,
  HomeOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  DashboardOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  CloudServerOutlined,
  UserSwitchOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  ApiOutlined
} from '@ant-design/icons-vue';

import { useRoute, useRouter } from 'vue-router';
import { useMenuStore } from '../../stores/menu';
import { useAuthStore } from '../../stores/auth';
import { loadDynamicRoutes } from '../../router';

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
    key: '/',
    label: '首页',
    title: '首页',
    icon: () => h(HomeOutlined),
    path: '/'
  },
];

const ICON_MAP: Record<string, any> = {
  'HomeOutlined': icon(HomeOutlined),
  'SettingOutlined': icon(SettingOutlined),
  'TeamOutlined': icon(TeamOutlined),
  'DatabaseOutlined': icon(DatabaseOutlined),
  'BarChartOutlined': icon(BarChartOutlined),
  'UnorderedListOutlined': icon(UnorderedListOutlined),
  'CloudServerOutlined': icon(CloudServerOutlined),
  'UserOutlined': icon(UserOutlined),
  'UserAddOutlined': icon(UserAddOutlined),
  'UserDeleteOutlined': icon(UserDeleteOutlined),
  'QuestionCircleOutlined': icon(QuestionCircleOutlined),
  'MenuOutlined': icon(MenuOutlined),
  'LockOutlined': icon(LockOutlined),
  'DashboardOutlined': icon(DashboardOutlined),
  'PlusOutlined': icon(PlusOutlined),
  'SafetyCertificateOutlined': icon(SafetyCertificateOutlined),
  'BookOutlined': icon(BookOutlined),
  'UserSwitchOutlined': icon(UserSwitchOutlined),
  'FileTextOutlined': icon(FileTextOutlined),
  'MenuFoldOutlined': icon(MenuFoldOutlined),
  'MenuUnfoldOutlined': icon(MenuUnfoldOutlined),
  'AppstoreOutlined': icon(AppstoreOutlined),
  'ApiOutlined': icon(ApiOutlined)
};

// 根据菜单名称自动匹配图标
function getIconByMenuName(menuName: string) {
  const nameLower = menuName.toLowerCase();
  
  if (nameLower.includes('首页')) return icon(HomeOutlined);
  if (nameLower.includes('用户')) {
    if (nameLower.includes('管理')) return icon(TeamOutlined);
    if (nameLower.includes('新增') || nameLower.includes('添加')) return icon(UserAddOutlined);
    if (nameLower.includes('授权')) return icon(UserSwitchOutlined);
    if (nameLower.includes('详情')) return icon(UserOutlined);
    return icon(UserOutlined);
  }
  if (nameLower.includes('菜单')) {
    if (nameLower.includes('树')) return icon(MenuOutlined);
    return icon(MenuOutlined);
  }
  if (nameLower.includes('权限')) return icon(LockOutlined);
  if (nameLower.includes('数据') || nameLower.includes('库')) {
    if (nameLower.includes('管理')) return icon(DatabaseOutlined);
    if (nameLower.includes('安全')) return icon(DatabaseOutlined);
    return icon(DatabaseOutlined);
  }
  if (nameLower.includes('集群')) return icon(CloudServerOutlined);
  if (nameLower.includes('分析') || nameLower.includes('统计')) {
    if (nameLower.includes('数据')) return icon(BarChartOutlined);
    return icon(BarChartOutlined);
  }
  if (nameLower.includes('设置') || nameLower.includes('配置')) return icon(SettingOutlined);
  if (nameLower.includes('列表')) return icon(UnorderedListOutlined);
  if (nameLower.includes('文档') || nameLower.includes('文件')) return icon(FileTextOutlined);
  if (nameLower.includes('应用') || nameLower.includes('平台')) return icon(AppstoreOutlined);
  if (nameLower.includes('API') || nameLower.includes('接口')) return icon(ApiOutlined);
  
  return null;
}

function convertApiMenu(apiMenu) {
  if (!apiMenu) return null;

  const item = {
    key: apiMenu.path || apiMenu.key || String(apiMenu.id || ''),
    label: apiMenu.name || apiMenu.label || '未命名',
    title: apiMenu.title || apiMenu.name || '未命名',
    path: apiMenu.path || apiMenu.key,
    position: apiMenu.position,
    parent_path: apiMenu.parent_path,
    is_folder: apiMenu.is_folder
  };

  if (apiMenu.icon) {
    if (typeof apiMenu.icon === 'function') {
      item.icon = apiMenu.icon;
    } else if (ICON_MAP[apiMenu.icon]) {
      item.icon = ICON_MAP[apiMenu.icon];
    }
  } else {
    // 没有指定图标，根据菜单名称自动匹配
    const autoIcon = getIconByMenuName(item.label);
    if (autoIcon) {
      item.icon = autoIcon;
    }
  }

  if (apiMenu.children && Array.isArray(apiMenu.children) && apiMenu.children.length > 0) {
    item.children = apiMenu.children
      .map(child => convertApiMenu(child))
      .filter(Boolean);
  }

  return item;
}

// 构建菜单树（将扁平列表转换为树结构）
function buildMenuTree(menus) {
  if (!menus || !Array.isArray(menus)) return [];
  
  const menuMap = new Map();
  const rootMenus = [];
  
  // 首先，将所有菜单转换为带 children 的对象
  menus.forEach(menu => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });
  
  // 然后，构建父子关系
  menus.forEach(menu => {
    const menuNode = menuMap.get(menu.id);
    if (menu.parent_id && menuMap.has(menu.parent_id)) {
      // 有父菜单，添加到父菜单的 children 中
      menuMap.get(menu.parent_id).children.push(menuNode);
    } else {
      // 没有父菜单，作为根菜单
      rootMenus.push(menuNode);
    }
  });
  
  return rootMenus;
}

// 检查菜单是否已经是树结构
function isTreeStructure(menus) {
  if (!menus || !Array.isArray(menus)) return false;
  // 检查第一个菜单是否有 children 属性
  return menus.length > 0 && 'children' in menus[0];
}

// 根据位置过滤菜单
// position: 0=顶部菜单, 1=顶部子菜单, 2=左侧菜单, 3=左侧子菜单
function filterMenusByPosition(menus, position) {
  if (!menus || !Array.isArray(menus)) return [];
  
  console.log('[菜单] 接收的菜单数量:', menus.length);
  console.log('[菜单] 过滤位置:', position);
  
  // 转换 position 为数字
  const processedMenus = menus.map(menu => ({
    ...menu,
    position: menu.position != null ? Number(menu.position) : 0
  }));
  
  let fullMenuTree;
  // 检查是否已经是树结构
  if (isTreeStructure(processedMenus)) {
    // 已经是树结构，直接使用
    fullMenuTree = processedMenus;
  } else {
    // 不是树结构，构建菜单树
    fullMenuTree = buildMenuTree(processedMenus);
  }
  
  // 根据位置过滤顶级菜单（保留完整子树）
  let filtered = [];
  if (position === 'top') {
    // 顶部菜单(position=0)及其所有子菜单
    filtered = fullMenuTree.filter(menu => menu.position === 0);
  } else if (position === 'left') {
    // 左侧菜单(position=2)及其所有子菜单
    filtered = fullMenuTree.filter(menu => menu.position === 2);
  } else {
    filtered = fullMenuTree;
  }
  
  console.log('[菜单] 过滤后顶级菜单数量:', filtered.length);
  console.log('[菜单] 菜单树:', filtered);
  
  return filtered;
}

// 加载菜单数据的函数
const loadMenuData = async () => {
  if (!authStore.isAuthenticated) return;
  try {
    await menuStore.FETCH_ADMIN_MENUS(true);
    // 加载动态路由
    loadDynamicRoutes(menuStore.menuTree);
  } catch (e) {
    console.error('[菜单] 加载菜单数据错误:', e);
  }
};

const menuItems = computed(() => {
  // 首先使用store中的菜单数据（动态菜单）
  let apiMenus = menuStore.menuTree;
  // 确保 apiMenus 是一个数组
  apiMenus = Array.isArray(apiMenus) ? apiMenus : [];
  console.log('[菜单] menuStore.menuTree:', apiMenus);
  if (apiMenus.length > 0) {
    // 打印第一个菜单的详细结构，查看position字段
    console.log('[菜单] 第一个菜单结构:', apiMenus[0]);
    console.log('[菜单] 第一个菜单的position字段:', apiMenus[0].position);
    // 先按位置过滤菜单（只显示顶部菜单）
    const filteredMenus = filterMenusByPosition(apiMenus, 'top');
    console.log('[菜单] 过滤后的顶部菜单:', filteredMenus);
    const converted = filteredMenus.map((m) => {
      const item = convertApiMenu(m);
      console.log('[菜单] 转换的API菜单项:', item);
      return item;
    }).filter(Boolean);
    console.log('[菜单] 使用来自API的动态菜单项:', converted);
    return converted;
  }
  
  // 其次使用props传递的菜单数据
  const meunArr = Array.isArray(props.meunArr) ? props.meunArr : [];
  if (meunArr.length > 0) {
    // 先按位置过滤菜单（只显示顶部菜单）
    const filteredMeunArr = filterMenusByPosition(meunArr, 'top');
    const adminMeunArr = Array.isArray(props.adminMeunArr) ? props.adminMeunArr : [];
    const filteredAdminMeunArr = filterMenusByPosition(adminMeunArr, 'top');
    
    const convertedMeunArr = filteredMeunArr.map((m) => {
      const item = convertApiMenu(m);
      console.log('[菜单] 转换的菜单项:', item);
      return item;
    }).filter(Boolean);
    const convertedAdminMeunArr = filteredAdminMeunArr.map((m) => {
      const item = convertApiMenu(m);
      console.log('[菜单] 转换的管理员菜单项:', item);
      return item;
    }).filter(Boolean);
    const result = [...convertedMeunArr, ...convertedAdminMeunArr];
    console.log('[菜单] 使用来自props的菜单项:', result);
    return result;
  }

  // 最后使用静态菜单作为兜底，同样需要按位置过滤
  const filteredStaticMenus = STATIC_MENU_ITEMS.filter(item => {
    // 为静态菜单设置默认位置（0=顶部菜单）
    return true; // 静态菜单默认都是顶部菜单
  });
  console.log('[菜单] 使用静态菜单项作为兜底:', filteredStaticMenus);
  return filteredStaticMenus;
});

const current = ref(['/']);

watch(
  () => route.path, (path) => {
    console.log('[菜单] 路由路径变化:', path);
    // 尝试找到对应的菜单key
    let matchedKey = findMenuKeyByPath(path);

    // 如果在用户管理相关页面，让顶部导航的"用户管理"菜单项被选中
    if (!matchedKey && path.startsWith('/user/manage')) {
      matchedKey = '/user/manage';
    }

    console.log('[菜单] 匹配的菜单key:', matchedKey);
    current.value = [matchedKey || path];

    // 不再每次路由变化都重新加载菜单数据，避免闪烁
    // 菜单数据只在组件挂载时加载一次，或通过 menuUpdated 事件手动刷新
  }, { immediate: true });

// 递归查找菜单key
function findMenuKeyInMenuTree(menus, path) {
  for (const menu of menus) {
    if (menu.path === path || menu.key === path) {
      return menu.key;
    }
    if (menu.children) {
      const found = findMenuKeyInMenuTree(menu.children, path);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// 根据路由路径查找对应的菜单key
function findMenuKeyByPath(path) {
  // 优先检查store中的动态菜单
  const storeMenus = menuStore.menuTree;
  if (storeMenus && storeMenus.length > 0) {
    const found = findMenuKeyInMenuTree(storeMenus, path);
    if (found) {
      return found;
    }
  }
  
  // 其次检查props传递的菜单
  const allMenus = [...props.meunArr, ...props.adminMeunArr];
  if (allMenus && allMenus.length > 0) {
    const found = findMenuKeyInMenuTree(allMenus, path);
    if (found) {
      return found;
    }
  }
  
  // 最后检查静态菜单
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
  if (menuItem) {
    if (menuItem.path) {
      console.log('[菜单] 找到菜单项，使用path跳转:', menuItem.path);
      emit('menuRouter', menuItem.path);
    } else if (menuItem.is_folder && menuItem.children && menuItem.children.length > 0) {
      // 如果是文件夹菜单且有子菜单，跳转到第一个子菜单
      const firstChild = menuItem.children[0];
      if (firstChild && firstChild.path) {
        console.log('[菜单] 文件夹菜单，跳转到第一个子菜单:', firstChild.path);
        emit('menuRouter', firstChild.path);
      } else {
        console.log('[菜单] 文件夹菜单但无子菜单可跳转:', key);
      }
    } else {
      console.log('[菜单] 菜单项无path属性，使用key跳转:', key);
      emit('menuRouter', key);
    }
  } else {
    console.log('[菜单] 未找到菜单项，使用key跳转:', key);
    emit('menuRouter', key);
  }
};

// 递归查找菜单项
function findMenuItemInMenuTree(menus, key) {
  for (const menu of menus) {
    if (menu.key === key) {
      return menu;
    }
    if (menu.children) {
      const found = findMenuItemInMenuTree(menu.children, key);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// 根据key查找对应的菜单项
function findMenuItemByKey(key: string) {
  // 优先检查store中的动态菜单
  const storeMenus = menuStore.menuTree;
  if (storeMenus && storeMenus.length > 0) {
    const found = findMenuItemInMenuTree(storeMenus, key);
    if (found) {
      return found;
    }
  }
  
  // 其次检查props传递的菜单
  const allMenus = [...props.meunArr, ...props.adminMeunArr];
  if (allMenus && allMenus.length > 0) {
    const found = findMenuItemInMenuTree(allMenus, key);
    if (found) {
      return found;
    }
  }
  
  // 最后检查静态菜单
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

<style scoped>
.user_menu {
  background: transparent;
  border: none;
  font-weight: 500;
}
.user_menu :deep(.ant-menu-item) {
  padding: 0 20px;
  font-size: 15px;
  transition: all 0.3s ease;
}
.user_menu :deep(.ant-menu-item:hover),
.user_menu :deep(.ant-menu-item-selected) {
  background: linear-gradient(135deg, #e6f7ff, #f0f5ff);
  border-radius: 6px;
  color: #1890ff;
}
.user_menu :deep(.ant-menu-submenu-title) {
  padding: 0 20px;
  font-size: 15px;
  transition: all 0.3s ease;
}
.user_menu :deep(.ant-menu-submenu-title:hover) {
  background: linear-gradient(135deg, #e6f7ff, #f0f5ff);
  border-radius: 6px;
  color: #1890ff;
}
.user_menu :deep(.ant-menu-sub) {
  background: white !important;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  margin-top: 4px;
}
.user_menu :deep(.ant-menu-submenu-popup) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.user_menu :deep(.ant-menu-sub .ant-menu-item) {
  padding: 8px 20px;
  font-size: 14px;
  margin: 2px 8px;
  border-radius: 6px;
}
.user_menu :deep(.ant-menu-sub .ant-menu-item:hover),
.user_menu :deep(.ant-menu-sub .ant-menu-item-selected) {
  background: linear-gradient(135deg, #e6f7ff, #f0f5ff);
  color: #1890ff;
}
/* 调整树节点开关图标的位置 */
:global(.ant-tree-switcher-icon) {
  transform: translateY(2px);
  margin-top: 6px;
}
</style>