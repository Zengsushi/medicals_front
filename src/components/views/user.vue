<template>
  <div class="user-container">
    <template v-if="isLoggedIn">
      <a-dropdown
        trigger="hover"
        placement="bottom"
        :arrow="{ pointAtCenter: true }"
        class="us_icon"
      >
        <div class="user-info">
          <a-avatar
            :src="avatarSrc"
            :shape="avatarShape"
            :size="props.size"
            style="cursor: pointer"
            class="avatar_from"
          >
            {{
              user.nickname
                ? user.nickname.charAt(0)
                : user.username
                  ? user.username.charAt(0).toUpperCase()
                  : "U"
            }}
          </a-avatar>
          <div class="user_name">{{ user.nickname || user.username || "" }}</div>
        </div>
        <template #overlay>
          <a-menu>
            <a-menu-item key="profile" @click="goToProfile">
              <UserOutlined /> 个人中心
            </a-menu-item>
            <a-menu-item key="settings" @click="goToSettings">
              <SettingOutlined /> 设置
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="logout" @click="handleLogout">
              <LogoutOutlined /> 退出登录
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </template>
    <template v-else>
      <a-button
        type="primary"
        size="small"
        @click="handleLogin"
        class="login-btn"
      >
        <LoginOutlined /> 登录
      </a-button>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  LoginOutlined,
} from "@ant-design/icons-vue";
import { isLoggedIn as checkLoggedIn, getUserInfo } from '../../utils/userUtil';
import { useAuthStore } from '../../stores/auth';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

const props = defineProps({
  size: {
    type: Number,
    default: 40,
  },
  shape: {
    type: Boolean,
    default: true,
  },
});

const router = useRouter();
const emit = defineEmits(["logout", "login", "userdetail"]);
const authStore = useAuthStore();

const isLoggedIn = computed(() => checkLoggedIn());
const tokenUser = computed(() => getUserInfo());

const user = computed(() => {
  const info = authStore.userInfo;
  const id = info?.id ?? tokenUser.value?.id ?? null;
  const username = info?.username ?? tokenUser.value?.username ?? '';
  const rawAvatar = info?.avatar ?? '';
  return {
    id,
    username,
    nickname: username,
    email: info?.email ?? '',
    phone: info?.phone ?? '',
    avatar: resolveMediaUrl(rawAvatar)
  };
});

/** 空字符串会导致 ant-avatar 请求当前页作图片，需用 undefined 走字母占位 */
const avatarSrc = computed(() => user.value.avatar || undefined);

const avatarShape = computed(() => (props.shape ? "circle" : "square"));

const handleLogin = () => {
  emit("login");
};

const goToProfile = () => {
  emit("userdetail");
  router.push({ name: 'userPersonalCenter' }).catch(() => {});
};

const goToSettings = () => {
  router.push({ name: 'userSelfProfile' }).catch(() => {});
};

const handleLogout = () => {
  emit("logout");
};
</script>

<style scoped>
.user-container {
  display: flex;
  align-items: center;
}

.us_icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.avatar_from {
  transition: transform 0.3s ease;
  transform: scale(1.05);
}

.avatar_from:hover {
  transform: scale(1.1);
}

.user_name {
  font-size: 14px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
