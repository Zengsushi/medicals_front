<template>
  <div class="error-boundary">
    <div v-if="error" class="error-container">
      <div class="error-icon">
        <WarningOutlined />
      </div>
      <h2 class="error-title">页面出错了</h2>
      <p class="error-message">{{ errorMessage }}</p>

      <div class="error-actions">
        <a-button type="primary" size="large" @click="handleReload">
          <template #icon><ReloadOutlined /></template>
          重新加载
        </a-button>
        <a-button size="large" @click="handleGoHome">
          <template #icon><HomeOutlined /></template>
          返回首页
        </a-button>
      </div>

      <details class="error-details" v-if="showDetails && errorDetails">
        <summary>技术详情（仅开发模式显示）</summary>
        <pre class="error-stack">{{ errorDetails }}</pre>
      </details>
    </div>

    <slot v-else />
  </div>
</template>

<script setup>
import { ref, computed, onErrorCaptured } from 'vue';
import { useRouter } from 'vue-router';
import { WarningOutlined, ReloadOutlined, HomeOutlined } from '@ant-design/icons-vue';

const props = defineProps({
  showDetails: {
    type: Boolean,
    default: import.meta.env.DEV
  },
  fallback: {
    type: String,
    default: '页面加载失败，请刷新重试'
  }
});

const router = useRouter();
const error = ref(null);
const errorInfo = ref(null);

const errorMessage = computed(() => {
  if (!error.value) return props.fallback;

  if (error.value?.userMessage) {
    return error.value.userMessage;
  }

  if (error.value?.message) {
    return error.value.message;
  }

  return props.fallback;
});

const errorDetails = computed(() => {
  if (!error.value) return null;

  const details = [];

  if (error.value.message) {
    details.push(`Error: ${error.value.message}`);
  }

  if (error.value.stack) {
    details.push(`\nStack:\n${error.value.stack}`);
  }

  if (errorInfo.value) {
    details.push(`\nComponent Info:\n${JSON.stringify(errorInfo.value, null, 2)}`);
  }

  return details.join('\n');
});

onErrorCaptured((err, instance, info) => {
  console.error('[ErrorBoundary] 捕获到错误:', err);
  console.error('[ErrorBoundary] 组件信息:', info);

  error.value = err;
  errorInfo.value = info;

  return false;
});

const handleReload = () => {
  error.value = null;
  errorInfo.value = null;
  window.location.reload();
};

const handleGoHome = () => {
  error.value = null;
  errorInfo.value = null;
  router.push('/');
};
</script>

<style scoped lang="less">
.error-boundary {
  min-height: 100%;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 140px);
  padding: 48px;
  text-align: center;
  animation: slideUp 0.5s ease-out;
}

.error-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: white;
  margin-bottom: 32px;
  box-shadow: 0 8px 24px rgba(238, 90, 111, 0.3);
  animation: shake 0.5s ease-in-out;
}

.error-title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin: 0 0 16px 0;
}

.error-message {
  font-size: 16px;
  color: #666;
  margin: 0 0 32px 0;
  max-width: 500px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;

  .ant-btn {
    height: 48px;
    padding: 0 32px;
    font-size: 15px;
    font-weight: 600;
    border-radius: 10px;
  }
}

.error-details {
  width: 100%;
  max-width: 700px;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 20px;
  text-align: left;

  summary {
    cursor: pointer;
    font-size: 14px;
    color: #999;
    font-weight: 500;
    outline: none;

    &:hover {
      color: #666;
    }
  }

  .error-stack {
    margin-top: 16px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: #e74c3c;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@media (max-width: 768px) {
  .error-container {
    padding: 24px;
  }

  .error-icon {
    width: 72px;
    height: 72px;
    font-size: 36px;
  }

  .error-title {
    font-size: 22px;
  }

  .error-message {
    font-size: 14px;
  }

  .error-actions {
    flex-direction: column;
    width: 100%;

    .ant-btn {
      width: 100%;
    }
  }
}
</style>
