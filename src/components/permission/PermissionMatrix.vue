<template>
  <div class="permission-matrix">
    <a-card :bordered="false" class="permission-card">
      <template #title>
        <div class="card-title">
          <SafetyCertificateOutlined />
          <span>权限矩阵</span>
        </div>
      </template>
      <template #extra>
        <a-space>
          <a-button @click="handleSelectAll(true)" :disabled="!canEdit">全选</a-button>
          <a-button @click="handleSelectAll(false)" :disabled="!canEdit">取消</a-button>
          <a-button type="primary" @click="handleSave" :loading="saving" :disabled="!canEdit">
            <SaveOutlined />
            保存
          </a-button>
        </a-space>
      </template>

      <div class="matrix-container">
        <a-spin :spinning="loading">
          <a-table
            :columns="columns"
            :data-source="matrixData"
            :pagination="false"
            :scroll="{ x: 1200 }"
            rowKey="resource"
            bordered
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key !== 'resource'">
                <a-checkbox
                  :checked="record[column.key]"
                  :disabled="!canEdit || !column.enabled"
                  @change="handleToggle(record.resource, column.key, $event.target.checked)"
                />
              </template>
              <template v-else>
                <div class="resource-cell">
                  <component :is="getResourceIcon(record.resource)" class="resource-icon" />
                  <span>{{ record.label }}</span>
                </div>
              </template>
            </template>
          </a-table>
        </a-spin>
      </div>

      <div class="permission-preview">
        <a-divider>权限预览</a-divider>
        <div class="preview-content">
          <a-tag v-for="perm in selectedPermissions" :key="perm" color="blue">
            {{ perm }}
          </a-tag>
          <a-empty v-if="selectedPermissions.length === 0" :description="'请选择权限'" />
        </div>
      </div>
    </a-card>

    <a-modal
      v-model:open="modalVisible"
      title="分配权限"
      @ok="handleModalConfirm"
      @cancel="modalVisible = false"
      :confirmLoading="saving"
    >
      <div class="modal-content">
        <p>确定要保存以下权限变更吗？</p>
        <a-tag v-for="perm in pendingChanges.add" key="add" color="green">+ {{ perm }}</a-tag>
        <a-tag v-for="perm in pendingChanges.remove" key="remove" color="red">- {{ perm }}</a-tag>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import {
  SafetyCertificateOutlined,
  SaveOutlined,
  UserOutlined,
  TeamOutlined,
  MenuOutlined,
  BookOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { getPermissions, getRoles } from '../../api/auth';

const props = defineProps({
  roleId: {
    type: Number,
    default: null
  },
  canEdit: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['save']);

const loading = ref(false);
const saving = ref(false);
const allPermissions = ref([]);
const rolePermissions = ref([]);
const matrixData = ref([]);
const modalVisible = ref(false);
const pendingChanges = ref({ add: [], remove: [] });

const columns = [
  {
    title: '资源/操作',
    dataIndex: 'resource',
    key: 'resource',
    width: 180,
    fixed: 'left',
    align: 'left'
  },
  { title: '查看', dataIndex: 'view', key: 'view', width: 80, align: 'center' },
  { title: '创建', dataIndex: 'create', key: 'create', width: 80, align: 'center' },
  { title: '修改', dataIndex: 'update', key: 'update', width: 80, align: 'center' },
  { title: '删除', dataIndex: 'delete', key: 'delete', width: 80, align: 'center' },
  { title: '导出', dataIndex: 'export', key: 'export', width: 80, align: 'center' },
  { title: '导入', dataIndex: 'import', key: 'import', width: 80, align: 'center' },
];

const resourceMap = {
  users: { label: '用户管理', icon: UserOutlined },
  role: { label: '角色管理', icon: TeamOutlined },
  permission: { label: '权限管理', icon: SafetyCertificateOutlined },
  menu: { label: '菜单管理', icon: MenuOutlined },
  dict: { label: '字典管理', icon: BookOutlined },
  source: { label: '数据源管理', icon: DatabaseOutlined },
  visual: { label: '可视化', icon: BarChartOutlined },
  admin: { label: '系统管理', icon: SettingOutlined },
};

const getResourceIcon = (resource) => {
  return resourceMap[resource]?.icon || SettingOutlined;
};

const actions = ['view', 'create', 'update', 'delete', 'export', 'import'];

const selectedPermissions = computed(() => {
  const perms = [];
  matrixData.value.forEach(record => {
    actions.forEach(action => {
      if (record[action]) {
        perms.push(`${record.resource}:${action}`);
      }
    });
  });
  return perms;
});

const initMatrix = () => {
  const data = [];

  Object.keys(resourceMap).forEach(resource => {
    const record = {
      resource,
      label: resourceMap[resource].label,
      view: false,
      create: false,
      update: false,
      delete: false,
      export: false,
      import: false,
    };

    actions.forEach(action => {
      const permCode = `${resource}:${action}`;
      record[action] = rolePermissions.value.includes(permCode);
    });

    data.push(record);
  });

  matrixData.value = data;
};

const loadPermissions = async () => {
  loading.value = true;
  try {
    const res = await getPermissions();
    if (res.code === 200) {
      allPermissions.value = res.data || [];
    }
  } catch (error) {
    console.error('加载权限失败:', error);
  } finally {
    loading.value = false;
  }
};

const loadRolePermissions = async () => {
  if (!props.roleId) {
    rolePermissions.value = [];
    return;
  }

  loading.value = true;
  try {
    const res = await getRoles();
    if (res.code === 200) {
      const role = res.data?.find(r => r.id === props.roleId);
      if (role && role.permissions) {
        rolePermissions.value = role.permissions.map(p => p.code);
      }
    }
  } catch (error) {
    console.error('加载角色权限失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleToggle = (resource, action, checked) => {
  const record = matrixData.value.find(r => r.resource === resource);
  if (record) {
    record[action] = checked;
  }
};

const handleSelectAll = (checked) => {
  matrixData.value.forEach(record => {
    actions.forEach(action => {
      record[action] = checked;
    });
  });
};

const handleSave = () => {
  const oldPerms = new Set(rolePermissions.value);
  const newPerms = new Set(selectedPermissions.value);

  const add = selectedPermissions.value.filter(p => !oldPerms.has(p));
  const remove = rolePermissions.value.filter(p => !newPerms.has(p));

  pendingChanges.value = { add, remove };

  if (add.length === 0 && remove.length === 0) {
    message.info('没有权限变更');
    return;
  }

  modalVisible.value = true;
};

const handleModalConfirm = () => {
  saving.value = true;
  try {
    emit('save', {
      roleId: props.roleId,
      permissions: selectedPermissions.value
    });
    message.success('权限保存成功');
    modalVisible.value = false;
  } catch (error) {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await loadPermissions();
  await loadRolePermissions();
  initMatrix();
});
</script>

<style scoped>
.permission-matrix {
  padding: 16px;
}

.permission-card {
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

.matrix-container {
  margin-bottom: 24px;
}

.resource-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resource-icon {
  font-size: 16px;
  color: #1890ff;
}

.permission-preview {
  margin-top: 16px;
}

.preview-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
}

.modal-content {
  padding: 16px 0;
}

.modal-content p {
  margin-bottom: 12px;
  font-weight: 500;
}

:deep(.ant-table-thead > tr > th) {
  background: #fafafa;
  font-weight: 600;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: #f5f7fa;
}
</style>
