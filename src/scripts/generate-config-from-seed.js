/**
 * 从后端 seeds 数据生成前端配置文件
 *
 * 用法:
 *   node generate-config-from-seed.js
 *
 * 输出:
 *   - src/config/menuMap.json
 *   - src/config/icons.json
 *
 * 注意: 此脚本需要后端 RBAC seed 数据作为输入
 *       需要先运行后端服务获取菜单数据
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8000';
const OUTPUT_DIR = path.join(__dirname, '../src/config');

const MENU_MAP_TEMPLATE = {
  "_comment": "路由 - 菜单映射配置文件",
  "_description": "此文件定义前端路由与后端菜单的映射关系，用于动态路由注入和菜单权限控制",
  "_generation": "此文件由 build/scripts/generate-config-from-seed.js 自动生成，请勿手动修改",
  "version": "2.0.0",
  "lastUpdated": new Date().toISOString(),
  "routeMenuMap": {},
  "menuRouteMap": {},
  "permissionModules": {
    "users": ["view", "create", "update", "delete", "authorize", "resetpwd"],
    "roles": ["view", "create", "update", "delete"],
    "permissions": ["view", "create", "update", "delete"],
    "menus": ["view", "create", "update", "delete"],
    "dicts": ["view", "create", "update", "delete"],
    "sources": ["view", "create", "update", "delete"],
    "visuals": ["view", "large", "export"],
    "admins": ["view", "manage"]
  },
  "keepAliveRoutes": []
};

const ICONS_CONFIG_TEMPLATE = {
  "_comment": "图标映射配置文件",
  "_description": "此文件定义图标名称与 Ant Design Icons 的映射关系，支持动态图标加载",
  "_generation": "此文件由 build/scripts/generate-config-from-seed.js 自动生成，请勿手动修改",
  "version": "1.0.0",
  "lastUpdated": new Date().toISOString(),
  "iconMap": {},
  "categoryGroups": {}
};

const ICON_ALIASES = {
  "HomeOutlined": { category: "navigation", tags: ["home", "首页"] },
  "UserOutlined": { category: "user", tags: ["user", "用户"] },
  "TeamOutlined": { category: "user", tags: ["team", "group", "团队", "分组"] },
  "DashboardOutlined": { category: "navigation", tags: ["dashboard", "admin", "仪表盘", "管理"] },
  "UnorderedListOutlined": { category: "navigation", tags: ["list", "列表"] },
  "PlusOutlined": { category: "action", tags: ["add", "create", "新增", "添加"] },
  "SafetyCertificateOutlined": { category: "user", tags: ["auth", "authorize", "授权", "安全"] },
  "FileTextOutlined": { category: "document", tags: ["detail", "文件", "详情"] },
  "BookOutlined": { category: "data", tags: ["dict", "dictionary", "字典"] },
  "DatabaseOutlined": { category: "data", tags: ["source", "database", "数据源"] },
  "BarChartOutlined": { category: "visualization", tags: ["chart", "visual", "bar", "图表", "可视化"] },
  "PieChartOutlined": { category: "visualization", tags: ["pie", "chart", "饼图"] },
  "LineChartOutlined": { category: "visualization", tags: ["line", "chart", "趋势", "折线图"] },
  "SettingOutlined": { category: "action", tags: ["setting", "设置"] },
  "LogoutOutlined": { category: "action", tags: ["logout", "exit", "退出"] },
  "LoginOutlined": { category: "action", tags: ["login", "登录"] },
  "MenuOutlined": { category: "navigation", tags: ["menu", "菜单"] },
  "CrownOutlined": { category: "user", tags: ["admin", "crown", "管理员"] },
  "StockOutlined": { category: "visualization", tags: ["stock", "医疗"] },
  "MonitorOutlined": { category: "device", tags: ["monitor", "screen", "屏幕"] },
  "QuestionCircleOutlined": { category: "action", tags: ["help", "question", "帮助", "问号"] },
  "BellOutlined": { category: "notification", tags: ["bell", "notification", "通知", "铃声"] },
  "LockOutlined": { category: "security", tags: ["lock", "password", "密码", "锁"] },
  "KeyOutlined": { category: "security", tags: ["key", "密码"] },
  "EyeOutlined": { category: "action", tags: ["eye", "view", "查看"] },
  "EyeInvisibleOutlined": { category: "action", tags: ["eye", "hide", "隐藏"] },
  "FormOutlined": { category: "document", tags: ["form", "表单"] },
  "TableOutlined": { category: "data", tags: ["table", "表格"] },
  "SaveOutlined": { category: "action", tags: ["save", "保存"] },
  "DeleteOutlined": { category: "action", tags: ["delete", "remove", "删除", "移除"] },
  "EditOutlined": { category: "action", tags: ["edit", "修改", "编辑"] },
  "SearchOutlined": { category: "action", tags: ["search", "查找", "搜索"] },
  "ReloadOutlined": { category: "action", tags: ["reload", "refresh", "刷新", "重载"] },
  "LeftOutlined": { category: "navigation", tags: ["left", "back", "左", "返回"] },
  "RightOutlined": { category: "navigation", tags: ["right", "右"] },
  "UpOutlined": { category: "navigation", tags: ["up", "上"] },
  "DownOutlined": { category: "navigation", tags: ["down", "下"] },
  "ArrowLeftOutlined": { category: "navigation", tags: ["arrow", "left", "箭头", "左"] },
  "ArrowRightOutlined": { category: "navigation", tags: ["arrow", "right", "箭头", "右"] },
  "CheckCircleOutlined": { category: "status", tags: ["check", "success", "完成", "成功"] },
  "CloseCircleOutlined": { category: "status", tags: ["close", "error", "错误", "失败"] },
  "ExclamationCircleOutlined": { category: "status", tags: ["warning", "exclamation", "警告"] },
  "InfoCircleOutlined": { category: "status", tags: ["info", "information", "信息"] },
  "LayoutFilled": { category: "layout", tags: ["layout", "布局"] },
  "FundOutlined": { category: "visualization", tags: ["fund", "chart", "资金", "图表"] }
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function request(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Request timeout: ${url}`));
    });
  });
}

function flattenMenuTree(menus, parentId = null, parentPath = '') {
  const result = [];

  for (const menu of menus) {
    const fullPath = menu.path.startsWith('/')
      ? menu.path
      : `${parentPath}/${menu.path}`.replace(/\/+/g, '/');

    result.push({
      ...menu,
      fullPath,
      parentId: menu.parent_id || parentId
    });

    if (menu.children && menu.children.length > 0) {
      result.push(...flattenMenuTree(menu.children, menu.id, fullPath));
    }
  }

  return result;
}

function generateMenuMap(menus) {
  const menuMap = { ...MENU_MAP_TEMPLATE };
  const flatMenus = flattenMenuTree(menus);

  const categoryGroups = {};

  for (const menu of flatMenus) {
    if (!menu.path) continue;

    const routeEntry = {
      menuId: menu.id,
      parentId: menu.parentId,
      name: menu.name,
      permission: menu.permission_code || 'visuals:view',
      keepAlive: ['/', '/admin/home', '/user/manage', '/admin/dictmanage', '/user/list'].includes(menu.path),
      icon: menu.icon,
      component: menu.component
    };

    if (menu.path === '/') {
      routeEntry.keepAlive = false;
    }

    menuMap.routeMenuMap[menu.path] = routeEntry;
    menuMap.menuRouteMap[menu.id.toString()] = {
      path: menu.path,
      permission: menu.permission_code || 'visuals:view'
    };

    if (routeEntry.keepAlive && !menuMap.keepAliveRoutes.includes(menu.path)) {
      menuMap.keepAliveRoutes.push(menu.path);
    }

    if (menu.icon && ICON_ALIASES[menu.icon]) {
      const iconInfo = ICON_ALIASES[menu.icon];
      if (!categoryGroups[iconInfo.category]) {
        categoryGroups[iconInfo.category] = [];
      }
      if (!categoryGroups[iconInfo.category].includes(menu.icon)) {
        categoryGroups[iconInfo.category].push(menu.icon);
      }
    }
  }

  menuMap._iconCategories = categoryGroups;

  return menuMap;
}

function generateIconsConfig() {
  const iconsConfig = { ...ICONS_CONFIG_TEMPLATE };

  for (const [iconName, info] of Object.entries(ICON_ALIASES)) {
    iconsConfig.iconMap[iconName] = {
      component: iconName,
      category: info.category,
      tags: info.tags
    };

    if (!iconsConfig.categoryGroups[info.category]) {
      iconsConfig.categoryGroups[info.category] = [];
    }
    iconsConfig.categoryGroups[info.category].push(iconName);
  }

  return iconsConfig;
}

async function fetchMenusFromBackend() {
  console.log(`从 ${API_BASE_URL} 获取菜单数据...`);

  try {
    const token = process.env.API_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await request(`${API_BASE_URL}/api/menus/tree`, { headers });

    if (res.code === 200) {
      console.log(`获取到 ${res.data.length} 个顶级菜单`);
      return res.data;
    } else {
      throw new Error(`API 返回错误: ${res.message}`);
    }
  } catch (error) {
    console.error('获取菜单失败:', error.message);
    console.log('将使用默认配置...');
    return null;
  }
}

async function main() {
  console.log('开始生成前端配置文件...\n');

  ensureDir(OUTPUT_DIR);

  const menus = await fetchMenusFromBackend();

  console.log('\n生成菜单映射配置...');
  const menuMap = menus ? generateMenuMap(menus) : { ...MENU_MAP_TEMPLATE };
  const menuMapPath = path.join(OUTPUT_DIR, 'menuMap.json');
  fs.writeFileSync(menuMapPath, JSON.stringify(menuMap, null, 2));
  console.log(`已生成: ${menuMapPath}`);

  console.log('\n生成图标映射配置...');
  const iconsConfig = generateIconsConfig();
  const iconsConfigPath = path.join(OUTPUT_DIR, 'icons.json');
  fs.writeFileSync(iconsConfigPath, JSON.stringify(iconsConfig, null, 2));
  console.log(`已生成: ${iconsConfigPath}`);

  console.log('\n✅ 配置文件生成完成!');
  console.log('\n提示:');
  console.log('  - 如需重新生成，请运行: node build/scripts/generate-config-from-seed.js');
  console.log('  - 确保后端服务已启动并可访问');
  console.log('  - 可设置 API_BASE_URL 环境变量指定后端地址');
}

main().catch(console.error);
