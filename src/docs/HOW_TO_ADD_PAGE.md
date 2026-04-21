# 如何新增一个带权限的功能页

本文档介绍如何在医疗数据分析系统中新增一个带权限的功能页面。

## 流程概览

```
后端: 创建菜单 + 权限 → 前端: 创建页面 + 配置映射 → 完成
```

## 步骤详解

### 1. 后端：创建权限（可选）

如果需要新的权限码，先在 `users/security_models.py` 的 `PERMISSION_CATEGORIES` 中添加：

```python
PERMISSION_CATEGORIES = {
    # ... 其他模块
    "新模块": ["new_module:view", "new_module:create", "new_module:update", "new_module:delete"],
}
```

### 2. 后端：创建菜单

通过 API 创建菜单：

```bash
POST /api/menus
{
  "name": "新功能",
  "path": "/new/feature",
  "component": "views/new/NewFeature.vue",
  "icon": "PlusOutlined",
  "order": 10,
  "parent_id": 3,  # 父菜单ID
  "permission_code": "new_module:view",
  "is_visible": true
}
```

或在数据库中直接插入 `menus` 表。

### 3. 前端：创建页面组件

创建 Vue 组件：`src/views/new/NewFeature.vue`

```vue
<template>
  <div class="new-feature">
    <h1>新功能页面</h1>
  </div>
</template>

<script setup>
// 页面逻辑
</script>
```

### 4. 前端：配置路由-菜单映射

编辑 `src/config/menuMap.json`：

```json
{
  "routeMenuMap": {
    "/new/feature": {
      "menuId": 100,
      "parentId": 3,
      "name": "新功能",
      "permission": "new_module:view",
      "keepAlive": true,
      "icon": "PlusOutlined",
      "component": "views/new/NewFeature.vue"
    }
  }
}
```

### 5. 注册组件（可选）

如果组件需要懒加载，在 `dynamic-injector.js` 的 `componentMap` 中添加：

```javascript
const componentMap = {
  // ... 其他组件
  'views/new/NewFeature.vue': () => import('../views/new/NewFeature.vue'),
};
```

### 6. 运行生成脚本（可选）

```bash
cd frontend
node build/scripts/generate-menu-map.js
```

### 7. 前端使用权限指令

在页面中使用 `v-permission` 指令控制元素显示：

```vue
<template>
  <div>
    <h1>新功能页面</h1>

    <!-- 需要特定权限才显示 -->
    <button v-permission="'new_module:create'">新建</button>
    <button v-permission="'new_module:delete'">删除</button>

    <!-- 禁用模式 -->
    <button v-permission.disable="'new_module:update'">编辑</button>
  </div>
</template>
```

## 权限码规范

```
格式: <module>:<action>

示例:
- users:view      (查看用户)
- users:create    (创建用户)
- users:update    (修改用户)
- users:delete    (删除用户)
- users:authorize (授权用户)
- users:resetpwd  (重置密码)

- dict:view       (查看字典)
- dict:create     (创建字典)
- dict:update     (修改字典)
- dict:delete     (删除字典)

- source:view     (查看数据源)
- source:create   (创建数据源)
- source:update   (修改数据源)
- source:delete   (删除数据源)

- admin:view      (系统查看)
- admin:manage    (系统管理)
```

## 菜单配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 菜单名称 |
| `path` | string | 否 | 路由路径（顶级菜单可为空） |
| `component` | string | 否 | Vue 组件路径 |
| `icon` | string | 否 | Ant Design 图标名 |
| `order` | number | 否 | 排序，越小越靠前 |
| `parent_id` | number | 否 | 父菜单 ID |
| `permission_code` | string | 否 | 关联的权限码 |
| `is_visible` | boolean | 否 | 是否显示 |

## 路由元数据标准

```javascript
const route = {
  path: '/new/feature',
  name: 'NewFeature',
  component: () => import('../views/new/NewFeature.vue'),
  meta: {
    title: '新功能',           // 页面标题
    menuId: 100,             // 关联菜单ID
    permission: 'new_module:view',  // 权限码
    keepAlive: true,          // 是否缓存
    icon: 'PlusOutlined'     // 图标
  }
}
```

## 常见问题

### Q: 为什么菜单不显示？

1. 检查用户是否有所需权限
2. 检查菜单的 `is_visible` 是否为 `true`
3. 检查 `permission_code` 是否正确

### Q: 为什么路由跳转404？

1. 检查 `menuMap.json` 中是否配置了该路径
2. 检查组件路径是否正确
3. 检查路由是否正确注册

### Q: 如何让页面需要多个权限？

```vue
<!-- 任一权限即可显示 -->
<button v-permission-any="['new_module:create', 'admin:manage']">创建</button>

<!-- 所有权限都需要 -->
<button v-permission-all="['new_module:view', 'new_module:update']">编辑</button>
```

## 自动生成脚本

每次修改后可以运行：

```bash
node build/scripts/generate-menu-map.js --validate
```

这会校验所有路由是否有对应的菜单配置。
