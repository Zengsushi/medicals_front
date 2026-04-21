<template>
  <div class="permission-list">
    <div class="content">
      <div class="header-actions">
        <div class="search-box">
          <a-input-search
            v-model:value="searchKey"
            placeholder="搜索权限名称或代码..."
            enter-button
            size="large"
            @search="handleSearch"
          />
        </div>
        <div class="search-filters">
          <a-select
            v-model:value="filterModule"
            placeholder="按模块筛选"
            style="width: 180px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="">全部模块</a-select-option>
            <a-select-option 
              v-for="mod in uniqueModules" 
              :key="mod" 
              :value="mod"
            >
              {{ mod }}
            </a-select-option>
          </a-select>

          <a-select
            v-model:value="filterStatus"
            placeholder="状态筛选"
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="true">启用</a-select-option>
            <a-select-option value="false">禁用</a-select-option>
          </a-select>
        </div>
        <div class="action-buttons">
          <a-button @click="handleRefresh" :loading="loading">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
          <a-button type="primary" @click="handleAddPermission">
            <template #icon><PlusOutlined /></template>
            新增权限
          </a-button>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredPermissions"
        :loading="loading"
        row-key="id"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: filteredPermissions.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条权限`
        }"
        :scroll="{ x: 900 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="permission-name-cell">
              <span class="name">{{ record.name }}</span>
              <span class="code">{{ record.code }}</span>
            </div>
          </template>

          <template v-if="column.key === 'status'">
            <a-tag :color="record.is_active ? 'green' : 'red'">
              {{ record.is_active ? "启用" : "禁用" }}
            </a-tag>
          </template>

          <template v-if="column.key === 'created_at'">
            {{ formatDate(record.created_at) }}
          </template>

          <template v-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="编辑">
                <a-button 
                  type="link" 
                  size="small" 
                  @click="handleEditPermission(record)"
                >
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              
              <a-popconfirm
                :title="record.is_active ? '确定禁用该权限？' : '确定启用该权限？'"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleTogglePermission(record)"
              >
                <a-tooltip :title="record.is_active ? '禁用' : '启用'">
                  <a-button type="link" size="small">
                    <template v-if="record.is_active"><CloseCircleOutlined /></template>
                    <template v-else><CheckCircleOutlined /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
              
              <a-popconfirm
                title="确定删除此权限吗？关联的菜单可能会受影响！"
                @confirm="handleDeletePermission(record.id)"
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
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>

      <a-empty v-if="filteredPermissions.length === 0 && !loading" description="暂无权限数据">
        <a-button type="primary" @click="handleAddPermission">立即创建</a-button>
      </a-empty>

      <a-modal
        v-model:open="modalVisible"
        :title="isEdit ? '✏️ 编辑权限' : '➕ 新增权限'"
        :width="550"
        :destroy-on-close="true"
        @ok="handleSubmit"
        @cancel="handleCancel"
        ok-text="保存"
        cancel-text="取消"
      >
        <a-form
          ref="formRef"
          :model="form"
          :rules="rules"
          layout="vertical"
        >
          <a-form-item label="权限名称" name="name">
            <a-input 
              v-model:value="form.name" 
              placeholder="例如：查看用户列表"
              :maxlength="50"
              show-count
            />
          </a-form-item>

          <a-form-item label="权限代码" name="code">
            <a-input 
              v-model:value="form.code" 
              placeholder="例如：users:view"
              :maxlength="100"
              show-count
            >
              <template #prefix>
                <span style="color: #999">:</span>
              </template>
            </a-input>
            <div class="form-tip">建议格式：模块:操作，如 users:view, menu:create</div>
          </a-form-item>

          <a-form-item label="所属模块" name="module">
            <a-input 
              v-model:value="form.module" 
              placeholder="例如：users、menu、system"
              :maxlength="30"
            />
          </a-form-item>

          <a-form-item label="描述说明" name="description">
            <a-textarea 
              v-model:value="form.description" 
              placeholder="详细描述此权限的作用范围和使用场景"
              :rows="3"
              :maxlength="200"
              show-count
            />
          </a-form-item>

          <a-form-item label="状态" name="is_active">
            <a-switch 
              v-model:checked="form.is_active" 
              checked-children="启用" 
              un-checked-children="禁用"
            />
          </a-form-item>
        </a-form>
      </a-modal>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import permissionAPI from '../../api/permission';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { formatDate } from '../../utils/dateUtil';

const { handleAsync } = useErrorHandler({ showNotification: true });

const loading = ref(false);
const permissions = ref([]);
const searchKey = ref('');
const filterModule = ref('');
const filterStatus = ref('');
const modalVisible = ref(false);
const isEdit = ref(false);
const formRef = ref(null);

const form = reactive({
  id: null,
  name: '',
  code: '',
  module: '',
  description: '',
  is_active: true
});

const rules = {
  name: [
    { required: true, message: '请输入权限名称', trigger: 'blur' },
    { max: 50, message: '不能超过50个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入权限代码', trigger: 'blur' }
  ]
};

const pagination = reactive({
  current: 1,
  pageSize: 15
});

const columns = [
  {
    title: '权限信息',
    key: 'name',
    width: 300,
    fixed: 'left'
  },
  {
    title: '所属模块',
    dataIndex: 'module',
    key: 'module',
    width: 120
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    align: 'center'
  },
  {
    title: '创建时间',
    key: 'created_at',
    width: 170,
    sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    align: 'center',
    fixed: 'right'
  }
];

const filteredPermissions = computed(() => {
  let result = [...permissions.value];
  
  if (searchKey.value) {
    const keyword = searchKey.value.toLowerCase();
    result = result.filter(p => 
      p.name?.toLowerCase().includes(keyword) ||
      p.code?.toLowerCase().includes(keyword)
    );
  }
  
  if (filterModule.value) {
    result = result.filter(p => p.module === filterModule.value);
  }
  
  if (filterStatus.value !== '') {
    const isActive = filterStatus.value === 'true';
    result = result.filter(p => p.is_active === isActive);
  }
  
  return result;
});

const uniqueModules = computed(() => {
  return [...new Set(permissions.value.map(p => p.module).filter(Boolean))].sort();
});

const loadPermissions = async () => {
  loading.value = true;
  
  try {
    const result = await handleAsync(
      () => permissionAPI.getAllPermissions(),
      { showSuccess: false }
    );

    let apiData = result;
    if (result.data && result.data.success !== undefined) {
      apiData = result.data;
    }
    
    if (apiData.success && apiData.code === 200) {
      permissions.value = apiData.data || [];
    }
  } catch (error) {
    console.error('[PermissionList] 加载失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleRefresh = async () => {
  await loadPermissions();
};

const handleSearch = () => {
  pagination.current = 1;
};

const handleTableChange = (pag) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
};

const handleAddPermission = () => {
  isEdit.value = false;
  resetForm();
  modalVisible.value = true;
};

const handleEditPermission = (record) => {
  isEdit.value = true;
  Object.assign(form, {
    id: record.id,
    name: record.name || '',
    code: record.code || '',
    module: record.module || '',
    description: record.description || '',
    is_active: record.is_active ?? true
  });
  modalVisible.value = true;
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    
    const submitData = { ...form };
    
    let result;
    if (isEdit.value) {
      result = await permissionAPI.updatePermission(form.id, submitData);
    } else {
      result = await permissionAPI.createPermission(submitData);
    }
    
    if (result.data.code === 200) {
      message.success(isEdit.value ? '✅ 权限更新成功' : '✅ 权限创建成功');
      modalVisible.value = false;
      resetForm();
      await loadPermissions();
    } else {
      message.error(result.data.message || (isEdit.value ? '更新失败' : '创建失败'));
    }
  } catch (error) {
    if (error.message !== 'Validation failed') {
      message.error('操作失败：' + error.message);
    }
  }
};

const handleTogglePermission = async (permission) => {
  const originalStatus = permission.is_active;
  permission.is_active = !originalStatus;
  
  try {
    const result = await permissionAPI.togglePermission(permission.id);
    if (result?.success && result?.code === 200) {
      message.success(!originalStatus ? '🟢 权限启用成功' : '🔴 权限禁用成功');
    } else {
      permission.is_active = originalStatus;
      message.error(result?.data?.message || '操作失败');
    }
  } catch (error) {
    permission.is_active = originalStatus;
    message.error('操作失败：' + error.message);
  }
};

const handleDeletePermission = async (id) => {
  try {
    const result = await permissionAPI.deletePermission(id);
    if (result.data.code === 200) {
      message.success('🗑️ 权限删除成功');
      await loadPermissions();
    } else {
      message.error(result.data.message || '删除失败');
    }
  } catch (error) {
    message.error('删除失败：' + error.message);
  }
};

const handleCancel = () => {
  modalVisible.value = false;
  resetForm();
};

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    code: '',
    module: '',
    description: '',
    is_active: true
  });
  formRef.value?.resetFields();
};

onMounted(async () => {
  await loadPermissions();
});
</script>

<style scoped lang="less">
.permission-list {
  width: 100%;
  padding: 0;
}

.content {
  width: 100%;
  padding: 24px;
  background: #f0f2f5;
  min-height: 600px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.search-box {
  max-width: 320px;
  flex-shrink: 0;
}

.search-filters {
  display: flex;
  gap: 12px;
  flex: 1;
  justify-content: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.permission-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .name {
    font-weight: 500;
    color: #1a1a1a;
  }

  .code {
    font-size: 12px;
    font-family: monospace;
    color: #1890ff;
    background: #e6f7ff;
    padding: 2px 8px;
    border-radius: 4px;
    display: inline-block;
    width: fit-content;
  }
}

.form-tip {
  margin-top: 4px;
  color: #999;
  font-size: 12px;
}

@media (max-width: 768px) {
  .content {
    padding: 16px;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .search-box {
    max-width: 100%;
  }
  
  .search-filters {
    flex-wrap: wrap;
  }
  
  .action-buttons {
    justify-content: center;
  }
}
</style>
