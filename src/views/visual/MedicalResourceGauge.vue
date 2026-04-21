<template>
  <div class="gauge-wrapper" ref="gaugeContainer">
    <!-- 加载状态 -->
    <transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-content">
          <div class="spinner"></div>
          <span>加载数据中...</span>
        </div>
      </div>
    </transition>

    <!-- 主内容区域 -->
    <div class="gauge-container">
      <!-- 顶部操作栏 -->
      <div class="header-bar">
        <div class="title-section">
          <span class="title-mark" aria-hidden="true"></span>
          <span class="title">医疗资源监控</span>
        </div>
        <div class="action-section">
          <a-space>
            <a-radio-group v-model:value="viewMode" size="small">
              <a-radio-button value="cards">卡片视图</a-radio-button>
              <a-radio-button value="list">列表视图</a-radio-button>
            </a-radio-group>
            <a-button 
              type="primary" 
              size="small" 
              ghost
              @click="handleRefresh"
              :loading="refreshing"
            >
              <template #icon><ReloadOutlined /></template>
              刷新
            </a-button>
          </a-space>
        </div>
      </div>

      <!-- 卡片视图模式 -->
      <div v-if="viewMode === 'cards'" class="cards-view">
        <!-- 主要仪表盘 -->
        <div class="gauges-row">
          <div class="gauge-card" v-for="(resource, index) in resources" :key="index">
            <div class="card-header">
              <span class="gauge-name">{{ resource.name }}</span>
            </div>
            <div class="gauge-body">
              <div class="radial-progress" :style="getRadialStyle(resource)">
                <svg viewBox="0 0 100 100">
                  <circle class="progress-bg" cx="50" cy="50" r="40"></circle>
                  <circle 
                    class="progress-bar" 
                    cx="50" 
                    cy="50" 
                    r="40"
                    :stroke-dasharray="getDashArray(resource)"
                    :stroke="getProgressColor(resource)"
                  ></circle>
                </svg>
                <div class="progress-value">
                  <span class="number">{{ resource.value }}</span>
                  <span class="unit">%</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="stats-row">
                <span class="stat">
                  <span class="stat-label">已用</span>
                  <span class="stat-value">{{ resource.value }}%</span>
                </span>
                <span class="divider">|</span>
                <span class="stat">
                  <span class="stat-label">剩余</span>
                  <span class="stat-value">{{ resource.max - resource.value }}%</span>
                </span>
              </div>
              <div class="status-tag" :class="`status-${getStatusLevel(resource)}`">
                {{ getStatusText(resource) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 趋势和统计区域 -->
        <div class="details-row">
          <!-- 趋势图 -->
          <div class="trend-card">
            <div class="card-title">
              <span>24小时趋势</span>
              <a-select v-model:value="selectedTrend" size="small" style="width: 110px">
                <a-select-option value="bed">床位</a-select-option>
                <a-select-option value="icu">ICU</a-select-option>
                <a-select-option value="equipment">设备</a-select-option>
              </a-select>
            </div>
            <div class="trend-chart">
              <div class="bars-container">
                <div 
                  v-for="(bar, index) in trendBars" 
                  :key="index"
                  class="bar-item"
                  :style="{ height: bar.height + '%' }"
                ></div>
              </div>
              <div class="labels-row">
                <span v-for="(label, index) in trendLabels" :key="index">{{ label }}</span>
              </div>
            </div>
          </div>

          <!-- 关键指标 -->
          <div class="stats-card">
            <div class="card-title">
              <span>关键指标</span>
            </div>
            <div class="stats-list">
              <div class="stat-row" v-for="(stat, index) in keyStats" :key="index">
                <div class="stat-info">
                  <span class="stat-name">{{ stat.name }}</span>
                  <span class="stat-num" :class="`trend-${stat.trend}`">
                    {{ stat.value }}
                    <span v-if="stat.change" class="stat-change">{{ stat.change }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 列表视图模式 -->
      <div v-else class="list-view">
        <a-table 
          :columns="listColumns" 
          :data-source="resources" 
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="list-name">
                <span>{{ record.name }}</span>
              </div>
            </template>
            
            <template v-if="column.key === 'progress'">
              <a-progress 
                :percent="record.value" 
                :status="getAntStatus(record)"
                :stroke-color="getProgressColor(record)"
                :show-info="false"
                style="width: 150px"
              />
              <span style="margin-left: 8px; color: rgba(255,255,255,0.7)">{{ record.value }}%</span>
            </template>
            
            <template v-if="column.key === 'status'">
              <a-tag :color="getAntTagColor(record)" style="margin: 0">
                {{ getStatusText(record) }}
              </a-tag>
            </template>
          </template>
        </a-table>
      </div>

      <!-- 底部信息 -->
      <div class="footer-bar">
        <span class="update-time">最后更新: {{ lastUpdateTime }}</span>
        <div class="footer-actions">
          <a-button type="link" size="small">查看详情</a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import dataAPI from '../../api/data';

const isLoading = ref(false);
const refreshing = ref(false);
const viewMode = ref('cards');
const selectedTrend = ref('bed');
const lastUpdateTime = ref('--');

const resources = ref([
  { name: '床位使用率', value: 0, max: 100 },
  { name: 'ICU使用率', value: 0, max: 100 },
  { name: '设备运行率', value: 0, max: 100 }
]);

const keyStats = ref([
  { name: '实时在院', value: '0', trend: 'neutral', change: '' },
  { name: '今日出院', value: '0', trend: 'neutral', change: '' },
  { name: '待手术', value: '0', trend: 'neutral', change: '' },
  { name: '药品预警', value: '0', trend: 'neutral', change: '' }
]);

const trendBars = ref([
  { height: 0 }, { height: 0 }, { height: 0 }, { height: 0 }, { height: 0 },
  { height: 0 }, { height: 0 }, { height: 0 }, { height: 0 }, { height: 0 },
  { height: 0 }, { height: 0 }
]);

const trendLabels = ref(['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22']);

const listColumns = [
  { title: '资源名称', key: 'name', width: 180 },
  { title: '使用率', key: 'progress', width: 200 },
  { title: '状态', key: 'status', width: 100 }
];

const getRadialStyle = (resource) => {
  return {
    '--progress': `${resource.value}%`
  };
};

const getDashArray = (resource) => {
  const circumference = 2 * Math.PI * 40;
  return `${circumference} ${circumference}`;
};

const getProgressColor = (resource) => {
  const percentage = resource.value / resource.max;
  if (percentage >= 0.85) return '#ee6666';
  if (percentage >= 0.70) return '#faad14';
  if (percentage >= 0.45) return '#91cc75';
  return '#4fc3f7';
};

const getStatusLevel = (resource) => {
  const percentage = resource.value / resource.max;
  if (percentage >= 0.85) return 'danger';
  if (percentage >= 0.70) return 'warning';
  return 'normal';
};

const getStatusText = (resource) => {
  const percentage = resource.value / resource.max;
  if (percentage >= 0.85) return '高负载';
  if (percentage >= 0.70) return '中等负载';
  if (percentage >= 0.45) return '正常';
  return '低负载';
};

const getAntStatus = (resource) => {
  const percentage = resource.value / resource.max;
  if (percentage >= 0.85) return 'exception';
  if (percentage >= 0.70) return 'active';
  return 'normal';
};

const getAntTagColor = (resource) => {
  const percentage = resource.value / resource.max;
  if (percentage >= 0.85) return 'red';
  if (percentage >= 0.70) return 'orange';
  if (percentage >= 0.45) return 'green';
  return 'blue';
};

const handleRefresh = () => {
  refreshing.value = true;
  message.info('正在刷新数据...');

  loadResourceData()
    .then(() => {
      lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN');
      message.success('刷新成功');
    })
    .catch(() => {
      message.error('刷新失败');
    })
    .finally(() => {
      refreshing.value = false;
    });
};

const loadResourceData = async () => {
  const [overviewRes, realtimeRes, activeRes] = await Promise.all([
    dataAPI.getOverview(),
    dataAPI.getRealtimeData(),
    dataAPI.getActiveUsers()
  ])

  const overviewList = overviewRes?.success ? (overviewRes.data?.data || overviewRes.data || []) : []
  const getIndicator = (name) => Number(overviewList.find((item) => item.indicator_name === name)?.indicator_value || 0)
  const totalConsultations = getIndicator('问诊总量')
  const totalHospitals = getIndicator('医院总数')
  const totalDoctors = getIndicator('医生总数')

  resources.value = [
    { name: '床位使用率', value: Math.min(100, totalHospitals > 0 ? Math.round((totalConsultations / totalHospitals) % 100) : 0), max: 100 },
    { name: 'ICU使用率', value: Math.min(100, totalDoctors > 0 ? Math.round((totalConsultations / totalDoctors) * 10) : 0), max: 100 },
    { name: '设备运行率', value: Math.min(100, totalConsultations > 0 ? Math.round((totalDoctors / totalConsultations) * 10000) : 0), max: 100 }
  ]

  const activeUsers = activeRes?.success ? Number(activeRes.data?.today_active || 0) : 0
  keyStats.value = [
    { name: '实时在院', value: String(totalHospitals), trend: 'neutral', change: '' },
    { name: '今日出院', value: String(activeUsers), trend: 'neutral', change: '' },
    { name: '待手术', value: String(totalDoctors), trend: 'neutral', change: '' },
    { name: '药品预警', value: String(Math.max(0, 100 - resources.value[2].value)), trend: 'neutral', change: '' }
  ]

  const realtimeList = realtimeRes?.success ? (realtimeRes.data?.list || realtimeRes.data?.data?.list || []) : []
  if (realtimeList.length > 0) {
    const values = realtimeList.map((item) => Number(item.value || 0))
    const maxValue = Math.max(...values, 1)
    trendBars.value = values.slice(-12).map((value) => ({ height: Math.round((value / maxValue) * 100) }))
  }
}

let updateTimer = null;

onMounted(() => {
  lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN');
  loadResourceData().catch(() => {});
  updateTimer = setInterval(() => {
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN');
  }, 60000);
});

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
});
</script>

<style scoped lang="less">
.gauge-wrapper {
  position: relative;
  width: 100%;
  min-height: 420px;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(11, 61, 145, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 12px;

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(79, 195, 255, 0.2);
      border-top-color: #4fc3ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    span {
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
    }
  }
}

.gauge-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(79, 195, 255, 0.06) 0%, rgba(79, 195, 255, 0.02) 100%);
  border-radius: 12px;
  border: 1px solid rgba(79, 195, 255, 0.12);
  overflow: hidden;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(79, 195, 255, 0.08);

  .title-section {
    display: flex;
    align-items: center;
    gap: 8px;

    .title-mark {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      background: linear-gradient(135deg, #4fc3ff, #00d4aa);
      box-shadow: 0 0 10px rgba(79, 195, 255, 0.45);
    }

    .title {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
    }
  }
}

.cards-view {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.gauges-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.gauge-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;

    .gauge-name {
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
    }
  }

  .gauge-body {
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
  }

  .card-footer {
    .stats-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 11px;

      .stat {
        color: rgba(255, 255, 255, 0.5);

        .stat-value {
          color: #4fc3ff;
          font-weight: 600;
          margin-left: 3px;
        }
      }

      .divider {
        color: rgba(255, 255, 255, 0.15);
      }
    }

    .status-tag {
      text-align: center;
      font-size: 10px;
      padding: 3px 10px;
      border-radius: 8px;

      &.status-danger {
        background: rgba(238, 102, 102, 0.12);
        color: #ee6666;
      }

      &.status-warning {
        background: rgba(250, 173, 20, 0.12);
        color: #faad14;
      }

      &.status-normal {
        background: rgba(145, 204, 117, 0.12);
        color: #91cc75;
      }
    }
  }
}

.radial-progress {
  position: relative;
  width: 100px;
  height: 100px;

  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .progress-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 6;
  }

  .progress-bar {
    fill: none;
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s ease;
    stroke-dashoffset: 0;
  }

  .progress-value {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;

    .number {
      font-size: 24px;
      font-weight: 700;
      color: #4fc3ff;
      font-family: 'DIN Alternate', monospace;
    }

    .unit {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.45);
      margin-left: 2px;
    }
  }
}

.details-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 12px;
}

.trend-card,
.stats-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  span {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
  }
}

.trend-chart {
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;

  .bars-container {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 75px;
    gap: 3px;

    .bar-item {
      flex: 1;
      background: linear-gradient(180deg, #4fc3ff 0%, #4fc3ff25 100%);
      border-radius: 3px 3px 0 0;
      transition: height 0.5s ease;
      min-height: 3px;

      &:hover {
        background: linear-gradient(180deg, #00d4aa 0%, #00d4aa25 100%);
      }
    }
  }

  .labels-row {
    display: flex;
    justify-content: space-between;
    gap: 3px;

    span {
      flex: 1;
      text-align: center;
      font-size: 9px;
      color: rgba(255, 255, 255, 0.35);
    }
  }
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;

  .stat-info {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .stat-name {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
    }

    .stat-num {
      font-size: 13px;
      font-weight: 600;
      color: #4fc3ff;

      &.trend-up {
        color: #ee6666;
      }

      &.trend-down {
        color: #91cc75;
      }

      .stat-change {
        font-size: 10px;
        margin-left: 3px;
        opacity: 0.75;
      }
    }
  }
}

.list-view {
  flex: 1;
  padding: 16px;
  overflow-y: auto;

  :deep(.ant-table) {
    background: transparent;

    .ant-table-thead > tr > th {
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(79, 195, 255, 0.08);
      color: rgba(255, 255, 255, 0.6);
    }

    .ant-table-tbody > tr > td {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: rgba(255, 255, 255, 0.8);
    }

    .ant-table-tbody > tr:hover > td {
      background: rgba(255, 255, 255, 0.03);
    }
  }
}

.list-name {
  display: flex;
  align-items: center;
}

.footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(79, 195, 255, 0.08);

  .update-time {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.35);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1400px) {
  .gauges-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1200px) {
  .details-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .gauges-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .header-bar {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .action-section {
    width: 100%;
    
    .ant-space {
      width: 100%;
      justify-content: flex-start;
    }
  }
}
</style>
