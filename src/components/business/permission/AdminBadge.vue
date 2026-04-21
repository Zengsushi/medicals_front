<template>
  <div class="admin-badge" :class="[type, size]" v-if="visible">
    <CrownOutlined v-if="type === 'crown'" />
    <SafetyCertificateOutlined v-else-if="type === 'shield'" />
    <StarOutlined v-else-if="type === 'star'" />
    <SettingOutlined v-else />
    <span class="badge-text" v-if="showText">
      {{ roleText }}
    </span>
    <span class="badge-tip" v-if="tooltip">
      <a-tooltip>
        <template #title>{{ tooltip }}</template>
        <QuestionCircleOutlined class="tip-icon" />
      </a-tooltip>
    </span>
  </div>
</template>

<script setup>
import {
  CrownOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
  SettingOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons-vue';
import { computed } from 'vue';
import { useAuthStore } from '../../../stores/auth';

const props = defineProps({
  type: {
    type: String,
    default: 'crown',
    validator: (val) => ['crown', 'shield', 'star', 'gear'].includes(val)
  },
  size: {
    type: String,
    default: 'default',
    validator: (val) => ['small', 'default', 'large'].includes(val)
  },
  showText: {
    type: Boolean,
    default: false
  },
  tooltip: {
    type: String,
    default: null
  },
  autoHide: {
    type: Boolean,
    default: true
  }
});

const authStore = useAuthStore();

const visible = computed(() => {
  if (!props.autoHide) return true;
  return authStore.isAdmin;
});

const roleText = computed(() => {
  const role = authStore.roles[0];
  const roleMap = {
    'superadmin': '超级管理员',
    'admin': '管理员',
    'manager': '经理',
    'user': '用户',
    'guest': '访客'
  };
  return roleMap[role] || '未知角色';
});
</script>

<style scoped>
.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s;
}

.admin-badge.crown {
  background: linear-gradient(135deg, #ffd700, #ffb347);
  color: #7c5700;
}

.admin-badge.shield {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.admin-badge.star {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: #fff;
}

.admin-badge.gear {
  background: #f0f0f0;
  color: #666;
}

.admin-badge.small {
  padding: 2px 6px;
  font-size: 10px;
  gap: 2px;
}

.admin-badge.small .anticon {
  font-size: 10px;
}

.admin-badge.large {
  padding: 6px 14px;
  font-size: 14px;
}

.admin-badge.large .anticon {
  font-size: 16px;
}

.badge-text {
  margin-left: 2px;
}

.badge-tip {
  margin-left: 4px;
  opacity: 0.7;
}

.badge-tip:hover {
  opacity: 1;
}

.tip-icon {
  cursor: help;
}

:deep(.admin-badge) {
  cursor: default;
}
</style>