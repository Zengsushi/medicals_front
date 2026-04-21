<template>
  <div class="user_list_content">
    <div class="content">
      <div class="header-actions">
        <div class="search-box">
          <a-input-search
            v-model:value="search"
            placeholder="搜索用户账号/邮箱/手机号"
            enter-button
            size="large"
            allow-clear
            @search="handleSearch"
          />
        </div>
        <div class="filter-box">
          <a-select v-model:value="statusFilter" style="width: 120px">
            <a-select-option value="all">全部状态</a-select-option>
            <a-select-option value="active">启用</a-select-option>
            <a-select-option value="inactive">禁用</a-select-option>
          </a-select>
          <a-select v-model:value="roleFilter" style="width: 140px">
            <a-select-option value="all">全部角色</a-select-option>
            <a-select-option value="super">系统管理员</a-select-option>
            <a-select-option value="staff">管理员</a-select-option>
            <a-select-option value="normal">普通用户</a-select-option>
          </a-select>
        </div>
        <div class="action-buttons">
          <a-button @click="refreshList">
            刷新列表
          </a-button>
          <a-button type="primary" @click="handleAddVisible">
            <template #icon><PlusOutlined /></template>
            添加用户
          </a-button>
          <a-button @click="handleBatchActions">
            <template #icon><SelectOutlined /></template>
            批量操作
          </a-button>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="user_list"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
        :locale="{ emptyText: '暂无用户数据' }"
      >
        <template #bodyCell="{ column, record }">
          <!-- 状态 -->
          <template v-if="column.key === 'status'">
            <a-tag :color="record.is_active ? 'green' : 'red'">
              {{ record.is_active ? "启用" : "禁用" }}
            </a-tag>
          </template>

          <!-- 权限 -->
          <template v-else-if="column.key === 'is_superuser'">
            <a-tag :color="record.is_superuser ? 'red' : 'blue'">
              {{ record.is_superuser ? "系统管理员" : (record.is_staff ? "管理员" : "普通用户") }}
            </a-tag>
          </template>

          <!-- 注册时间 -->
          <template v-else-if="column.key === 'date_joined'">
            {{ formatDate(record.date_joined) }}
          </template>

          <!-- 操作列 -->
          <template v-else-if="column.key === 'operation'">
            <div class="action-box">
              <!-- 编辑 -->
              <a-tooltip title="编辑">
                <a-button type="link" @click="handleEdit(record)">
                  <FormOutlined />
                </a-button>
              </a-tooltip>

              <!-- 授权 -->
              <a-tooltip title="用户授权">
                <a-button type="link" @click="handleAuthorize(record)">
                  <LockOutlined />
                </a-button>
              </a-tooltip>

              <!-- 禁用/启用 -->
              <a-popconfirm
                :title="record.is_active ? '确定禁用该用户？' : '确定启用该用户？'"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleToggleStatus(record)"
              >
                <a-tooltip :title="record.is_active ? '禁用用户' : '启用用户'">
                  <a-button type="link">
                    <template v-if="record.is_active"><CloseCircleOutlined /></template>
                    <template v-else><CheckCircleOutlined /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>

              <!-- 强制下线 -->
              <a-popconfirm
                title="确定强制下线该用户？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleForceLogout(record)"
              >
                <a-tooltip title="强制下线">
                  <a-button type="link">
                    <ApiOutlined />
                  </a-button>
                </a-tooltip>
              </a-popconfirm>

              <!-- 删除 -->
              <a-popconfirm
                title="确定删除该用户？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(record)"
              >
                <a-tooltip title="删除">
                  <a-button type="link" danger>
                    <DeleteOutlined />
                  </a-button>
                </a-tooltip>
              </a-popconfirm>

              <!-- 更多 -->
              <a-dropdown>
                <a-button type="link">
                  <SmallDashOutlined />
                </a-button>

                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="handleResetPassword(record)">
                      <template #icon><KeyOutlined /></template>
                      重置密码
                    </a-menu-item>
                    <a-menu-item @click="handleForcePasswordChange(record)">
                      <template #icon><EditOutlined /></template>
                      强制修改密码
                    </a-menu-item>
                    <a-menu-item @click="handleViewDetails(record)">
                      <template #icon><EyeOutlined /></template>
                      查看详情
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </template>
        </template>
      </a-table>
    </div>
  </div>
  <UserForm
    :visible="addVisible"
    :edit="addFormEdit"
    :record="currentUser"
    @update:visible="addVisible = $event"
    @update="handleUpdateUser"
    @success="handleCreateUser"
    @close="handleClose"
  />
  <!-- 用户授权弹窗 -->
  <a-modal
    v-model:open="authorizeVisible"
    title="👤 用户授权"
    :width="600"
    @ok="handleAuthorizeSubmit"
    @cancel="handleAuthorizeCancel"
  >
    <div class="authorize-content">
      <h3>用户：{{ currentUser?.username }}</h3>
      <a-form :model="authorizeForm" layout="vertical">
        <a-form-item label="角色分配">
          <a-select
            v-model:value="authorizeForm.role"
            placeholder="选择用户角色"
            style="width: 100%"
          >
            <a-select-option value="admin">管理员</a-select-option>
            <a-select-option value="user">普通用户</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="权限分配">
          <a-checkbox-group v-model:value="authorizeForm.permissions">
            <a-checkbox value="users:view">查看用户</a-checkbox>
            <a-checkbox value="users:create">创建用户</a-checkbox>
            <a-checkbox value="users:edit">编辑用户</a-checkbox>
            <a-checkbox value="users:delete">删除用户</a-checkbox>
            <a-checkbox value="users:authorize">用户授权</a-checkbox>
            <a-checkbox value="menu:manage">菜单管理</a-checkbox>
            <a-checkbox value="permission:manage">权限管理</a-checkbox>
            <a-checkbox value="database:manage">数据源管理</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </div>
  </a-modal>

  <!-- 用户查看弹窗 -->
  <UserViewer
    v-model:visible="viewerVisible"
    :user="viewerUser"
    :show-actions="true"
    @edit="handleViewEdit"
    @disable="handleViewDisable"
    @enable="handleViewEnable"
  />
  <!-- 强制修改密码弹窗 -->
  <a-modal
    v-model:open="forcePasswordModalVisible"
    title="🔑 强制修改密码"
    :width="500"
    @ok="handleForcePasswordSubmit"
    @cancel="handleForcePasswordCancel"
  >
    <a-form :model="forcePasswordForm" layout="vertical">
      <a-form-item
        label="新密码"
        name="new_password"
        :rules="[{ required: true, message: '请输入新密码' }]"
      >
        <a-input-password
          v-model:value="forcePasswordForm.new_password"
          placeholder="请输入新密码"
        />
      </a-form-item>
      <a-form-item
        label="确认密码"
        name="confirm_password"
        :rules="[
          { required: true, message: '请确认新密码' },
          { 
            validator: async (_, value) => {
              if (value !== forcePasswordForm.new_password) {
                return Promise.reject('两次输入的密码不一致');
              }
            }
          }
        ]"
      >
        <a-input-password
          v-model:value="forcePasswordForm.confirm_password"
          placeholder="请再次输入新密码"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<script setup lang="ts">
import { onMounted, ref, reactive, watch } from "vue";
import { useRouter } from "vue-router";
import {
  message,
  type TableColumnsType,
  type TablePaginationConfig,
} from "ant-design-vue";
import {
  FormOutlined,
  DeleteOutlined,
  SmallDashOutlined,
  ApiOutlined,
  PlusOutlined,
  SelectOutlined,
  LockOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  EditOutlined,
  EyeOutlined
} from "@ant-design/icons-vue";
import { userAPI } from "../../api/users";
import UserForm from "../user/UserForm.vue";
import UserViewer from "./UserViewer.vue";
import { formatDate } from "../../utils/dateUtil";

const router = useRouter();

interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string;
}

const user_list = ref<User[]>([]);
const loading = ref(false);

// 搜索关键词
const search = ref<string>("");
const statusFilter = ref<"all" | "active" | "inactive">("all");
const roleFilter = ref<"all" | "super" | "staff" | "normal">("all");

// 模态框状态
const addVisible = ref(false);
const addFormEdit = ref(false);
const currentUser = ref(null);
const authorizeVisible = ref(false);
const viewerVisible = ref(false);
const viewerUser = ref(null);
const forcePasswordModalVisible = ref(false);

// 授权表单
const authorizeForm = reactive({
  role: '',
  permissions: []
});

// 强制修改密码表单
const forcePasswordForm = reactive({
  new_password: '',
  confirm_password: ''
});

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: false,
  showTotal: (total) => `共 ${total} 条记录`
});

const columns: TableColumnsType = [
  { title: "ID", dataIndex: "id", key: "id", width: 60, fixed: "left" },
  { title: "账号", dataIndex: "username", key: "username", width: 120, ellipsis: true },
  { title: "手机号", dataIndex: "phone", key: "phone", width: 130, ellipsis: true },
  { title: "邮箱", dataIndex: "email", key: "email", width: 180, ellipsis: true },
  { title: "权限", dataIndex: "is_superuser", key: "is_superuser", width: 70 },
  { title: "状态", dataIndex: "is_active", key: "status", width: 60 },
  { title: "注册时间", key: "date_joined", width: 120 },
  { title: "操作", key: "operation", width: 260, fixed: "right" }
];

const get_user_list = async () => {
  try {
    loading.value = true;
    const res = await userAPI.get_user_list({
      search: search.value || undefined,
      status: statusFilter.value !== "all" ? statusFilter.value : undefined,
      role: roleFilter.value !== "all" ? roleFilter.value : undefined,
      page: pagination.current,
      page_size: pagination.pageSize,
    });

    if (res.success && res.code === 200) {
      user_list.value = res.data.user_list;
      pagination.total = res.data.total;
    } else {
      message.error(res.message || "获取失败");
    }
  } finally {
    loading.value = false;
  }
};

const handleSearch = async () => {
  pagination.current = 1;
  await get_user_list();
};

const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.current = pag.current!;
  pagination.pageSize = pag.pageSize!;
  get_user_list();
};

const refreshList = async () => {
  await get_user_list();
  message.success("用户列表已刷新");
};

const handleAddVisible = () => {
  addVisible.value = true;
  addFormEdit.value = false;
  currentUser.value = null;
};

const handleUpdateUser = async (user) => {
  try {
    const res = await userAPI.update_user(currentUser.value.id, user);
    if (res.success && res.code === 200) {
      message.success(res.message || "更新成功");
      addVisible.value = false;
      get_user_list();
    } else {
      message.error(res.message || "更新失败");
    }
  } catch (error) {
    message.error("操作失败");
  }
};

const handleCreateUser = async (user) => {
  try {
    const res = await userAPI.create_user(user);
    if (res.success && res.code === 200) {
      message.success(res.message || "创建成功");
      addVisible.value = false;
      get_user_list();
    } else {
      message.error(res.message || "创建失败");
    }
  } catch (error) {
    message.error("操作失败");
  }
};

const handleClose = async () => {
  addVisible.value = false;
  currentUser.value = null;
};

const handleEdit = (record: User) => {
  currentUser.value = record;
  addVisible.value = true;
  addFormEdit.value = true;
};

const handleDelete = async (record: User) => {
  try {
    const res = await userAPI.delete_user(record.id);
    if (res.success && res.code === 200){
      message.success(res.message || "删除成功");
      get_user_list();
    } else {
      message.error(res.message || "删除失败");
    }
  } catch (error) {
    message.error("删除失败");
  }
};

const handleForceLogout = async (record: User) => {
  try {
    const res = await userAPI.force_logout(record.id);
    if (res.success && res.code === 200) {
      message.success(res.message || "强制下线成功");
      get_user_list();
    } else {
      message.error(res.message || "强制下线失败");
    }
  } catch (error) {
    message.error("强制下线失败");
  }
};

const handleToggleStatus = async (record: User) => {
  try {
    const res = await userAPI.update_user_status(record.id, !record.is_active);
    if (res.success && res.code === 200) {
      message.success(res.message || (record.is_active ? "禁用成功" : "启用成功"));
      get_user_list();
    } else {
      message.error(res.message || "操作失败");
    }
  } catch (error) {
    message.error("操作失败");
  }
};

const handleAuthorize = (record: User) => {
  currentUser.value = record;
  authorizeForm.role = record.is_superuser ? 'admin' : 'user';
  authorizeForm.permissions = [];
  authorizeVisible.value = true;
};

const handleAuthorizeSubmit = async () => {
  try {
    const res = await userAPI.update_user_permissions(currentUser.value.id, {
      role: authorizeForm.role,
      permissions: authorizeForm.permissions
    });
    if (res.success && res.code === 200) {
      message.success(res.message || "授权成功");
      authorizeVisible.value = false;
      get_user_list();
    } else {
      message.error(res.message || "授权失败");
    }
  } catch (error) {
    message.error("授权失败");
  }
};

const handleAuthorizeCancel = () => {
  authorizeVisible.value = false;
  currentUser.value = null;
};

const handleResetPassword = async (record: User) => {
  try {
    console.log('[ResetPassword] 重置用户ID:', record.id)
    const res = await userAPI.reset_password(record.id);
    console.log('[ResetPassword] 响应:', res)
    if (res.success && res.code === 200) {
      message.success(res.message || "密码重置成功，新密码为: 123456");
      get_user_list();
    } else {
      message.error(res.message || `重置密码失败: ${res.error?.detail || '未知错误'}`);
    }
  } catch (error: any) {
    console.error('[ResetPassword] 请求失败:', error)
    message.error(`重置密码失败: ${error.response?.data?.message || error.message || '网络错误'}`);
  }
};

const handleForcePasswordChange = (record: User) => {
  currentUser.value = record;
  forcePasswordForm.new_password = '';
  forcePasswordForm.confirm_password = '';
  forcePasswordModalVisible.value = true;
};

const handleForcePasswordSubmit = async () => {
  if (!forcePasswordForm.new_password) {
    message.error("请输入新密码");
    return;
  }
  if (forcePasswordForm.new_password !== forcePasswordForm.confirm_password) {
    message.error("两次输入的密码不一致");
    return;
  }

  // 密码强度检查
  const pwd = forcePasswordForm.new_password;
  if (pwd.length < 6) {
    message.error("密码长度至少6位");
    return;
  }
  if (!/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    message.error("密码必须包含字母和数字");
    return;
  }

  try {
    console.log('[ForcePassword] 提交修改，用户ID:', currentUser.value.id, '新密码长度:', pwd.length)
    const res = await userAPI.force_change_password(currentUser.value.id, forcePasswordForm.new_password);
    console.log('[ForcePassword] 响应:', res)
    
    if (res.success && res.code === 200) {
      message.success(res.message || "密码修改成功");
      forcePasswordModalVisible.value = false;
      get_user_list();
    } else {
      message.error(res.message || `修改密码失败: ${res.error?.detail || '未知错误'}`);
    }
  } catch (error: any) {
    console.error('[ForcePassword] 请求失败:', error)
    message.error(`修改密码失败: ${error.response?.data?.message || error.message || '网络错误'}`);
  }
};

const handleForcePasswordCancel = () => {
  forcePasswordModalVisible.value = false;
  forcePasswordForm.new_password = '';
  forcePasswordForm.confirm_password = '';
};

const handleViewDetails = (record: User) => {
  router.push({ name: 'userdetail', query: { id: record.id } });
};

const handleViewEdit = (user: User) => {
  viewerVisible.value = false;
  handleEdit(user);
};

const handleViewDisable = (user: User) => {
  viewerVisible.value = false;
  handleToggleStatus(user);
};

const handleViewEnable = (user: User) => {
  viewerVisible.value = false;
  handleToggleStatus(user);
};

const handleBatchActions = () => {
  message.info("批量操作功能开发中");
  // TODO: 实现批量操作功能
};

watch([statusFilter, roleFilter], async () => {
  pagination.current = 1;
  await get_user_list();
});

onMounted(() => {
  get_user_list();
});
</script>

<style scoped lang="less">
.user_list_content {
  width: 100%;
  padding: 0;
}

.content {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
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
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.search-box {
  max-width: 320px;
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.filter-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-box {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
}

.authorize-content {
  padding: 16px 0;
  
  h3 {
    margin: 0 0 24px 0;
    color: #333;
  }
}

/* 调整分页组件文字位置 */
:deep(.ant-pagination) {
  .ant-pagination-options {
    .ant-pagination-options-size-changer {
      .ant-select-selection-item {
        transform: translateY(-1px);
      }
    }
  }
}

/* 紧凑表格行高 */
:deep(.ant-table-thead > tr > th) {
  padding-top: 8px;
  padding-bottom: 8px;
}

:deep(.ant-table-tbody > tr > td) {
  padding-top: 6px;
  padding-bottom: 6px;
  line-height: 1.2;
  font-size: 13px;
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .search-box {
    max-width: 100%;
  }
  
  .action-buttons {
    justify-content: center;
  }

  .filter-box {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .content {
    padding: 16px;
  }
}
</style>
