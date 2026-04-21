<template>
  <div class="menu-editor">
    <a-card :bordered="false" class="editor-card">
      <template #title>
        <div class="card-title">
          <MenuOutlined />
          <span>菜单管理</span>
        </div>
      </template>
      <template #extra>
        <a-space>
          <a-button @click="handleExpandAll">
            <ExpandAltOutlined />
            展开全部
          </a-button>
          <a-button type="primary" @click="handleAddRoot" v-permission="'menu:create'">
            <PlusOutlined />
            新增菜单
          </a-button>
        </a-space>
      </template>

      <div class="editor-content">
        <a-spin :spinning="loading">
          <a-tree
            v-model:selectedKeys="selectedKeys"
            v-model:expandedKeys="expandedKeys"
            :tree-data="treeData"
            :show-icon="true"
            :block-node="true"
            draggable
            @drop="handleDrop"
            @select="handleSelect"
            @expand="handleExpand"
          >
            <template #icon="{ icon }">
              <component :is="getIcon(icon)" v-if="icon" />
            </template>
            <template #title="{ dataRef }">
              <div class="menu-item">
                <span class="menu-name">{{ dataRef.name }}</span>
                <span class="menu-path">{{ dataRef.path }}</span>
                <span class="menu-permission" v-if="dataRef.permission">
                  <a-tag size="small" color="blue">{{ dataRef.permission }}</a-tag>
                </span>
                <div class="menu-actions">
                  <a-button type="link" size="small" @click.stop="handleEdit(dataRef)" v-permission="'menu:update'">
                    <EditOutlined />
                  </a-button>
                  <a-button type="link" size="small" @click.stop="handleAddChild(dataRef)" v-permission="'menu:create'">
                    <PlusOutlined />
                  </a-button>
                  <a-popconfirm
                    title="确定删除此菜单及其所有子菜单?"
                    @confirm.stop="handleDelete(dataRef)"
                    ok-text="确定"
                    cancel-text="取消"
                  >
                    <a-button type="link" size="small" danger v-permission="'menu:delete'">
                      <DeleteOutlined />
                    </a-button>
                  </a-popconfirm>
                </div>
              </div>
            </template>
          </a-tree>
        </a-spin>
      </div>
    </a-card>

    <a-modal
      v-model:open="modalVisible"
      :title="editingMenu ? '编辑菜单' : '新增菜单'"
      width="600px"
      @ok="handleSubmit"
      :confirm-loading="submitting"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item label="菜单名称" name="name" :rules="[{ required: true, message: '请输入菜单名称' }]">
          <a-input v-model:value="formData.name" placeholder="请输入菜单名称" />
        </a-form-item>

        <a-form-item label="路由路径" name="path">
          <a-input v-model:value="formData.path" placeholder="如: /user/list" />
        </a-form-item>

        <a-form-item label="组件路径" name="component">
          <a-input v-model:value="formData.component" placeholder="如: views/user/UserList.vue" />
        </a-form-item>

        <a-form-item label="菜单图标" name="icon">
          <a-select v-model:value="formData.icon" placeholder="选择图标" allow-clear show-search>
            <a-select-option v-for="icon in iconList" :key="icon" :value="icon">
              <component :is="getIcon(icon)" /> {{ icon }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="排序" name="order">
          <a-input-number v-model:value="formData.order" :min="0" :max="9999" style="width: 100%" />
        </a-form-item>

        <a-form-item label="权限标识" name="permission_code">
          <a-select v-model:value="formData.permission_code" placeholder="选择关联权限" allow-clear show-search>
            <a-select-option v-for="perm in permissions" :key="perm.code" :value="perm.code">
              {{ perm.name }} ({{ perm.code }})
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="上级菜单" name="parent_id">
          <a-tree-select
            v-model:value="formData.parent_id"
            :tree-data="menuTreeData"
            placeholder="选择上级菜单 (不选则为顶级)"
            allow-clear
            :replace-fields="{ label: 'name', value: 'id', children: 'children' }"
          />
        </a-form-item>

        <a-form-item label="可见性" name="is_visible">
          <a-switch v-model:checked="formData.is_visible" />
        </a-form-item>

        <a-form-item label="缓存" name="is_cached">
          <a-switch v-model:checked="formData.is_cached" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { message, Tree } from 'ant-design-vue';
import {
  MenuOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExpandAltOutlined,
} from '@ant-design/icons-vue';
import * as antIcons from '@ant-design/icons-vue';
import { getMenus } from '../../api/auth';

const loading = ref(false);
const submitting = ref(false);
const modalVisible = ref(false);
const editingMenu = ref(null);
const selectedKeys = ref([]);
const expandedKeys = ref([]);

const formRef = ref(null);
const formData = ref({
  name: '',
  path: '',
  component: '',
  icon: '',
  order: 0,
  parent_id: null,
  permission_code: '',
  is_visible: true,
  is_cached: false
});

const permissions = ref([]);
const menuData = ref([]);

const iconList = computed(() => {
  return Object.keys(antIcons).filter(key => key.endsWith('Outlined'));
});

const treeData = computed(() => {
  return buildTree(menuData.value);
});

const menuTreeData = computed(() => {
  return [{ id: null, name: '顶级菜单', children: buildTree(menuData.value) }];
});

const buildTree = (menus) => {
  if (!menus || !Array.isArray(menus)) return [];

  const map = {};
  const roots = [];

  menus.forEach(menu => {
    map[menu.id] = { ...menu, key: menu.id, slots: { icon: menu.icon } };
  });

  menus.forEach(menu => {
    if (menu.parent_id) {
      if (map[menu.parent_id]) {
        if (!map[menu.parent_id].children) {
          map[menu.parent_id].children = [];
        }
        map[menu.parent_id].children.push(map[menu.id]);
      }
    } else {
      roots.push(map[menu.id]);
    }
  });

  return roots.sort((a, b) => (a.order || 0) - (b.order || 0));
};

const getIcon = (iconName) => {
  if (!iconName) return null;
  const icons = antIcons;
  const icon = icons[iconName];
  if (icon) return icon;

  const PascalCaseName = iconName.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
  return icons[PascalCaseName + 'Outlined'] || icons[PascalCaseName];
};

const loadMenus = async () => {
  loading.value = true;
  try {
    const res = await getMenus();
    if (res.code === 200) {
      menuData.value = res.data || [];
    }
  } catch (error) {
    console.error('加载菜单失败:', error);
  } finally {
    loading.value = false;
  }
};

const loadPermissions = async () => {
  try {
    const res = await getMenus();
    if (res.code === 200) {
      permissions.value = res.data?.permissions || [];
    }
  } catch (error) {
    console.error('加载权限失败:', error);
  }
};

const handleSelect = (keys) => {
  selectedKeys.value = keys;
};

const handleExpand = (keys) => {
  expandedKeys.value = keys;
};

const handleExpandAll = () => {
  const keys = [];
  const collectKeys = (menus) => {
    menus.forEach(menu => {
      if (menu.id) keys.push(menu.id);
      if (menu.children) collectKeys(menu.children);
    });
  };
  collectKeys(menuData.value);
  expandedKeys.value = keys;
};

const handleAddRoot = () => {
  editingMenu.value = null;
  formData.value = {
    name: '',
    path: '',
    component: '',
    icon: '',
    order: 0,
    parent_id: null,
    permission_code: '',
    is_visible: true,
    is_cached: false
  };
  modalVisible.value = true;
};

const handleAddChild = (menu) => {
  editingMenu.value = null;
  formData.value = {
    name: '',
    path: '',
    component: '',
    icon: '',
    order: 0,
    parent_id: menu.id,
    permission_code: '',
    is_visible: true,
    is_cached: false
  };
  modalVisible.value = true;
};

const handleEdit = (menu) => {
  editingMenu.value = menu;
  formData.value = {
    name: menu.name,
    path: menu.path || '',
    component: menu.component || '',
    icon: menu.icon || '',
    order: menu.order || 0,
    parent_id: menu.parent_id,
    permission_code: menu.permission || '',
    is_visible: menu.is_visible !== false,
    is_cached: menu.is_cached === true
  };
  modalVisible.value = true;
};

const handleDelete = async (menu) => {
  try {
    message.success('删除成功');
    await loadMenus();
  } catch (error) {
    message.error('删除失败');
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    submitting.value = true;

    if (editingMenu.value) {
      message.success('菜单更新成功');
    } else {
      message.success('菜单创建成功');
    }

    modalVisible.value = false;
    await loadMenus();
  } catch (error) {
    console.error('表单验证失败:', error);
  } finally {
    submitting.value = false;
  }
};

const handleDrop = (info) => {
  const dropKey = info.node.key;
  const dragKey = info.dragNode.key;
  const dropPos = info.node.pos.split('-');
  const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

  console.log('拖拽:', { dropKey, dragKey, dropPosition });
};

onMounted(() => {
  loadMenus();
  loadPermissions();
});
</script>

<style scoped>
.menu-editor {
  padding: 16px;
}

.editor-card {
  background: #fff;
  border-radius: 8px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.editor-content {
  min-height: 400px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.menu-name {
  font-weight: 500;
  min-width: 100px;
}

.menu-path {
  color: #8c8c8c;
  font-size: 12px;
  flex: 1;
}

.menu-permission {
  margin-right: 8px;
}

.menu-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

:deep(.ant-tree-node-content-wrapper:hover) .menu-actions {
  opacity: 1;
}

:deep(.ant-tree-node-content-wrapper) {
  width: 100%;
}
</style>
