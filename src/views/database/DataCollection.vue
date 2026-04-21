<template>
  <div class="data-collection-container">
    <a-spin :spinning="loading">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">📊 数据采集管理</h2>
          <div class="header-stats">
            <span class="stat-badge total">
              <ScheduleOutlined /> 共 {{ totalTasks }} 个采集任务
            </span>
            <span class="stat-badge success">
              <CheckCircleOutlined /> {{ runningTasks }} 运行中
            </span>
            <span class="stat-badge error">
              <CloseCircleOutlined /> {{ failedTasks }} 失败
            </span>
          </div>
        </div>

        <div class="header-right">
          <a-input-search
            v-model:value="searchText"
            placeholder="搜索任务名称/数据源..."
            style="width: 240px"
            allowClear
            @search="handleSearch"
            @change="handleSearchChange"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input-search>

          <a-select
            v-model:value="filterStatus"
            placeholder="任务状态"
            style="width: 140px"
            allowClear
            @change="handleFilterStatus"
          >
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="pending">等待中</a-select-option>
            <a-select-option value="running">运行中</a-select-option>
            <a-select-option value="success">成功</a-select-option>
            <a-select-option value="failed">失败</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>

          <a-button type="primary" @click="showCreateModal = true">
            <template #icon><PlusOutlined /></template>
            新建采集任务
          </a-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <a-row :gutter="[16, 16]" class="stats-row">
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-blue hoverable" size="small">
            <a-statistic title="总任务数" :value="totalTasks" :value-style="{ color: '#1677ff', fontSize: '24px' }">
              <template #prefix><ScheduleOutlined style="color: '#1677ff'" /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-green hoverable" size="small">
            <a-statistic title="运行中" :value="runningTasks" :value-style="{ color: '#52c41a', fontSize: '24px' }">
              <template #prefix><PlayCircleOutlined style="color: '#52c41a'" /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-orange hoverable" size="small">
            <a-statistic title="成功率" :value="successRate" suffix="%" :value-style="{ color: '#fa8c16', fontSize: '24px' }">
              <template #prefix><CheckCircleOutlined style="color: '#fa8c16'" /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-purple hoverable" size="small">
            <a-statistic title="平均耗时" :value="avgDuration" suffix="s" :value-style="{ color: '#722ed1', fontSize: '24px' }">
              <template #prefix><ClockOutlined style="color: '#722ed1'" /></template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <!-- 任务执行趋势图表 -->
      <a-row :gutter="[16, 16]" class="chart-row">
        <a-col :xs="24">
          <a-card class="chart-card hoverable" size="small">
            <template #title>
              <div class="chart-title">
                <span>最近7天任务执行趋势</span>
                <a-button type="text" size="small" @click="loadStatistics">
                  <ReloadOutlined />
                  刷新
                </a-button>
              </div>
            </template>
            <div ref="trendChartRef" class="trend-chart" style="height: 300px;"></div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 采集任务列表 -->
      <a-card class="table-card" :body-style="{ padding: 0 }">
        <a-table
          :columns="columns"
          :data-source="filteredTasks"
          :loading="loading"
          row-key="id"
          :pagination="paginationConfig"
          :row-selection="rowSelection"
          size="middle"
          :scroll="{ x: 1200 }"
          :row-class-name="getTaskRowClass"
        >
          <!-- 任务名称列 -->
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="name-cell">
                <div class="task-icon" :class="'status-' + (record.status || 'pending')">
                  <ScheduleOutlined />
                </div>
                <div class="name-info">
                  <div class="name-main">
                    <span class="name-text">{{ record.name }}</span>
                    <a-tag v-if="record.is_active" color="success" size="small">启用</a-tag>
                    <a-tag v-else color="error" size="small">停用</a-tag>
                  </div>
                  <div class="name-desc">{{ record.description || '暂无描述' }}</div>
                </div>
              </div>
            </template>

            <!-- 数据源 -->
            <template v-if="column.key === 'datasource'">
              <div class="datasource-cell">
                <a-tag :color="getDbTypeColor(record.datasource_type)">
                  <DatabaseFilled />
                  {{ record.datasource_name }}
                </a-tag>
                <br />
                <span class="datasource-db">{{ record.database_name }}</span>
              </div>
            </template>

            <!-- 表信息 -->
            <template v-if="column.key === 'table'">
              <div class="table-cell">
                <code>{{ record.table_name }}</code>
                <br />
                <span class="table-size" v-if="record.table_size">
                  {{ formatFileSize(record.table_size) }}
                </span>
              </div>
            </template>

            <!-- 状态 -->
            <template v-if="column.key === 'status'">
              <div class="status-cell">
                <div class="status-indicator" :class="record.status">
                  <span class="dot"></span>
                  <span class="text">{{ getStatusText(record.status) }}</span>
                </div>
                <div class="duration-info" v-if="record.duration">
                  <span class="duration-value">
                    {{ record.duration }}s
                  </span>
                </div>
              </div>
            </template>

            <!-- 调度 -->
            <template v-if="column.key === 'schedule'">
              <div class="schedule-cell">
                <span class="schedule-type" :class="record.schedule_type">
                  {{ getScheduleTypeText(record.schedule_type) }}
                </span>
                <br />
                <span class="schedule-cron" v-if="record.cron_expression">
                  {{ record.cron_expression }}
                </span>
              </div>
            </template>

            <!-- 操作 -->
            <template v-if="column.key === 'actions'">
              <a-space :size="4">
                <a-tooltip title="立即执行">
                  <a-button
                    type="text"
                    size="small"
                    :loading="executingIds.includes(record.id)"
                    @click="handleExecuteTask(record)"
                  >
                    <PlayCircleOutlined />
                  </a-button>
                </a-tooltip>

                <a-divider type="vertical" />

                <a-tooltip title="编辑">
                  <a-button type="text" size="small" @click="handleEdit(record)">
                    <EditOutlined />
                  </a-button>
                </a-tooltip>

                <a-dropdown :trigger="['click']">
                  <a-button type="text" size="small">
                    <MoreOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item @click="handleToggleActive(record)">
                        <PoweroffOutlined />
                        {{ record.is_active ? '停用' : '启用' }}
                      </a-menu-item>
                      <a-menu-item @click="handleViewDetail(record)">
                        <EyeOutlined />
                        查看详情
                      </a-menu-item>
                      <a-menu-item @click="handleCopyTask(record)">
                        <CopyOutlined />
                        复制任务
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item danger @click="handleDelete(record.id)">
                        <DeleteOutlined />
                        删除
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>

      <!-- 新建/编辑采集任务弹窗 -->
      <a-modal
        v-model:open="showCreateModal"
        :title="isEdit ? '✏️ 编辑采集任务' : '➕ 新建采集任务'"
        :width="720"
        :destroy-on-close="true"
        @ok="handleSaveTask"
        @cancel="handleCancelTask"
        ok-text="保存"
        cancel-text="取消"
        :confirm-loading="saving"
        class="task-modal"
      >
        <a-alert
          message="提示：采集任务将从指定数据源采集数据到临时存储，然后由同步任务同步到目标数据库"
          type="info"
          show-icon
          style="margin-bottom: 20px;"
        />

        <a-form
          ref="taskFormRef"
          :model="taskForm"
          :rules="taskRules"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 16 }"
          layout="horizontal"
          class="task-form"
        >
          <!-- 基本信息 -->
          <a-form-item label="任务名称" name="name">
            <a-input v-model:value="taskForm.name" placeholder="请输入任务名称" />
          </a-form-item>

          <a-form-item label="任务描述" name="description">
            <a-input-textarea v-model:value="taskForm.description" placeholder="请输入任务描述" rows="3" />
          </a-form-item>

          <!-- 数据源配置 -->
          <a-form-item label="数据源" name="datasource_id">
            <a-select
              v-model:value="taskForm.datasource_id"
              placeholder="请选择数据源"
              :options="availableDataSources"
              @change="handleDataSourceChange"
              show-search
              :filter-option="filterOption"
            />
          </a-form-item>

          <a-form-item label="数据库" name="database_name">
            <a-select
              v-model:value="taskForm.database_name"
              placeholder="请选择数据库"
              :options="availableDatabases"
              :loading="loadingDatabases"
              @change="handleDatabaseChange"
              :disabled="!taskForm.datasource_id"
            />
          </a-form-item>

          <a-form-item label="表" name="table_name">
            <a-select
              v-model:value="taskForm.table_name"
              placeholder="请选择表"
              :options="availableTables"
              :loading="loadingTables"
              :disabled="!taskForm.database_name"
            />
          </a-form-item>

          <!-- 采集配置 -->
          <a-form-item label="采集方式" name="collection_type">
            <a-radio-group v-model:value="taskForm.collection_type">
              <a-radio value="full">全量采集</a-radio>
              <a-radio value="incremental">增量采集</a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="增量字段" name="incremental_field" v-if="taskForm.collection_type === 'incremental'">
            <a-select
              v-model:value="taskForm.incremental_field"
              placeholder="请选择增量字段"
              :options="availableColumns"
              :disabled="!taskForm.table_name"
            />
          </a-form-item>

          <!-- 调度配置 -->
          <a-form-item label="调度类型" name="schedule_type">
            <a-radio-group v-model:value="taskForm.schedule_type">
              <a-radio value="manual">手动触发</a-radio>
              <a-radio value="cron">定时调度</a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="Cron表达式" name="cron_expression" v-if="taskForm.schedule_type === 'cron'">
            <a-input v-model:value="taskForm.cron_expression" placeholder="请输入Cron表达式，如：0 0 * * *" />
          </a-form-item>

          <!-- 高级配置 -->
          <a-form-item label="并发数" name="concurrency">
            <a-input-number v-model:value="taskForm.concurrency" :min="1" :max="10" placeholder="1" />
          </a-form-item>

          <a-form-item label="超时时间" name="timeout">
            <a-input-number v-model:value="taskForm.timeout" :min="60" :max="3600" placeholder="300" />
            <template #suffix>秒</template>
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 任务详情弹窗 -->
      <a-modal
        v-model:open="showDetailModal"
        title="任务详情"
        width="800px"
        :footer="null"
      >
        <a-descriptions :column="1" bordered v-if="currentTask">
          <a-descriptions-item label="任务ID">{{ currentTask.id }}</a-descriptions-item>
          <a-descriptions-item label="任务名称">{{ currentTask.name }}</a-descriptions-item>
          <a-descriptions-item label="数据源">{{ currentTask.datasource_name }}</a-descriptions-item>
          <a-descriptions-item label="采集表">{{ currentTask.database_name }}.{{ currentTask.table_name }}</a-descriptions-item>
          <a-descriptions-item label="采集方式">{{ currentTask.collection_type === 'full' ? '全量采集' : '增量采集' }}</a-descriptions-item>
          <a-descriptions-item label="调度类型">{{ getScheduleTypeText(currentTask.schedule_type) }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(currentTask.status)">
              {{ getStatusText(currentTask.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="采集数量">{{ currentTask.collection_count || 0 }}</a-descriptions-item>
          <a-descriptions-item label="耗时">{{ currentTask.duration || 0 }}秒</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ currentTask.created_at }}</a-descriptions-item>
          <a-descriptions-item label="最后执行时间">{{ currentTask.last_executed_at || '-' }}</a-descriptions-item>
          <a-descriptions-item label="错误信息" v-if="currentTask.error_message">
            <a-text type="danger">{{ currentTask.error_message }}</a-text>
          </a-descriptions-item>
        </a-descriptions>
      </a-modal>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import * as echarts from 'echarts';
import {
  ScheduleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockOutlined,
  DatabaseFilled,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  MoreOutlined,
  PoweroffOutlined,
  EyeOutlined,
  CopyOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { useDataSourceStore } from '../../stores/datasource';
import dataAPI from '../../api/data';

const dataSourceStore = useDataSourceStore();

const taskFormRef = ref(null);
const trendChartRef = ref(null);
const loading = ref(false);
const loadingDatabases = ref(false);
const loadingTables = ref(false);
const saving = ref(false);
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const isEdit = ref(false);
const executingIds = ref([]);

let trendChartInstance = null;

const searchText = ref('');
const filterStatus = ref('');
const paginationConfig = ref({
  current: 1,
  pageSize: 10,
  total: 0
});

const taskForm = reactive({
  id: null,
  name: '',
  description: '',
  datasource_id: null,
  database_name: null,
  table_name: null,
  collection_type: 'full',
  incremental_field: null,
  schedule_type: 'manual',
  cron_expression: '',
  concurrency: 1,
  timeout: 300,
  is_active: true
});

const taskRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  datasource_id: [{ required: true, message: '请选择数据源', trigger: 'change' }],
  database_name: [{ required: true, message: '请选择数据库', trigger: 'change' }],
  table_name: [{ required: true, message: '请选择表', trigger: 'change' }]
};

// 模拟数据
const tasks = ref([
  {
    id: 1,
    name: 'Hive用户数据采集',
    description: '从Hive数据仓库采集用户信息数据',
    datasource_id: 1,
    datasource_name: 'Hive数据仓库',
    datasource_type: 'hive',
    database_name: 'ods',
    table_name: 'user_info',
    table_size: 1024 * 1024 * 100, // 100MB
    collection_type: 'incremental',
    incremental_field: 'update_time',
    schedule_type: 'cron',
    cron_expression: '0 0 * * *',
    status: 'success',
    duration: 15,
    collection_count: 10000,
    concurrency: 2,
    timeout: 300,
    is_active: true,
    created_at: '2024-01-15 10:00:00',
    last_executed_at: '2024-01-15 10:00:00'
  },
  {
    id: 2,
    name: 'MySQL订单数据采集',
    description: '从MySQL数据库采集订单数据',
    datasource_id: 2,
    datasource_name: 'MySQL主库',
    datasource_type: 'mysql',
    database_name: 'order_db',
    table_name: 'order_info',
    table_size: 1024 * 1024 * 50, // 50MB
    collection_type: 'full',
    schedule_type: 'manual',
    status: 'pending',
    concurrency: 1,
    timeout: 600,
    is_active: true,
    created_at: '2024-01-14 15:30:00'
  }
]);

const availableDataSources = computed(() => {
  return dataSourceStore.dataSources.map(ds => ({
    label: `${ds.name} (${ds.type || 'unknown'})`,
    value: ds.id
  }));
});

const availableDatabases = ref([]);
const availableTables = ref([]);
const availableColumns = ref([]);

const totalTasks = computed(() => statistics.value.total_tasks);
const runningTasks = computed(() => statistics.value.running_tasks);
const failedTasks = computed(() => statistics.value.failed_tasks);
const successRate = computed(() => Math.round(statistics.value.success_rate));
const avgDuration = computed(() => Math.round(statistics.value.avg_duration));

const filteredTasks = computed(() => {
  let result = tasks.value;
  
  if (searchText.value) {
    const search = searchText.value.toLowerCase();
    result = result.filter(t => 
      t.name.toLowerCase().includes(search) ||
      t.datasource_name.toLowerCase().includes(search)
    );
  }
  
  if (filterStatus.value) {
    result = result.filter(t => t.status === filterStatus.value);
  }
  
  paginationConfig.value.total = result.length;
  const start = (paginationConfig.value.current - 1) * paginationConfig.value.pageSize;
  const end = start + paginationConfig.value.pageSize;
  
  return result.slice(start, end);
});

const currentTask = ref(null);
const statistics = ref({
  total_tasks: 0,
  running_tasks: 0,
  success_tasks: 0,
  failed_tasks: 0,
  success_rate: 0,
  avg_duration: 0,
  daily_stats: []
});

const columns = [
  {
    title: '任务名称',
    dataIndex: 'name',
    key: 'name',
    width: 200
  },
  {
    title: '数据源',
    dataIndex: 'datasource',
    key: 'datasource',
    width: 180
  },
  {
    title: '表',
    dataIndex: 'table',
    key: 'table',
    width: 150
  },
  {
    title: '采集方式',
    dataIndex: 'collection_type',
    key: 'collection_type',
    width: 120,
    render: (_, record) => record.collection_type === 'full' ? '全量' : '增量'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120
  },
  {
    title: '调度',
    dataIndex: 'schedule',
    key: 'schedule',
    width: 150
  },
  {
    title: '最后执行',
    dataIndex: 'last_executed_at',
    key: 'last_executed_at',
    width: 180
  },
  {
    title: '操作',
    dataIndex: 'actions',
    key: 'actions',
    width: 150,
    fixed: 'right'
  }
];

const rowSelection = {
  selectedRowKeys: [],
  onChange: (selectedRowKeys) => {
    console.log('Selected row keys:', selectedRowKeys);
  }
};

const getTaskRowClass = (record) => {
  return `task-row-${record.status}`;
};

const getDbTypeColor = (type) => {
  const colors = {
    mysql: 'blue',
    postgresql: 'orange',
    hive: 'purple',
    oracle: 'red'
  };
  return colors[type] || 'default';
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'default',
    running: 'processing',
    success: 'success',
    failed: 'error',
    cancelled: 'warning'
  };
  return colors[status] || 'default';
};

const getStatusText = (status) => {
  const texts = {
    pending: '等待中',
    running: '运行中',
    success: '成功',
    failed: '失败',
    cancelled: '已取消'
  };
  return texts[status] || status;
};

const getScheduleTypeText = (type) => {
  const texts = {
    manual: '手动触发',
    cron: '定时调度'
  };
  return texts[type] || type;
};

const filterOption = (input, option) => {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const loadDataSources = async () => {
  try {
    await dataSourceStore.fetchDataSources();
  } catch (error) {
    console.error('加载数据源失败:', error);
    message.error('加载数据源失败');
  }
};

const loadStatistics = async () => {
  try {
    loading.value = true;
    const response = await dataAPI.getCollectionStatistics();
    if (response.success) {
      statistics.value = response.data;
      initTrendChart();
    } else {
      message.error('加载统计数据失败');
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
    message.error('加载统计数据失败');
  } finally {
    loading.value = false;
  }
};

const initTrendChart = () => {
  if (!trendChartRef.value) return;

  if (trendChartInstance) {
    trendChartInstance.dispose();
  }

  trendChartInstance = echarts.init(trendChartRef.value);
  
  const dailyStats = statistics.value.daily_stats || [];
  const dates = dailyStats.map(item => item.date);
  const counts = dailyStats.map(item => item.count);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '任务执行次数',
      minInterval: 1
    },
    series: [{
      name: '执行次数',
      type: 'bar',
      data: counts,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#1677ff' },
          { offset: 1, color: '#40a9ff' }
        ])
      },
      emphasis: {
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1890ff' },
            { offset: 1, color: '#69c0ff' }
          ])
        }
      }
    }]
  };

  trendChartInstance.setOption(option);

  window.addEventListener('resize', () => {
    trendChartInstance?.resize();
  });
};

const handleDataSourceChange = async () => {
  if (!taskForm.datasource_id) {
    availableDatabases.value = [];
    availableTables.value = [];
    availableColumns.value = [];
    return;
  }
  
  loadingDatabases.value = true;
  try {
    // 模拟加载数据库列表
    await new Promise(resolve => setTimeout(resolve, 500));
    availableDatabases.value = [
      { label: 'ods', value: 'ods' },
      { label: 'dw', value: 'dw' },
      { label: 'ads', value: 'ads' }
    ];
  } catch (error) {
    console.error('加载数据库失败:', error);
    message.error('加载数据库失败');
  } finally {
    loadingDatabases.value = false;
  }
};

const handleDatabaseChange = async () => {
  if (!taskForm.database_name) {
    availableTables.value = [];
    availableColumns.value = [];
    return;
  }
  
  loadingTables.value = true;
  try {
    // 模拟加载表列表
    await new Promise(resolve => setTimeout(resolve, 500));
    availableTables.value = [
      { label: 'user_info', value: 'user_info' },
      { label: 'order_info', value: 'order_info' },
      { label: 'product_info', value: 'product_info' }
    ];
  } catch (error) {
    console.error('加载表失败:', error);
    message.error('加载表失败');
  } finally {
    loadingTables.value = false;
  }
};

const handleSearch = () => {
  paginationConfig.value.current = 1;
};

const handleSearchChange = () => {
  paginationConfig.value.current = 1;
};

const handleFilterStatus = () => {
  paginationConfig.value.current = 1;
};

const handleExecuteTask = async (record) => {
  executingIds.value.push(record.id);
  try {
    message.info(`正在执行任务: ${record.name}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    message.success(`任务执行成功: ${record.name}`);
    
    // 更新任务状态
    const task = tasks.value.find(t => t.id === record.id);
    if (task) {
      task.status = 'success';
      task.duration = Math.floor(Math.random() * 30) + 5;
      task.last_executed_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
  } catch (error) {
    message.error('任务执行失败');
  } finally {
    executingIds.value = executingIds.value.filter(id => id !== record.id);
  }
};

const handleEdit = (record) => {
  isEdit.value = true;
  Object.assign(taskForm, { ...record });
  showCreateModal.value = true;
};

const handleToggleActive = (record) => {
  record.is_active = !record.is_active;
  message.success(`任务已${record.is_active ? '启用' : '停用'}`);
};

const handleViewDetail = (record) => {
  currentTask.value = record;
  showDetailModal.value = true;
};

const handleCopyTask = (record) => {
  isEdit.value = false;
  Object.assign(taskForm, {
    ...record,
    id: null,
    name: `${record.name} (复制)`,
    status: 'pending',
    last_executed_at: null,
    duration: null
  });
  showCreateModal.value = true;
};

const handleDelete = (taskId) => {
  tasks.value = tasks.value.filter(t => t.id !== taskId);
  message.success('任务已删除');
};

const handleSaveTask = async () => {
  try {
    await taskFormRef.value?.validate();
    saving.value = true;
    
    if (isEdit.value) {
      // 更新现有任务
      const index = tasks.value.findIndex(t => t.id === taskForm.id);
      if (index !== -1) {
        tasks.value[index] = { ...tasks.value[index], ...taskForm };
      }
      message.success('任务更新成功');
    } else {
      // 创建新任务
      const newTask = {
        ...taskForm,
        id: Date.now(),
        status: 'pending',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        datasource_name: dataSourceStore.dataSources.find(ds => ds.id === taskForm.datasource_id)?.name || '未知',
        datasource_type: dataSourceStore.dataSources.find(ds => ds.id === taskForm.datasource_id)?.type || 'unknown'
      };
      tasks.value.unshift(newTask);
      message.success('任务创建成功');
    }
    
    showCreateModal.value = false;
  } catch (error) {
    if (error.message !== 'Validation failed') {
      message.error('保存失败: ' + error.message);
    }
  } finally {
    saving.value = false;
  }
};

const handleCancelTask = () => {
  showCreateModal.value = false;
  taskFormRef.value?.resetFields();
  isEdit.value = false;
};

onMounted(() => {
  loadDataSources();
  loadStatistics();
});
</script>

<style scoped lang="less">
.data-collection-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.08);
  margin: 24px;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #00bcd4, #4dd0e1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-stats {
  display: flex;
  gap: 12px;
}

.stat-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &.total {
    background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
    color: #1677ff;
  }

  &.success {
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
    color: #52c41a;
  }

  &.error {
    background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
    color: #ff4d4f;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-row {
  padding: 0 24px 16px 24px;
}

.chart-row {
  padding: 0 24px 16px 24px;
}

.chart-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}

.chart-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.trend-chart {
  width: 100%;
  height: 300px;
}

.stat-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  &.stat-card-blue {
    background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
  }

  &.stat-card-green {
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  }

  &.stat-card-orange {
    background: linear-gradient(135deg, #fff7e6 0%, #ffd591 100%);
  }

  &.stat-card-purple {
    background: linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%);
  }
}

.table-card {
  margin: 0 24px 24px 24px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.name-cell {
  display: flex;
  align-items: flex-start;
  gap: 12px;

  .task-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;

    &.status-pending {
      background: #f0f0f0;
      color: #999;
    }

    &.status-running {
      background: #e6f7ff;
      color: #1677ff;
    }

    &.status-success {
      background: #f6ffed;
      color: #52c41a;
    }

    &.status-failed {
      background: #fff1f0;
      color: #ff4d4f;
    }
  }

  .name-info {
    flex: 1;

    .name-main {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .name-text {
        font-weight: 500;
        font-size: 14px;
      }
    }

    .name-desc {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }
  }
}

.datasource-cell {
  .datasource-db {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
    display: block;
  }
}

.table-cell {
  code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }

  .table-size {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
    display: block;
  }
}

.status-cell {
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    &.pending {
      .dot {
        background: #d9d9d9;
      }
      .text {
        color: #999;
      }
    }

    &.running {
      .dot {
        background: #1677ff;
      }
      .text {
        color: #1677ff;
      }
    }

    &.success {
      .dot {
        background: #52c41a;
      }
      .text {
        color: #52c41a;
      }
    }

    &.failed {
      .dot {
        background: #ff4d4f;
      }
      .text {
        color: #ff4d4f;
      }
    }
  }

  .duration-info {
    font-size: 12px;
    color: #666;
  }
}

.schedule-cell {
  .schedule-type {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;

    &.manual {
      background: #f0f0f0;
      color: #666;
    }

    &.cron {
      background: #e6f7ff;
      color: #1677ff;
    }
  }

  .schedule-cron {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
    display: block;
  }
}

.task-row-running {
  background: rgba(22, 119, 255, 0.05);
}

.task-row-success {
  background: rgba(82, 196, 26, 0.05);
}

.task-row-failed {
  background: rgba(255, 77, 79, 0.05);
}

.task-modal {
  :deep(.ant-modal-body) {
    max-height: 600px;
    overflow-y: auto;
  }
}

.task-form {
  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .stats-row {
    padding: 0 16px 16px 16px;
  }

  .table-card {
    margin: 0 16px 16px 16px;
  }
}
</style>