/**
 * 路由-菜单映射生成脚本
 *
 * 功能：
 * 1. 扫描 src/views 目录下的所有 .vue 文件
 * 2. 从路由文件中提取路由配置
 * 3. 生成 routeMenuMap 和 menuRouteMap
 * 4. 自动写入 src/config/menuMap.json
 *
 * 运行方式：
 * node build/scripts/generate-menu-map.js
 *
 * CI 集成：
 * 在 package.json 中添加：
 * "scripts": {
 *   "generate-menu-map": "node build/scripts/generate-menu-map.js",
 *   "precommit": "npm run generate-menu-map && git add src/config/menuMap.json"
 * }
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const CONFIG_PATH = path.resolve(__dirname, '../../src/config/menuMap.json');
const VIEWS_PATH = path.resolve(__dirname, '../../src/views');
const ROUTER_PATH = path.resolve(__dirname, '../../src/router/index.js');

const componentMap = {
  'views/user/UserHome.vue': '/',
  'views/user/UserLogin.vue': '/login',
  'views/user/UserManage.vue': '/user/manage',
  'views/user/UserList.vue': '/user/manage/list',
  'views/user/UserAdd.vue': '/user/manage/add',
  'views/user/UserAuth.vue': '/user/manage/auth',
  'views/user/UserDetail.vue': '/user/manage/detail',
  'views/user/UserGroupManage.vue': '/user/manage/group',
  'views/admin/adminHome.vue': '/admin/home',
  'views/admin/adminDictManage.vue': '/admin/dictmanage',
  'views/database/SourceManage.vue': '/user/list',
  'views/visual/Large.vue': '/visual/large'
};

function extractMetaFromRoute(routeStr) {
  const metaMatch = routeStr.match(/meta\s*:\s*\{([^}]+)\}/);
  if (!metaMatch) return {};

  const meta = {};
  const metaStr = metaMatch[1];

  const titleMatch = metaStr.match(/title\s*:\s*['"]([^'"]+)['"]/);
  if (titleMatch) meta.title = titleMatch[1];

  const permissionMatch = metaStr.match(/permission\s*:\s*['"]([^'"]+)['"]/);
  if (permissionMatch) meta.permission = permissionMatch[1];

  const keepAliveMatch = metaStr.match(/keepAlive\s*:\s*(true|false)/);
  if (keepAliveMatch) meta.keepAlive = keepAliveMatch[1] === 'true';

  const requiresAdminMatch = metaStr.match(/requiresAdmin\s*:\s*(true|false)/);
  if (requiresAdminMatch) meta.requiresAdmin = requiresAdminMatch[1] === 'true';

  return meta;
}

function pathToMenuName(path) {
  const segments = path.split('/').filter(Boolean);
  const nameMap = {
    'admin': '管理',
    'user': '用户',
    'manage': '管理',
    'list': '列表',
    'add': '新增',
    'edit': '编辑',
    'detail': '详情',
    'auth': '授权',
    'group': '分组',
    'dictmanage': '字典管理',
    'visual': '可视化',
    'large': '大屏'
  };

  return segments.map(s => nameMap[s] || s).join('');
}

function findComponentPath(viewPath) {
  const relativePath = path.relative(VIEWS_PATH, viewPath);
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return normalizedPath.startsWith('..') ? null : `views/${normalizedPath}`;
}

function generateMenuMap() {
  console.log('🔄 开始生成路由-菜单映射...\n');

  const existingConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const existingRouteMenuMap = existingConfig.routeMenuMap || {};
  const existingMenuRouteMap = existingConfig.menuRouteMap || {};

  const routeMenuMap = {};
  const menuRouteMap = {};
  const keepAliveRoutes = [];

  Object.entries(componentMap).forEach(([component, routePath]) => {
    const existing = existingRouteMenuMap[routePath] || {};

    const menuId = existing.menuId || Object.keys(menuRouteMap).length + 1;
    const parentId = existing.parentId || null;

    const meta = {};
    if (routePath === '/') {
      meta.title = '首页';
      meta.permission = 'visual:view';
      meta.keepAlive = false;
      meta.icon = 'HomeOutlined';
    } else if (routePath === '/login') {
      meta.title = '登录页';
      meta.permission = null;
      meta.keepAlive = false;
      meta.icon = null;
      meta.isPublic = true;
    } else if (routePath === '/404') {
      meta.title = '页面不存在';
      meta.permission = null;
      meta.keepAlive = false;
      meta.icon = null;
      meta.isPublic = true;
    } else if (routePath.includes('/admin/')) {
      meta.title = existing.title || pathToMenuName(routePath);
      meta.permission = existing.permission || 'admin:view';
      meta.keepAlive = existing.keepAlive !== undefined ? existing.keepAlive : true;
      meta.icon = existing.icon || 'SettingOutlined';
    } else if (routePath.includes('/user/')) {
      meta.title = existing.title || pathToMenuName(routePath);
      meta.permission = existing.permission || 'users:view';
      meta.keepAlive = existing.keepAlive !== undefined ? existing.keepAlive : true;
      meta.icon = existing.icon || 'UserOutlined';
    } else if (routePath.includes('/visual/')) {
      meta.title = existing.title || pathToMenuName(routePath);
      meta.permission = existing.permission || 'visual:view';
      meta.keepAlive = existing.keepAlive !== undefined ? existing.keepAlive : false;
      meta.icon = existing.icon || 'BarChartOutlined';
    } else {
      meta.title = existing.title || pathToMenuName(routePath);
      meta.permission = existing.permission || null;
      meta.keepAlive = existing.keepAlive !== undefined ? existing.keepAlive : false;
      meta.icon = existing.icon || null;
    }

    meta.component = component;

    routeMenuMap[routePath] = {
      menuId,
      parentId,
      name: meta.title,
      permission: meta.permission,
      keepAlive: meta.keepAlive,
      icon: meta.icon,
      component: meta.component,
      ...(existing.isPublic ? { isPublic: true } : {})
    };

    if (meta.keepAlive) {
      keepAliveRoutes.push(routePath);
    }

    if (menuId) {
      menuRouteMap[menuId.toString()] = {
        path: routePath,
        permission: meta.permission
      };
    }
  });

  const permissionModules = {
    users: ['view', 'create', 'update', 'delete', 'authorize', 'resetpwd'],
    role: ['view', 'create', 'update', 'delete'],
    permission: ['view', 'create', 'update', 'delete'],
    menu: ['view', 'create', 'update', 'delete'],
    dict: ['view', 'create', 'update', 'delete'],
    source: ['view', 'create', 'update', 'delete'],
    visual: ['view', 'large', 'export'],
    admin: ['view', 'manage']
  };

  const newConfig = {
    _comment: "路由 - 菜单映射配置文件",
    _description: "此文件定义前端路由与后端菜单的映射关系，用于动态路由注入和菜单权限控制",
    _generation: "此文件由 build/scripts/generate-menu-map.js 自动生成，如有手动修改请同步更新生成脚本",
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),

    routeMenuMap,
    menuRouteMap,
    permissionModules,
    keepAliveRoutes
  };

  const sortedRouteMenuMap = {};
  Object.keys(routeMenuMap).sort().forEach(key => {
    sortedRouteMenuMap[key] = routeMenuMap[key];
  });
  newConfig.routeMenuMap = sortedRouteMenuMap;

  const sortedMenuRouteMap = {};
  Object.keys(menuRouteMap).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
    sortedMenuRouteMap[key] = menuRouteMap[key];
  });
  newConfig.menuRouteMap = sortedMenuRouteMap;

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');

  console.log('✅ 路由-菜单映射生成完成！\n');
  console.log(`📊 统计信息:`);
  console.log(`   - 路由数量: ${Object.keys(routeMenuMap).length}`);
  console.log(`   - 菜单数量: ${Object.keys(menuRouteMap).length}`);
  console.log(`   - 缓存路由: ${keepAliveRoutes.length}`);
  console.log(`   - 输出文件: ${CONFIG_PATH}\n`);

  return newConfig;
}

function validateMenuMap() {
  console.log('🔍 开始校验路由-菜单映射...\n');

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const { routeMenuMap, menuRouteMap } = config;

  const errors = [];
  const warnings = [];

  Object.entries(routeMenuMap).forEach(([routePath, config]) => {
    if (!config.menuId && !config.isPublic) {
      warnings.push(`路由 ${routePath} 没有关联菜单 ID`);
    }

    if (config.permission && !config.permission.includes(':')) {
      errors.push(`路由 ${routePath} 的权限格式不正确，应为 'module:action' 格式`);
    }
  });

  Object.entries(menuRouteMap).forEach(([menuId, config]) => {
    if (!routeMenuMap[config.path]) {
      errors.push(`菜单 ${menuId} 映射的路由 ${config.path} 不存在`);
    }
  });

  if (errors.length > 0) {
    console.log('❌ 校验失败：');
    errors.forEach(err => console.log(`   - ${err}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('⚠️  校验警告：');
    warnings.forEach(warn => console.log(`   - ${warn}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 校验通过！\n');
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--validate')) {
    validateMenuMap();
  } else if (args.includes('--help')) {
    console.log(`
📖 路由-菜单映射生成脚本

用法:
  node generate-menu-map.js [选项]

选项:
  --validate   只进行校验，不生成文件
  --help      显示帮助信息

示例:
  node generate-menu-map.js
  node generate-menu-map.js --validate
    `);
  } else {
    generateMenuMap();
  }
}

module.exports = { generateMenuMap, validateMenuMap };
