<template>
  <div class="user-profile-container">
    <a-page-header
      class="page-header"
      :title="pageTitle"
      :sub-title="pageSubTitle"
      @back="handleBack"
    />

    <a-spin :spinning="loading">
      <div class="profile-content">
        <a-row :gutter="24">
          <a-col :span="8">
            <a-card class="avatar-card">
              <div class="avatar-section">
                <div class="avatar-wrapper">
                  <img :src="avatarDisplayUrl" class="user-avatar" />
                  <div class="avatar-upload-mask" @click="avatarVisible = true">
                    <CameraOutlined />
                    <span>更换头像</span>
                  </div>
                </div>
                <a-divider />
                <div class="user-basic-info">
                  <h3>{{ userForm.first_name }}{{ userForm.last_name }}</h3>
                  <p class="username">@{{ userForm.username }}</p>
                  <div class="status-tags">
                    <a-tag :color="userForm.is_active ? 'green' : 'red'">
                      {{ userForm.is_active ? '在线' : '离线' }}
                    </a-tag>
                    <a-tag :color="userForm.is_superuser ? 'blue' : 'default'">
                      {{ userForm.is_superuser ? '管理员' : '普通用户' }}
                    </a-tag>
                  </div>
                </div>
              </div>
            </a-card>

            <a-card class="info-card" title="账户信息" style="margin-top: 16px">
              <a-descriptions :column="1" size="small">
                <a-descriptions-item label="用户ID">
                  {{ userForm.id || '-' }}
                </a-descriptions-item>
                <a-descriptions-item label="注册时间">
                  {{ formatDate(userForm.date_joined) }}
                </a-descriptions-item>
                <a-descriptions-item label="最后登录">
                  {{ formatDate(userForm.last_login) }}
                </a-descriptions-item>
              </a-descriptions>
            </a-card>
          </a-col>

          <a-col :span="16">
            <a-card class="edit-card" title="基本信息">
              <a-form
                :model="userForm"
                layout="vertical"
                :label-col="{ style: { width: '120px' } }"
              >
                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="用户名">
                      <a-input v-model:value="userForm.username" disabled />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="手机号">
                      <a-input v-model:value="userForm.phone" placeholder="请输入手机号" />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="姓">
                      <a-input v-model:value="userForm.last_name" placeholder="请输入姓" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="名">
                      <a-input v-model:value="userForm.first_name" placeholder="请输入名" />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-form-item label="邮箱">
                  <a-input v-model:value="userForm.email" placeholder="请输入邮箱" />
                </a-form-item>

                <a-form-item label="自我介绍">
                  <a-textarea
                    v-model:value="userForm.introduce"
                    :rows="4"
                    placeholder="请输入自我介绍"
                    show-count
                    :maxlength="500"
                  />
                </a-form-item>

                <a-form-item>
                  <a-space>
                    <a-button type="primary" @click="handleSave" :loading="saving">
                      <template #icon><SaveOutlined /></template>
                      保存修改
                    </a-button>
                    <a-button @click="handleReset">
                      <template #icon><ReloadOutlined /></template>
                      重置
                    </a-button>
                  </a-space>
                </a-form-item>
              </a-form>
            </a-card>
          </a-col>
        </a-row>
      </div>
    </a-spin>

    <UserAvatar
      :visible="avatarVisible"
      :avatar_url="avatarDisplayUrl"
      @upload="handleAvatarUpload"
      @close="avatarVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { useAuthStore } from '../../stores/auth';
import { useRouter, useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  CameraOutlined,
  SaveOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue';
import { userAPI } from '../../api/users';
import UserAvatar from './UserAvatarUpdate.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const defaultAvatar =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlOSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjIwIiBmaWxsPSIjOWVhM2FiIi8+PHBhdGggZD0iTTIwIDg1IGMwIC0yNSAyNSAtNDAgMzAgLTQwIGMxMCAwIDMwIDE1IDMwIDQwIGwwIDAiIGZpbGw9IiM5ZWEzYWIiLz48L3N2Zz4=';

const avatarDisplayUrl = computed(() => {
  const u = userForm.avatar;
  return resolveMediaUrl(u) || defaultAvatar;
});

const loading = ref(false);
const saving = ref(false);
const avatarVisible = ref(false);
const userId = ref<number | null>(null);

const initialUserForm = {
  id: null,
  username: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  avatar: '',
  introduce: '',
  is_active: true,
  is_superuser: false,
  date_joined: '',
  last_login: ''
};

const userForm = reactive({ ...initialUserForm });
const originalUserForm = reactive({ ...initialUserForm });

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const isSelfProfile = computed(() => {
  if (route.path === '/user/profile' || route.name === 'userSelfProfile') return true;
  if (authStore.userId == null || userForm.id == null) return false;
  return Number(authStore.userId) === Number(userForm.id);
});

const pageTitle = computed(() => (isSelfProfile.value ? '账号资料' : '用户详情'));
const pageSubTitle = computed(() =>
  isSelfProfile.value ? '维护头像、联系方式与简介等账号信息' : '查看和编辑用户信息'
);

const applyUserPayload = (user: Record<string, any>) => {
  Object.assign(userForm, {
    id: user.id,
    username: user.username ?? '',
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    phone: user.phone ?? '',
    email: user.email ?? '',
    avatar: user.avatar ?? '',
    introduce: user.introduce ?? '',
    is_active: user.is_active !== false,
    is_superuser: Boolean(user.is_superuser),
    date_joined: user.date_joined ?? '',
    last_login: user.last_login ?? ''
  });
  Object.assign(originalUserForm, { ...userForm });
};

const loadCurrentUserProfile = async () => {
  try {
    loading.value = true;
    const res = await userAPI.getCurrentUser();
    if (res.success && res.code === 200 && res.data) {
      applyUserPayload(res.data);
    } else {
      message.error(res.message || '加载当前用户信息失败');
      handleBack();
    }
  } catch (error) {
    console.error('加载当前用户信息失败:', error);
    message.error('加载当前用户信息失败');
    handleBack();
  } finally {
    loading.value = false;
  }
};

const loadUserDetail = async (id: number) => {
  try {
    loading.value = true;
    const res = await userAPI.get_user_list({ page: 1, page_size: 100 });
    if (res.success && res.code === 200) {
      const user = res.data.user_list.find((u: any) => u.id === id);
      if (user) {
        applyUserPayload(user);
      } else {
        message.error('未找到该用户');
        handleBack();
      }
    } else {
      message.error(res.message || '加载用户信息失败');
    }
  } catch (error) {
    console.error('加载用户信息失败:', error);
    message.error('加载用户信息失败');
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  if (!userForm.id) {
    message.error('用户ID不存在');
    return;
  }

  try {
    saving.value = true;
    const payload = {
      first_name: userForm.first_name,
      last_name: userForm.last_name,
      phone: userForm.phone,
      email: userForm.email,
      introduce: userForm.introduce
    };

    const res = isSelfProfile.value
      ? await userAPI.update_user(userForm.id, payload)
      : await userAPI.adminUpdateUser(userForm.id, payload);

    if (res.success && res.code === 200) {
      message.success('保存成功');
      Object.assign(originalUserForm, userForm);
    } else {
      message.error(res.message || '保存失败');
    }
  } catch (error) {
    console.error('保存失败:', error);
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const handleReset = () => {
  Object.assign(userForm, originalUserForm);
  message.info('已重置');
};

const handleBack = () => {
  if (route.path === '/user/profile' || route.name === 'userSelfProfile') {
    router.push('/');
    return;
  }
  router.push('/user/manage/list');
};

const handleAvatarUpload = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await userAPI.avatar_upload(formData);
    if (res.success && res.code === 200) {
      const url = res.data?.avatar_url || res.data?.avatar || '';
      userForm.avatar = url;
      if (authStore.userId != null && userForm.id === authStore.userId && authStore.userInfo) {
        authStore.patchUserInfo({ avatar: url });
      }
      avatarVisible.value = false;
      message.success(res.message || '头像上传成功');
    } else {
      message.error(res.message || '头像上传失败');
    }
  } catch (error) {
    console.error('头像上传失败:', error);
    message.error('头像上传失败');
  }
};

onMounted(async () => {
  const idFromQuery = route.query.id ? Number(route.query.id) : null;
  const selfPath =
    route.path === '/user/profile' ||
    route.name === 'userSelfProfile' ||
    route.path.startsWith('/user/profile');

  if (selfPath) {
    if (authStore.userId == null) {
      message.error('请先登录');
      router.push({ name: 'login' });
      return;
    }
    userId.value = Number(authStore.userId);
    await loadCurrentUserProfile();
    return;
  }

  if (idFromQuery) {
    userId.value = idFromQuery;
    await loadUserDetail(idFromQuery);
    return;
  }

  message.error('缺少用户ID参数');
  handleBack();
});
</script>

<style scoped lang="less">
.user-profile-container {
  padding: 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 58px);
}

.page-header {
  background: #fff;
  margin: -24px -24px 24px -24px;
  padding: 16px 24px;
}

.profile-content {
  max-width: 1400px;
  margin: 0 auto;
}

.avatar-card,
.info-card,
.edit-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.avatar-section {
  text-align: center;
  padding: 20px 0;
}

.avatar-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
  cursor: pointer;

  &:hover .avatar-upload-mask {
    opacity: 1;
  }
}

.user-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #f0f0f0;
}

.avatar-upload-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.3s ease;

  span {
    font-size: 12px;
    margin-top: 4px;
  }
}

.user-basic-info {
  margin-top: 16px;

  h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #1a1a1a;
  }

  .username {
    margin: 0 0 12px 0;
    color: #999;
    font-size: 14px;
  }
}

.status-tags {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
