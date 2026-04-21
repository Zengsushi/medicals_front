import { createRouter, createWebHashHistory } from 'vue-router';
import { useMenuStore } from '../stores/menu';
import { useAuthStore } from '../stores/auth';
import { usePermission } from '../composables/usePermission';

const staticRoutes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/user/UserHome.vue'),
    meta: { requiresAuth: true, title: '首页' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/user/UserLogin.vue'),
    meta: { title: '用户登录', islogin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('../views/user/UserHome.vue'),
    meta: { title: '页面不存在' }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes: staticRoutes
});

let isDynamicRoutesAdded = false;

const componentMap = {
  'views/user/UserHome.vue': () => import('../views/user/UserHome.vue'),
  'views/user/UserLogin.vue': () => import('../views/user/UserLogin.vue'),
  'views/user/UserManage.vue': () => import('../views/user/UserManage.vue'),
  'views/user/UserList.vue': () => import('../views/user/UserList.vue'),
  'views/user/UserAdd.vue': () => import('../views/user/UserAdd.vue'),
  'views/user/UserAuth.vue': () => import('../views/user/UserAuth.vue'),
  'views/user/UserDetail.vue': () => import('../views/user/UserDetail.vue'),
  'views/user/UserGroupManage.vue': () => import('../views/user/UserGroupManage.vue'),
  'views/user/UserGroupAdd.vue': () => import('../views/user/UserGroupAdd.vue'),
  'views/user/UserForm.vue': () => import('../views/user/UserForm.vue'),
  'views/user/UserViewer.vue': () => import('../views/user/UserViewer.vue'),
  'views/user/UserProfile.vue': () => import('../views/user/UserProfile.vue'),
  'views/user/UserAvatarUpdate.vue': () => import('../views/user/UserAvatarUpdate.vue'),
  'views/admin/adminHome.vue': () => import('../views/admin/adminHome.vue'),
  'views/admin/adminDictManage.vue': () => import('../views/admin/adminDictManage.vue'),
  'views/admin/adminMenuManage.vue': () => import('../views/admin/adminMenuManage.vue'),
  'views/admin/PermissionManage.vue': () => import('../views/admin/PermissionManage.vue'),
  'views/admin/PermissionList.vue': () => import('../views/admin/PermissionList.vue'),
  'views/admin/MenuTreeManage.vue': () => import('../views/admin/MenuTreeManage.vue'),
  'views/admin/MenuPermissionManage.vue': () => import('../views/admin/MenuPermissionManage.vue'),
  'views/admin/UserPermissionManage.vue': () => import('../views/admin/UserPermissionManage.vue'),
  'views/admin/adminDictCategoryList.vue': () => import('../views/admin/adminDictCategoryList.vue'),
  'views/admin/adminDictCategoryForm.vue': () => import('../views/admin/adminDictCategoryForm.vue'),
  'views/admin/adminDictList.vue': () => import('../views/admin/adminDictList.vue'),
  'views/admin/adminDictForm.vue': () => import('../views/admin/adminDictForm.vue'),
  'views/admin/adminDictionList.vue': () => import('../views/admin/adminDictionList.vue'),
  'views/database/SourceManage.vue': () => import('../views/database/SourceManage.vue'),
  'views/visual/Large.vue': () => import('../views/visual/Large.vue'),
  'views/monitor/SystemMonitor.vue': () => import('../views/monitor/SystemMonitor.vue'),
  'views/cluster/ClusterManage.vue': () => import('../views/cluster/ClusterManage.vue'),
  'views/sync/DataSync.vue': () => import('../views/sync/DataSyncEnhanced.vue'),
  'views/sync/DataSyncEnhanced.vue': () => import('../views/sync/DataSyncEnhanced.vue'),
  'views/model/Menu.vue': () => import('../views/model/Menu.vue'),
  'views/analysis/Overview.vue': () => import('../views/analysis/Overview.vue'),
  'views/analysis/DiseaseAnalysis.vue': () => import('../views/analysis/DiseaseAnalysis.vue'),
  'views/analysis/ConsultationTrend.vue': () => import('../views/analysis/ConsultationTrend.vue'),
  'views/analysis/SatisfactionAnalysis.vue': () => import('../views/analysis/SatisfactionAnalysis.vue'),
  'views/analysis/HospitalRanking.vue': () => import('../views/analysis/HospitalRanking.vue'),
  'views/analysis/DoctorRanking.vue': () => import('../views/analysis/DoctorRanking.vue'),
  'views/analysis/HospitalLevelAnalysis.vue': () => import('../views/analysis/HospitalLevelAnalysis.vue'),
  'views/analysis/DoctorTitleAnalysis.vue': () => import('../views/analysis/DoctorTitleAnalysis.vue'),
  'views/analysis/DoctorTitleChart.vue': () => import('../views/analysis/DoctorTitleChart.vue'),
  'views/analysis/DepartmentServiceAnalysis.vue': () => import('../views/analysis/DepartmentServiceAnalysis.vue'),
  'views/analysis/PriceRangeAnalysis.vue': () => import('../views/analysis/PriceRangeAnalysis.vue'),
  'views/analysis/CityMedicalComparison.vue': () => import('../views/analysis/CityMedicalComparison.vue'),
  'views/analysis/RegionMedicalResource.vue': () => import('../views/analysis/RegionMedicalResource.vue')
};

export function loadComponent(componentPath) {
  if (componentMap[componentPath]) {
    return componentMap[componentPath];
  }
  return () => import('../views/user/UserHome.vue');
}

export function addRouteFromMenus(menus, parentPath = '') {
  if (!menus || !Array.isArray(menus)) {
    return;
  }

  menus.forEach(menu => {
    if (!menu.path) {
      return;
    }

    const fullPath = menu.path.startsWith('/') ? menu.path : `${parentPath}/${menu.path}`;
    const routeName = menu.name;

    if (!router.hasRoute(routeName)) {
      const route = {
        path: menu.path,
        name: routeName,
        component: menu.component ? loadComponent(menu.component) : null,
        meta: {
          requiresAuth: true,
          title: menu.name,
          icon: menu.icon,
          permission: menu.permission,
          order: menu.order
        }
      };

      if (menu.component && menu.children && menu.children.length > 0) {
        route.redirect = menu.children[0].path;
      }

      router.addRoute(route);

      if (menu.children && menu.children.length > 0) {
        addRouteFromMenus(menu.children, menu.path);
      }
    }
  });
}

export function injectDynamicRoutes(menus) {
  if (isDynamicRoutesAdded) {
    return;
  }

  addRouteFromMenus(menus);
  isDynamicRoutesAdded = true;
}

export function resetDynamicRoutes() {
  isDynamicRoutesAdded = false;
}

function collectMenuPaths(menus, paths = []) {
  if (!menus || !Array.isArray(menus)) return paths;
  menus.forEach(menu => {
    if (menu.path) {
      paths.push(menu.path);
    }
    if (menu.children && menu.children.length > 0) {
      collectMenuPaths(menu.children, paths);
    }
  });
  return paths;
}

export function setupRouterGuards(router) {
  const publicPaths = ['/login'];
  const menuStore = useMenuStore();

  router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();

    if (to.meta.requiresAuth) {
      if (!authStore.isAuthenticated) {
        next({ name: 'login' });
        return;
      }
    }

    if (to.path === '/login' && authStore.isAuthenticated) {
      if (authStore.isAdmin) {
        next({ name: 'adminHome' });
      } else {
        next({ name: 'home' });
      }
      return;
    }

    if (!isDynamicRoutesAdded && menuStore.menuTree.length > 0) {
      injectDynamicRoutes(menuStore.menuTree);
    }

    if (to.meta.requiresAuth && to.path && !publicPaths.includes(to.path)) {
      if (menuStore.menuTree.length > 0) {
        const menuPaths = collectMenuPaths(menuStore.menuTree);
        if (menuPaths.length > 0 && !menuPaths.includes(to.path)) {
          console.log('[路由守卫] 路径不在菜单中，跳转到首页:', to.path);
          next({ name: 'home' });
          return;
        }
      }
    }

    next();
  });

  router.afterEach((to) => {
    if (to.meta.title) {
      document.title = `${to.meta.title} - 医疗数据分析系统`;
    }
  });

  return router;
}

export function initRouter() {
  const menuStore = useMenuStore();

  if (menuStore.menuTree.length > 0) {
    injectDynamicRoutes(menuStore.menuTree);
  }

  setupRouterGuards(router);

  return router;
}

export { router };
