<template>
  <div class="menu-manage-container">
    <!-- 左侧菜单 -->
    <SideMenu
      :isExpanded="isExpanded"
      :title="'菜单管理'"
      :menuItems="menuItems"
      :activeKey="activeMenuItem"
      :showAddButton="true"
      :addButtonText="'新增菜单'"
      @toggle-menu="handleToggleMenu"
      @add="handleAddMenu"
      @menu-item-click="handleMenuItemClick"
      @item-action="handleItemAction"
      @context-menu-action="handleContextMenuAction"
    />
    
    <div class="main-content" :class="{ 'main-content-collapsed': !isExpanded }">
      <!-- 菜单树管理 -->
      <div v-if="activeMenuItem === 'menu-tree'">
        <div class="header">
          <h2>菜单管理</h2>
          <a-button type="primary" @click="handleAddMenu">
            <template #icon><PlusOutlined /></template>
            新增菜单
          </a-button>
        </div>

        <a-card class="menu-card">
          <a-tree
            v-if="menuTree.length > 0"
            :tree-data="buildTreeData()"
            :field-names="{ children: 'children', title: 'name', key: 'id' }"
            :expanded-keys="expandedKeys"
            @expand="onExpand"
            block-node
          >
            <template #title="{ data }">
              <div class="tree-node">
                <span class="node-name">{{ data.name }}</span>
                <span class="node-actions">
                  <a-button type="link" size="small" @click.stop="handleEditMenu(data)">
                    <EditOutlined />
                  </a-button>
                  <a-popconfirm
                    title="确定删除此菜单及其子菜单吗？"
                    @confirm="handleDeleteMenu(data.id)"
                  >
                    <a-button type="link" size="small" danger>
                      <DeleteOutlined />
                    </a-button>
                  </a-popconfirm>
                </span>
              </div>
            </template>
          </a-tree>
          <a-empty v-else description="暂无菜单数据" />
        </a-card>
      </div>

      <!-- 权限管理 -->
      <div v-else-if="activeMenuItem === 'permissions'">
        <PermissionList />
      </div>
    </div>

    <a-modal
      v-model:open="menuModalVisible"
      :title="isEdit ? '编辑菜单' : '新增菜单'"
      :width="600"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        ref="menuFormRef"
        :model="menuForm"
        :rules="menuRules"
        layout="vertical"
      >
        <a-form-item label="菜单名称" name="name">
          <a-input v-model:value="menuForm.name" placeholder="请输入菜单名称" />
        </a-form-item>

        <a-form-item label="父级菜单" name="parent_id">
          <a-select
            v-model:value="menuForm.parent_id"
            placeholder="选择父级菜单（不选则为顶级菜单）"
            :options="parentMenuOptions"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="菜单路径" name="path">
          <a-input v-model:value="menuForm.path" placeholder="请输入菜单路径" />
        </a-form-item>

        <a-form-item label="组件路径" name="component">
          <a-input v-model:value="menuForm.component" placeholder="请输入组件路径" />
        </a-form-item>

        <a-form-item label="菜单图标" name="icon">
          <a-select v-model:value="menuForm.icon" placeholder="选择图标" allow-clear show-search>
            <a-select-option v-for="icon in iconList" :key="icon" :value="icon">
              <component :is="getIcon(icon)" /> {{ icon }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="排序号" name="order">
          <a-input-number v-model:value="menuForm.order" :min="0" style="width: 100%" />
        </a-form-item>

        <a-form-item label="权限代码" name="permission_code">
          <a-select
            v-model:value="menuForm.permission_code"
            placeholder="选择权限代码"
            :options="permissionOptions"
            allow-clear
            show-search
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="是否启用" name="is_active">
              <a-switch v-model:checked="menuForm.is_active" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="是否缓存" name="is_cached">
              <a-switch v-model:checked="menuForm.is_cached" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, MenuOutlined, LockOutlined } from '@ant-design/icons-vue';
import * as antIcons from '@ant-design/icons-vue';
import menuAPI from '../../api/menu';
import { useErrorHandler } from '../../composables/useErrorHandler';
import SideMenu from '../../components/common/SideMenu.vue';
import PermissionList from './PermissionList.vue';

const { handleAsync, handleError } = useErrorHandler({ showNotification: true });

const isExpanded = ref(true);
const activeMenuItem = ref('menu-tree');
const menuTree = ref([]);
const expandedKeys = ref([]);
const menuModalVisible = ref(false);
const isEdit = ref(false);
const menuFormRef = ref(null);
const permissionOptions = ref([]);

const menuForm = reactive({
  name: '',
  path: '',
  component: '',
  icon: '',
  order: 0,
  parent_id: null,
  permission_code: null,
  is_active: true,
  is_cached: false
});

const menuRules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  path: [{ required: true, message: '请输入菜单路径', trigger: 'blur' }],
  order: [{ required: true, message: '请输入排序号', trigger: 'blur' }]
};

const parentMenuOptions = computed(() => {
  const options = [];
  const addOptions = (menus, level = 0) => {
    menus.forEach(menu => {
      if (!isEdit.value || menu.id !== menuForm.id) {
        options.push({
          label: '  '.repeat(level) + menu.name,
          value: menu.id
        });
        if (menu.children && menu.children.length > 0) {
          addOptions(menu.children, level + 1);
        }
      }
    });
  };
  addOptions(menuTree.value);
  return options;
});

const iconList = computed(() => {
  return Object.keys(antIcons).filter(key => key.endsWith('Outlined'));
});

const getIcon = (iconName) => {
  if (!iconName) return null;
  const icons = antIcons;
  const icon = icons[iconName];
  if (icon) return icon;

  const PascalCaseName = iconName.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
  return icons[PascalCaseName + 'Outlined'] || icons[PascalCaseName];
};

// 左侧菜单配置
const menuItems = computed(() => [
  {
    key: 'menu-tree',
    label: '菜单树管理',
    title: '菜单树管理',
    icon: MenuOutlined,
    actions: [
      {
        key: 'add',
        icon: PlusOutlined,
        title: '新增菜单'
      }
    ],
    contextActions: [
      {
        key: 'add',
        label: '新增菜单',
        icon: PlusOutlined
      },
      {
        key: 'refresh',
        label: '刷新菜单',
        icon: SettingOutlined
      }
    ]
  },
  {
    key: 'permissions',
    label: '权限管理',
    title: '权限管理',
    icon: LockOutlined,
    actions: [],
    contextActions: [
      {
        key: 'refresh',
        label: '刷新权限',
        icon: SettingOutlined
      }
    ]
  }
]);

const buildTreeData = () => {
  return menuTree.value;
};

const loadMenuTree = async () => {
  const result = await handleAsync(
    () => menuAPI.getFullMenuTree(),
    {
      errorMessage: '加载菜单树失败',
      showSuccess: false
    }
  );

  // 处理两种数据格式：
  // 1. handleAsync 返回 { success, data, error }，其中 data 是 API 完整响应
  // 2. API 完整响应格式: { success, code, message, data: { menus: [...] } }
  let apiData = result;
  if (result.data && result.data.success !== undefined) {
    apiData = result.data;
  }
  
  if (apiData.success && apiData.code === 200) {
    menuTree.value = apiData.data?.menus || [];
    expandedKeys.value = menuTree.value.map(m => m.id);
    
    console.log('[MenuManage] 菜单树加载成功:', menuTree.value.length, '个顶级菜单');
  } else {
    console.error('[MenuManage] API 返回失败:', apiData.message);
  }
};

const loadPermissions = async () => {
  const result = await handleAsync(
    () => menuAPI.getAllPermissions(),
    {
      showSuccess: false,
      showError: false
    }
  );
  
  if (result.success) {
    permissionOptions.value = (result.data || []).map(p => ({
      label: `${p.code} - ${p.name}`,
      value: p.code
    }));
  }
};

const onExpand = (keys) => {
  expandedKeys.value = keys;
};

const handleToggleMenu = () => {
  isExpanded.value = !isExpanded.value;
};

const handleMenuItemClick = (item) => {
  activeMenuItem.value = item.key;
  if (item.key === 'menu-tree') {
    loadMenuTree();
  } else if (item.key === 'permissions') {
    loadPermissions();
  }
};

const handleItemAction = (item, action) => {
  if (action.key === 'add') {
    handleAddMenu();
  }
};

const handleContextMenuAction = (item, action) => {
  if (action.key === 'add') {
    handleAddMenu();
  } else if (action.key === 'refresh') {
    if (item.key === 'menu-tree') {
      loadMenuTree();
    } else if (item.key === 'permissions') {
      loadPermissions();
    }
  }
};

const handleAddMenu = () => {
  isEdit.value = false;
  resetForm();
  menuModalVisible.value = true;
};

const handleEditMenu = (menu) => {
  isEdit.value = true;
  menuForm.id = menu.id;
  menuForm.name = menu.name;
  menuForm.path = menu.path || '';
  menuForm.component = menu.component || '';
  menuForm.icon = menu.icon || '';
  menuForm.order = menu.order || 0;
  menuForm.parent_id = menu.parent_id;
  menuForm.permission_code = menu.permission_code || menu.permission || null;
  menuForm.is_active = menu.is_active ?? menu.is_visible ?? true;
  menuForm.is_cached = menu.is_cached ?? false;
  menuModalVisible.value = true;
};

const handleSubmit = async () => {
  try {
    await menuFormRef.value?.validate();
    
    const result = await handleAsync(
      async () => {
        if (isEdit.value) {
          return await menuAPI.updateMenu(menuForm.id, menuForm);
        } else {
          return await menuAPI.createMenu(menuForm);
        }
      },
      {
        successMessage: isEdit.value ? '菜单更新成功' : '菜单创建成功'
      }
    );

    if (result.success) {
      menuModalVisible.value = false;
      resetForm();
      await loadMenuTree();
      // 通知系统刷新菜单
      window.dispatchEvent(new CustomEvent('menuUpdated'));
    }
  } catch (error) {
    handleError(error);
  }
};

const handleDeleteMenu = async (menuId) => {
  const result = await handleAsync(
    () => menuAPI.deleteMenu(menuId),
    {
      successMessage: '菜单删除成功',
      errorMessage: '删除失败'
    }
  );

  if (result.success) {
    await loadMenuTree();
    // 通知系统刷新菜单
    window.dispatchEvent(new CustomEvent('menuUpdated'));
  }
};

const handleCancel = () => {
  menuModalVisible.value = false;
  resetForm();
};

const resetForm = () => {
  menuForm.id = null;
  menuForm.name = '';
  menuForm.path = '';
  menuForm.component = '';
  menuForm.icon = '';
  menuForm.order = 0;
  menuForm.parent_id = null;
  menuForm.permission_code = null;
  menuForm.is_active = true;
  menuForm.is_cached = false;
  menuFormRef.value?.resetFields();
};

onMounted(async () => {
  await loadMenuTree();
  await loadPermissions();
});
</script>

<style scoped>
.menu-manage-container {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: 240px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #f0f2f5;
  min-height: 100vh;
}

.main-content-collapsed {
  margin-left: 60px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h2 {
  margin: 0;
  color: #333;
}

.menu-card {
  min-height: 600px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.node-name {
  flex: 1;
}

.node-actions {
  display: none;
}

.tree-node:hover .node-actions {
  display: flex;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding: 16px;
  }
}
</style>

<style>
/* 图标选择器样式 */
.icon-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-select-option svg {
  font-size: 18px;
}
</style>
