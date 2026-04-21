import { ref, computed, watch, onActivated, onDeactivated, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import RouteLoader from '../routes/RouteLoader';

const cachedViews = ref([]);
const prefetchCache = new Map();
const activeViewName = ref(null);
const viewRefreshFlags = ref({});
const MAX_CACHE_SIZE = 20;
const PREFETCH_ENABLED = true;

export function useKeepAlive() {
  const route = useRoute();

  const includeList = computed(() => {
    return cachedViews.value.filter(name => !viewRefreshFlags.value[name]);
  });

  const excludeList = computed(() => {
    return Object.keys(viewRefreshFlags.value).filter(name => viewRefreshFlags.value[name]);
  });

  function initFromConfig() {
    const configRoutes = RouteLoader.getKeepAliveRoutes();
    if (configRoutes && configRoutes.length > 0) {
      configRoutes.forEach(path => {
        const routeName = pathToName(path);
        if (routeName && !cachedViews.value.includes(routeName)) {
          cachedViews.value.push(routeName);
        }
      });
    }
  }

  function pathToName(path) {
    if (!path) return null;
    const nameMap = {
      '/': 'large',
      '/user/home': 'userHome',
      '/user/detail': 'userPersonalCenter',
      '/login': 'login',
      '/admin/home': 'adminHome',
      '/admin/dictmanage': 'dictManage',
      '/admin/menumanage': 'menuManage',  // 兼容旧路由（重定向）
      '/admin/settings/menus': 'menuTreeManage',
      '/admin/settings/permissions': 'permissionManage',
      '/admin/settings/permission-list': 'permissionManage',
      '/admin/settings/user-permission': 'userPermissionManage',
      '/admin/settings/menu-permission': 'menuPermissionManage',
      '/user/manage': 'userManage',
      '/user/manage/list': 'userlist',
      '/user/manage/add': 'useradd',
      '/user/manage/detail': 'userdetail',
      '/user/manage/auth': 'userauth',
      '/user/manage/group': 'usergroup',
      '/user/manage/groupadd': 'usergroupadd',
      '/user/list': 'sourceManage',
      '/visual/large': 'large',
      '/cluster/manage': 'clusterManage'
    };
    return nameMap[path] || null;
  }

  function addCacheView(viewName) {
    if (!viewName) return;

    const name = typeof viewName === 'string' ? viewName : viewName.name || viewName.path;

    if (!cachedViews.value.includes(name)) {
      if (cachedViews.value.length >= MAX_CACHE_SIZE) {
        const removed = cachedViews.value.shift();
        console.log(`[KeepAlive] 缓存已满，移除最早缓存: ${removed}`);
      }
      cachedViews.value.push(name);
    }
  }

  function removeCacheView(viewName) {
    const name = typeof viewName === 'string' ? viewName : viewName.name;
    const index = cachedViews.value.indexOf(name);
    if (index > -1) {
      cachedViews.value.splice(index, 1);
    }
    delete viewRefreshFlags.value[name];
  }

  function clearAllCache() {
    cachedViews.value = [];
    viewRefreshFlags.value = {};
    prefetchCache.clear();
    console.log('[KeepAlive] 所有缓存已清除');
  }

  function refreshView(viewName) {
    const name = typeof viewName === 'string' ? viewName : viewName?.name;
    if (name) {
      viewRefreshFlags.value[name] = true;
      nextTick(() => {
        setTimeout(() => {
          delete viewRefreshFlags.value[name];
          addCacheView(name);
        }, 100);
      });
    }
  }

  function isCached(viewName) {
    const name = typeof viewName === 'string' ? viewName : viewName?.name;
    return cachedViews.value.includes(name);
  }

  async function prefetchComponent(componentPath) {
    if (!PREFETCH_ENABLED || !componentPath || prefetchCache.has(componentPath)) {
      return;
    }

    try {
      const loader = RouteLoader.loadComponent(componentPath);
      if (loader) {
        const startTs = Date.now();
        await loader();
        prefetchCache.set(componentPath, Date.now() - startTs);
        console.log(`[KeepAlive] 预加载完成: ${componentPath} (${Date.now() - startTs}ms)`);
      }
    } catch (error) {
      console.warn(`[KeepAlive] 预加载失败: ${componentPath}`, error.message);
    }
  }

  function prefetchRoute(routePath) {
    if (!routePath) return;

    const componentMap = {
      '/user/manage/list': 'views/user/UserList.vue',
      '/user/manage/add': 'views/user/UserAdd.vue',
      '/user/manage/detail': 'views/user/UserDetail.vue',
      '/admin/dictmanage': 'views/admin/adminDictManage.vue',
      '/admin/menumanage': 'views/admin/adminMenuManage.vue',  // 兼容旧路由
      '/admin/settings/menus': 'views/admin/MenuTreeManage.vue',
      '/admin/settings/permissions': 'views/admin/PermissionManage.vue',
      '/visual/large': 'views/visual/Large.vue'
    };

    const compPath = componentMap[routePath];
    if (compPath) {
      prefetchComponent(compPath);
    }
  }

  function setupAutoCache() {
    watch(
      () => route.name,
      (newName) => {
        activeViewName.value = newName;

        if (route.meta?.keepAlive !== false && newName) {
          const isKeepAliveRoute = RouteLoader.isKeepAlive(route.path);

          if (isKeepAliveRoute || route.meta?.keepAlive === true) {
            addCacheView(newName);
          }
        }

        if (route.meta?.keepAlive === false) {
          removeCacheView(newName);
        }
      },
      { immediate: true }
    );
  }

  function getCacheStats() {
    return {
      cachedCount: cachedViews.value.length,
      maxSize: MAX_CACHE_SIZE,
      usage: `${cachedViews.value.length}/${MAX_CACHE_SIZE}`,
      prefetchCount: prefetchCache.size,
      cachedViews: [...cachedViews.value],
      refreshingViews: Object.keys(viewRefreshFlags.value)
    };
  }

  return {
    cachedViews,
    activeViewName,
    includeList,
    excludeList,
    initFromConfig,
    addCacheView,
    removeCacheView,
    clearAllCache,
    refreshView,
    isCached,
    prefetchComponent,
    prefetchRoute,
    setupAutoCache,
    getCacheStats
  };
}

export function onKeepAliveActive(callback) {
  onActivated(callback);
}

export function onKeepAliveInactive(callback) {
  onDeactivated(callback);
}

export default useKeepAlive;