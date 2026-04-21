<template>
  <div class="data-management-container">
    <a-spin :spinning="loading">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">📊 数据管理中心</h1>
          <p class="page-desc">统一管理数据源、数据采集和数据同步，实现数据全生命周期管理</p>
        </div>
        <div class="header-right">
          <a-button type="primary" @click="showFlowModal = true" class="create-flow-btn">
            <template #icon><RocketOutlined /></template>
            创建数据流程
          </a-button>
        </div>
      </div>

      <!-- 统计概览 -->
      <a-row :gutter="[16, 16]" class="overview-row">
        <a-col :xs="12" :sm="6">
          <a-card class="overview-card card-blue hoverable">
            <div class="card-content">
              <div class="card-icon"><DatabaseOutlined /></div>
              <div class="card-info">
                <div class="card-value">{{ dataSources.length }}</div>
                <div class="card-label">数据源</div>
              </div>
              <div class="card-status" :class="{ online: onlineDataSources > 0 }">
                <span class="status-dot"></span>
                {{ onlineDataSources }} 在线
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="overview-card card-green hoverable">
            <div class="card-content">
              <div class="card-icon"><ScheduleOutlined /></div>
              <div class="card-info">
                <div class="card-value">{{ collectionTasks.length }}</div>
                <div class="card-label">采集任务</div>
              </div>
              <div class="card-status" :class="{ online: runningCollectionTasks > 0 }">
                <span class="status-dot"></span>
                {{ runningCollectionTasks }} 运行中
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="overview-card card-orange hoverable">
            <div class="card-content">
              <div class="card-icon"><SyncOutlined /></div>
              <div class="card-info">
                <div class="card-value">{{ syncTasks.length }}</div>
                <div class="card-label">同步任务</div>
              </div>
              <div class="card-status" :class="{ online: runningSyncTasks > 0 }">
                <span class="status-dot"></span>
                {{ runningSyncTasks }} 运行中
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="overview-card card-purple hoverable">
            <div class="card-content">
              <div class="card-icon"><FlowOutlined /></div>
              <div class="card-info">
                <div class="card-value">{{ dataFlows.length }}</div>
                <div class="card-label">数据流程</div>
              </div>
              <div class="card-status" :class="{ online: activeDataFlows > 0 }">
                <span class="status-dot"></span>
                {{ activeDataFlows }} 活跃
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 主内容区 -->
      <a-card class="main-card">
        <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
          <!-- 数据源管理 -->
          <a-tab-pane key="datasource" tab="
            <span class="tab-icon">
              <DatabaseOutlined />
            </span>
            数据源管理
          ">
            <div class="tab-content">
              <div class="tab-header">
                <h3>数据源管理</h3>
                <a-button type="primary" @click="showDataSourceModal = true">
                  <template #icon><PlusOutlined /></template>
                  新增数据源
                </a-button>
              </div>
              
              <!-- 数据源列表 -->
              <a-table
                :columns="datasourceColumns"
                :data-source="dataSources"
                :loading="loadingDataSources"
                row-key="id"
                :pagination="{ pageSize: 10 }"
                size="middle"
                :row-class-name="(record) => record.connected ? 'datasource-online' : 'datasource-offline'"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'connected'">
                    <a-tag :color="record.connected ? 'success' : 'default'">
                      {{ record.connected ? '在线' : '离线' }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'actions'">
                    <a-space :size="4">
                      <a-button type="text" size="small" @click="handleTestDataSource(record)">
                        <SyncOutlined />
                      </a-button>
                      <a-button type="text" size="small" @click="handleEditDataSource(record)">
                        <EditOutlined />
                      </a-button>
                      <a-button type="text" size="small" danger @click="handleDeleteDataSource(record.id)">
                        <DeleteOutlined />
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 数据采集 -->
          <a-tab-pane key="collection" tab="
            <span class="tab-icon">
              <ScheduleOutlined />
            </span>
            数据采集
          ">
            <div class="tab-content">
              <div class="tab-header">
                <h3>数据采集任务</h3>
                <a-button type="primary" @click="showCollectionModal = true">
                  <template #icon><PlusOutlined /></template>
                  新建采集任务
                </a-button>
              </div>
              
              <!-- 采集任务列表 -->
              <a-table
                :columns="collectionColumns"
                :data-source="collectionTasks"
                :loading="loadingCollectionTasks"
                row-key="id"
                :pagination="{ pageSize: 10 }"
                size="middle"
                :row-class-name="(record) => `collection-${record.status}`"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="record.status === 'success' ? 'success' : record.status === 'running' ? 'processing' : record.status === 'failed' ? 'error' : 'default'">
                      {{ record.status === 'success' ? '成功' : record.status === 'running' ? '运行中' : record.status === 'failed' ? '失败' : '待执行' }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'actions'">
                    <a-space :size="4">
                      <a-button type="text" size="small" @click="handleExecuteCollection(record)">
                        <PlayCircleOutlined />
                      </a-button>
                      <a-button type="text" size="small" @click="handleEditCollection(record)">
                        <EditOutlined />
                      </a-button>
                      <a-button type="text" size="small" danger @click="handleDeleteCollection(record.id)">
                        <DeleteOutlined />
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 数据同步 -->
          <a-tab-pane key="sync" tab="
            <span class="tab-icon">
              <SyncOutlined />
            </span>
            数据同步
          ">
            <div class="tab-content">
              <div class="tab-header">
                <h3>数据同步任务</h3>
                <a-button type="primary" @click="showSyncModal = true">
                  <template #icon><PlusOutlined /></template>
                  新建同步任务
                </a-button>
              </div>
              
              <!-- 同步任务列表 -->
              <a-table
                :columns="syncColumns"
                :data-source="syncTasks"
                :loading="loadingSyncTasks"
                row-key="id"
                :pagination="{ pageSize: 10 }"
                size="middle"
                :row-class-name="(record) => `sync-${record.status}`"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="record.status === 'success' ? 'success' : record.status === 'running' ? 'processing' : record.status === 'failed' ? 'error' : 'default'">
                      {{ record.status === 'success' ? '成功' : record.status === 'running' ? '运行中' : record.status === 'failed' ? '失败' : '待执行' }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'actions'">
                    <a-space :size="4">
                      <a-button type="text" size="small" @click="handleExecuteSync(record)">
                        <PlayCircleOutlined />
                      </a-button>
                      <a-button type="text" size="small" @click="handleEditSync(record)">
                        <EditOutlined />
                      </a-button>
                      <a-button type="text" size="small" danger @click="handleDeleteSync(record.id)">
                        <DeleteOutlined />
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 数据流程 -->
          <a-tab-pane key="flow" tab="
            <span class="tab-icon">
              <FlowOutlined />
            </span>
            数据流程
          ">
            <div class="tab-content">
              <div class="tab-header">
                <h3>数据流程管理</h3>
                <a-button type="primary" @click="showFlowModal = true">
                  <template #icon><PlusOutlined /></template>
                  创建数据流程
                </a-button>
              </div>
              
              <!-- 数据流程列表 -->
              <a-table
                :columns="flowColumns"
                :data-source="dataFlows"
                :loading="loadingFlows"
                row-key="id"
                :pagination="{ pageSize: 10 }"
                size="middle"
                :row-class-name="(record) => `flow-${record.status}`"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="record.status === 'active' ? 'success' : 'default'">
                      {{ record.status === 'active' ? '活跃' : '停用' }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'actions'">
                    <a-space :size="4">
                      <a-button type="text" size="small" @click="handleExecuteFlow(record)">
                        <PlayCircleOutlined />
                      </a-button>
                      <a-button type="text" size="small" @click="handleViewFlow(record)">
                        <EyeOutlined />
                      </a-button>
                      <a-button type="text" size="small" @click="handleEditFlow(record)">
                        <EditOutlined />
                      </a-button>
                      <a-button type="text" size="small" danger @click="handleDeleteFlow(record.id)">
                        <DeleteOutlined />
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 监控中心 -->
          <a-tab-pane key="monitor" tab="
            <span class="tab-icon">
              <MonitorOutlined />
            </span>
            监控中心
          ">
            <div class="tab-content">
              <div class="tab-header">
                <h3>任务监控</h3>
                <a-button @click="refreshMonitor">
                  <template #icon><ReloadOutlined /></template>
                  刷新
                </a-button>
              </div>
              
              <!-- 监控面板 -->
              <div class="monitor-panel">
                <a-card class="monitor-card">
                  <template #title>
                    <div class="monitor-title">
                      <ClockCircleOutlined />
                      任务执行情况
                    </div>
                  </template>
                  <div class="monitor-content">
                    <a-row :gutter="16">
                      <a-col :span="8">
                        <div class="monitor-stat">
                          <div class="stat-number">{{ todayTasks }}</div>
                          <div class="stat-label">今日任务</div>
                        </div>
                      </a-col>
                      <a-col :span="8">
                        <div class="monitor-stat">
                          <div class="stat-number">{{ successTasksToday }}</div>
                          <div class="stat-label">成功</div>
                        </div>
                      </a-col>
                      <a-col :span="8">
                        <div class="monitor-stat">
                          <div class="stat-number">{{ failedTasksToday }}</div>
                          <div class="stat-label">失败</div>
                        </div>
                      </a-col>
                    </a-row>
                    
                    <!-- 最近执行记录 -->
                    <div class="recent-tasks">
                      <h4>最近执行记录</h4>
                      <a-table
                        :columns="recentTaskColumns"
                        :data-source="recentTasks"
                        :pagination="false"
                        size="small"
                        row-key="id"
                      />
                    </div>
                  </div>
                </a-card>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-card>

      <!-- 数据源管理弹窗 -->
      <a-modal
        v-model:open="showDataSourceModal"
        :title="isEditDataSource ? '编辑数据源' : '新增数据源'"
        width="600px"
        @ok="handleSaveDataSource"
        @cancel="handleCancelDataSource"
      >
        <p>数据源管理弹窗（集成现有 SourceManage 功能）</p>
      </a-modal>

      <!-- 数据采集弹窗 -->
      <a-modal
        v-model:open="showCollectionModal"
        :title="isEditCollection ? '编辑采集任务' : '新建采集任务'"
        width="700px"
        @ok="handleSaveCollection"
        @cancel="handleCancelCollection"
      >
        <p>数据采集任务弹窗（集成 DataCollection 功能）</p>
      </a-modal>

      <!-- 数据同步弹窗 -->
      <a-modal
        v-model:open="showSyncModal"
        :title="isEditSync ? '编辑同步任务' : '新建同步任务'"
        width="800px"
        @ok="handleSaveSync"
        @cancel="handleCancelSync"
      >
        <p>数据同步任务弹窗（集成 DataSyncEnhanced 功能）</p>
      </a-modal>

      <!-- 数据流程弹窗 -->
      <a-modal
        v-model:open="showFlowModal"
        :title="isEditFlow ? '编辑数据流程' : '创建数据流程'"
        width="800px"
        @ok="handleSaveFlow"
        @cancel="handleCancelFlow"
      >
        <a-form
          ref="flowFormRef"
          :model="flowForm"
          :rules="flowRules"
          layout="vertical"
        >
          <a-form-item label="流程名称" name="name">
            <a-input v-model:value="flowForm.name" placeholder="请输入流程名称" />
          </a-form-item>

          <a-form-item label="流程描述" name="description">
            <a-input-textarea v-model:value="flowForm.description" placeholder="请输入流程描述" rows="3" />
          </a-form-item>

          <a-form-item label="采集任务" name="collection_task_id">
            <a-select
              v-model:value="flowForm.collection_task_id"
              placeholder="请选择采集任务"
              :options="collectionTaskOptions"
              show-search
            />
          </a-form-item>

          <a-form-item label="同步任务" name="sync_task_id">
            <a-select
              v-model:value="flowForm.sync_task_id"
              placeholder="请选择同步任务"
              :options="syncTaskOptions"
              show-search
            />
          </a-form-item>

          <a-form-item label="调度类型" name="schedule_type">
            <a-radio-group v-model:value="flowForm.schedule_type">
              <a-radio value="manual">手动触发</a-radio>
              <a-radio value="cron">定时调度</a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="Cron表达式" name="cron_expression" v-if="flowForm.schedule_type === 'cron'">
            <a-input v-model:value="flowForm.cron_expression" placeholder="请输入Cron表达式" />
          </a-form-item>
        </a-form>
      </a-modal>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  DatabaseOutlined,
  ScheduleOutlined,
  SyncOutlined,
  FlowOutlined,
  MonitorOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined as SyncIcon,
  PlayCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  RocketOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { useDataSourceStore } from '../../stores/datasource';
import datasourceAPI from '../../api/datasource';
import request from '../../utils/requestUtil';

const dataSourceStore = useDataSourceStore();

const loading = ref(false);
const activeTab = ref('datasource');

// 弹窗状态
const showDataSourceModal = ref(false);
const showCollectionModal = ref(false);
const showSyncModal = ref(false);
const showFlowModal = ref(false);
const isEditDataSource = ref(false);
const isEditCollection = ref(false);
const isEditSync = ref(false);
const isEditFlow = ref(false);

// 加载状态
const loadingDataSources = ref(false);
const loadingCollectionTasks = ref(false);
const loadingSyncTasks = ref(false);
const loadingFlows = ref(false);

// 表单引用
const flowFormRef = ref(null);

// 流程表单
const flowForm = reactive({
  id: null,
  name: '',
  description: '',
  collection_task_id: null,
  sync_task_id: null,
  schedule_type: 'manual',
  cron_expression: '',
  is_active: true
});

const flowRules = {
  name: [{ required: true, message: '请输入流程名称', trigger: 'blur' }],
  collection_task_id: [{ required: true, message: '请选择采集任务', trigger: 'change' }],
  sync_task_id: [{ required: true, message: '请选择同步任务', trigger: 'change' }]
};

const dataSources = ref([]);
const collectionTasks = ref([]);
const syncTasks = ref([]);
const dataFlows = ref([]);
const recentTasks = ref([]);

// 计算属性
const onlineDataSources = computed(() => dataSources.value.filter(ds => ds.connected).length);
const runningCollectionTasks = computed(() => collectionTasks.value.filter(t => t.status === 'running').length);
const runningSyncTasks = computed(() => syncTasks.value.filter(t => t.status === 'running').length);
const activeDataFlows = computed(() => dataFlows.value.filter(f => f.is_active).length);
const todayTasks = computed(() => recentTasks.value.length);
const successTasksToday = computed(() => recentTasks.value.filter(t => t.status === 'success').length);
const failedTasksToday = computed(() => recentTasks.value.filter(t => t.status === 'failed').length);

const collectionTaskOptions = computed(() => {
  return collectionTasks.value.map(task => ({
    label: task.name,
    value: task.id
  }));
});

const syncTaskOptions = computed(() => {
  return syncTasks.value.map(task => ({
    label: task.name,
    value: task.id
  }));
});

// 列定义
const datasourceColumns = [
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
    title: '连接地址',
    dataIndex: 'host',
    key: 'host',
    render: (_, record) => `${record.host}:${record.port}`
  },
  {
    title: '数据库',
    dataIndex: 'database',
    key: 'database',
    width: 120
  },
  {
    title: '状态',
    dataIndex: 'connected',
    key: 'connected',
    width: 80,
    render: (_, record) => record.connected ? '在线' : '离线'
  },
  {
    title: '操作',
    dataIndex: 'actions',
    key: 'actions',
    width: 120
  }
];

const collectionColumns = [
  {
    title: '任务名称',
    dataIndex: 'name',
    key: 'name',
    width: 200
  },
  {
    title: '数据源',
    dataIndex: 'datasource_name',
    key: 'datasource_name',
    width: 150
  },
  {
    title: '表',
    dataIndex: 'table_name',
    key: 'table_name',
    width: 120
  },
  {
    title: '采集方式',
    dataIndex: 'collection_type',
    key: 'collection_type',
    width: 100,
    render: (_, record) => record.collection_type === 'full' ? '全量' : '增量'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80
  },
  {
    title: '操作',
    dataIndex: 'actions',
    key: 'actions',
    width: 120
  }
];

const syncColumns = [
  {
    title: '任务名称',
    dataIndex: 'name',
    key: 'name',
    width: 200
  },
  {
    title: '源数据',
    dataIndex: 'source_name',
    key: 'source_name',
    width: 150
  },
  {
    title: '目标数据',
    dataIndex: 'target_name',
    key: 'target_name',
    width: 150
  },
  {
    title: '同步模式',
    dataIndex: 'sync_mode',
    key: 'sync_mode',
    width: 100,
    render: (_, record) => record.sync_mode === 'full' ? '全量' : '增量'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80
  },
  {
    title: '操作',
    dataIndex: 'actions',
    key: 'actions',
    width: 120
  }
];

const flowColumns = [
  {
    title: '流程名称',
    dataIndex: 'name',
    key: 'name',
    width: 200
  },
  {
    title: '采集任务',
    dataIndex: 'collection_task_name',
    key: 'collection_task_name',
    width: 150
  },
  {
    title: '同步任务',
    dataIndex: 'sync_task_name',
    key: 'sync_task_name',
    width: 150
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80
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
    width: 150
  }
];

const recentTaskColumns = [
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
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80
  },
  {
    title: '开始时间',
    dataIndex: 'start_time',
    key: 'start_time',
    width: 180
  },
  {
    title: '耗时',
    dataIndex: 'duration',
    key: 'duration',
    width: 80
  }
];

// 方法
const pickList = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};

const statusMap = {
  completed: 'success',
  succeeded: 'success',
  success: 'success',
  failed: 'failed',
  error: 'failed',
  running: 'running',
  processing: 'running',
  pending: 'pending',
  waiting: 'pending',
  idle: 'pending'
};

const normalizeStatus = (status) => {
  const value = String(status || '').toLowerCase();
  return statusMap[value] || 'pending';
};

const normalizeDataSource = (item) => ({
  ...item,
  id: item.id,
  type: item.type || item.db_type || 'unknown',
  host: item.host || item.hostname || '-',
  port: item.port || '-',
  database: item.database || item.db_name || item.default_database || '-',
  connected: item.connected ?? item.is_connected ?? item.is_active ?? false,
  is_active: item.is_active !== false
});

const normalizeCollectionTask = (item) => ({
  ...item,
  id: item.id,
  datasource_id: item.source_id || item.datasource_id,
  datasource_name: item.source_name || item.datasource_name || '-',
  database_name: item.database_name || item.source_database || '-',
  table_name: item.table_name || item.source_table || '-',
  collection_type: item.collection_type || item.task_type || 'full',
  status: normalizeStatus(item.status),
  is_active: item.is_active !== false
});

const normalizeSyncTask = (item) => ({
  ...item,
  id: item.id,
  source_id: item.source_id,
  source_name: item.source_name || '-',
  source_database: item.source_database || '-',
  source_table: item.source_table || '-',
  target_id: item.target_id,
  target_name: item.target_name || '-',
  target_database: item.target_database || '-',
  target_table: item.target_table || '-',
  sync_mode: item.sync_mode || 'full',
  status: normalizeStatus(item.status),
  is_active: item.is_active !== false
});

const buildDataFlows = () => {
  dataFlows.value = syncTasks.value.map((syncTask) => {
    const collectionTask = collectionTasks.value.find((task) => task.id === syncTask.collection_task_id) || collectionTasks.value[0];
    return {
      id: syncTask.id,
      name: `流程-${syncTask.name}`,
      description: syncTask.description || '采集后执行同步',
      collection_task_id: collectionTask?.id,
      collection_task_name: collectionTask?.name || '-',
      sync_task_id: syncTask.id,
      sync_task_name: syncTask.name,
      status: syncTask.is_active ? 'active' : 'inactive',
      last_executed_at: syncTask.updated_at || syncTask.last_executed_at || '-',
      is_active: syncTask.is_active !== false
    };
  });
};

const loadDataSources = async () => {
  loadingDataSources.value = true;
  try {
    await dataSourceStore.fetchDataSources(true);
    dataSources.value = (dataSourceStore.dataSources || []).map(normalizeDataSource);
  } catch (error) {
    message.error('加载数据源失败');
  } finally {
    loadingDataSources.value = false;
  }
};

const loadCollectionTasks = async () => {
  loadingCollectionTasks.value = true;
  try {
    const res = await request.get('/collection/tasks', { params: { page: 1, page_size: 100 } });
    const list = res?.success ? pickList(res.data, ['tasks', 'list', 'items', 'data']) : [];
    collectionTasks.value = list.map(normalizeCollectionTask);
  } catch (error) {
    collectionTasks.value = [];
    message.error('加载采集任务失败');
  } finally {
    loadingCollectionTasks.value = false;
  }
};

const loadSyncTasks = async () => {
  loadingSyncTasks.value = true;
  try {
    const res = await request.get('/sync/tasks', { params: { skip: 0, limit: 100 } });
    const list = res?.success ? pickList(res.data, ['list', 'items', 'tasks', 'data']) : [];
    syncTasks.value = list.map(normalizeSyncTask);
  } catch (error) {
    syncTasks.value = [];
    message.error('加载同步任务失败');
  } finally {
    loadingSyncTasks.value = false;
  }
};

const loadRecentTasks = async () => {
  try {
    const res = await request.get('/collection/executions', { params: { page: 1, page_size: 20 } });
    const list = res?.success ? pickList(res.data, ['executions', 'list', 'items', 'data']) : [];
    recentTasks.value = list.map((item) => {
      const startedAt = item.started_at || item.start_time || '-';
      const endedAt = item.finished_at || item.end_time || null;
      const durationSec = Number(item.duration_seconds || 0);
      return {
        id: item.id,
        name: item.task_name || item.name || `任务-${item.task_id || item.id}`,
        type: 'collection',
        status: normalizeStatus(item.status),
        start_time: startedAt,
        end_time: endedAt || '-',
        duration: durationSec > 0 ? `${Math.round(durationSec / 60)}m` : '-'
      };
    });
  } catch (error) {
    recentTasks.value = [];
  }
};

const loadAllData = async () => {
  loading.value = true;
  loadingFlows.value = true;
  try {
    await Promise.all([loadDataSources(), loadCollectionTasks(), loadSyncTasks(), loadRecentTasks()]);
    buildDataFlows();
  } finally {
    loadingFlows.value = false;
    loading.value = false;
  }
};

const handleTabChange = (tabKey) => {
  activeTab.value = tabKey;
};

const handleTestDataSource = async (record) => {
  try {
    const res = await datasourceAPI.testConnection({
      dbType: record.type,
      host: record.host,
      port: record.port,
      database: record.database
    });
    if (res?.success) {
      message.success(`数据源连接成功: ${record.name}`);
    } else {
      message.error(res?.message || `数据源连接失败: ${record.name}`);
    }
  } catch (error) {
    message.error(`数据源连接失败: ${record.name}`);
  }
};

const handleEditDataSource = (record) => {
  isEditDataSource.value = true;
  showDataSourceModal.value = true;
};

const handleDeleteDataSource = async (id) => {
  try {
    const res = await datasourceAPI.deleteDataSource(id);
    if (!res?.success) throw new Error(res?.message || '删除失败');
    message.success('数据源已删除');
    await loadDataSources();
  } catch (error) {
    message.error(error.message || '删除数据源失败');
  }
};

const handleSaveDataSource = () => {
  showDataSourceModal.value = false;
  message.success('数据源保存成功');
};

const handleCancelDataSource = () => {
  showDataSourceModal.value = false;
  isEditDataSource.value = false;
};

const handleExecuteCollection = async (record) => {
  try {
    const res = await request.post(`/collection/tasks/${record.id}/execute`);
    if (!res?.success) throw new Error(res?.message || '执行失败');
    message.success(`已执行采集任务: ${record.name}`);
    await loadCollectionTasks();
    await loadRecentTasks();
  } catch (error) {
    message.error(error.message || `执行采集任务失败: ${record.name}`);
  }
};

const handleEditCollection = (record) => {
  isEditCollection.value = true;
  showCollectionModal.value = true;
};

const handleDeleteCollection = async (id) => {
  try {
    const res = await request.delete(`/collection/tasks/${id}`);
    if (!res?.success) throw new Error(res?.message || '删除失败');
    message.success('采集任务已删除');
    await loadCollectionTasks();
    buildDataFlows();
  } catch (error) {
    message.error(error.message || '删除采集任务失败');
  }
};

const handleSaveCollection = () => {
  showCollectionModal.value = false;
  message.success('采集任务保存成功');
};

const handleCancelCollection = () => {
  showCollectionModal.value = false;
  isEditCollection.value = false;
};

const handleExecuteSync = async (record) => {
  try {
    const res = await request.post(`/sync/tasks/${record.id}/execute`);
    if (!res?.success) throw new Error(res?.message || '执行失败');
    message.success(`已执行同步任务: ${record.name}`);
    await loadSyncTasks();
    buildDataFlows();
  } catch (error) {
    message.error(error.message || `执行同步任务失败: ${record.name}`);
  }
};

const handleEditSync = (record) => {
  isEditSync.value = true;
  showSyncModal.value = true;
};

const handleDeleteSync = async (id) => {
  try {
    const res = await request.delete(`/sync/tasks/${id}`);
    if (!res?.success) throw new Error(res?.message || '删除失败');
    message.success('同步任务已删除');
    await loadSyncTasks();
    buildDataFlows();
  } catch (error) {
    message.error(error.message || '删除同步任务失败');
  }
};

const handleSaveSync = () => {
  showSyncModal.value = false;
  message.success('同步任务保存成功');
};

const handleCancelSync = () => {
  showSyncModal.value = false;
  isEditSync.value = false;
};

const handleExecuteFlow = (record) => {
  message.info(`执行数据流程: ${record.name}`);
};

const handleViewFlow = (record) => {
  message.info(`查看数据流程详情: ${record.name}`);
};

const handleEditFlow = (record) => {
  isEditFlow.value = true;
  Object.assign(flowForm, { ...record });
  showFlowModal.value = true;
};

const handleDeleteFlow = (id) => {
  dataFlows.value = dataFlows.value.filter(f => f.id !== id);
  message.success('数据流程已删除');
};

const handleSaveFlow = async () => {
  try {
    await flowFormRef.value?.validate();
    
    if (isEditFlow.value) {
      const index = dataFlows.value.findIndex(f => f.id === flowForm.id);
      if (index !== -1) {
        dataFlows.value[index] = { ...dataFlows.value[index], ...flowForm };
      }
      message.success('数据流程更新成功');
    } else {
      const newFlow = {
        ...flowForm,
        id: Date.now(),
        status: 'active',
        collection_task_name: collectionTasks.value.find(t => t.id === flowForm.collection_task_id)?.name || '未知',
        sync_task_name: syncTasks.value.find(t => t.id === flowForm.sync_task_id)?.name || '未知'
      };
      dataFlows.value.unshift(newFlow);
      message.success('数据流程创建成功');
    }
    
    showFlowModal.value = false;
  } catch (error) {
    if (error.message !== 'Validation failed') {
      message.error('保存失败: ' + error.message);
    }
  }
};

const handleCancelFlow = () => {
  showFlowModal.value = false;
  flowFormRef.value?.resetFields();
  isEditFlow.value = false;
};

const refreshMonitor = () => {
  loadRecentTasks();
  message.success('监控数据已刷新');
};

onMounted(() => {
  loadAllData();
});
</script>

<style scoped lang="less">
.data-management-container {
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
    font-size: 32px;
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;

  .create-flow-btn {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
    }

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      transition: left 0.5s ease;
    }

    &:hover::before {
      left: 100%;
    }
  }
}

.overview-row {
  margin-bottom: 24px;
}

.overview-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  &.card-blue {
    background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
  }

  &.card-green {
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
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

    .card-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #666;

      &.online {
        color: #52c41a;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #d9d9d9;

        .online & {
          background: #52c41a;
        }
      }
    }
  }
}

.main-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: none;
  background: #ffffff;
}

:deep(.ant-tabs) {
  .ant-tabs-nav {
    padding: 0 24px;
    margin-bottom: 0;
    border-bottom: 1px solid #f0f0f0;

    .ant-tabs-tab {
      padding: 16px 24px;
      font-size: 14px;
      font-weight: 500;

      .tab-icon {
        margin-right: 8px;
        font-size: 16px;
      }
    }

    .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
      color: #1677ff;
    }
  }

  .ant-tabs-content {
    padding: 24px;
  }
}

.tab-content {
  .tab-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
  }
}

.datasource-online {
  background: rgba(82, 196, 26, 0.05);
}

.datasource-offline {
  background: rgba(255, 77, 79, 0.05);
}

.collection-success {
  background: rgba(82, 196, 26, 0.05);
}

.collection-failed {
  background: rgba(255, 77, 79, 0.05);
}

.collection-running {
  background: rgba(22, 119, 255, 0.05);
}

.sync-success {
  background: rgba(82, 196, 26, 0.05);
}

.sync-failed {
  background: rgba(255, 77, 79, 0.05);
}

.sync-running {
  background: rgba(22, 119, 255, 0.05);
}

.flow-active {
  background: rgba(82, 196, 26, 0.05);
}

.flow-inactive {
  background: rgba(153, 153, 153, 0.05);
}

.monitor-panel {
  .monitor-card {
    border-radius: 12px;
    overflow: hidden;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    .monitor-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
    }

    .monitor-content {
      .monitor-stat {
        text-align: center;
        padding: 16px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 8px;

        .stat-number {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
        }
      }

      .recent-tasks {
        margin-top: 24px;

        h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .data-management-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 24px;
  }

  .overview-row {
    .ant-col {
      margin-bottom: 16px;
    }
  }

  :deep(.ant-tabs) {
    .ant-tabs-nav {
      padding: 0 16px;

      .ant-tabs-tab {
        padding: 12px 16px;
        font-size: 13px;
      }
    }

    .ant-tabs-content {
      padding: 16px;
    }
  }

  .tab-content {
    .tab-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }
}
</style>
