<template>
  <div class="route-loading-container">
    <div class="route-loading-content">
      <a-spin :size="size" :tip="tip">
        <template #indicator>
          <LoadingOutlined :style="{ fontSize: size === 'large' ? 48 : 32, color: '#1890ff' }" />
        </template>
      </a-spin>
      <div v-if="showProgress" class="loading-progress">
        <a-progress
          :percent="progress"
          :status="progressStatus"
          :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }"
          :show-info="false"
        />
      </div>
      <p v-if="tip" class="loading-tip">{{ tip }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { LoadingOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  size: {
    type: String,
    default: 'large',
    validator: (val) => ['small', 'default', 'large'].includes(val)
  },
  tip: {
    type: String,
    default: '页面加载中...'
  },
  showProgress: {
    type: Boolean,
    default: true
  },
  duration: {
    type: Number,
    default: 3000
  }
})

const progress = ref(0)
const progressStatus = ref('active')
let timer = null
let progressTimer = null

onMounted(() => {
  const step = 100 / (props.duration / 100)

  progressTimer = setInterval(() => {
    if (progress.value < 90) {
      progress.value = Math.min(progress.value + step, 90)
    }
  }, 100)

  timer = setTimeout(() => {
    progress.value = 100
    progressStatus.value = 'success'
  }, props.duration)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
  if (progressTimer) clearInterval(progressTimer)
})
</script>

<style scoped>
.route-loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  width: 100%;
}

.route-loading-content {
  text-align: center;
  padding: 40px 20px;
}

.loading-progress {
  margin-top: 24px;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.loading-tip {
  margin-top: 16px;
  color: #999;
  font-size: 14px;
}
</style>