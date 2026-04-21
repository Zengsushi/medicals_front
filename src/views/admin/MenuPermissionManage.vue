<template>
  <div class="menu-permission-manage">
    <div class="page-header">
      <div class="header-left">
        <a-input-search
          v-model:value="searchKey"
          placeholder="搜索权限名称或代码..."
          style="width: 320px"
          @search="handleSearch"
        />
      </div>
      <div class="header-right">
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
        <a-button @click="handleRefresh" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>
    </div>

    <a-card class="menu-permission-card" :loading="loading">
      <template v-if="filteredPermissions.length > 0">
        <a-table
          :columns="columns"
          :data-source="filteredPermissions"
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
      </template>

      <a-empty v-else description="暂无权限数据，点击刷新按钮加载">
        <a-button type="primary" @click="handleRefresh">
          立即加载
        </a-button>
      </a-empty>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { 
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
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
const formRef = ref(null);

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
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
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
    console.error('[MenuPermissionManage] 加载失败:', error);
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

const handleEditPermission = (record) => {
  message.info('编辑功能待实现');
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

onMounted(async () => {
  await loadPermissions();
});
</script>

<style scoped lang="less">
.menu-permission-manage {
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
    align-items: center;
  }
}

.search-filters {
  display: flex;
  gap: 12px;
}

.menu-permission-card {
  min-height: 500px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;

    .header-right {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }
  }

  .search-filters {
    flex-wrap: wrap;
  }
}
</style>
