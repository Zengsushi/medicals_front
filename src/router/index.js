import { createRouter, createWebHashHistory } from 'vue-router';
import { useMenuStore } from '../stores/menu';
import { useAuthStore } from '../stores/auth';
import RouteLoader, { initRouteLoader } from '../routes/RouteLoader';

const constantRoutes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/visual/Large.vue'),
    meta: {
      requiresAuth: true,
      title: '医疗可视化大屏'
    }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/user/UserLogin.vue'),
    meta: {
      title: '用户登录',
      islogin: true,
      isPublic: true
    }
  },
  {
    path: '/user/home',
    name: 'userHome',
    component: () => import('../views/user/UserHome.vue'),
    meta: {
      requiresAuth: true,
      title: '用户首页'
    }
  },
  {
    path: '/user/detail',
    name: 'userPersonalCenter',
    component: () => import('../views/user/UserDetail.vue'),
    meta: {
      requiresAuth: true,
      title: '个人中心'
    }
  },
  {
    path: '/user/profile',
    name: 'userSelfProfile',
    component: () => import('../views/user/UserProfile.vue'),
    meta: {
      requiresAuth: true,
      title: '账号资料',
      selfProfile: true
    }
  },
  {
    path: '/user/settings',
    name: 'userSelfSettings',
    redirect: '/user/profile',
    meta: {
      requiresAuth: true,
      title: '账号设置'
    }
  },
  {
    path: '/admin/home',
    name: 'adminHome',
    component: () => import('../views/admin/adminHome.vue'),
    meta: {
      requiresAuth: true,
      title: '管理首页'
    }
  },
  {
    path: '/admin/menumanage',
    name: 'menuManage',
    redirect: '/admin/settings/menus',
    meta: {
      requiresAuth: true,
      title: '菜单管理（已迁移）'
    }
  },
  {
    path: '/admin/settings',
    name: 'settings',
    redirect: '/admin/settings/menus',
    meta: {
      requiresAuth: true,
      title: '系统设置'
    },
    children: [
      {
        path: 'menus',
        name: 'menuTreeManage',
        component: () => import('../views/admin/MenuTreeManage.vue'),
        meta: {
          requiresAuth: true,
          title: '🌳 菜单树管理'
        }
      },
      {
        path: 'permission-list',
        name: 'permissionList',
        component: () => import('../views/admin/PermissionList.vue'),
        meta: {
          requiresAuth: true,
          title: '🔒 权限列表'
        }
      },
      {
        path: 'user-permission',
        name: 'userPermissionManage',
        component: () => import('../views/admin/UserPermissionManage.vue'),
        meta: {
          requiresAuth: true,
          title: '👤 用户权限管理'
        }
      },
      {
        path: 'menu-permission',
        name: 'menuPermissionManage',
        component: () => import('../views/admin/MenuPermissionManage.vue'),
        meta: {
          requiresAuth: true,
          title: '📋 菜单权限管理'
        }
      }
    ]
  },
  {
    path: '/user/manage',
    name: 'userManage',
    component: () => import('../views/user/UserManage.vue'),
    meta: {
      requiresAuth: true,
      title: '用户管理'
    },
    children: [
      {
        path: '',
        name: 'userManageDefault',
        redirect: 'list'
      },
      {
        path: 'list',
        name: 'userlist',
        component: () => import('../views/user/UserList.vue')
      },
      {
        path: 'add',
        name: 'useradd',
        component: () => import('../views/user/UserAdd.vue')
      },
      {
        path: 'detail',
        name: 'userdetail',
        component: () => import('../views/user/UserProfile.vue'),
        meta: {
          title: '用户详情'
        }
      },
      {
        path: 'home',
        name: 'userhome',
        component: () => import('../views/user/UserHome.vue'),
        meta: {
          title: '用户首页'
        }
      },
      {
        path: 'auth',
        name: 'userauth',
        component: () => import('../views/user/UserAuth.vue'),
        meta: {
          title: '用户授权'
        }
      },
      {
        path: 'group',
        name: 'usergroup',
        component: () => import('../views/user/UserGroupManage.vue'),
        meta: {
          title: '用户分组'
        }
      },
      {
        path: 'groupadd',
        name: 'usergroupadd',
        component: () => import('../views/user/UserGroupAdd.vue'),
        meta: {
          title: '添加分组'
        }
      }
    ]
  },
  {
    path: '/database',
    name: 'database',
    redirect: '/database/management',
    meta: {
      requiresAuth: true,
      title: '数据管理'
    },
    children: [
      {
        path: 'management',
        name: 'dataManagement',
        component: () => import('../views/database/DataManagement.vue'),
        meta: {
          requiresAuth: true,
          title: '数据管理中心'
        }
      },
      {
        path: 'source',
        name: 'sourceManage',
        component: () => import('../views/database/SourceManage.vue'),
        alias: ['/database/sources', '/database/source-manage', '/database/manage'],
        meta: {
          requiresAuth: true,
          title: '数据源管理'
        }
      },
      {
        path: 'collection',
        name: 'dataCollection',
        component: () => import('../views/database/DataCollection.vue'),
        meta: {
          requiresAuth: true,
          title: '数据采集'
        }
      },
      {
        path: 'sync',
        name: 'dataSync',
        component: () => import('../views/sync/DataSyncEnhanced.vue'),
        alias: ['/data/sync'],
        meta: {
          requiresAuth: true,
          title: '数据同步'
        }
      },
      {
        path: 'monitor',
        name: 'dataMonitor',
        component: () => import('../views/database/DataMonitor.vue'),
        meta: {
          requiresAuth: true,
          title: '数据监控'
        }
      }
    ]
  },
  {
    path: '/visual/large',
    name: 'large',
    component: () => import('../views/visual/MedicalDashboard.vue'),
    meta: {
      requiresAuth: true,
      title: '医疗数据大屏'
    }
  },
  {
    path: '/visual/monitor',
    name: 'systemMonitor',
    component: () => import('../views/monitor/SystemMonitor.vue'),
    meta: {
      requiresAuth: true,
      title: '系统监控'
    }
  },
  {
    path: '/cluster/manage',
    name: 'clusterManage',
    component: () => import('../views/cluster/ClusterManage.vue'),
    meta: {
      requiresAuth: true,
      title: '集群管理'
    }
  },

  {
    path: '/analysis',
    name: 'analysis',
    redirect: '/analysis/overview',
    meta: {
      requiresAuth: true,
      title: '数据分析'
    },
    children: [
      {
        path: 'overview',
        name: 'analysisOverview',
        component: () => import('../views/analysis/Overview.vue'),
        meta: {
          requiresAuth: true,
          title: '数据概览'
        }
      },
      {
        path: 'disease',
        name: 'diseaseAnalysis',
        component: () => import('../views/analysis/DiseaseAnalysis.vue'),
        meta: {
          requiresAuth: true,
          title: '疾病分析'
        }
      },
      {
        path: 'consultation-trend',
        name: 'consultationTrend',
        component: () => import('../views/analysis/ConsultationTrend.vue'),
        meta: {
          requiresAuth: true,
          title: '问诊趋势'
        }
      },
      {
        path: 'satisfaction',
        name: 'satisfactionAnalysis',
        component: () => import('../views/analysis/SatisfactionAnalysis.vue'),
        meta: {
          requiresAuth: true,
          title: '满意度分析'
        }
      },
      {
        path: 'hospital-ranking',
        name: 'hospitalRanking',
        component: () => import('../views/analysis/HospitalRanking.vue'),
        meta: {
          requiresAuth: true,
          title: '医院排名'
        }
      },
      {
        path: 'doctor-ranking',
        name: 'doctorRanking',
        component: () => import('../views/analysis/DoctorRanking.vue'),
        meta: {
          requiresAuth: true,
          title: '医生排名'
        }
      },
      {
        path: 'hospital-level',
        name: 'hospitalLevelAnalysis',
        component: () => import('../views/analysis/HospitalLevelAnalysis.vue'),
        meta: {
          requiresAuth: true,
          title: '医院等级分析'
        }
      },
      {
        path: 'doctor-title',
        name: 'doctorTitleAnalysis',
        component: () => import('../views/analysis/DoctorTitleAnalysis.vue'),
        meta: {
          requiresAuth: true,
          title: '医生职称分析'
        }
      },
      {
        path: 'doctor-title-chart',
        name: 'doctorTitleChart',
        component: () => import('../views/analysis/DoctorTitleChart.vue'),
        meta: {
          requiresAuth: true,
          title: '医生职称分布图'
        }
      },
      {
        path: 'department-service',
        name: 'departmentServiceAnalysis',
        component: () => import('../views/analysis/DepartmentServiceAnalysis.vue'),
        meta: {
          requiresAuth: true,
          title: '科室服务分析'
        }
      },
      {
        path: 'price-range',
        name: 'priceRangeAnalysis',
        component: () => import('../views/analysis/PriceRangeAnalysis.vue'),
        meta: {
          requiresAuth: true,
          title: '价格区间分析'
        }
      },
      {
        path: 'city-medical',
        name: 'cityMedicalComparison',
        component: () => import('../views/analysis/CityMedicalComparison.vue'),
        meta: {
          requiresAuth: true,
          title: '城市医疗对比'
        }
      },
      {
        path: 'region-resource',
        name: 'regionMedicalResource',
        component: () => import('../views/analysis/RegionMedicalResource.vue'),
        meta: {
          requiresAuth: true,
          title: '区域医疗资源'
        }
      }
    ]
  },
  {
    path: '/admin/dict',
    name: 'dictManage',
    component: () => import('../views/admin/adminDictManage.vue'),
    meta: {
      requiresAuth: true,
      title: '字典管理'
    },
    children: [
      {
        path: '',
        name: 'dictManageDefault',
        redirect: 'category'
      },
      {
        path: 'category',
        name: 'dictCategoryList',
        component: () => import('../views/admin/adminDictCategoryList.vue'),
        meta: {
          requiresAuth: true,
          title: '字典分类列表'
        }
      },
      {
        path: 'category/add',
        name: 'dictCategoryAdd',
        component: () => import('../views/admin/adminDictCategoryForm.vue'),
        meta: {
          requiresAuth: true,
          title: '添加字典分类'
        }
      },
      {
        path: 'category/edit/:id',
        name: 'dictCategoryEdit',
        component: () => import('../views/admin/adminDictCategoryForm.vue'),
        meta: {
          requiresAuth: true,
          title: '编辑字典分类'
        }
      },
      {
        path: 'list',
        name: 'dictList',
        component: () => import('../views/admin/adminDictList.vue'),
        meta: {
          requiresAuth: true,
          title: '字典列表'
        }
      },
      {
        path: 'add',
        name: 'dictAdd',
        component: () => import('../views/admin/adminDictForm.vue'),
        meta: {
          requiresAuth: true,
          title: '添加字典'
        }
      },
      {
        path: 'edit/:id',
        name: 'dictEdit',
        component: () => import('../views/admin/adminDictForm.vue'),
        meta: {
          requiresAuth: true,
          title: '编辑字典'
        }
      },
      {
        path: 'diction',
        name: 'dictionList',
        component: () => import('../views/admin/adminDictionList.vue'),
        meta: {
          requiresAuth: true,
          title: '字典项列表'
        }
      }
    ]
  },
  {
    path: '/admin/menu-manage',
    name: 'adminMenuManage',
    component: () => import('../views/admin/adminMenuManage.vue'),
    meta: {
      requiresAuth: true,
      title: '菜单管理'
    }
  },
  {
    path: '/admin/permission-manage',
    name: 'permissionManage',
    component: () => import('../views/admin/PermissionManage.vue'),
    meta: {
      requiresAuth: true,
      title: '权限管理'
    }
  },
  {
    path: '/user/form',
    name: 'userForm',
    component: () => import('../views/user/UserForm.vue'),
    meta: {
      requiresAuth: true,
      title: '用户表单'
    }
  },
  {
    path: '/user/viewer',
    name: 'userViewer',
    component: () => import('../views/user/UserViewer.vue'),
    meta: {
      requiresAuth: true,
      title: '用户查看'
    }
  },
  {
    path: '/user/avatar',
    name: 'userAvatarUpdate',
    component: () => import('../views/user/UserAvatarUpdate.vue'),
    meta: {
      requiresAuth: true,
      title: '更新头像'
    }
  },
  {
    path: '/model/menu',
    name: 'modelMenu',
    component: () => import('../views/model/Menu.vue'),
    meta: {
      requiresAuth: true,
      title: '模型菜单'
    }
  },
  {
    path: '/test/hospital-level',
    name: 'hospitalLevelTest',
    component: () => import('../views/test/HospitalLevelTest.vue'),
    meta: {
      requiresAuth: true,
      title: '医院等级分布测试'
    }
  },
  {
    path: '/test/satisfaction',
    name: 'satisfactionTest',
    component: () => import('../views/test/SatisfactionTest.vue'),
    meta: {
      requiresAuth: true,
      title: '满意度分析测试'
    }
  },
  {
    path: '/test/doctor-title',
    name: 'doctorTitleTest',
    component: () => import('../views/test/DoctorTitleTest.vue'),
    meta: {
      requiresAuth: true,
      title: '医生职称分布测试'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('../views/user/UserHome.vue'),
    meta: {
      title: '页面不存在',
      isPublic: true
    }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes
});

initRouteLoader(router);

let isRoutesLoaded = false;

export function loadDynamicRoutes(menus) {
  if (!menus || menus.length === 0) {
    console.log('[Router] 菜单为空，跳过动态路由加载');
    return { injected: 0, skipped: 0, totalMenus: 0 };
  }

  const result = RouteLoader.injectFromMenuTree(menus);

  if (result.injected > 0) {
    console.log(`[Router] 动态路由注入完成: 注入 ${result.injected} 个, 跳过 ${result.skipped} 个`);
  }

  isRoutesLoaded = true;
  return result;
}

export function loadComponent(componentPath) {
  return RouteLoader.loadComponent(componentPath);
}

export function resetRouter() {
  isRoutesLoaded = false;
  RouteLoader.clearCache();
}

export function isStaticRoute(path) {
  return RouteLoader.isStaticRoute(path);
}

export function injectSingleRoute(route, parentName) {
  return RouteLoader.inject(route, parentName);
}

const checkAuthToken = () => {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  return !!(token || refreshToken);
};

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const menuStore = useMenuStore();

  const hasToken = checkAuthToken();

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated && !hasToken) {
      console.log('[路由守卫] 未认证，跳转登录页');
      next({ path: '/login' });
      return;
    }

    if (hasToken && !authStore.isAuthenticated) {
      const restored = authStore.restoreFromStorage();
      if (!restored && !authStore.isAuthenticated) {
        console.log('[路由守卫] 令牌过期或无活动，跳转登录页');
        next({ path: '/login' });
        return;
      }
    }

    // 暂时禁用令牌过期检查，让用户能够正常登录和使用系统
    // if (authStore.isAuthenticated && authStore.isTokenExpired) {
    //   console.log('[路由守卫] 令牌已过期，跳转登录页');
    //   authStore.clearAuth();
    //   next({ path: '/login' });
    //   return;
    // }
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    console.log('[路由守卫] 已登录用户访问登录页');
    next({ path: '/', replace: true });
    return;
  }

  if (!isRoutesLoaded && menuStore.menuTree && menuStore.menuTree.length > 0) {
    console.log('[路由守卫] 加载动态路由，菜单数:', menuStore.menuTree.length);
    loadDynamicRoutes(menuStore.menuTree);
  }

  localStorage.setItem('at_path', to.path);

  next();
});

router.afterEach((to) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 医疗数据分析系统`;
  }

  // 规范化地址：避免登录入口残留为 /login#/xxx
  // 在 hash 模式下，用户若从 /login 进入，后续跳转可能保留 pathname=/login
  // 这里统一改写为 /#/xxx，提升路由观感与分享链接一致性
  if (window.location.pathname === '/login' && to.path !== '/login') {
    const normalized = `/#${to.fullPath.startsWith('/') ? to.fullPath : `/${to.fullPath}`}`;
    window.history.replaceState(window.history.state, '', normalized);
  }
});

export default router;