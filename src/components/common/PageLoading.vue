<template>
  <div v-if="visible" class="page-loading-overlay">
    <div class="loading-container">
      <div class="loading-spinner">
        <a-spin size="large" :tip="loadingText" />
      </div>
      <div class="loading-text" v-if="loadingText">{{ loadingText }}</div>
      <div class="loading-progress" v-if="showProgress">
        <a-progress
          :percent="progress"
          :status="progressStatus"
          :stroke-color="{ '0%': '#667eea', '100%': '#764ba2' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: '加载中...'
  },
  showProgress: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0
  },
  progressStatus: {
    type: String,
    default: 'active'
  }
});
</script>

<style scoped lang="less">
.page-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-out;

  .loading-container {
    text-align: center;
    padding: 48px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);

    .loading-spinner {
      margin-bottom: 24px;

      :deep(.ant-spin-text) {
        font-size: 16px;
        color: #666;
        margin-top: 16px;
      }
    }

    .loading-text {
      font-size: 16px;
      color: #666;
      margin-bottom: 20px;
      font-weight: 500;
    }

    .loading-progress {
      width: 300px;
      margin: 0 auto;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
