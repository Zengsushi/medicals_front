<template>
  <a-modal
    :open="visible"
    title="👤 用户详情"
    :width="700"
    @cancel="handleClose"
    @ok="handleClose"
    :footer="null"
  >
    <div class="user-viewer" v-if="user">
      <div class="user-header">
        <div class="avatar-section">
          <img :src="user.avatar || defaultAvatar" alt="用户头像" class="user-avatar" />
          <div class="user-basic">
            <h2 class="user-name">{{ user.first_name }}{{ user.last_name }}</h2>
            <p class="user-username">@{{ user.username }}</p>
            <div class="user-tags">
              <a-tag :color="user.is_active ? 'green' : 'red'">
                {{ user.is_active ? '在线' : '离线' }}
              </a-tag>
              <a-tag :color="user.is_superuser ? 'blue' : 'default'">
                {{ user.is_superuser ? '管理员' : '普通用户' }}
              </a-tag>
            </div>
          </div>
        </div>
      </div>

      <a-divider />

      <div class="user-info">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="用户ID">
            {{ user.id }}
          </a-descriptions-item>
          <a-descriptions-item label="用户名">
            {{ user.username }}
          </a-descriptions-item>
          <a-descriptions-item label="姓名">
            {{ user.first_name }}{{ user.last_name }}
          </a-descriptions-item>
          <a-descriptions-item label="手机号">
            {{ user.phone || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="邮箱">
            {{ user.email || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="注册时间">
            {{ formatDate(user.date_joined) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="user.is_active ? 'green' : 'red'">
              {{ user.is_active ? '已激活' : '已禁用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="权限">
            <a-tag :color="user.is_superuser ? 'blue' : 'default'">
              {{ user.is_superuser ? '超级管理员' : '普通用户' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <div class="user-actions" v-if="showActions">
        <a-space>
          <a-button type="primary" @click="handleEdit">
            <template #icon><EditOutlined /></template>
            编辑用户
          </a-button>
          <a-button v-if="user.is_active" danger @click="handleDisable">
            <template #icon><CloseCircleOutlined /></template>
            禁用用户
          </a-button>
          <a-button v-else type="primary" @click="handleEnable">
            <template #icon><CheckCircleOutlined /></template>
            启用用户
          </a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { message } from 'ant-design-vue';
import { EditOutlined, CloseCircleOutlined, CheckCircleOutlined } from '@ant-design/icons-vue';

interface UserRecord {
  id?: number;
  username: string;
  password?: string;
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
  is_active?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
}

const props = defineProps<{
  visible: boolean;
  user: UserRecord | null;
  showActions?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'edit', user: UserRecord): void;
  (e: 'disable', user: UserRecord): void;
  (e: 'enable', user: UserRecord): void;
  (e: 'close'): void;
}>();

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlOSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjIwIiBmaWxsPSIjOWVhM2FiIi8+PHBhdGggZD0iTTIwIDg1IGMwIC0yNSAyNSAtNDAgMzAgLTQwIGMxMCAwIDMwIDE1IDMwIDQwIGwwIDAiIGZpbGw9IiM5ZWEzYWIiLz48L3N2Zz4=';

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

const handleEdit = () => {
  if (props.user) {
    emit('edit', props.user);
  }
};

const handleDisable = () => {
  if (props.user) {
    emit('disable', props.user);
  }
};

const handleEnable = () => {
  if (props.user) {
    emit('enable', props.user);
  }
};
</script>

<style scoped>
.user-viewer {
  padding: 0;
}

.user-header {
  padding: 20px 0;
}

.avatar-section {
  display: flex;
  gap: 24px;
  align-items: center;
}

.user-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #f0f0f0;
}

.user-basic {
  flex: 1;
}

.user-name {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #1a1a1a;
}

.user-username {
  margin: 0 0 12px 0;
  color: #999;
  font-size: 14px;
}

.user-tags {
  display: flex;
  gap: 8px;
}

.user-info {
  margin-top: 20px;
}

.user-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;
}
</style>
