<template>
  <div class="menu-tree-manage">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <a-input-search
          v-model:value="searchKey"
          placeholder="搜索菜单名称或路径..."
          style="width: 320px;"
          @search="handleSearch"
        />
      </div>
      <div class="header-right">
        <a-button @click="handleRefresh" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button 
          type="primary" 
          @click="handleBatchEdit"
          :disabled="selectedKeys.length === 0"
        >
          <template #icon><EditOutlined /></template>
          批量编辑
        </a-button>
        <a-button type="primary" @click="handleAddMenu">
          <template #icon><PlusOutlined /></template>
          新增菜单
        </a-button>
      </div>
    </div>

    <!-- 菜单树展示区 -->
    <a-card class="menu-tree-card" :loading="loading && menuTree.length === 0">
      <template v-if="menuTree.length > 0">
        <a-tree
          :tree-data="buildTreeData()"
          :field-names="{ children: 'children', title: 'title', key: 'key' }"
          :expanded-keys="expandedKeys"
          :selected-keys="selectedKeys"
          :checked-keys="checkedKeys"
          :default-expand-all="true"
          @expand="onExpand"
          @select="onSelect"
          @check="onCheck"
          checkable
          block-node
        >
          <template #title="{ data }">
            <div v-if="data" class="tree-node" :class="{ 'is-selected': data.id && selectedKeys.includes(data.id) }">
              <div class="node-info">
                <span class="node-icon" v-if="data.is_folder">
                  <FolderOutlined />
                </span>
                <span class="node-name">{{ data.name || '' }}</span>
                <div class="node-tags">
                  <span class="node-path" v-if="data.path">{{ data.path }}</span>
                  <a-tag 
                    :color="getPositionColor(data.position) " 
                    size="small"
                  >
                    {{ getPositionText(data.position) }}
                  </a-tag>
                  <a-tag 
                    v-if="data.is_folder"
                    color="purple"
                    size="small"
                  >
                    文件夹
                  </a-tag>
                  <a-tag 
                    :color="data.is_active ? 'green' : 'default' " 
                    size="small"
                  >
                    {{ data.is_active ? '启用' : '禁用' }}
                  </a-tag>
                </div>
              </div>
              
              <div class="node-actions">
                <a-tooltip :title="data.is_active ? '点击禁用' : '点击启用'">
                  <a-switch
                    v-model:checked="data.is_active"
                    size="small"
                    @change="(checked) => handleToggleMenu(data, checked)"
                  />
                </a-tooltip>
                
                <a-tooltip title="添加子菜单">
                  <a-button 
                    type="link" 
                    size="small" 
                    @click="handleAddChildMenu(data)"
                  >
                    <PlusCircleOutlined />
                  </a-button>
                </a-tooltip>
                
                <a-tooltip title="编辑">
                  <a-button 
                    type="link" 
                    size="small" 
                    @click="handleEditMenu(data)"
                  >
                    <EditOutlined />
                  </a-button>
                </a-tooltip>
                
                <a-popconfirm
                  v-if="data.id"
                  title="确定删除此菜单及其所有子菜单吗？此操作不可恢复！"
                  @confirm="handleDeleteMenu(data.id)"
                  ok-text="删除"
                  cancel-text="取消"
                  ok-type="danger"
                >
                  <a-tooltip title="删除">
                    <a-button 
                      type="link" 
                      size="small" 
                      danger
                    >
                      <DeleteOutlined />
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </div>
            </div>
          </template>
        </a-tree>
      </template>

      <a-empty v-else description="暂无菜单数据，点击右上角新增菜单">
        <a-button type="primary" @click="handleAddMenu">
          立即创建
        </a-button>
      </a-empty>
    </a-card>

    <!-- 新增/编辑菜单弹窗 -->
    <a-modal
      v-model:open="menuModalVisible"
      :title="isEdit ? '✏️ 编辑菜单' : '➕ 新增菜单'"
      :width="650"
      :destroy-on-close="true"
      @ok="handleSubmit"
      @cancel="handleCancel"
      ok-text="保存"
      cancel-text="取消"
    >
      <a-form
        ref="menuFormRef"
        :model="menuForm"
        :rules="menuRules"
        layout="vertical"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="菜单名称" name="name">
              <a-input 
                v-model:value="menuForm.name" 
                placeholder="请输入菜单名称"
                :maxlength="50"
                show-count
              />
            </a-form-item>
          </a-col>
          
          <a-col :span="12">
            <a-form-item label="排序号" name="order">
              <a-input-number 
                v-model:value="menuForm.order" 
                :min="0" 
                :max="9999"
                style="width: 100%" 
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="父级菜单" name="parent_id">
          <a-tree-select
            v-model:value="menuForm.parent_id"
            :tree-data="parentMenuOptions"
            :field-names="{ label: 'title', value: 'value', children: 'children' }"
            placeholder="选择父级菜单（不选则为顶级菜单）"
            allow-clear
            tree-default-expand-all
            :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="路由路径" name="path">
              <a-input 
                v-model:value="menuForm.path" 
                placeholder="/example/path"
              />
            </a-form-item>
          </a-col>
          
          <a-col :span="12">
            <a-form-item label="组件路径" name="component">
              <a-input 
                v-model:value="menuForm.component" 
                placeholder="views/example/Index"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="图标" name="icon">
              <a-input 
                v-model:value="menuForm.icon" 
                placeholder="MenuOutlined"
              />
            </a-form-item>
          </a-col>
          
          <a-col :span="8">
            <a-form-item label="权限代码" name="permission_code">
              <a-select
                v-model:value="menuForm.permission_code"
                placeholder="选择权限"
                :options="permissionOptions"
                allow-clear
                show-search
                :filter-option="filterOption"
              />
            </a-form-item>
          </a-col>
          
          <a-col :span="8">
            <a-form-item label="菜单位置">
              <a-select 
                v-model:value="menuForm.position" 
                :options="availablePositionOptions"
                placeholder="选择菜单位置"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="菜单状态">
          <a-row :gutter="16">
            <a-col :span="8">
              <div class="status-item">
                <a-switch 
                  v-model:checked="menuForm.is_folder" 
                />
                <span class="status-label">
                  <strong>文件夹</strong>
                  <small>是否是文件夹（目录）</small>
                </span>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="status-item">
                <a-switch 
                  v-model:checked="menuForm.is_active" 
                />
                <span class="status-label">
                  <strong>启用</strong>
                  <small>是否启用菜单</small>
                </span>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="status-item">
                <a-switch 
                  v-model:checked="menuForm.is_cached" 
                />
                <span class="status-label">
                  <strong>缓存</strong>
                  <small>页面是否保持缓存状态</small>
                </span>
              </div>
            </a-col>
          </a-row>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量编辑菜单弹窗 -->
    <a-modal
      v-model:open="batchEditModalVisible"
      title="📋 批量编辑菜单"
      :width="650"
      :destroy-on-close="true"
      @ok="handleBatchSubmit"
      @cancel="handleBatchCancel"
      ok-text="保存"
      cancel-text="取消"
    >
      <a-form
        ref="batchEditFormRef"
        :model="batchEditForm"
        layout="vertical"
      >
        <a-form-item label="批量修改选项">
          <p class="batch-info">已选择 {{ selectedKeys.length }} 个菜单，将对所有选中的菜单应用以下修改：</p>
          
          <a-divider orientation="left">状态设置</a-divider>
          
          <a-row :gutter="16">
            <a-col :span="8">
              <div class="status-item">
                <a-switch 
                  v-model:checked="batchEditForm.is_active" 
                  :checked="batchEditForm.is_active !== null ? batchEditForm.is_active : undefined"
                />
                <span class="status-label">
                  <strong>启用</strong>
                  <small>是否启用菜单</small>
                </span>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="status-item">
                <a-switch 
                  v-model:checked="batchEditForm.is_folder" 
                  :checked="batchEditForm.is_folder !== null ? batchEditForm.is_folder : undefined"
                />
                <span class="status-label">
                  <strong>文件夹</strong>
                  <small>是否是文件夹（目录）</small>
                </span>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="status-item">
                <a-switch 
                  v-model:checked="batchEditForm.is_cached" 
                  :checked="batchEditForm.is_cached !== null ? batchEditForm.is_cached : undefined"
                />
                <span class="status-label">
                  <strong>缓存</strong>
                  <small>页面是否保持缓存状态</small>
                </span>
              </div>
            </a-col>
          </a-row>
          
          <a-divider orientation="left">属性设置</a-divider>
          
          <a-form-item label="父级菜单">
            <a-tree-select
              v-model:value="batchEditForm.parent_id"
              :tree-data="parentMenuOptions"
              :field-names="{ label: 'title', value: 'value', children: 'children' }"
              placeholder="选择父级菜单（保持不变请留空）"
              allow-clear
              tree-default-expand-all
              :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
            />
          </a-form-item>
          
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="菜单位置">
                <a-select 
                  v-model:value="batchEditForm.position" 
                  :options="availablePositionOptions"
                  placeholder="选择菜单位置（保持不变请留空）"
                  allow-clear
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="权限代码">
                <a-select
                  v-model:value="batchEditForm.permission_code"
                  placeholder="选择权限（保持不变请留空）"
                  :options="permissionOptions"
                  allow-clear
                  show-search
                  :filter-option="filterOption"
                />
              </a-form-item>
            </a-col>
          </a-row>
          
          <div class="batch-tip">
            <a-alert
              type="info"
              message="提示"
              description="只修改选中的选项，未选中的选项将保持原有值不变。"
              show-icon
            />
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  PlusCircleOutlined, MenuOutlined, SettingOutlined, LockOutlined,
  AppstoreOutlined, FileTextOutlined, DashboardOutlined,
  FolderOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import menuAPI from '../../api/menu';
import { useErrorHandler } from '../../composables/useErrorHandler';

const { handleAsync, handleError } = useErrorHandler({ showNotification: true });

// ============================
// 响应式状态
// ============================
const loading = ref(false);
const menuTree = ref([]);
const allMenuTree = ref([]);
const expandedKeys = ref([]);
const selectedKeys = ref([]);
const checkedKeys = ref([]);
const menuModalVisible = ref(false);
const batchEditModalVisible = ref(false);
const isEdit = ref(false);
const isSettingForm = ref(false);
const menuFormRef = ref(null);
const batchEditFormRef = ref(null);
const permissionOptions = ref([]);
const searchKey = ref('');

const batchEditForm = reactive({
  is_active: null,
  position: null,
  is_folder: null,
  is_cached: null,
  permission_code: null,
  parent_id: null
});

// 监听 parent_id 变化，确保清空时设置为 null
watch(() => batchEditForm.parent_id, (newValue) => {
  if (newValue === undefined) {
    batchEditForm.parent_id = null;
  }
});

const menuForm = reactive({
  id: null,
  name: '',
  path: '',
  component: '',
  icon: '',
  order: 0,
  parent_id: null,
  permission_code: null,
  is_cached: false,
  is_folder: false,
  is_active: true,
  position: 0
});

const menuRules = {
  name: [
    { required: true, message: '请输入菜单名称', trigger: 'blur' },
    { max: 50, message: '名称不能超过50个字符', trigger: 'blur' }
  ],
  order: [{ required: true, message: '请输入排序号', trigger: 'blur' }]
};

// ============================
// 计算属性
// ============================
const parentMenuOptions = computed(() => {
  const buildOptions = (menus) => {
    return menus.map(menu => {
      // 确保 menu.id 存在，避免 TreeNode value 无效的错误
      if (!menu.id) {
        return null;
      }
      return {
        value: menu.id,
        title: `${menu.name}${menu.path ? ` (${menu.path})` : ''}`,
        children: menu.children?.length > 0 ? buildOptions(menu.children).filter(Boolean) : undefined
      };
    }).filter(Boolean);
  };
  
  // 打印 menuTree.value 内容，用于调试
  console.log('[MenuTreeManage] menuTree.value:', menuTree.value);
  
  return [
    { value: null, title: '├─ 顶级菜单（无父级）' },
    ...buildOptions(menuTree.value)
  ];
});

// ============================
// 方法
// ============================
const buildTreeData = () => {
  const buildNode = (node) => {
    if (!node || !node.id) return null;
    const result = {
      ...node,
      key: node.id,
      value: node.id,
      title: node.name
    };
    if (node.children && node.children.length > 0) {
      result.children = node.children.map(buildNode).filter(Boolean);
    }
    return result;
  };
  return menuTree.value.map(buildNode).filter(Boolean);
};

const filterOption = (input, option) => {
  return option.label.toLowerCase().includes(input.toLowerCase());
};

const getIconText = (icon) => {
  // 简单的图标文本映射
  const iconMap = {
    'DashboardOutlined': '📊',
    'MenuOutlined': '📋',
    'SettingOutlined': '⚙️',
    'UserOutlined': '👤',
    'LockOutlined': '🔒',
    'FileTextOutlined': '📄',
    'AppstoreOutlined': '📦'
  };
  return iconMap[icon] || '📁';
};

const getPositionText = (position) => {
  const positionMap = {
    0: '顶部菜单',
    2: '顶部子菜单',
    1: '左侧菜单',
    3: '左侧子菜单'
  };
  return positionMap[position] || '顶部菜单';
};

const getPositionColor = (position) => {
  const colorMap = {
    0: 'purple',
    2: 'cyan',
    1: 'orange',
    3: 'gold'
  };
  return colorMap[position] || 'purple';
};

// 菜单位置选项：始终显示所有4个选项
const availablePositionOptions = computed(() => {
  return [
    { value: 0, label: '顶部菜单' },
    { value: 2, label: '顶部子菜单' },
    { value: 1, label: '左侧菜单' },
    { value: 3, label: '左侧子菜单' }
  ];
});

// 根据ID查找菜单
const findMenuById = (id, menus) => {
  for (const menu of menus) {
    if (menu.id === id) {
      return menu;
    }
    if (menu.children && menu.children.length > 0) {
      const found = findMenuById(id, menu.children);
      if (found) return found;
    }
  }
  return null;
};

// 监听父菜单变化，自动设置位置
watch(() => menuForm.parent_id, (newParentId, oldParentId) => {
  // 如果正在设置表单，跳过watch处理
  if (isSettingForm.value) {
    return;
  }
  
  if (newParentId && newParentId !== oldParentId) {
    // 有父菜单时，根据父菜单的位置设置子菜单的位置
    const parentMenu = findMenuById(newParentId, menuTree.value);
    if (parentMenu) {
      // position: 0=顶部菜单, 1=顶部子菜单, 2=左侧菜单, 3=左侧子菜单
      if (parentMenu.position === 0) {
        menuForm.position = 1; // 顶部菜单的子菜单
      } else if (parentMenu.position === 1) {
        menuForm.position = 1; // 顶部子菜单的子菜单
      } else if (parentMenu.position === 2) {
        menuForm.position = 3; // 左侧菜单的子菜单
      } else if (parentMenu.position === 3) {
        menuForm.position = 3; // 左侧子菜单的子菜单
      }
    }
  } else if (!newParentId) {
    // 没有父菜单时，设置为默认的顶级菜单位置
    if (menuForm.position === 3) {
      menuForm.position = 2; // 原来是左侧子菜单，现在变成左侧菜单
    } else if (menuForm.position === 1) {
      menuForm.position = 0; // 原来是顶部子菜单，现在变成顶部菜单
    }
  }
});

const onExpand = (keys) => {
  expandedKeys.value = keys;
};

const onSelect = (keys) => {
  selectedKeys.value = keys;
  // 同时也同步更新 id 格式的 selectedKeys 用于模板中的 is-selected 判断
};

const onCheck = (checkedKeysValue, info) => {
  checkedKeys.value = checkedKeysValue;
  // 同时更新 selectedKeys，确保批量编辑按钮的状态正确
  selectedKeys.value = checkedKeysValue;
};

// 加载菜单树
const loadMenuTree = async () => {
  loading.value = true;
  
  try {
    const result = await handleAsync(
      () => menuAPI.getFullMenuTree(),
      { showSuccess: false }
    );

    // 处理两种数据格式：
    // 1. handleAsync 返回 { success, data, error }，其中 data 是 API 完整响应
    // 2. API 完整响应格式: { success, code, message, data: { menus: [...] } }
    let apiData = result;
    if (result.data && result.data.success !== undefined) {
      apiData = result.data;
    }
    
    if (apiData.success && apiData.code === 200) {
      allMenuTree.value = apiData.data?.menus || [];
      menuTree.value = [...allMenuTree.value];
      expandedKeys.value = menuTree.value.filter(m => m && m.id).map(m => m.id);
      
      if (menuTree.value.length > 0) {
        message.success(`成功加载 ${menuTree.value.length} 个顶级菜单`, 1);
      }
    } else {
      message.error(apiData.message || '加载菜单树失败');
    }
  } catch (error) {
    console.error('[MenuTreeManage] 加载失败:', error);
    message.error('加载菜单树失败');
  } finally {
    loading.value = false;
  }
};

// 加载权限列表（用于下拉选择）
const loadPermissions = async () => {
  try {
    const result = await handleAsync(
      () => menuAPI.getAllPermissions(),
      { showSuccess: false, showError: false }
    );
    
    let apiData = result;
    if (result.data && result.data.success !== undefined) {
      apiData = result.data;
    }
    
    if (apiData.success && apiData.code === 200 && apiData.data) {
      permissionOptions.value = apiData.data.map(p => ({
        label: `${p.code} - ${p.name}`,
        value: p.code
      }));
    }
  } catch (error) {
    console.warn('[MenuTreeManage] 加载权限列表失败:', error);
  }
};

// 搜索处理
const handleSearch = (value) => {
  if (!value) {
    menuTree.value = [...allMenuTree.value];
    return;
  }
  
  const keyword = value.toLowerCase();
  
  const filterMenus = (menus) => {
    return menus.filter(menu => {
      const nameMatch = menu.name?.toLowerCase().includes(keyword);
      const pathMatch = menu.path?.toLowerCase().includes(keyword);
      
      let hasMatchingChildren = false;
      if (menu.children && menu.children.length > 0) {
        menu.children = filterMenus(menu.children);
        hasMatchingChildren = menu.children.length > 0;
      }
      
      return nameMatch || pathMatch || hasMatchingChildren;
    });
  };
  
  menuTree.value = filterMenus([...allMenuTree.value]);
  expandedKeys.value = menuTree.value.filter(m => m && m.id).map(m => m.id);
};

// 刷新
const handleRefresh = async () => {
  searchKey.value = '';
  await Promise.all([loadMenuTree(), loadPermissions()]);
};

// 新增菜单
const handleAddMenu = () => {
  isEdit.value = false;
  isSettingForm.value = true;
  resetForm();
  menuModalVisible.value = true;
  // 在下一个 tick 中恢复 isSettingForm 标志
  setTimeout(() => {
    isSettingForm.value = false;
  }, 0);
};

// 添加子菜单
const handleAddChildMenu = (parentNode) => {
  isEdit.value = false;
  isSettingForm.value = true;
  resetForm();
  // 设置父菜单和位置
  menuForm.parent_id = parentNode.id;
  if (parentNode.position === 0) {
    menuForm.position = 2;
  } else if (parentNode.position === 1) {
    menuForm.position = 3;
  } else if (parentNode.position === 2) {
    menuForm.position = 2;
  } else if (parentNode.position === 3) {
    menuForm.position = 3;
  } else {
    menuForm.position = 2;
  }
  menuModalVisible.value = true;
  // 在下一个 tick 中恢复 isSettingForm 标志
  setTimeout(() => {
    isSettingForm.value = false;
  }, 0);
};

// 编辑菜单
const handleEditMenu = (menu) => {
  isEdit.value = true;
  isSettingForm.value = true;
  Object.assign(menuForm, {
    id: menu.id,
    name: menu.name || '',
    path: menu.path || '',
    component: menu.component || '',
    icon: menu.icon || '',
    order: menu.order ?? 0,
    parent_id: menu.parent_id || null,
    permission_code: menu.permission_code || menu.permission || null,
    is_cached: menu.is_cached ?? false,
    is_folder: menu.is_folder ?? false,
    is_active: menu.is_active ?? true,
    position: menu.position || 0
  });
  menuModalVisible.value = true;
  // 在下一个 tick 中恢复 isSettingForm 标志
  setTimeout(() => {
    isSettingForm.value = false;
  }, 0);
};

// 提交表单
const handleSubmit = async () => {
  try {
    await menuFormRef.value?.validate();
    
    const submitData = { ...menuForm };
    
    const result = await handleAsync(async () => {
      if (isEdit.value) {
        return await menuAPI.updateMenu(submitData.id, submitData);
      } else {
        return await menuAPI.createMenu(submitData);
      }
    }, {
      successMessage: isEdit.value ? '✅ 菜单更新成功' : '✅ 菜单创建成功'
    });

    if (result.success) {
      menuModalVisible.value = false;
      resetForm();
      await loadMenuTree();
      
      // 通知系统刷新侧边栏菜单
      window.dispatchEvent(new CustomEvent('menuUpdated'));
    }
  } catch (error) {
    if (error.message !== 'Validation failed') {
      handleError(error);
    }
  }
};

// 启用/禁用菜单
const handleToggleMenu = async (menu, checked) => {
  console.log('[MenuTreeManage] 切换菜单状态:', menu.name, 'checked:', checked);
  
  // 先临时更新UI状态，提升体验
  menu.is_active = checked;
  
  const result = await handleAsync(
    async () => {
      // 使用专门的 toggleMenu 接口来切换菜单状态
      return await menuAPI.toggleMenu(menu.id);
    },
    { 
      successMessage: checked ? '🟢 菜单启用成功' : '🔴 菜单禁用成功' 
    }
  );

  if (!result.success) {
    console.error('[MenuTreeManage] 菜单状态切换失败:', result);
    // 如果失败，回滚状态
    menu.is_active = !checked;
    message.error('菜单状态切换失败，请重试');
  } else {
    console.log('[MenuTreeManage] 菜单状态切换成功');
    // 刷新菜单树，确保状态同步
    await loadMenuTree();
    // 成功后刷新侧边栏
    window.dispatchEvent(new CustomEvent('menuUpdated'));
  }
};

// 删除菜单
const handleDeleteMenu = async (menuId) => {
  const result = await handleAsync(
    () => menuAPI.deleteMenu(menuId),
    { successMessage: '🗑️ 菜单删除成功' }
  );

  if (result.success) {
    await loadMenuTree();
    window.dispatchEvent(new CustomEvent('menuUpdated'));
  }
};

// 批量编辑
const handleBatchEdit = () => {
  if (selectedKeys.value.length === 0) {
    message.warning('请先选择要编辑的菜单');
    return;
  }
  
  // 重置批量编辑表单
  Object.assign(batchEditForm, {
    is_active: null,
    position: null,
    is_folder: null,
    is_cached: null,
    permission_code: null,
    parent_id: null
  });
  
  batchEditModalVisible.value = true;
};

// 提交批量编辑
const handleBatchSubmit = async () => {
  try {
    if (selectedKeys.value.length === 0) {
      message.warning('请先选择要编辑的菜单');
      return;
    }
    
    // 构建批量编辑数据
    const batchData = {};
    if (batchEditForm.is_active !== null) {
      batchData.is_active = batchEditForm.is_active;
    }
    if (batchEditForm.position !== null) {
      batchData.position = batchEditForm.position;
    }
    if (batchEditForm.is_folder !== null) {
      batchData.is_folder = batchEditForm.is_folder;
    }
    if (batchEditForm.is_cached !== null) {
      batchData.is_cached = batchEditForm.is_cached;
    }
    if (batchEditForm.permission_code !== null) {
      batchData.permission_code = batchEditForm.permission_code;
    }
    // 确保即使 parent_id 为 null 也会包含在请求中，这样才能将菜单设置为顶级菜单
    if (batchEditForm.parent_id !== undefined) {
      batchData.parent_id = batchEditForm.parent_id;
    }
    
    if (Object.keys(batchData).length === 0) {
      message.warning('请至少选择一项要修改的内容');
      return;
    }
    
    // 批量更新菜单
    const result = await handleAsync(async () => {
      // 使用批量更新接口
      return await menuAPI.batchUpdateMenus(selectedKeys.value, batchData);
    }, {
      successMessage: `✅ 成功批量更新 ${selectedKeys.value.length} 个菜单`
    });

    if (result) {
      batchEditModalVisible.value = false;
      // 重置表单
      Object.assign(batchEditForm, {
        is_active: null,
        position: null,
        is_folder: null,
        is_cached: null,
        permission_code: null
      });
      // 刷新菜单树
      await loadMenuTree();
      // 通知系统刷新侧边栏菜单
      window.dispatchEvent(new CustomEvent('menuUpdated'));
      // 清空选择
      checkedKeys.value = [];
      selectedKeys.value = [];
    }
  } catch (error) {
    handleError(error);
  }
};

// 取消批量编辑
const handleBatchCancel = () => {
  batchEditModalVisible.value = false;
  // 重置表单
  Object.assign(batchEditForm, {
    is_active: null,
    position: null,
    is_folder: null,
    is_cached: null,
    permission_code: null,
    parent_id: null
  });
};

// 取消/关闭弹窗
const handleCancel = () => {
  menuModalVisible.value = false;
  resetForm();
};

// 重置表单
const resetForm = () => {
  Object.assign(menuForm, {
    id: null,
    name: '',
    path: '',
    component: '',
    icon: '',
    order: 0,
    parent_id: null,
    permission_code: null,
    is_visible: true,
    is_cached: false,
    is_folder: false,
    position: 'top'
  });
  menuFormRef.value?.resetFields();
};

// ============================
// 生命周期
// ============================
onMounted(async () => {
  await Promise.all([loadMenuTree(), loadPermissions()]);
});
</script>

<style scoped lang="less">
.menu-tree-manage {
  padding: 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 64px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 20px 24px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .header-left {
    .description {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.menu-tree-card {
  min-height: 500px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #e6f7ff;

    .node-actions {
      display: flex !important;
    }
  }

  &.is-selected {
    background: #bae7ff;
  }

  .node-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;

    .node-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .node-name {
      font-weight: 500;
      color: #1a1a1a;
      white-space: nowrap;
    }

    .node-path {
      color: #999;
      font-size: 12px;
      font-family: monospace;
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
      margin-right: 8px;
    }

    .node-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      flex-shrink: 0;
    }
  }

  .node-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;

  .status-label {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 14px;
      color: #1a1a1a;
    }

    small {
      font-size: 12px;
      color: #999;
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;

    .header-right {
      justify-content: stretch;

      button {
        flex: 1;
      }
    }
  }

  .tree-node {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;

    .node-actions {
      display: flex;
      width: 100%;
      justify-content: flex-end;
    }
  }
}
</style>
