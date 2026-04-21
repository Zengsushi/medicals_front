<template>
  <div class="warning-panel">
    <div class="panel-header">
      <div class="header-left">
        <div class="warning-icon">⚠</div>
        <div class="header-text">
          <h3>医疗风险预警</h3>
          <span class="subtitle">实时监控系统风险</span>
        </div>
      </div>
      <div class="header-right">
        <span class="warning-count">{{ warnings.length }} 条预警</span>
        <a-button 
          type="text" 
          size="small"
          @click="handleRefresh"
          :loading="refreshing"
        >
          <template #icon><ReloadOutlined /></template>
        </a-button>
      </div>
    </div>

    <div class="warning-list">
      <TransitionGroup name="warning-list" tag="div">
        <div
          v-for="(item, index) in warnings"
          :key="index"
          class="warning-item"
          :class="`level-${item.level}`"
        >
          <div class="item-icon">
            <span v-if="item.level === 'high'" class="icon-high">🚨</span>
            <span v-else-if="item.level === 'medium'" class="icon-medium">⚠</span>
            <span v-else class="icon-low">ℹ</span>
          </div>
          <div class="item-content">
            <div class="item-title">{{ item.title }}</div>
            <div class="item-desc">{{ item.description }}</div>
          </div>
          <div class="item-meta">
            <span class="item-time">{{ item.time }}</span>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <div v-if="warnings.length === 0" class="no-warning">
      <div class="no-warning-icon">✅</div>
      <span>暂无预警信息</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ReloadOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import dataAPI from '../../api/data';

const refreshing = ref(false);
const timer = ref(null);

const warnings = ref([
  {
    level: 'low',
    title: '暂无预警',
    description: '等待后端实时数据...',
    time: '刚刚'
  }
]);

const handleRefresh = () => {
  refreshing.value = true;
  message.info('正在刷新预警数据...');

  updateWarnings()
    .then(() => {
      message.success('刷新成功');
    })
    .catch(() => {
      message.error('刷新失败');
    })
    .finally(() => {
      refreshing.value = false;
    });
};

const updateWarnings = async () => {
  const [realtimeRes, activeRes] = await Promise.all([
    dataAPI.getRealtimeData(),
    dataAPI.getActiveUsers()
  ])
  const realtimeList = realtimeRes?.success ? (realtimeRes.data?.list || realtimeRes.data?.data?.list || []) : []
  const latestValue = realtimeList.length > 0 ? Number(realtimeList[realtimeList.length - 1].value || 0) : 0
  const activeUsers = activeRes?.success ? Number(activeRes.data?.today_active || 0) : 0

  const nextWarnings = []
  if (latestValue >= 10000) {
    nextWarnings.push({
      level: 'high',
      title: '问诊流量高负载',
      description: `最近时段问诊量达到 ${latestValue}，建议关注服务容量`,
      time: '刚刚'
    })
  }
  if (activeUsers >= 100) {
    nextWarnings.push({
      level: 'medium',
      title: '活跃用户快速增长',
      description: `今日活跃用户 ${activeUsers}，请关注系统并发稳定性`,
      time: '刚刚'
    })
  }
  if (nextWarnings.length === 0) {
    nextWarnings.push({
      level: 'low',
      title: '运行状态平稳',
      description: '当前未触发高优先级预警',
      time: '刚刚'
    })
  }

  warnings.value = nextWarnings;
};

onMounted(() => {
  updateWarnings().catch(() => {});
  timer.value = setInterval(() => {
    updateWarnings().catch(() => {});
  }, 30000);
});

onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value);
  }
});
</script>

<style scoped lang="less">
.warning-panel {
  margin-top: 20px;
  background: linear-gradient(135deg, rgba(255, 120, 117, 0.1) 0%, rgba(255, 120, 117, 0.05) 100%);
  padding: 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 120, 117, 0.2);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ff7875, transparent);
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.warning-icon {
  font-size: 28px;
  animation: iconPulse 2s ease-in-out infinite;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-text h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #ff7875;
  letter-spacing: 1px;
}

.subtitle {
  font-size: 12px;
  color: rgba(255, 120, 117, 0.6);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.warning-count {
  font-size: 14px;
  color: rgba(255, 120, 117, 0.8);
  padding: 4px 12px;
  background: rgba(255, 120, 117, 0.1);
  border-radius: 12px;
}

.warning-list {
  max-height: 200px;
  overflow-y: auto;
}

.warning-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border-left: 3px solid transparent;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateX(4px);
  }

  &.level-high {
    border-left-color: #ff4d4f;
  }

  &.level-medium {
    border-left-color: #faad14;
  }

  &.level-low {
    border-left-color: #1890ff;
  }
}

.item-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.item-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
}

.item-meta {
  flex-shrink: 0;
}

.item-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.no-warning {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: rgba(255, 255, 255, 0.5);
}

.no-warning-icon {
  font-size: 36px;
}

/* 动画效果 */
@keyframes iconPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.warning-list-enter-active {
  animation: warningEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.warning-list-leave-active {
  animation: warningLeave 0.3s cubic-bezier(0.55, 0, 1, 0.45);
}

@keyframes warningEnter {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes warningLeave {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}

/* 滚动条样式 */
.warning-list::-webkit-scrollbar {
  width: 6px;
}

.warning-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.warning-list::-webkit-scrollbar-thumb {
  background: rgba(255, 120, 117, 0.3);
  border-radius: 3px;

  &:hover {
    background: rgba(255, 120, 117, 0.5);
  }
}

@media (max-width: 768px) {
  .warning-panel {
    padding: 16px;
  }

  .header-text h3 {
    font-size: 16px;
  }

  .warning-item {
    padding: 10px 12px;
  }
}
</style>
