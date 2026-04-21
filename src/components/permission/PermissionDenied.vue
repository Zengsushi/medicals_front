<template>
  <div class="permission-denied" :class="{ 'compact': compact }">
    <div class="denied-icon">
      <LockOutlined />
    </div>
    <div class="denied-content">
      <h4 class="denied-title">{{ title }}</h4>
      <p class="denied-message">{{ message }}</p>

      <div class="denied-actions" v-if="showAction">
        <a-button type="link" @click="handleContactAdmin">
          <ContactOutlined />
          联系管理员申请权限
        </a-button>
        <a-button type="link" @click="handleGoBack" v-if="showGoBack">
          <ArrowLeftOutlined />
          返回上一页
        </a-button>
      </div>
    </div>

    <div class="required-permissions" v-if="requiredPermissions && requiredPermissions.length > 0">
      <a-divider v-if="!compact" />
      <div class="permissions-list">
        <span class="permissions-label">需要权限:</span>
        <a-tag v-for="perm in requiredPermissions" :key="perm" color="orange">
          {{ perm }}
        </a-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  LockOutlined,
  ContactOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  title: {
    type: String,
    default: '权限不足'
  },
  message: {
    type: String,
    default: '您没有执行此操作的权限，请联系管理员申请。'
  },
  requiredPermissions: {
    type: Array,
    default: null
  },
  compact: {
    type: Boolean,
    default: false
  },
  showAction: {
    type: Boolean,
    default: true
  },
  showGoBack: {
    type: Boolean,
    default: true
  },
  redirectTo: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['contact-admin', 'go-back']);

const router = useRouter();

const handleContactAdmin = () => {
  emit('contact-admin');
};

const handleGoBack = () => {
  emit('go-back');
  if (props.redirectTo) {
    router.push(props.redirectTo);
  } else {
    router.back();
  }
};
</script>

<style scoped>
.permission-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #d9d9d9;
}

.permission-denied.compact {
  padding: 20px;
  flex-direction: row;
  gap: 16px;
  text-align: left;
}

.denied-icon {
  font-size: 48px;
  color: #ff4d4f;
  margin-bottom: 16px;
}

.compact .denied-icon {
  font-size: 32px;
  margin-bottom: 0;
}

.denied-content {
  max-width: 400px;
}

.denied-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.compact .denied-title {
  font-size: 14px;
  margin: 0 0 4px;
}

.denied-message {
  margin: 0 0 16px;
  font-size: 14px;
  color: #666;
}

.compact .denied-message {
  font-size: 12px;
  margin: 0;
}

.denied-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.required-permissions {
  margin-top: 16px;
  width: 100%;
}

.permissions-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.compact .permissions-list {
  justify-content: flex-start;
}

.permissions-label {
  font-size: 12px;
  color: #999;
}
</style>
