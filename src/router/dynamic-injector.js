/**
 * Vue Router 动态路由注入器
 *
 * 遵循 Vue Router 最佳实践:
 * - 使用 router.addRoute() 动态注册路由
 * - 路由守卫中使用 next(location) 进行重定向
 * - 支持懒加载组件
 * - 支持路由元信息 (meta) 进行权限控制
 *
 * 配置文件:
 * - config/menuMap.json: 路由与菜单的映射配置
 * - config/icons.json: 图标映射配置
 */

import { useMenuStore } from '../stores/menu';
import menuMapConfig from '../config/menuMap.json';
import iconsConfig from '../config/icons.json';

const componentCache = new Map();
const registeredRouteNames = new Set();

const ICON_COMPONENT_CACHE = new Map();

export function loadIconComponent(iconName) {
  if (!iconName) return null;

  if (ICON_COMPONENT_CACHE.has(iconName)) {
    return ICON_COMPONENT_CACHE.get(iconName);
  }

  let iconComponent = null;

  const iconConfig = iconsConfig.iconMap?.[iconName];
  if (iconConfig) {
    const antIcons = require('@ant-design/icons-vue');
    iconComponent = antIcons[iconConfig.component] || null;
  }

  if (!iconComponent) {
    const antIcons = require('@ant-design/icons-vue');
    iconComponent = antIcons[iconName] || null;
  }

  if (!iconComponent) {
    const PascalCaseName = iconName.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
    const antIcons = require('@ant-design/icons-vue');
    iconComponent = antIcons[PascalCaseName + 'Outlined'] || antIcons[PascalCaseName] || null;
  }

  ICON_COMPONENT_CACHE.set(iconName, iconComponent);
  return iconComponent;
}

export function getIconByName(iconName) {
  return loadIconComponent(iconName);
}

export function getAllAvailableIcons() {
  return iconsConfig.iconMap || {};
}

export function getIconsByCategory(category) {
  return iconsConfig.categoryGroups?.[category] || [];
}

export function loadComponent(componentPath) {
  if (componentCache.has(componentPath)) {
    return componentCache.get(componentPath);
  }

  if (!componentPath) {
    return null;
  }

  const normalizedPath = componentPath.replace(/^\//, '');
  const loader = () => import(`../${normalizedPath}`);

  componentCache.set(componentPath, loader);
  return loader;
}

export function getRouteConfigByPath(routePath) {
  return menuMapConfig.routeMenuMap?.[routePath];
}

export function getRouteConfigByMenuId(menuId) {
  return menuMapConfig.menuRouteMap?.[menuId?.toString()];
}

export function getComponentByMenuId(menuId) {
  const routeConfig = getRouteConfigByMenuId(menuId);
  if (routeConfig?.component) {
    return loadComponent(routeConfig.component);
  }
  return null;
}

export function isPublicRoute(routePath) {
  const config = getRouteConfigByPath(routePath);
  return config?.isPublic === true;
}

export function getPermissionByPath(routePath) {
  const config = getRouteConfigByPath(routePath);
  return config?.permission || null;
}

export function getMenuIdByPath(routePath) {
  const config = getRouteConfigByPath(routePath);
  return config?.menuId || null;
}

export function isKeepAlive(routePath) {
  return menuMapConfig.keepAliveRoutes?.includes(routePath) || false;
}

export function getKeepAliveRoutes() {
  return menuMapConfig.keepAliveRoutes || [];
}

function buildRouteFromMenu(router, menu, parentName = null) {
  if (!menu.path || registeredRouteNames.has(menu.name)) {
    return null;
  }

  const routeConfig = getRouteConfigByPath(menu.path);

  const route = {
    path: menu.path,
    name: menu.name,
    component: null,
    redirect: null,
    meta: {
      title: menu.name,
      menuId: menu.id,
      permission: menu.permission_code || menu.permission || routeConfig?.permission,
      keepAlive: isKeepAlive(menu.path),
      icon: menu.icon || routeConfig?.icon,
      order: menu.order,
      requiresAuth: true,
      breadcrumb: routeConfig?.meta?.breadcrumb || menu.name
    }
  };

  if (routeConfig?.component) {
    route.component = loadComponent(routeConfig.component);
  } else if (menu.component) {
    route.component = loadComponent(menu.component);
  }

  if (menu.children?.length > 0 && menu.children[0]?.path) {
    route.redirect = menu.children[0].path;
  }

  registeredRouteNames.add(menu.name);

  return route;
}

export function injectRoutesFromMenuTree(router, menuTree, parentRoute = null) {
  if (!menuTree || !Array.isArray(menuTree)) {
    return;
  }

  for (const menu of menuTree) {
    const route = buildRouteFromMenu(router, menu, parentRoute);

    if (route) {
      if (parentRoute) {
        router.addRoute(parentRoute, route);
      } else {
        router.addRoute(route);
      }
    }

    if (menu.children?.length > 0) {
      injectRoutesFromMenuTree(router, menu.children, menu.name);
    }
  }
}

export function injectDynamicRoutes(router, menuTree = null) {
  if (!menuTree) {
    const menuStore = useMenuStore();
    menuTree = menuStore.menuTree || [];
  }

  if (!menuTree || menuTree.length === 0) {
    return false;
  }

  injectRoutesFromMenuTree(router, menuTree);
  return true;
}

export function resetRegisteredRoutes() {
  registeredRouteNames.clear();
}

export function rebuildRouter(router) {
  resetRegisteredRoutes();

  const notFoundRoute = {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/user/UserHome.vue'),
    meta: { title: '页面不存在', isPublic: true }
  };

  if (!router.hasRoute('NotFound')) {
    router.addRoute(notFoundRoute);
  }

  const menuStore = useMenuStore();
  const menuTree = menuStore.menuTree || [];
  if (menuTree.length > 0) {
    injectRoutesFromMenuTree(router, menuTree);
  }
}

export function getAllRoutePaths(menus = null) {
  if (!menus) {
    const menuStore = useMenuStore();
    menus = menuStore.menuTree || [];
  }

  const paths = [];

  function traverse(menuList) {
    for (const menu of menuList) {
      if (menu.path) {
        paths.push(menu.path);
      }
      if (menu.children?.length > 0) {
        traverse(menu.children);
      }
    }
  }

  traverse(menus);
  return paths;
}

export function validateRouteMapping() {
  const menuStore = useMenuStore();
  const menuTree = menuStore.menuTree || [];
  const unmappedRoutes = [];

  function traverse(menuList) {
    for (const menu of menuList) {
      if (menu.path) {
        const config = getRouteConfigByPath(menu.path);
        if (!config) {
          unmappedRoutes.push({
            path: menu.path,
            name: menu.name,
            menuId: menu.id
          });
        }
      }
      if (menu.children?.length > 0) {
        traverse(menu.children);
      }
    }
  }

  traverse(menuTree);

  if (unmappedRoutes.length > 0) {
    console.warn('⚠️  发现未映射的路由:', unmappedRoutes);
    return false;
  }

  return true;
}

export function getMenuMetaByPath(routePath) {
  const config = getRouteConfigByPath(routePath);
  if (config?.meta) {
    return config.meta;
  }
  return {
    title: config?.name || '未命名',
    breadcrumb: config?.name || '未命名'
  };
}

export default {
  loadComponent,
  loadIconComponent,
  getIconByName,
  getAllAvailableIcons,
  getIconsByCategory,
  getRouteConfigByPath,
  getRouteConfigByMenuId,
  getComponentByMenuId,
  isPublicRoute,
  getPermissionByPath,
  getMenuIdByPath,
  isKeepAlive,
  getKeepAliveRoutes,
  getMenuMetaByPath,
  injectRoutesFromMenuTree,
  injectDynamicRoutes,
  resetRegisteredRoutes,
  rebuildRouter,
  getAllRoutePaths,
  validateRouteMapping
};
