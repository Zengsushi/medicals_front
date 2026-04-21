import routeConfig from './config.json';

const componentCache = new Map();
const registeredRoutes = new Set();
const loadingPromises = new Map();
const LEGACY_PATH_MAP = {
  '/data/sync': '/database/sync'
};
const LEGACY_COMPONENT_MAP = {
  'views/sync/DataSync.vue': 'views/sync/DataSyncEnhanced.vue'
};

const CONFIG = {
  staticRoutes: new Set(routeConfig.staticRoutes || []),
  adminOnlyPatterns: routeConfig.adminOnlyPatterns || [],
  publicRoutes: new Set(routeConfig.publicRoutes || []),
  lazyComponents: routeConfig.lazyLoadedComponents || {},
  keepAliveRoutes: new Set(routeConfig.keepAliveRoutes || []),
  fallbackComponent: routeConfig.fallbackComponent || 'views/user/UserHome.vue',
  loading: routeConfig.loadingConfig || { enabled: true, delay: 200, timeout: 10000 },
  metaDefaults: routeConfig.routeMetaDefaults || {},
  dynamicImport: routeConfig.dynamicImport || { baseDir: '../views', errorFallback: 'views/user/UserHome.vue', retryCount: 1, cacheEnabled: true }
};

class RouteLoader {
  static isStaticRoute(path) {
    if (!path) return false;
    return CONFIG.staticRoutes.has(path);
  }

  static isAdminRoute(path) {
    if (!path) return false;
    return CONFIG.adminOnlyPatterns.some(pattern => {
      if (pattern.endsWith('/*')) {
        const basePattern = pattern.slice(0, -2);
        return path.startsWith(basePattern);
      }
      return path === pattern;
    });
  }

  static isPublicRoute(path) {
    if (!path) return false;
    return CONFIG.publicRoutes.has(path);
  }

  static shouldLazyLoad(componentPath) {
    if (!componentPath) return false;
    return CONFIG.lazyComponents[componentPath] === true;
  }

  static isKeepAlive(path) {
    if (!path) return false;
    return CONFIG.keepAliveRoutes.has(path);
  }

  static getKeepAliveRoutes() {
    return Array.from(CONFIG.keepAliveRoutes);
  }

  static loadComponent(componentPath) {
    if (!componentPath) {
      console.warn('[RouteLoader] 空组件路径，使用降级组件');
      return this._createFallbackLoader();
    }

    let normalizedPath = componentPath.replace(/^\.\//, '').replace(/^\//, '');
    normalizedPath = LEGACY_COMPONENT_MAP[normalizedPath] || normalizedPath;

    if (CONFIG.dynamicImport.cacheEnabled && componentCache.has(normalizedPath)) {
      return componentCache.get(normalizedPath);
    }

    const loader = this._createLazyLoader(normalizedPath);

    if (CONFIG.dynamicImport.cacheEnabled) {
      componentCache.set(normalizedPath, loader);
    }

    return loader;
  }

  static _createLazyLoader(componentPath) {
    const baseDir = CONFIG.dynamicImport.baseDir;
    const fullPath = componentPath.startsWith('views/') ? `../${componentPath}` : `${baseDir}/${componentPath}`;

    const errorFallbackPath = `../${CONFIG.dynamicImport.errorFallback}`;

    return () => import(
      /* webpackChunkName: "route-[request]" */
      /* webpackMode: "lazy" */
      /* @vite-ignore */
      fullPath
    ).catch((error) => {
      console.error(`[RouteLoader] 组件加载失败: ${componentPath}`, error);
      return import(
        /* @vite-ignore */
        errorFallbackPath
      );
    });
  }

  static _createFallbackLoader() {
    return () => import('../views/user/UserHome.vue');
  }

  static createLoadingWrapper(asyncLoader, options = {}) {
    const delay = options.delay ?? CONFIG.loading.delay;
    const timeout = options.timeout ?? CONFIG.loading.timeout;

    return () => ({
      component: asyncLoader(),
      loading: CONFIG.loading.enabled ? this._getLoadingComponent() : undefined,
      error: this._getErrorComponent(),
      delay,
      timeout
    });
  }

  static _getLoadingComponent() {
    return () => import('./LoadingIndicator.vue');
  }

  static _getErrorComponent() {
    return {
      template: '<div style="display:flex;align-items:center;justify-content:center;height:300px;color:#999;"><a-result status="error" title="页面加载失败" sub-title="请刷新页面重试"><template #extra><a-button type="primary" @click="$router.go(0)">重新加载</a-button></template></a-result></div>'
    };
  }

  static inject(route, parentName = null) {
    if (!route || !route.path) {
      console.warn('[RouteLoader] inject: 无效的路由配置', route);
      return false;
    }

    const routeKey = route.name || route.path;

    if (registeredRoutes.has(routeKey)) {
      return false;
    }

    // 按路径去重：避免数据库菜单与静态路由指向同一路径时重复注入
    const normalizedPath = route.path.startsWith('/') ? route.path : `/${route.path}`;
    const existsByPath = window.__ROUTER__?.getRoutes?.().some(r => r.path === normalizedPath);
    if (existsByPath) {
      return false;
    }

    try {
      const normalizedRoute = this._normalizeRoute(route);

      if (parentName && typeof parentName === 'string') {
        window.__ROUTER__?.addRoute(parentName, normalizedRoute);
      } else {
        window.__ROUTER__?.addRoute(normalizedRoute);
      }

      registeredRoutes.add(routeKey);
      return true;
    } catch (error) {
      console.error(`[RouteLoader] 注入路由失败: ${route.path}`, error);
      return false;
    }
  }

  static injectBatch(routes, parentName = null) {
    if (!Array.isArray(routes)) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;

    routes.forEach(route => {
      if (this.inject(route, parentName)) {
        success++;
      } else {
        failed++;
      }
    });

    return { success, failed };
  }

  static _normalizeRoute(rawRoute) {
    const meta = {
      ...CONFIG.metaDefaults,
      ...(rawRoute.meta || {})
    };

    if (rawRoute.component) {
      if (typeof rawRoute.component === 'string') {
        rawRoute.component = this.loadComponent(rawRoute.component);
      }
    } else if (meta.requiresAuth !== false) {
      rawRoute.component = this._createFallbackLoader();
    }

    if (this.isKeepAlive(rawRoute.path)) {
      meta.keepAlive = true;
    }

    if (this.isPublicRoute(rawRoute.path)) {
      meta.isPublic = true;
      meta.requiresAuth = false;
    }

    if (this.isAdminRoute(rawRoute.path)) {
      meta.requiresAdmin = true;
    }

    return {
      ...rawRoute,
      meta
    };
  }

  static clearCache() {
    componentCache.clear();
    registeredRoutes.clear();
    loadingPromises.clear();
    console.log('[RouteLoader] 路由缓存已清除');
  }

  static clearComponentCache(componentPath) {
    if (componentPath) {
      const normalizedPath = componentPath.replace(/^\.\//, '').replace(/^\//, '');
      componentCache.delete(normalizedPath);
    } else {
      componentCache.clear();
    }
  }

  static removeRoute(routeName) {
    if (window.__ROUTER__?.hasRoute(routeName)) {
      window.__ROUTER__.removeRoute(routeName);
      registeredRoutes.delete(routeName);
      return true;
    }
    return false;
  }

  static validate(path) {
    if (!path || typeof path !== 'string') {
      return { valid: false, reason: 'INVALID_PATH', message: '路径无效或为空' };
    }

    if (!path.startsWith('/')) {
      return { valid: false, reason: 'INVALID_FORMAT', message: '路径必须以 / 开头' };
    }

    const invalidChars = /[<>:"|?*\x00-\x1F]/;
    if (invalidChars.test(path)) {
      return { valid: false, reason: 'INVALID_CHARS', message: '路径包含非法字符' };
    }

    if (registeredRoutes.has(path)) {
      return { valid: true, reason: 'ALREADY_REGISTERED', message: '路由已注册', cached: true };
    }

    if (this.isStaticRoute(path)) {
      return { valid: true, reason: 'STATIC_ROUTE', message: '静态路由', cached: true };
    }

    return { valid: true, reason: 'VALID', message: '路径有效，可动态注入', cached: false };
  }

  static hasRoute(routeIdentifier) {
    return registeredRoutes.has(routeIdentifier) ||
           window.__ROUTER__?.hasRoute(routeIdentifier) ||
           false;
  }

  static getRegisteredCount() {
    return registeredRoutes.size;
  }

  static getRegisteredPaths() {
    return Array.from(registeredRoutes);
  }

  static buildRouteFromMenu(menuItem, parentPath = null) {
    if (!menuItem || !menuItem.path) {
      return null;
    }

    const rawPath = menuItem.path.startsWith('/') ? menuItem.path : `${parentPath || ''}/${menuItem.path}`;
    const path = LEGACY_PATH_MAP[rawPath] || rawPath;
    const component = LEGACY_COMPONENT_MAP[menuItem.component] || menuItem.component;

    return {
      path: path,
      name: menuItem.name || `dynamic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      component: component || null,
      redirect: menuItem.redirect || null,
      meta: {
        title: menuItem.name || menuItem.title || '未命名',
        menuId: menuItem.id || null,
        icon: menuItem.icon || null,
        permissionCode: menuItem.permission_code || menuItem.permission || null,
        order: menuItem.order || 0,
        breadcrumb: menuItem.breadcrumb || menuItem.name || '未命名',
        keepAlive: this.isKeepAlive(menuItem.path)
      },
      children: menuItem.children ? menuItem.children.map(child =>
        this.buildRouteFromMenu(child, menuItem.path)
      ).filter(Boolean) : undefined
    };
  }

  static injectFromMenuTree(menuTree, parentName = null) {
    if (!menuTree || !Array.isArray(menuTree) || menuTree.length === 0) {
      return { injected: 0, skipped: 0 };
    }

    let injected = 0;
    let skipped = 0;

    const traverse = (menus, parent) => {
      menus.forEach(menu => {
        if (this.isStaticRoute(menu.path)) {
          skipped++;
          if (menu.children?.length > 0) {
            traverse(menu.children, menu.name);
          }
          return;
        }

        const route = this.buildRouteFromMenu(menu);
        if (route && this.inject(route, parent)) {
          injected++;
        } else {
          skipped++;
        }

        if (menu.children?.length > 0) {
          traverse(menu.children, route?.name);
        }
      });
    };

    traverse(menuTree, parentName);

    return { injected, skipped };
  }

  static getConfig() {
    return CONFIG;
  }

  static getStats() {
    return {
      registeredRoutes: registeredRoutes.size,
      cachedComponents: componentCache.size,
      keepAliveRoutes: CONFIG.keepAliveRoutes.size,
      staticRoutes: CONFIG.staticRoutes.size,
      publicRoutes: CONFIG.publicRoutes.size
    };
  }
}

export function initRouteLoader(routerInstance) {
  if (routerInstance) {
    window.__ROUTER__ = routerInstance;
  }
  return RouteLoader;
}

export default RouteLoader;