<template>
  <div class="data-sync-container">
    <a-spin :spinning="loading">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">🔄 数据同步管理</h2>
          <div class="header-stats">
            <span class="stat-badge total">
              <SyncOutlined /> 共 {{ totalTasks }} 个同步任务
            </span>
            <span class="stat-badge success">
              <CheckCircleOutlined /> {{ successTasks }} 成功
            </span>
            <span class="stat-badge error">
              <CloseCircleOutlined /> {{ failedTasks }} 失败
            </span>
          </div>
        </div>

        <div class="header-right">
          <a-input-search
            v-model:value="searchText"
            placeholder="搜索任务名称/表..."
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
            新建同步任务
          </a-button>
          <a-button @click="handleRefresh">
            <template #icon><SyncOutlined /></template>
            刷新
          </a-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <a-row :gutter="[16, 16]" class="stats-row">
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-blue hoverable" size="small">
            <a-statistic title="总任务数" :value="totalTasks" :value-style="{ color: '#1677ff', fontSize: '24px' }">
              <template #prefix><SyncOutlined style="color: '#1677ff'" /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-green hoverable" size="small">
            <a-statistic title="成功任务" :value="successTasks" :value-style="{ color: '#52c41a', fontSize: '24px' }">
              <template #prefix><CheckCircleOutlined style="color: '#52c41a'" /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-orange hoverable" size="small">
            <a-statistic title="同步速率" :value="syncRate" suffix="条/秒" :value-style="{ color: '#fa8c16', fontSize: '24px' }">
              <template #prefix><ThunderboltOutlined style="color: '#fa8c16'" /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-purple hoverable" size="small">
            <a-statistic title="平均耗时" :value="avgDuration" suffix="s" :value-style="{ color: '#722ed1', fontSize: '24px' }">
              <template #prefix><ClockCircleOutlined style="color: '#722ed1'" /></template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <!-- 同步任务列表 -->
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
                  <SyncOutlined />
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

            <!-- 源数据 -->
            <template v-if="column.key === 'source'">
              <div class="source-cell">
                <a-tag :color="getDbTypeColor(record.source_type)">
                  <DatabaseFilled />
                  {{ record.source_name }}
                </a-tag>
                <br />
                <code class="source-table">{{ record.source_database }}.{{ record.source_table }}</code>
              </div>
            </template>

            <!-- 目标数据 -->
            <template v-if="column.key === 'target'">
              <div class="target-cell">
                <a-tag :color="getDbTypeColor(record.target_type)">
                  <CloudServerOutlined />
                  {{ record.target_name }}
                </a-tag>
                <br />
                <code class="target-table">{{ record.target_database }}.{{ record.target_table }}</code>
              </div>
            </template>

            <!-- 同步模式 -->
            <template v-if="column.key === 'sync_mode'">
              <a-tag :color="record.sync_mode === 'full' ? 'blue' : 'green'">
                {{ record.sync_mode === 'full' ? '全量同步' : '增量同步' }}
              </a-tag>
            </template>

            <!-- 状态 -->
            <template v-if="column.key === 'status'">
              <div class="status-cell">
                <div class="status-indicator" :class="record.status">
                  <span class="dot"></span>
                  <span class="text">{{ getStatusText(record.status) }}</span>
                </div>
                <div class="progress-info" v-if="record.progress !== undefined">
                  <a-progress :percent="record.progress" size="small" :status="record.status === 'success' ? 'success' : undefined" />
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
                      <a-menu-item @click="handlePreview(record)">
                        <EyeOutlined />
                        预览数据
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

      <!-- 新建/编辑同步任务弹窗 -->
      <a-modal
        v-model:open="showCreateModal"
        :title="isEdit ? '✏️ 编辑同步任务' : '➕ 新建同步任务'"
        :width="800"
        :destroy-on-close="true"
        @ok="handleSaveTask"
        @cancel="handleCancelTask"
        ok-text="保存"
        cancel-text="取消"
        :confirm-loading="saving"
        class="task-modal"
      >
        <a-alert
          message="提示：同步任务将从源数据源同步数据到目标数据源，支持全量和增量同步"
          type="info"
          show-icon
          style="margin-bottom: 20px;"
        />

        <a-tabs v-model:activeKey="formTabKey">
          <a-tab-pane key="basic" tab="📝 基本信息">
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

              <!-- 源数据配置 -->
              <a-form-item label="源数据源" name="source_id">
                <a-select
                  v-model:value="taskForm.source_id"
                  placeholder="请选择源数据源"
                  :options="sourceDataSourceOptions"
                  @change="handleSourceChange('source')"
                  show-search
                  :filter-option="filterOption"
                />
              </a-form-item>

              <a-form-item label="源数据库" name="source_database">
                <a-select
                  v-model:value="taskForm.source_database"
                  placeholder="请选择数据库"
                  :options="sourceDatabases"
                  :loading="loadingSourceDatabases"
                  @change="handleDatabaseChange('source')"
                  :disabled="!taskForm.source_id"
                />
              </a-form-item>

              <a-form-item label="源表" name="source_table">
                <a-select
                  v-model:value="taskForm.source_table"
                  placeholder="请选择表"
                  :options="sourceTables"
                  :loading="loadingSourceTables"
                  @change="handleTableChange('source')"
                  :disabled="!taskForm.source_database"
                />
              </a-form-item>

              <!-- 目标数据配置 -->
              <a-form-item label="目标数据源" name="target_id">
                <a-select
                  v-model:value="taskForm.target_id"
                  placeholder="请选择目标数据源"
                  :options="targetDataSourceOptions"
                  @change="handleSourceChange('target')"
                  show-search
                  :filter-option="filterOption"
                />
              </a-form-item>

              <a-form-item label="目标数据库" name="target_database">
                <a-select
                  v-model:value="taskForm.target_database"
                  placeholder="请选择数据库"
                  :options="targetDatabases"
                  :loading="loadingTargetDatabases"
                  @change="handleDatabaseChange('target')"
                  :disabled="!taskForm.target_id"
                />
              </a-form-item>

              <a-form-item label="目标表" name="target_table">
                <a-select
                  v-model:value="taskForm.target_table"
                  placeholder="请选择表"
                  :options="targetTables"
                  :loading="loadingTargetTables"
                  @change="handleTableChange('target')"
                  :disabled="!taskForm.target_database"
                />
              </a-form-item>

              <!-- 同步配置 -->
              <a-form-item label="同步模式" name="sync_mode">
                <a-radio-group v-model:value="taskForm.sync_mode">
                  <a-radio value="full">全量同步</a-radio>
                  <a-radio value="incremental">增量同步</a-radio>
                </a-radio-group>
              </a-form-item>

              <a-form-item label="增量字段" name="incremental_field" v-if="taskForm.sync_mode === 'incremental'">
                <a-select
                  v-model:value="taskForm.incremental_field"
                  placeholder="请选择增量字段"
                  :options="sourceColumns"
                  :disabled="!taskForm.source_table"
                />
              </a-form-item>

              <!-- 调度配置 -->
              <a-form-item label="调度类型" name="schedule_type">
                <a-radio-group v-model:value="taskForm.schedule_type">
                  <a-radio value="manual">手动触发</a-radio>
                  <a-radio value="cron">定时调度</a-radio>
                  <a-radio value="collection">采集后自动触发</a-radio>
                </a-radio-group>
              </a-form-item>

              <a-form-item label="Cron表达式" name="cron_expression" v-if="taskForm.schedule_type === 'cron'">
                <a-input v-model:value="taskForm.cron_expression" placeholder="请输入Cron表达式，如：0 0 * * *" />
              </a-form-item>

              <a-form-item label="关联采集任务" name="collection_task_id" v-if="taskForm.schedule_type === 'collection'">
                <a-select
                  v-model:value="taskForm.collection_task_id"
                  placeholder="请选择采集任务"
                  :options="availableCollectionTasks"
                  :disabled="taskForm.schedule_type !== 'collection'"
                />
              </a-form-item>
            </a-form>
          </a-tab-pane>

          <a-tab-pane key="columns" tab="🔄 列映射配置">
            <a-form-item label="列映射关系">
              <a-table
                :data-source="columnMapping"
                :pagination="false"
                size="small"
                bordered
              >
                <template #columns>
                  <a-table-column title="源列名" data-index="sourceColumn" key="sourceColumn" width="40%">
                    <template #default="{ record, index }">
                      <a-select
                        v-model:value="record.sourceColumn"
                        style="width: 100%"
                        :options="sourceColumns"
                        placeholder="选择源列"
                        allow-clear
                        @change="handleColumnChange(index)"
                      />
                    </template>
                  </a-table-column>
                  <a-table-column title="→" key="arrow" width="60" align="center">
                    <template #default>
                      <ArrowRightOutlined />
                    </template>
                  </a-table-column>
                  <a-table-column title="目标列名" data-index="targetColumn" key="targetColumn" width="40%">
                    <template #default="{ record, index }">
                      <a-select
                        v-model:value="record.targetColumn"
                        style="width: 100%"
                        :options="targetColumns"
                        placeholder="选择目标列"
                        allow-clear
                        @change="handleColumnChange(index)"
                      />
                    </template>
                  </a-table-column>
                  <a-table-column title="操作" key="actions" width="100" align="center">
                    <template #default="{ index }">
                      <a-button
                        type="link"
                        size="small"
                        danger
                        @click="removeColumnMapping(index)"
                      >
                        删除
                      </a-button>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
              <a-button type="dashed" block style="margin-top: 8px" @click="addColumnMapping">
                <template #icon><PlusOutlined /></template>
                添加映射
              </a-button>
            </a-form-item>
          </a-tab-pane>

          <a-tab-pane key="advanced" tab="⚙️ 高级配置">
            <a-form
              :model="taskForm"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 16 }"
              layout="horizontal"
            >
              <a-form-item label="并发数">
                <a-input-number v-model:value="taskForm.concurrency" :min="1" :max="10" placeholder="1" />
              </a-form-item>

              <a-form-item label="超时时间">
                <a-input-number v-model:value="taskForm.timeout" :min="60" :max="3600" placeholder="300" />
                <template #suffix>秒</template>
              </a-form-item>

              <a-form-item label="批量大小">
                <a-input-number v-model:value="taskForm.batch_size" :min="100" :max="10000" placeholder="1000" />
              </a-form-item>

              <a-form-item label="错误处理">
                <a-radio-group v-model:value="taskForm.error_handling">
                  <a-radio value="stop">遇到错误停止</a-radio>
                  <a-radio value="continue">遇到错误继续</a-radio>
                  <a-radio value="retry">重试后停止</a-radio>
                </a-radio-group>
              </a-form-item>

              <a-form-item label="重试次数">
                <a-input-number v-model:value="taskForm.retry_count" :min="0" :max="10" placeholder="3" />
              </a-form-item>
            </a-form>
          </a-tab-pane>
        </a-tabs>
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
          <a-descriptions-item label="源数据">{{ currentTask.source_name }}.{{ currentTask.source_database }}.{{ currentTask.source_table }}</a-descriptions-item>
          <a-descriptions-item label="目标数据">{{ currentTask.target_name }}.{{ currentTask.target_database }}.{{ currentTask.target_table }}</a-descriptions-item>
          <a-descriptions-item label="同步模式">{{ currentTask.sync_mode === 'full' ? '全量同步' : '增量同步' }}</a-descriptions-item>
          <a-descriptions-item label="调度类型">{{ getScheduleTypeText(currentTask.schedule_type) }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(currentTask.status)">
              {{ getStatusText(currentTask.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="同步数量">{{ currentTask.sync_count || 0 }}</a-descriptions-item>
          <a-descriptions-item label="耗时">{{ currentTask.duration || 0 }}秒</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ currentTask.created_at }}</a-descriptions-item>
          <a-descriptions-item label="最后执行时间">{{ currentTask.last_executed_at || '-' }}</a-descriptions-item>
          <a-descriptions-item label="错误信息" v-if="currentTask.error_message">
            <a-text type="danger">{{ currentTask.error_message }}</a-text>
          </a-descriptions-item>
        </a-descriptions>
      </a-modal>

      <!-- 数据预览弹窗 -->
      <a-modal
        v-model:open="showPreviewModal"
        title="数据预览"
        width="800px"
        :footer="null"
      >
        <a-table
          :data-source="previewData"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 'max-content' }"
          size="small"
        >
          <template #columns>
            <a-table-column
              v-for="column in previewColumns"
              :key="column"
              :title="column"
              :data-index="column"
              :ellipsis="true"
            />
          </template>
        </a-table>
      </a-modal>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  SyncOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  MoreOutlined,
  PoweroffOutlined,
  EyeOutlined,
  CopyOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  DatabaseFilled,
  CloudServerOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { useDataSourceStore } from '../../stores/datasource';
import syncAPI from '../../api/sync';
import datasourceAPI from '../../api/datasource';

const dataSourceStore = useDataSourceStore();

const taskFormRef = ref(null);
const loading = ref(false);
const loadingSourceDatabases = ref(false);
const loadingSourceTables = ref(false);
const loadingTargetDatabases = ref(false);
const loadingTargetTables = ref(false);
const saving = ref(false);
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const showPreviewModal = ref(false);
const isEdit = ref(false);
const executingIds = ref([]);
const formTabKey = ref('basic');

const searchText = ref('');
const filterStatus = ref('');
const paginationConfig = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total) => `共 ${total} 条`,
  onChange: async (page, pageSize) => {
    paginationConfig.value.current = page;
    paginationConfig.value.pageSize = pageSize;
    await loadTasks();
  }
});

const taskForm = reactive({
  id: null,
  name: '',
  description: '',
  source_id: null,
  source_database: null,
  source_table: null,
  target_id: null,
  target_database: null,
  target_table: null,
  sync_mode: 'full',
  incremental_field: null,
  schedule_type: 'manual',
  cron_expression: '',
  collection_task_id: null,
  concurrency: 1,
  timeout: 300,
  batch_size: 1000,
  error_handling: 'stop',
  retry_count: 3,
  is_active: true
});

const taskRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  source_id: [{ required: true, message: '请选择源数据源', trigger: 'change' }],
  source_database: [{ required: true, message: '请选择源数据库', trigger: 'change' }],
  source_table: [{ required: true, message: '请选择源表', trigger: 'change' }],
  target_id: [{ required: true, message: '请选择目标数据源', trigger: 'change' }],
  target_database: [{ required: true, message: '请选择目标数据库', trigger: 'change' }],
  target_table: [{ required: true, message: '请选择目标表', trigger: 'change' }]
};

const columnMapping = ref([
  { sourceColumn: null, targetColumn: null }
]);

const tasks = ref([]);

const availableDataSources = computed(() => {
  return dataSourceStore.dataSources.map(ds => ({
    label: `${ds.name} (${ds.type || 'unknown'})`,
    value: ds.id
  }));
});

const sourceDataSourceOptions = computed(() => {
  return availableDataSources.value.filter(item => String(item.value) !== String(taskForm.target_id));
});

const targetDataSourceOptions = computed(() => {
  return availableDataSources.value.filter(item => String(item.value) !== String(taskForm.source_id));
});

const availableCollectionTasks = ref([
  { label: 'Hive用户数据采集', value: 1 },
  { label: 'MySQL订单数据采集', value: 2 }
]);

const sourceDatabases = ref([]);
const sourceTables = ref([]);
const targetDatabases = ref([]);
const targetTables = ref([]);
const sourceColumns = ref([]);
const targetColumns = ref([]);
const previewData = ref([]);
const previewColumns = ref([]);

const totalTasks = computed(() => Number(paginationConfig.value.total) || tasks.value.length);
const successTasks = computed(() => tasks.value.filter(t => t.status === 'success').length);
const failedTasks = computed(() => tasks.value.filter(t => t.status === 'failed').length);
const syncRate = computed(() => {
  const executedTasks = tasks.value.filter(t => t.sync_count && t.duration);
  if (executedTasks.length === 0) return 0;
  const totalRate = executedTasks.reduce((sum, t) => sum + (t.sync_count / t.duration), 0);
  return Math.round(totalRate / executedTasks.length);
});
const avgDuration = computed(() => {
  const executedTasks = tasks.value.filter(t => t.duration);
  if (executedTasks.length === 0) return 0;
  const totalDuration = executedTasks.reduce((sum, t) => sum + t.duration, 0);
  return Math.round(totalDuration / executedTasks.length);
});

const filteredTasks = computed(() => {
  let result = tasks.value;
  
  if (searchText.value) {
    const search = searchText.value.toLowerCase();
    result = result.filter(t => 
      t.name.toLowerCase().includes(search) ||
      t.source_table.toLowerCase().includes(search) ||
      t.target_table.toLowerCase().includes(search)
    );
  }
  
  if (filterStatus.value) {
    result = result.filter(t => t.status === filterStatus.value);
  }

  return result;
});

const currentTask = ref(null);

const columns = [
  {
    title: '任务名称',
    dataIndex: 'name',
    key: 'name',
    width: 200
  },
  {
    title: '源数据',
    dataIndex: 'source',
    key: 'source',
    width: 200
  },
  {
    title: '目标数据',
    dataIndex: 'target',
    key: 'target',
    width: 200
  },
  {
    title: '同步模式',
    dataIndex: 'sync_mode',
    key: 'sync_mode',
    width: 100
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
    oracle: 'red',
    collection: 'green'
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
    cron: '定时调度',
    collection: '采集后触发'
  };
  return texts[type] || type;
};

const filterOption = (input, option) => {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
};

const unwrapBizData = (res) => {
  if (!res) return null;
  // 标准后端格式: { success, code, message, data }
  if (Object.prototype.hasOwnProperty.call(res, 'success') && Object.prototype.hasOwnProperty.call(res, 'data')) {
    return res.data;
  }
  return res;
};

const loadDataSources = async () => {
  try {
    await dataSourceStore.fetchDataSources();
    const defaultRes = await datasourceAPI.getDefaultDataSource();
    const defaultDs = unwrapBizData(defaultRes);
    if (defaultDs && !taskForm.target_id) {
      taskForm.target_id = defaultDs.id;
    }
  } catch (error) {
    console.error('加载数据源失败:', error);
    message.error('加载数据源失败');
  }
};

const handleRefresh = async () => {
  loading.value = true;
  try {
    await Promise.all([loadDataSources(), loadTasks()]);
    message.success('同步页面数据已刷新');
  } finally {
    loading.value = false;
  }
};

const loadTasks = async () => {
  try {
    const res = await syncAPI.getSyncTasks({
      page: paginationConfig.value.current,
      pageSize: paginationConfig.value.pageSize
    });
    const taskData = unwrapBizData(res);
    // 兼容两种返回：
    // 1) 旧版: data = []
    // 2) 新版: data = { list, total, page, pageSize }
    const list = Array.isArray(taskData)
      ? taskData
      : Array.isArray(taskData?.list)
        ? taskData.list
        : [];
    tasks.value = list.map((task) => {
      const [sourceDatabase, sourceTable] = String(task.source_table || '').split('.', 2);
      const [targetDatabase, targetTable] = String(task.target_table || '').split('.', 2);
      const sourceDs = dataSourceStore.getSourceById(task.source_id);
      const targetDs = dataSourceStore.getSourceById(task.target_id);
      return {
        ...task,
        source_database: sourceTable ? sourceDatabase : (task.source_database || ''),
        source_table: sourceTable || task.source_table || '',
        target_database: targetTable ? targetDatabase : (task.target_database || ''),
        target_table: targetTable || task.target_table || '',
        source_name: sourceDs?.name || `数据源#${task.source_id}`,
        source_type: sourceDs?.type || 'unknown',
        target_name: targetDs?.name || `数据源#${task.target_id}`,
        target_type: targetDs?.type || 'unknown',
        schedule_type: task.is_scheduled ? 'cron' : 'manual',
        sync_count: task.row_count || 0,
        duration: task.started_at && task.completed_at
          ? Math.max(0, Math.round((new Date(task.completed_at) - new Date(task.started_at)) / 1000))
          : null,
        last_executed_at: task.completed_at || null
      };
    });
    paginationConfig.value.total = Number(taskData?.total) || tasks.value.length;
  } catch (error) {
    console.error('加载同步任务失败:', error);
    message.error('加载同步任务失败');
  }
};

const handleSourceChange = async (type) => {
  const sourceId = type === 'source' ? taskForm.source_id : taskForm.target_id;
  if (type === 'source') {
    taskForm.source_database = null;
    taskForm.source_table = null;
    sourceDatabases.value = [];
    sourceTables.value = [];
    sourceColumns.value = [];
  } else {
    taskForm.target_database = null;
    taskForm.target_table = null;
    targetDatabases.value = [];
    targetTables.value = [];
    targetColumns.value = [];
  }
  if (!sourceId) {
    message.warning(type === 'source' ? '请先选择源数据源' : '请先选择目标数据源');
    return;
  }
  
  const loadingRef = type === 'source' ? loadingSourceDatabases : loadingTargetDatabases;
  const databasesRef = type === 'source' ? sourceDatabases : targetDatabases;
  
  loadingRef.value = true;
  try {
    const res = await syncAPI.getDatabases(sourceId);
    const result = unwrapBizData(res) || {};
    if (!result.success) {
      throw new Error(result.message || '获取数据库列表失败');
    }
    databasesRef.value = (result.databases || []).map((item) => ({ label: item, value: item }));
  } catch (error) {
    console.error('加载数据库失败:', error);
    message.error(error?.message || '加载数据库失败，请检查后端服务与数据源配置');
  } finally {
    loadingRef.value = false;
  }
};

const handleDatabaseChange = async (type) => {
  const sourceId = type === 'source' ? taskForm.source_id : taskForm.target_id;
  const database = type === 'source' ? taskForm.source_database : taskForm.target_database;
  if (type === 'source') {
    taskForm.source_table = null;
    sourceTables.value = [];
    sourceColumns.value = [];
  } else {
    taskForm.target_table = null;
    targetTables.value = [];
    targetColumns.value = [];
  }
  if (!sourceId || !database) {
    return;
  }
  
  const loadingRef = type === 'source' ? loadingSourceTables : loadingTargetTables;
  const tablesRef = type === 'source' ? sourceTables : targetTables;
  
  loadingRef.value = true;
  try {
    const res = await syncAPI.getTables(sourceId, database);
    const result = unwrapBizData(res) || {};
    if (!result.success) {
      throw new Error(result.message || '获取表列表失败');
    }
    tablesRef.value = (result.tables || []).map((item) => ({ label: item, value: item }));
  } catch (error) {
    console.error('加载表失败:', error);
    message.error(error.message || '加载表失败');
  } finally {
    loadingRef.value = false;
  }
};

const handleTableChange = async (type) => {
  const sourceId = type === 'source' ? taskForm.source_id : taskForm.target_id;
  const database = type === 'source' ? taskForm.source_database : taskForm.target_database;
  const table = type === 'source' ? taskForm.source_table : taskForm.target_table;
  
  if (!sourceId || !database || !table) return;
  
  const columnsRef = type === 'source' ? sourceColumns : targetColumns;
  
  try {
    const res = await syncAPI.getTableColumns(sourceId, database, table);
    const result = unwrapBizData(res) || {};
    if (!result.success) {
      throw new Error(result.message || '获取列信息失败');
    }
    columnsRef.value = (result.columns || []).map((item) => ({
      label: item.name,
      value: item.name
    }));
    if (sourceColumns.value.length && targetColumns.value.length) {
      const targetSet = new Set(targetColumns.value.map(item => item.value));
      const autoMapped = sourceColumns.value
        .map(item => item.value)
        .filter(name => targetSet.has(name))
        .slice(0, 20)
        .map(name => ({ sourceColumn: name, targetColumn: name }));
      if (autoMapped.length > 0) {
        columnMapping.value = autoMapped;
      }
    }
  } catch (error) {
    console.error('加载列信息失败:', error);
    message.error(error.message || '加载列信息失败');
  }
};

const addColumnMapping = () => {
  columnMapping.value.push({ sourceColumn: null, targetColumn: null });
};

const removeColumnMapping = (index) => {
  columnMapping.value.splice(index, 1);
};

const handleColumnChange = (index) => {
  const mapping = columnMapping.value[index];
  if (mapping.sourceColumn && !mapping.targetColumn) {
    mapping.targetColumn = mapping.sourceColumn;
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
    const res = await syncAPI.executeTask(record.id);
    if (res?.success) {
      message.success(`任务已启动: ${record.name}`);
      await loadTasks();
    } else {
      throw new Error(res?.message || '执行失败');
    }
  } catch (error) {
    message.error(error.message || '任务执行失败');
  } finally {
    executingIds.value = executingIds.value.filter(id => id !== record.id);
  }
};

const handleEdit = async (record) => {
  isEdit.value = true;
  Object.assign(taskForm, { ...record });
  showCreateModal.value = true;
  if (taskForm.source_id) {
    await handleSourceChange('source');
    if (taskForm.source_database) {
      await handleDatabaseChange('source');
      if (taskForm.source_table) await handleTableChange('source');
    }
  }
  if (taskForm.target_id) {
    await handleSourceChange('target');
    if (taskForm.target_database) {
      await handleDatabaseChange('target');
      if (taskForm.target_table) await handleTableChange('target');
    }
  }
};

const handleToggleActive = (record) => {
  message.info('当前后端暂未提供任务启停字段，建议使用“立即执行/取消任务”操作');
};

const handleViewDetail = (record) => {
  currentTask.value = record;
  showDetailModal.value = true;
};

const handlePreview = async (record) => {
  try {
    message.info('正在预览数据...');
    const res = await syncAPI.previewSync({
      sourceId: record.source_id,
      sourceDatabase: record.source_database,
      sourceTable: record.source_table,
      targetId: record.target_id,
      targetDatabase: record.target_database,
      targetTable: record.target_table,
      limit: 10
    });
    if (!res?.success) {
      throw new Error(res?.message || '预览失败');
    }
    const data = res.data || {};
    previewData.value = data.sample_data || [];
    previewColumns.value = (data.source_columns || []).map((item) => item.name);
    showPreviewModal.value = true;
  } catch (error) {
    message.error(error.message || '预览失败');
  }
};

const handleCopyTask = (record) => {
  isEdit.value = false;
  Object.assign(taskForm, {
    ...record,
    id: null,
    name: `${record.name} (复制)`,
    status: 'pending',
    last_executed_at: null,
    duration: null,
    progress: 0
  });
  showCreateModal.value = true;
};

const handleDelete = async (taskId) => {
  try {
    const res = await syncAPI.deleteTask(taskId);
    if (!res?.success) {
      throw new Error(res?.message || '删除失败');
    }
    await loadTasks();
    message.success('任务已删除');
  } catch (error) {
    message.error(error.message || '删除失败');
  }
};

const handleSaveTask = async () => {
  try {
    await taskFormRef.value?.validate();
    saving.value = true;

    if (String(taskForm.source_id) === String(taskForm.target_id)) {
      throw new Error('源数据源与目标数据源不能相同');
    }
    if (taskForm.schedule_type === 'cron' && !taskForm.cron_expression?.trim()) {
      throw new Error('定时调度模式下请填写 Cron 表达式');
    }

    const payload = {
      name: taskForm.name,
      description: taskForm.description,
      source_id: taskForm.source_id,
      target_id: taskForm.target_id,
      source_table: `${taskForm.source_database}.${taskForm.source_table}`,
      target_table: `${taskForm.target_database}.${taskForm.target_table}`,
      sync_mode: taskForm.sync_mode,
      sync_condition: taskForm.sync_mode === 'incremental' && taskForm.incremental_field
        ? `${taskForm.incremental_field} IS NOT NULL`
        : null,
      column_mapping: columnMapping.value
        .filter(item => item.sourceColumn && item.targetColumn)
        .reduce((acc, item) => {
          acc[item.sourceColumn] = item.targetColumn;
          return acc;
        }, {}),
      batch_size: taskForm.batch_size,
      is_scheduled: taskForm.schedule_type === 'cron',
      cron_expression: taskForm.schedule_type === 'cron' ? taskForm.cron_expression : null
    };
    
    if (isEdit.value) {
      const res = await syncAPI.updateTask(taskForm.id, payload);
      if (!res?.success) throw new Error(res?.message || '更新失败');
      message.success('任务更新成功');
    } else {
      const res = await syncAPI.createTask(payload);
      if (!res?.success) throw new Error(res?.message || '创建失败');
      message.success('任务创建成功');
    }
    
    await loadTasks();
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
  columnMapping.value = [{ sourceColumn: null, targetColumn: null }];
  isEdit.value = false;
};

onMounted(async () => {
  await loadDataSources();
  await loadTasks();
});
</script>

<style scoped lang="less">
.data-sync-container {
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

.source-cell,
.target-cell {
  code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    margin-top: 4px;
    display: block;
  }
}

.status-cell {
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;

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

    &.collection {
      background: #f6ffed;
      color: #52c41a;
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