<template>
  <div class="data-monitor-container">
    <a-spin :spinning="loading">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">📊 数据监控中心</h2>
          <p class="page-desc">实时监控数据源健康状态、任务执行情况和系统性能</p>
        </div>
        <div class="header-right">
          <a-button @click="refreshMonitor">
            <template #icon><ReloadOutlined /></template>
            刷新数据
          </a-button>
          <a-button type="primary" @click="exportReport">
            <template #icon><DownloadOutlined /></template>
            导出报告
          </a-button>
        </div>
      </div>

      <!-- 状态概览 -->
      <a-row :gutter="[16, 16]" class="status-row">
        <a-col :xs="12" :sm="6">
          <a-card class="status-card card-green hoverable">
            <div class="card-content">
              <div class="card-icon"><CheckCircleOutlined /></div>
              <div class="card-info">
                <div class="card-value">{{ healthyDataSources }}</div>
                <div class="card-label">健康数据源</div>
              </div>
              <div class="card-percent" :style="{ color: healthyDataSourceRate > 80 ? '#52c41a' : healthyDataSourceRate > 50 ? '#fa8c16' : '#ff4d4f' }">
                {{ healthyDataSourceRate }}%
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="status-card card-blue hoverable">
            <div class="card-content">
              <div class="card-icon"><ScheduleOutlined /></div>
              <div class="card-info">
                <div class="card-value">{{ runningTasks }}</div>
                <div class="card-label">运行中任务</div>
              </div>
              <div class="card-percent" :style="{ color: runningTaskRate > 50 ? '#1677ff' : '#fa8c16' }">
                {{ runningTaskRate }}%
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="status-card card-orange hoverable">
            <div class="card-content">
              <div class="card-icon"><CheckCircleOutlined /></div>
              <div class="card-info">
                <div class="card-value">{{ successTasksToday }}</div>
                <div class="card-label">今日成功</div>
              </div>
              <div class="card-percent" :style="{ color: successTaskRate > 80 ? '#52c41a' : successTaskRate > 50 ? '#fa8c16' : '#ff4d4f' }">
                {{ successTaskRate }}%
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="status-card card-purple hoverable">
            <div class="card-content">
              <div class="card-icon"><AlertOutlined /></div>
              <div class="card-info">
                <div class="card-value">{{ alertCount }}</div>
                <div class="card-label">告警数量</div>
              </div>
              <div class="card-percent" :style="{ color: alertCount > 5 ? '#ff4d4f' : alertCount > 0 ? '#fa8c16' : '#52c41a' }">
                {{ alertLevel }}
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 监控面板 -->
      <a-row :gutter="[16, 16]" class="monitor-row">
        <!-- 数据源健康状态 -->
        <a-col :xs="24" :lg="12">
          <a-card class="monitor-card">
            <template #title>
              <div class="card-title">
                <DatabaseOutlined />
                数据源健康状态
              </div>
            </template>
            <div class="card-content">
              <a-table
                :columns="dataSourceColumns"
                :data-source="dataSources"
                :pagination="{ pageSize: 10 }"
                size="small"
                row-key="id"
                :row-class-name="(record) => getDataSourceRowClass(record)"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <div class="status-indicator" :class="record.status">
                      <span class="status-dot"></span>
                      <span class="status-text">{{ getDataSourceStatusText(record.status) }}</span>
                    </div>
                  </template>
                  <template v-if="column.key === 'actions'">
                    <a-space :size="4">
                      <a-button type="text" size="small" @click="handleTestDataSource(record)">
                        <SyncOutlined />
                      </a-button>
                      <a-button type="text" size="small" @click="handleViewDataSource(record)">
                        <EyeOutlined />
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>
          </a-card>
        </a-col>

        <!-- 任务执行情况 -->
        <a-col :xs="24" :lg="12">
          <a-card class="monitor-card">
            <template #title>
              <div class="card-title">
                <ScheduleOutlined />
                任务执行情况
              </div>
            </template>
            <div class="card-content">
              <a-table
                :columns="taskColumns"
                :data-source="recentTasks"
                :pagination="{ pageSize: 10 }"
                size="small"
                row-key="id"
                :row-class-name="(record) => getTaskRowClass(record)"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="getTaskStatusColor(record.status)">
                      {{ getTaskStatusText(record.status) }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'actions'">
                    <a-space :size="4">
                      <a-button type="text" size="small" @click="handleViewTask(record)">
                        <EyeOutlined />
                      </a-button>
                      <a-button type="text" size="small" v-if="record.status === 'failed'" @click="handleRetryTask(record)">
                        <ReloadOutlined />
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>
          </a-card>
        </a-col>

        <!-- 系统性能监控 -->
        <a-col :xs="24" :lg="12">
          <a-card class="monitor-card">
            <template #title>
              <div class="card-title">
                <MonitorOutlined />
                系统性能监控
              </div>
            </template>
            <div class="card-content">
              <div class="performance-metrics">
                <div class="metric-item">
                  <div class="metric-label">CPU 使用率</div>
                  <div class="metric-value" :style="{ color: cpuUsage > 80 ? '#ff4d4f' : cpuUsage > 50 ? '#fa8c16' : '#52c41a' }">
                    {{ cpuUsage }}%
                  </div>
                  <a-progress :percent="cpuUsage" :status="cpuUsage > 80 ? 'exception' : cpuUsage > 50 ? 'normal' : 'success'" size="small" />
                </div>
                <div class="metric-item">
                  <div class="metric-label">内存使用率</div>
                  <div class="metric-value" :style="{ color: memoryUsage > 80 ? '#ff4d4f' : memoryUsage > 50 ? '#fa8c16' : '#52c41a' }">
                    {{ memoryUsage }}%
                  </div>
                  <a-progress :percent="memoryUsage" :status="memoryUsage > 80 ? 'exception' : memoryUsage > 50 ? 'normal' : 'success'" size="small" />
                </div>
                <div class="metric-item">
                  <div class="metric-label">磁盘使用率</div>
                  <div class="metric-value" :style="{ color: diskUsage > 80 ? '#ff4d4f' : diskUsage > 50 ? '#fa8c16' : '#52c41a' }">
                    {{ diskUsage }}%
                  </div>
                  <a-progress :percent="diskUsage" :status="diskUsage > 80 ? 'exception' : diskUsage > 50 ? 'normal' : 'success'" size="small" />
                </div>
                <div class="metric-item">
                  <div class="metric-label">网络带宽</div>
                  <div class="metric-value">
                    {{ networkBandwidth }} Mbps
                  </div>
                  <a-progress :percent="networkBandwidth / 100 * 100" status="normal" size="small" />
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <!-- 告警中心 -->
        <a-col :xs="24" :lg="12">
          <a-card class="monitor-card">
            <template #title>
              <div class="card-title">
                <AlertOutlined />
                告警中心
              </div>
            </template>
            <div class="card-content">
              <a-list
                :data-source="alerts"
                :pagination="{ pageSize: 10 }"
                item-layout="horizontal"
                size="small"
              >
                <template #renderItem="{ item }">
                  <a-list-item :class="`alert-item alert-${item.level}`">
                    <a-list-item-meta
                      :avatar="getAlertAvatar(item.level)"
                      :title="item.title"
                      :description="item.message"
                    />
                    <div class="alert-time">{{ item.timestamp }}</div>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 趋势图表 -->
      <a-card class="chart-card">
        <template #title>
          <div class="card-title">
            <LineChartOutlined />
            任务执行趋势
          </div>
        </template>
        <div class="card-content">
          <div ref="trendChartRef" class="trend-chart" style="height: 300px;"></div>
        </div>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import {
  ReloadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ScheduleOutlined,
  AlertOutlined,
  DatabaseOutlined,
  MonitorOutlined,
  EyeOutlined,
  SyncOutlined,
  LineChartOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import * as echarts from 'echarts';

const loading = ref(false);
const trendChartRef = ref(null);
let trendChart = null;

// 模拟数据
const dataSources = ref([
  {
    id: 1,
    name: 'Hive数据仓库',
    type: 'hive',
    host: '192.168.1.100',
    status: 'healthy',
    latency: 15,
    last_checked: '2024-01-15 10:00:00'
  },
  {
    id: 2,
    name: 'MySQL主库',
    type: 'mysql',
    host: '192.168.1.101',
    status: 'healthy',
    latency: 5,
    last_checked: '2024-01-15 10:00:00'
  },
  {
    id: 3,
    name: 'PostgreSQL数据库',
    type: 'postgresql',
    host: '192.168.1.102',
    status: 'unhealthy',
    latency: 1000,
    last_checked: '2024-01-15 09:55:00'
  },
  {
    id: 4,
    name: 'Oracle数据库',
    type: 'oracle',
    host: '192.168.1.103',
    status: 'warning',
    latency: 500,
    last_checked: '2024-01-15 09:50:00'
  }
]);

const recentTasks = ref([
  {
    id: 1,
    name: 'Hive用户数据采集',
    type: 'collection',
    status: 'success',
    start_time: '2024-01-15 10:00:00',
    end_time: '2024-01-15 10:05:00',
    duration: '5m',
    data_source: 'Hive数据仓库'
  },
  {
    id: 2,
    name: 'Hive到MySQL用户数据同步',
    type: 'sync',
    status: 'success',
    start_time: '2024-01-15 10:05:00',
    end_time: '2024-01-15 10:10:00',
    duration: '5m',
    data_source: 'MySQL主库'
  },
  {
    id: 3,
    name: 'MySQL订单数据采集',
    type: 'collection',
    status: 'failed',
    start_time: '2024-01-15 11:00:00',
    end_time: '2024-01-15 11:02:00',
    duration: '2m',
    data_source: 'PostgreSQL数据库',
    error: '连接超时'
  },
  {
    id: 4,
    name: 'Oracle数据同步',
    type: 'sync',
    status: 'running',
    start_time: '2024-01-15 11:30:00',
    duration: '3m',
    data_source: 'Oracle数据库'
  }
]);

const alerts = ref([
  {
    id: 1,
    title: '数据源连接失败',
    message: 'PostgreSQL数据库连接超时，请检查网络连接',
    level: 'error',
    timestamp: '2024-01-15 09:55:00'
  },
  {
    id: 2,
    title: '任务执行失败',
    message: 'MySQL订单数据采集任务执行失败',
    level: 'error',
    timestamp: '2024-01-15 11:02:00'
  },
  {
    id: 3,
    title: '系统警告',
    message: '磁盘使用率超过70%，请及时清理',
    level: 'warning',
    timestamp: '2024-01-15 10:30:00'
  },
  {
    id: 4,
    title: '数据源延迟',
    message: 'Oracle数据库响应时间超过500ms',
    level: 'warning',
    timestamp: '2024-01-15 09:50:00'
  }
]);

// 系统性能数据
const cpuUsage = ref(45);
const memoryUsage = ref(60);
const diskUsage = ref(75);
const networkBandwidth = ref(25);

// 计算属性
const healthyDataSources = computed(() => dataSources.value.filter(ds => ds.status === 'healthy').length);
const healthyDataSourceRate = computed(() => {
  if (dataSources.value.length === 0) return 0;
  return Math.round((healthyDataSources.value / dataSources.value.length) * 100);
});

const runningTasks = computed(() => recentTasks.value.filter(t => t.status === 'running').length);
const runningTaskRate = computed(() => {
  if (recentTasks.value.length === 0) return 0;
  return Math.round((runningTasks.value / recentTasks.value.length) * 100);
});

const successTasksToday = computed(() => recentTasks.value.filter(t => t.status === 'success').length);
const successTaskRate = computed(() => {
  if (recentTasks.value.length === 0) return 0;
  return Math.round((successTasksToday.value / recentTasks.value.length) * 100);
});

const alertCount = computed(() => alerts.value.length);
const alertLevel = computed(() => {
  if (alertCount.value === 0) return '正常';
  if (alerts.value.some(a => a.level === 'error')) return '严重';
  return '警告';
});

// 列定义
const dataSourceColumns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    width: 150
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100
  },
  {
    title: '主机',
    dataIndex: 'host',
    key: 'host',
    width: 150
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100
  },
  {
    title: '延迟',
    dataIndex: 'latency',
    key: 'latency',
    width: 80,
    render: (_, record) => `${record.latency}ms`
  },
  {
    title: '最后检查',
    dataIndex: 'last_checked',
    key: 'last_checked',
    width: 150
  },
  {
    title: '操作',
    dataIndex: 'actions',
    key: 'actions',
    width: 100
  }
];

const taskColumns = [
  {
    title: '任务名称',
    dataIndex: 'name',
    key: 'name',
    width: 200
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 80,
    render: (_, record) => record.type === 'collection' ? '采集' : '同步'
  },
  {
    title: '数据源',
    dataIndex: 'data_source',
    key: 'data_source',
    width: 120
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80
  },
  {
    title: '开始时间',
    dataIndex: 'start_time',
    key: 'start_time',
    width: 150
  },
  {
    title: '耗时',
    dataIndex: 'duration',
    key: 'duration',
    width: 80
  },
  {
    title: '操作',
    dataIndex: 'actions',
    key: 'actions',
    width: 100
  }
];

// 方法
const getDataSourceRowClass = (record) => {
  return `datasource-${record.status}`;
};

const getDataSourceStatusText = (status) => {
  const texts = {
    healthy: '健康',
    warning: '警告',
    unhealthy: '异常'
  };
  return texts[status] || status;
};

const getTaskRowClass = (record) => {
  return `task-${record.status}`;
};

const getTaskStatusColor = (status) => {
  const colors = {
    success: 'success',
    failed: 'error',
    running: 'processing',
    pending: 'default'
  };
  return colors[status] || 'default';
};

const getTaskStatusText = (status) => {
  const texts = {
    success: '成功',
    failed: '失败',
    running: '运行中',
    pending: '等待中'
  };
  return texts[status] || status;
};

const getAlertAvatar = (level) => {
  const avatars = {
    error: <AlertOutlined style="color: #ff4d4f" />,
    warning: <AlertOutlined style="color: #fa8c16" />,
    info: <AlertOutlined style="color: #1677ff" />
  };
  return avatars[level] || <AlertOutlined style="color: #52c41a" />;
};

const handleTestDataSource = (record) => {
  message.info(`测试数据源连接: ${record.name}`);
};

const handleViewDataSource = (record) => {
  message.info(`查看数据源详情: ${record.name}`);
};

const handleViewTask = (record) => {
  message.info(`查看任务详情: ${record.name}`);
};

const handleRetryTask = (record) => {
  message.info(`重试任务: ${record.name}`);
};

const refreshMonitor = () => {
  loading.value = true;
  setTimeout(() => {
    // 模拟数据更新
    cpuUsage.value = Math.floor(Math.random() * 100);
    memoryUsage.value = Math.floor(Math.random() * 100);
    diskUsage.value = Math.floor(Math.random() * 100);
    networkBandwidth.value = Math.floor(Math.random() * 100);
    
    // 更新图表
    updateTrendChart();
    
    loading.value = false;
    message.success('监控数据已刷新');
  }, 1000);
};

const exportReport = () => {
  message.info('正在导出监控报告...');
  setTimeout(() => {
    message.success('监控报告导出成功');
  }, 1000);
};

const initTrendChart = () => {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value);
    updateTrendChart();
  }
};

const updateTrendChart = () => {
  if (!trendChart) return;
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['成功', '失败', '运行中']
    },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '成功',
        type: 'line',
        data: [5, 8, 12, 15, 10, 8],
        itemStyle: {
          color: '#52c41a'
        }
      },
      {
        name: '失败',
        type: 'line',
        data: [1, 2, 1, 3, 2, 1],
        itemStyle: {
          color: '#ff4d4f'
        }
      },
      {
        name: '运行中',
        type: 'line',
        data: [2, 3, 2, 1, 3, 2],
        itemStyle: {
          color: '#1677ff'
        }
      }
    ]
  };
  
  trendChart.setOption(option);
};

const handleResize = () => {
  trendChart?.resize();
};

onMounted(() => {
  initTrendChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  trendChart?.dispose();
});
</script>

<style scoped lang="less">
.data-monitor-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 184, 148, 0.12);
}

.header-left {
  flex: 1;

  .page-title {
    margin: 0 0 8px 0;
    font-size: 28px;
    font-weight: 600;
    background: linear-gradient(135deg, #00bcd4, #4dd0e1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .page-desc {
    margin: 0;
    font-size: 16px;
    color: #666;
    line-height: 1.5;
  }
}

.status-row {
  margin-bottom: 24px;
}

.status-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  &.card-green {
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  }

  &.card-blue {
    background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
  }

  &.card-orange {
    background: linear-gradient(135deg, #fff7e6 0%, #ffd591 100%);
  }

  &.card-purple {
    background: linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%);
  }

  .card-content {
    display: flex;
    align-items: center;
    padding: 24px;
    gap: 16px;

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      background: rgba(255, 255, 255, 0.8);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .card-info {
      flex: 1;

      .card-value {
        font-size: 32px;
        font-weight: 600;
        line-height: 1;
        margin-bottom: 4px;
      }

      .card-label {
        font-size: 14px;
        color: #666;
      }
    }

    .card-percent {
      font-size: 18px;
      font-weight: 600;
    }
  }
}

.monitor-row {
  margin-bottom: 24px;
}

.monitor-card {
  border-radius: 12px;
  overflow: hidden;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .card-content {
    padding: 20px;
  }
}

.datasource-healthy {
  background: rgba(82, 196, 26, 0.05);
}

.datasource-warning {
  background: rgba(250, 140, 22, 0.05);
}

.datasource-unhealthy {
  background: rgba(255, 77, 79, 0.05);
}

.task-success {
  background: rgba(82, 196, 26, 0.05);
}

.task-failed {
  background: rgba(255, 77, 79, 0.05);
}

.task-running {
  background: rgba(22, 119, 255, 0.05);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  &.healthy {
    .status-dot {
      background: #52c41a;
    }
    .status-text {
      color: #52c41a;
    }
  }

  &.warning {
    .status-dot {
      background: #fa8c16;
    }
    .status-text {
      color: #fa8c16;
    }
  }

  &.unhealthy {
    .status-dot {
      background: #ff4d4f;
    }
    .status-text {
      color: #ff4d4f;
    }
  }
}

.performance-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .metric-item {
    .metric-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 4px;
    }

    .metric-value {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
  }
}

.alert-item {
  &.alert-error {
    background: rgba(255, 77, 79, 0.05);
  }

  &.alert-warning {
    background: rgba(250, 140, 22, 0.05);
  }

  &.alert-info {
    background: rgba(22, 119, 255, 0.05);
  }

  .alert-time {
    font-size: 12px;
    color: #999;
  }
}

.chart-card {
  border-radius: 12px;
  overflow: hidden;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;

  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .card-content {
    padding: 20px;
  }
}

.trend-chart {
  width: 100%;
  height: 300px;
}

@media (max-width: 768px) {
  .data-monitor-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 24px;
  }

  .status-row {
    .ant-col {
      margin-bottom: 16px;
    }
  }

  .monitor-row {
    .ant-col {
      margin-bottom: 16px;
    }
  }
}
</style>