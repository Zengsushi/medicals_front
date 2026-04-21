<template>
  <a-dropdown class="user-dropdown" :trigger="['click']">
    <div class="user-trigger">
      <a-badge :dot="hasNotification" :offset="[-2, 2]">
        <Avatar :src="avatar" :size="size" class="user-avatar">
          {{ userName?.charAt(0) || 'U' }}
        </Avatar>
      </a-badge>
      <div class="user-info" v-if="showInfo">
        <span class="user-name">{{ userName }}</span>
        <span class="user-role">
          <AdminBadge v-if="isAdmin" type="crown" size="small" :show-text="true" />
          <span v-else>{{ roleName }}</span>
        </span>
      </div>
      <DownOutlined v-if="showArrow" class="dropdown-arrow" />
    </div>

    <template #overlay>
      <a-menu class="user-dropdown-menu">
        <div class="dropdown-header" v-if="showDropdownHeader">
          <Avatar :src="avatar" :size="40">{{ userName?.charAt(0) || 'U' }}</Avatar>
          <div class="header-info">
            <div class="header-name">{{ userName }}</div>
            <div class="header-role">
              <AdminBadge v-if="isAdmin" type="crown" size="small" :show-text="true" />
              <span v-else>{{ roleName }}</span>
            </div>
          </div>
        </div>

        <a-menu-divider v-if="showDropdownHeader" />

        <div class="dropdown-section" v-if="hasMultipleRoles">
          <div class="section-title">切换角色</div>
          <a-menu-item
            v-for="role in availableRoles"
            :key="role.code"
            @click="handleSwitchRole(role.code)"
            :class="{ 'role-item-active': role.code === currentRole }"
          >
            <div class="role-item">
              <component :is="getRoleIcon(role.code)" class="role-icon" />
              <span class="role-name">{{ role.name }}</span>
              <CheckOutlined v-if="role.code === currentRole" class="role-check" />
            </div>
          </a-menu-item>
          <a-menu-divider />
        </div>

        <a-menu-item key="profile" @click="handleProfile">
          <UserOutlined />
          <span>个人中心</span>
        </a-menu-item>

        <a-menu-item key="settings" @click="handleSettings">
          <SettingOutlined />
          <span>账号设置</span>
        </a-menu-item>

        <a-menu-item key="devices" @click="handleDevices" v-if="showDevices">
          <MobileOutlined />
          <span>登录设备</span>
          <a-tag color="blue" size="small" class="device-count" v-if="deviceCount > 0">
            {{ deviceCount }}
          </a-tag>
        </a-menu-item>

        <a-menu-divider />

        <a-menu-item key="logout" class="logout-item" @click="handleLogout">
          <LogoutOutlined />
          <span>退出登录</span>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup>
import { computed } from 'vue';
import {
  DownOutlined,
  UserOutlined,
  SettingOutlined,
  MobileOutlined,
  LogoutOutlined,
  CheckOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  StarOutlined
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';
import Avatar from './Avatar.vue';
import AdminBadge from './AdminBadge.vue';
import { useAuthStore } from '../../../stores/auth';

const props = defineProps({
  avatar: {
    type: String,
    default: ''
  },
  userName: {
    type: String,
    default: ''
  },
  userId: {
    type: [String, Number],
    default: ''
  },
  size: {
    type: String,
    default: 'default'
  },
  showInfo: {
    type: Boolean,
    default: false
  },
  showArrow: {
    type: Boolean,
    default: true
  },
  showDropdownHeader: {
    type: Boolean,
    default: true
  },
  showDevices: {
    type: Boolean,
    default: true
  },
  hasNotification: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'switch-role',
  'profile',
  'settings',
  'devices',
  'logout'
]);

const router = useRouter();
const authStore = useAuthStore();

const currentRole = computed(() => authStore.roles[0]);
const isAdmin = computed(() => authStore.isAdmin);

const roleNameMap = {
  'superadmin': '超级管理员',
  'admin': '管理员',
  'manager': '经理',
  'user': '普通用户',
  'guest': '访客'
};

const roleName = computed(() => roleNameMap[currentRole.value] || '未知角色');

const availableRoles = computed(() => {
  const roles = authStore.roles;
  if (roles && roles.length > 0) {
    return roles.map(r => ({ code: r, name: roleNameMap[r] || r }));
  }
  return [
    { code: 'user', name: '普通用户' },
    { code: 'admin', name: '管理员' }
  ];
});

const hasMultipleRoles = computed(() => {
  return availableRoles.value.length > 1;
});

const deviceCount = computed(() => {
  const devices = localStorage.getItem('loginDevices');
  try {
    return devices ? JSON.parse(devices).length : 0;
  } catch {
    return 0;
  }
});

const getRoleIcon = (roleCode) => {
  const iconMap = {
    'superadmin': CrownOutlined,
    'admin': SafetyCertificateOutlined,
    'manager': StarOutlined,
    'user': UserOutlined,
    'guest': UserOutlined
  };
  return iconMap[roleCode] || UserOutlined;
};

const handleSwitchRole = (roleCode) => {
  emit('switch-role', roleCode);
};

const handleProfile = () => {
  emit('profile');
  router.push({ name: 'userPersonalCenter' });
};

const handleSettings = () => {
  emit('settings');
  router.push({ name: 'userSelfProfile' });
};

const handleDevices = () => {
  emit('devices');
};

const handleLogout = () => {
  emit('logout');
};
</script>

<style scoped>
.user-dropdown {
  cursor: pointer;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.3s;
}

.user-trigger:hover {
  background: rgba(0, 0, 0, 0.04);
}

.user-avatar {
  cursor: pointer;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 1.2;
}

.user-role {
  font-size: 12px;
  color: #999;
  line-height: 1.2;
}

.dropdown-arrow {
  font-size: 10px;
  color: #999;
  transition: transform 0.3s;
}

.user-dropdown:hover .dropdown-arrow {
  transform: rotate(180deg);
}

:deep(.user-dropdown-menu) {
  min-width: 220px;
  padding: 8px 0;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.header-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.header-role {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.dropdown-section {
  padding: 4px 0;
}

.section-title {
  padding: 8px 16px 4px;
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.role-icon {
  font-size: 14px;
}

.role-name {
  flex: 1;
}

.role-check {
  color: #1890ff;
  font-size: 12px;
}

.role-item-active {
  background: #e6f7ff;
}

.device-count {
  margin-left: auto;
}

.logout-item {
  color: #ff4d4f;
}

.logout-item:hover {
  color: #ff4d4f !important;
  background: #fff1f0 !important;
}
</style>