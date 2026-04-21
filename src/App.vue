<template>
  <a-config-provider :locale="zhCN">
    <router-view v-if="$route.meta.islogin" />

    <div v-else class="user_home">
    <header class="user_header">
      <div class="user_container">
        <div class="brand">
          <div class="logo">LOGO</div>
          <h1 class="user_title">医疗数据分析系统</h1>
        </div>
        <nav class="main_nav">
          <Meun
            ref="menuRef"
            @menuRouter="menuRouter"
          />
        </nav>
        <div class="header_actions">
          <User
            :size="40"
            :shape="true"
            @logout="logout"
            @login="goToLogin"
            @userdetail="goToUserDetail"
          />
        </div>
      </div>
    </header>
    <main class="user_main">
      <SideMenu
        v-if="showSideMenu"
        :is-expanded="sideMenuExpanded"
        :title="currentTopMenu?.label || '菜单'"
        :menu-items="currentSideMenuItems"
        :active-key="currentSideMenuActiveKey"
        :show-add-button="false"
        @menu-item-click="handleSideMenuClick"
        @toggle-menu="toggleSideMenu"
      />
      <div class="main_content" :class="{ 'content-with-side-menu': showSideMenu && sideMenuExpanded, 'content-with-side-menu-collapsed': showSideMenu && !sideMenuExpanded }">
        <router-view v-slot="{ Component, route }">
          <template v-if="!route.meta?.noCache">
            <keep-alive :include="cachedViews" :max="20">
              <component :is="Component" :key="route.name" />
            </keep-alive>
          </template>
          <component v-else :is="Component" :key="route.name + '-nocache'" />
        </router-view>
      </div>
    </main>
    <Copyright />
  </div>
  <a-float-button
    type="primary"
    icon="ai-fill"
    @click="AiModel"
    class="ai_model"
    title="AI模型模块"
  >
    <template #icon>
      <QuestionCircleOutlined />
    </template>
  </a-float-button>
  </a-config-provider>
</template>

<script setup>
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { onMounted, ref, computed, h, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Copyright from './components/views/copyright.vue';
import User from './components/views/user.vue';
import SideMenu from './components/common/SideMenu.vue';
import { userAPI } from './api/users';
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
  CloudServerOutlined
} from '@ant-design/icons-vue';
import Meun from './components/views/meun.vue';
import { useAuthStore } from './stores/auth';
import { useMenuStore } from './stores/menu';
import { usePermission } from './composables/usePermission';
import { useErrorHandler } from './composables/useErrorHandler';
import { useKeepAlive } from './composables/useKeepAlive';

const router = useRouter();
const route = useRoute();
const menuRef = ref(null);
const authStore = useAuthStore();
const menuStore = useMenuStore();
const { loadAll: loadPermissionData } = usePermission();
const { handleAsync } = useErrorHandler({ showNotification: true });
const { cachedViews, initFromConfig, setupAutoCache, prefetchRoute, getCacheStats } = useKeepAlive();

const sideMenuExpanded = ref(true);

// 硬编码的菜单配置作为后备方案
const sideMenuConfig = {
  '/': {
    label: '首页',
    items: []
  }
};

// 根据当前路由找到对应的顶级菜单（优先从 menuStore 获取，没有则使用硬编码配置）
const currentTopMenuKey = computed(() => {
  const path = route.path;
  const menus = menuStore.menuTree;
  
  // 优先从 menuStore 查找
  for (const menu of menus) {
    if (menu.path && path.startsWith(menu.path) && menu.path !== '/') {
      return menu.path;
    }
  }
  
  // 精确匹配根路径
  if (path === '/') return '/';
  
  // 如果没有找到匹配的，尝试查找子菜单的父级
  for (const menu of menus) {
    if (menu.children && menu.children.length > 0) {
      for (const child of menu.children) {
        if (child.path && path.startsWith(child.path)) {
          return menu.path;
        }
      }
    }
  }
  
  // 最后使用硬编码配置查找
  for (const key of Object.keys(sideMenuConfig)) {
    if (path.startsWith(key) && key !== '/') {
      return key;
    }
  }
  
  return null;
});

const currentTopMenu = computed(() => {
  if (currentTopMenuKey.value) {
    // 优先从 menuStore 获取
    const menu = menuStore.menuTree.find(m => m.path === currentTopMenuKey.value);
    if (menu) {
      return {
        key: menu.path,
        label: menu.name || menu.title || menu.label
      };
    }
    // 后备方案：使用硬编码配置
    if (sideMenuConfig[currentTopMenuKey.value]) {
      return {
        key: currentTopMenuKey.value,
        label: sideMenuConfig[currentTopMenuKey.value]?.label
      };
    }
  }
  return null;
});

const showSideMenu = computed(() => {
  const currentPath = route.path;
  
  // 隐藏左菜单的页面列表
  const hideSideMenuPaths = ['/visual/large', '/admin/home'];
  if (hideSideMenuPaths.includes(currentPath)) {
    return false;
  }
  
  const allMenus = menuStore.menuTree;
  if (!allMenus || allMenus.length === 0) return false;
  
  // 检查是否存在左侧菜单(position=2)或左侧子菜单(position=4)
  const leftMenus = filterMenusByPosition(allMenus, 'left');
  if (leftMenus.length > 0) {
    return true;
  }
  
  return false;
});

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
      menuMap.get(menu.parent_id).children.push(menuNode);
    } else {
      rootMenus.push(menuNode);
    }
  });
  
  return rootMenus;
}

// 根据位置过滤菜单
// position: 0=顶部菜单, 1=顶部子菜单, 2=左侧菜单, 3=左侧子菜单
function filterMenusByPosition(menus, position) {
  if (!Array.isArray(menus)) {
    console.warn('[App] 过滤菜单时，menus 不是数组:', menus);
    return [];
  }
  
  // 转换 position 为数字
  const processedMenus = menus.map(menu => ({
    ...menu,
    position: menu.position != null ? Number(menu.position) : 0
  }));
  
  // 先构建完整菜单树（保留所有菜单）
  const fullMenuTree = buildMenuTree(processedMenus);
  
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
  
  console.log('[App] 过滤位置:', position, '过滤后菜单数量:', filtered.length);
  console.log('[App] 菜单树:', filtered);
  
  return filtered;
}

function normalizeMenuPath(path) {
  if (!path) return '';
  if (path === '/data/sync') return '/database/sync';
  return path;
}

function resolveMenuPath(path, parentPath = '') {
  const normalized = normalizeMenuPath(path);
  if (!normalized) return '';
  if (normalized.startsWith('/')) return normalized;
  const base = normalizeMenuPath(parentPath).replace(/\/$/, '');
  return base ? `${base}/${normalized}`.replace(/\/+/g, '/') : `/${normalized}`;
}

// 转换菜单格式供 SideMenu 组件使用
function convertToSideMenuItem(menu, parentPath = '') {
  const ICON_MAP = {
    'HomeOutlined': h(HomeOutlined),
    'SettingOutlined': h(SettingOutlined),
    'TeamOutlined': h(TeamOutlined),
    'DatabaseOutlined': h(DatabaseOutlined),
    'BarChartOutlined': h(BarChartOutlined),
    'UnorderedListOutlined': h(UnorderedListOutlined),
    'DashboardOutlined': h(DashboardOutlined),
    'UserOutlined': h(UserOutlined),
    'PlusOutlined': h(PlusOutlined),
    'SafetyCertificateOutlined': h(SafetyCertificateOutlined),
    'BookOutlined': h(BookOutlined),
    'MenuOutlined': h(MenuOutlined),
    'LockOutlined': h(LockOutlined),
    'SafetyOutlined': h(SafetyCertificateOutlined)
  };

  const resolvedPath = resolveMenuPath(menu.path || menu.key, menu.parent_path || parentPath);
  const item = {
    key: resolvedPath || menu.path || menu.key,
    label: menu.name || menu.title || menu.label,
    path: resolvedPath || menu.path || menu.key
  };

  // 设置图标
  if (menu.icon) {
    if (typeof menu.icon === 'function') {
      item.icon = menu.icon;
    } else if (ICON_MAP[menu.icon]) {
      item.icon = () => ICON_MAP[menu.icon];
    }
  }

  // 递归处理子菜单，并根据位置过滤
  if (menu.children && menu.children.length > 0) {
    const filteredChildren = filterMenusByPosition(menu.children, 'left');
    if (filteredChildren.length > 0) {
      item.children = filteredChildren.map(child => convertToSideMenuItem(child, resolvedPath));
    }
  }

  return item;
}

const currentSideMenuItems = computed(() => {
  const allMenus = menuStore.menuTree;
  if (!allMenus || allMenus.length === 0) return [];
  
  // 过滤出左侧菜单(position=2)和左侧子菜单(position=4)
  const leftMenus = filterMenusByPosition(allMenus, 'left');
  if (leftMenus.length === 0) return [];
  
  // 判断是否需要显示侧边栏
  // 如果当前路由在左侧菜单的路径下，显示侧边栏
  const currentPath = route.path;
  
  // 查找当前路由对应的左侧菜单
  const currentMenu = leftMenus.find(m => 
    currentPath.startsWith(m.path) || m.path === currentPath
  );
  
  if (currentMenu) {
    // 获取该左菜单的所有子菜单(position=4)
    const childMenus = leftMenus.filter(m => m.parent_path === currentMenu.path);
    if (childMenus.length > 0) {
      return childMenus.map(convertToSideMenuItem);
    }
    // 如果没有子菜单但本身是文件夹，也显示
    if (currentMenu.is_folder) {
      return [convertToSideMenuItem(currentMenu)];
    }
  }
  
  // 默认返回所有左侧菜单
  return leftMenus.map(convertToSideMenuItem);
});

const currentSideMenuActiveKey = computed(() => {
  return route.path;
});

let routeTimer = null;

const isLoggedIn = computed(() => authStore.isAuthenticated);
const isAdmin = computed(() => authStore.isAdmin);
const userType = computed(() => authStore.roles[0]);
const loginMode = computed(() => authStore.roles[0]);
const userInfo = computed(() => authStore.currentUser);

const checkAuthToken = () => {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  return !!(token || refreshToken);
};

const verifyUserLoginStatus = () => {
  const hasToken = checkAuthToken();

  if (!authStore.isAuthenticated && !hasToken) {
    if (
      router.currentRoute.value.name !== 'login' &&
      router.currentRoute.value.path !== '/login'
    ) {
      const redirectPath = router.currentRoute.value.fullPath;
      console.log('[App] 未认证，重定向到登录页，保留路径:', redirectPath);
      router.push({ name: 'login', query: { redirect: redirectPath } });
      refreshMenuState();
    }
    return false;
  }

  if (hasToken && !authStore.isAuthenticated) {
    authStore.restoreFromStorage();
  }

  return true;
};

const refreshMenuState = () => {
  if (menuRef.value && menuRef.value.rebuildMenu) {
    menuRef.value.rebuildMenu();
  }
};

const goToLogin = () => {
  router.push({ name: 'login' });
};

const goToUserDetail = () => {
  router.push({ name: 'userPersonalCenter' });
};

const logout = async () => {
  const result = await handleAsync(
    () => userAPI.logouts(),
    {
      successMessage: '退出登录成功',
      errorMessage: '登出失败，将强制退出'
    }
  );
  
  authStore.logout();
  refreshMenuState();
  router.push({ name: 'login' });
};

const menuRouter = (path) => {
  console.log('[App] 菜单路由跳转:', path);
  
  if (routeTimer) {
    clearTimeout(routeTimer);
  }
  
  routeTimer = setTimeout(async () => {
    routeTimer = null;
    
    const pathMap = {
      userManage: '/user/manage',
      sourceManage: '/database/manage',
      menuManage: '/admin/menumanage',
      large: '/visual/large',
      admin: '/admin/home'
    };
    
    let routePath;
    if (path.startsWith('/')) {
      routePath = path;
    } else {
      routePath = pathMap[path] || `/${path}`;
    }
    
    console.log('[App] 导航到路径:', routePath);
    
    try {
      await router.push(routePath);
      console.log('[App] 路由跳转成功:', routePath);
    } catch (error) {
      if (error.name === 'NavigationDuplicated' || 
          (error.message && error.message.includes('Avoided redundant navigation'))) {
        console.log('[App] 路由跳转重复，忽略:', routePath);
      } else {
        console.error('[App] 路由跳转失败:', error);
      }
    }
  }, 50);
};

const handleSideMenuClick = async (item) => {
  if (item.path) {
    const targetPath = resolveMenuPath(item.path, currentTopMenuKey.value || '');
    try {
      await router.push(targetPath);
    } catch (error) {
      if (error.name === 'NavigationDuplicated' || 
          (error.message && error.message.includes('Avoided redundant navigation'))) {
        console.log('[App] 侧边栏路由跳转重复，忽略:', targetPath);
      } else {
        console.error('[App] 侧边栏路由跳转失败:', error);
      }
    }
  }
};

const toggleSideMenu = () => {
  sideMenuExpanded.value = !sideMenuExpanded.value;
};

const AiModel = () => {
  console.log('AI模型');
};

watch(
  () => route.name,
  () => {
    verifyUserLoginStatus();
  }
);

onMounted(() => {
  verifyUserLoginStatus();
  if (authStore.isAuthenticated) {
    loadPermissionData();
  }
  refreshMenuState();
  initFromConfig();
  setupAutoCache();
});
</script>

<style lang="less">
/* ==================================================================
 * 全局样式：统一降低所有图表外层盒子的圆角
 * 作用于所有视图，使用非 scoped 样式 + !important 以覆盖各组件 scoped 样式
 * ================================================================== */
.chart-card,
.main-chart-card,
.mini-chart,
.chart-container,
.chart-wrapper,
.stat-card,
.stats-card,
.gauge-card,
.trend-mini-card,
.satisfaction-chart,
.table-card,
.map-card,
.rank-card,
.detail-card,
.warning-card,
.page-header,
.ant-card,
.ant-card-bordered,
.ant-statistic {
  border-radius: 4px !important;
}

/* 伴随装饰条的顶部圆角也一并降低，避免与父容器错位 */
.chart-card::before,
.main-chart-card::before,
.mini-chart::before,
.stat-card::before,
.stats-card::before,
.gauge-card::before,
.trend-mini-card::before,
.satisfaction-chart::before,
.warning-card::before {
  border-radius: 4px 4px 0 0 !important;
}

/* Ant Design Card 内部容器继承降低圆角 */
.ant-card .ant-card-head,
.ant-card .ant-card-body,
.ant-card-cover {
  border-radius: 4px !important;
}
</style>

<style lang="less" scoped>
.user_home {
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f8ff;
  font-family: "Segoe UI", Roboto, "PingFang SC", sans-serif;
}

.user_header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e6f0ff;
  box-shadow: 0 2px 12px rgba(24, 144, 255, 0.06);
  position: sticky;
  top: 0;
  z-index: 999;
  transition: background 0.3s ease;
}

.user_container {
  width: 100%;
  padding: 0 20px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.logo {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.user_title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d3748 50%, #4a5568 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.main_nav {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 20px;
}



.header_actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.user_main {
  flex: 1;
  display: flex;
  background: linear-gradient(180deg, #f9fbff 0%, #eef3ff 100%);
}

.main_content {
  flex: 1;
  transition: margin-left 0.3s ease;
}

.content-with-side-menu {
  margin-left: 240px;
}

.content-with-side-menu-collapsed {
  margin-left: 60px;
}

.ai_model {
  left: 40px;
  z-index: 9999;
  transition: left 0.3s ease;
}

body.menu-collapsed .ai_model {
  left: 10px;
}

@media (max-width: 768px) {
  .user_container {
    flex-direction: column;
    height: auto;
    padding: 10px;
    gap: 10px;
  }
  .main_nav {
    order: 3;
  }
  .header_actions {
    order: 2;
  }
  .user_title {
    font-size: 18px;
  }
  .content-with-side-menu {
    margin-left: 0;
  }
}
</style>
