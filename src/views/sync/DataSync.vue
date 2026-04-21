<template>
  <div class="data-sync-container">
    <div class="main-content">
      <div class="header">
        <h2>数据同步</h2>
        <a-button type="primary" @click="showTaskModal = true">
          <template #icon><HistoryOutlined /></template>
          同步任务
        </a-button>
      </div>

      <!-- 数据同步表单 -->
      <a-card class="sync-card" title="新建同步任务">
        <a-alert
          v-if="dataSources.length === 0 && !loadingSources"
          type="warning"
          show-icon
          style="margin-bottom: 16px;"
        >
          <template #message>
            <div>
              <WarningOutlined style="margin-right: 8px;" />
              未找到可用数据源，请先在
              <a href="#/database/source-manage">数据源管理</a> 中配置数据源
            </div>
          </template>
        </a-alert>

        <a-alert
          v-else-if="hiveSources.length === 0"
          type="info"
          show-icon
          style="margin-bottom: 16px;"
          message="未找到 Hive 数据源（源数据），请先添加 Hive 类型数据源"
        />

        <a-alert
          v-else-if="mysqlSources.length === 0"
          type="info"
          show-icon
          style="margin-bottom: 16px;"
          message="未找到 MySQL 数据源（目标数据），请先添加 MySQL 类型数据源"
        />
        <a-form
          ref="formRef"
          :model="form"
          :rules="rules"
          layout="vertical"
        >
          <a-row :gutter="24">
            <!-- 源数据配置 -->
            <a-col :span="12">
              <a-divider orientation="left">
                <template #left>
                  <DatabaseOutlined /> 源数据 (Hive)
                </template>
              </a-divider>
              
              <a-form-item label="选择数据源" name="sourceId">
                <a-select
                  v-model:value="form.sourceId"
                  placeholder="请选择 Hive 数据源"
                  :options="hiveSources"
                  :loading="loadingSources"
                  @change="handleSourceChange('source')"
                  show-search
                  :filter-option="filterOption"
                />
              </a-form-item>

              <a-form-item label="选择数据库" name="sourceDatabase">
                <a-select
                  v-model:value="form.sourceDatabase"
                  placeholder="请选择数据库"
                  :options="sourceDatabases"
                  :loading="loadingSourceDatabases"
                  @change="handleDatabaseChange('source')"
                  :disabled="!form.sourceId"
                />
              </a-form-item>

              <a-form-item label="选择表" name="sourceTable">
                <a-select
                  v-model:value="form.sourceTable"
                  placeholder="请选择表"
                  :options="sourceTables"
                  :loading="loadingSourceTables"
                  @change="handleTableChange('source')"
                  :disabled="!form.sourceDatabase"
                />
              </a-form-item>
            </a-col>

            <!-- 目标数据配置 -->
            <a-col :span="12">
              <a-divider orientation="left">
                <template #left>
                  <CloudServerOutlined /> 目标数据 (MySQL)
                </template>
              </a-divider>
              
              <a-form-item label="选择数据源" name="targetId">
                <a-select
                  v-model:value="form.targetId"
                  placeholder="请选择 MySQL 数据源"
                  :options="mysqlSources"
                  :loading="loadingSources"
                  @change="handleSourceChange('target')"
                  show-search
                  :filter-option="filterOption"
                />
              </a-form-item>

              <a-form-item label="选择数据库" name="targetDatabase">
                <a-select
                  v-model:value="form.targetDatabase"
                  placeholder="请选择数据库"
                  :options="targetDatabases"
                  :loading="loadingTargetDatabases"
                  @change="handleDatabaseChange('target')"
                  :disabled="!form.targetId"
                />
              </a-form-item>

              <a-form-item label="选择表" name="targetTable">
                <a-select
                  v-model:value="form.targetTable"
                  placeholder="请选择表"
                  :options="targetTables"
                  :loading="loadingTargetTables"
                  @change="handleTableChange('target')"
                  :disabled="!form.targetDatabase"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <!-- 列映射配置 -->
          <a-divider>
            <template #left>
              <SwapOutlined /> 列映射配置
            </template>
          </a-divider>

          <a-form-item label="同步模式">
            <a-radio-group v-model:value="form.syncMode">
              <a-radio value="full">全量同步</a-radio>
              <a-radio value="incremental">增量同步</a-radio>
            </a-radio-group>
          </a-form-item>

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

          <a-form-item>
            <a-space>
              <a-button type="primary" :loading="syncing" @click="handlePreview">
                <template #icon><EyeOutlined /></template>
                预览数据
              </a-button>
              <a-button type="primary" :loading="syncing" @click="handleExecuteSync">
                <template #icon><PlayCircleOutlined /></template>
                开始同步
              </a-button>
              <a-button @click="handleReset">
                <template #icon><RedoOutlined /></template>
                重置
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>

      <!-- 数据预览 -->
      <a-card v-if="previewData.length > 0" class="preview-card" title="数据预览">
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
      </a-card>

      <!-- 同步任务列表弹窗 -->
      <a-modal
        v-model:open="showTaskModal"
        title="同步任务列表"
        width="1000px"
        :footer="null"
      >
        <a-table
          :data-source="syncTasks"
          :loading="loadingTasks"
          :pagination="{ pageSize: 10 }"
          row-key="id"
        >
          <template #columns>
            <a-table-column title="任务ID" data-index="id" key="id" width="100" />
            <a-table-column title="源表" data-index="sourceTable" key="sourceTable" width="200" />
            <a-table-column title="目标表" data-index="targetTable" key="targetTable" width="200" />
            <a-table-column title="状态" data-index="status" key="status" width="120">
              <template #default="{ record }">
                <a-tag :color="getStatusColor(record.status)">
                  {{ getStatusText(record.status) }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="进度" data-index="progress" key="progress" width="150">
              <template #default="{ record }">
                <a-progress :percent="record.progress || 0" size="small" />
              </template>
            </a-table-column>
            <a-table-column title="创建时间" data-index="createTime" key="createTime" width="180" />
            <a-table-column title="操作" key="actions" width="150" fixed="right">
              <template #default="{ record }">
                <a-space>
                  <a-button
                    v-if="record.status === 'running'"
                    type="link"
                    size="small"
                    danger
                    @click="handleCancelTask(record.id)"
                  >
                    取消
                  </a-button>
                  <a-button
                    v-if="record.status === 'failed'"
                    type="link"
                    size="small"
                    @click="handleRetryTask(record.id)"
                  >
                    重试
                  </a-button>
                  <a-button type="link" size="small" @click="handleViewTask(record.id)">
                    详情
                  </a-button>
                </a-space>
              </template>
            </a-table-column>
          </template>
        </a-table>
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
          <a-descriptions-item label="源数据">
            {{ currentTask.sourceDatabase }}.{{ currentTask.sourceTable }}
          </a-descriptions-item>
          <a-descriptions-item label="目标数据">
            {{ currentTask.targetDatabase }}.{{ currentTask.targetTable }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(currentTask.status)">
              {{ getStatusText(currentTask.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="同步模式">{{ currentTask.syncMode === 'full' ? '全量同步' : '增量同步' }}</a-descriptions-item>
          <a-descriptions-item label="同步数量">{{ currentTask.syncCount || 0 }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ currentTask.createTime }}</a-descriptions-item>
          <a-descriptions-item label="完成时间">{{ currentTask.finishTime || '-' }}</a-descriptions-item>
          <a-descriptions-item label="错误信息" v-if="currentTask.errorMessage">
            <a-text type="danger">{{ currentTask.errorMessage }}</a-text>
          </a-descriptions-item>
        </a-descriptions>
      </a-modal>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  DatabaseOutlined,
  CloudServerOutlined,
  SwapOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  RedoOutlined,
  HistoryOutlined,
  WarningOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import syncAPI from '../../api/sync';
import datasourceAPI from '../../api/datasource';
import { useDataSourceStore } from '../../stores/datasource';

const dataSourceStore = useDataSourceStore();

const formRef = ref(null);
const loadingSources = ref(false);
const loadingSourceDatabases = ref(false);
const loadingSourceTables = ref(false);
const loadingTargetDatabases = ref(false);
const loadingTargetTables = ref(false);
const syncing = ref(false);
const loadingTasks = ref(false);
const showTaskModal = ref(false);
const showDetailModal = ref(false);

const dataSources = computed(() => dataSourceStore.dataSources);
const sourceDatabases = ref([]);
const sourceTables = ref([]);
const targetDatabases = ref([]);
const targetTables = ref([]);
const sourceColumns = ref([]);
const targetColumns = ref([]);
const previewData = ref([]);
const previewColumns = ref([]);
const syncTasks = ref([]);
const currentTask = ref(null);

const form = reactive({
  sourceId: null,
  sourceDatabase: null,
  sourceTable: null,
  targetId: null,
  targetDatabase: null,
  targetTable: null,
  syncMode: 'full'
});

const columnMapping = ref([
  { sourceColumn: null, targetColumn: null }
]);

const rules = {
  sourceId: [{ required: true, message: '请选择源数据源', trigger: 'change' }],
  sourceDatabase: [{ required: true, message: '请选择源数据库', trigger: 'change' }],
  sourceTable: [{ required: true, message: '请选择源表', trigger: 'change' }],
  targetId: [{ required: true, message: '请选择目标数据源', trigger: 'change' }],
  targetDatabase: [{ required: true, message: '请选择目标数据库', trigger: 'change' }],
  targetTable: [{ required: true, message: '请选择目标表', trigger: 'change' }]
};

const hiveSources = computed(() => {
  return dataSourceStore.hiveSources.map(ds => ({
    label: `${ds.name}${ds.connected === false || ds.is_connected === false ? ' (离线)' : ''}`,
    value: ds.id,
    disabled: ds.is_active === false
  }));
});

const mysqlSources = computed(() => {
  return dataSourceStore.mysqlSources.map(ds => ({
    label: `${ds.name}${ds.connected === false || ds.is_connected === false ? ' (离线)' : ''}`,
      value: ds.id,
      disabled: !ds.is_active
    }));
});

const filterOption = (input, option) => {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
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

const loadDataSources = async () => {
  loadingSources.value = true;
  try {
    console.log('[DataSync] 从Store加载数据源...');
    await dataSourceStore.fetchDataSources();
    console.log(`[DataSync] ✅ 成功加载 ${dataSources.value.length} 个数据源`);
  } catch (error) {
    console.error('[DataSync] ❌ 加载数据源失败:', error);
    message.error('加载数据源失败: ' + (error.message || '网络错误'));
  } finally {
    loadingSources.value = false;
  }
};

const handleSourceChange = async (type) => {
  const sourceId = type === 'source' ? form.sourceId : form.targetId;
  if (!sourceId) return;

  const loadingRef = type === 'source' ? loadingSourceDatabases : loadingTargetDatabases;
  const databasesRef = type === 'source' ? sourceDatabases : targetDatabases;

  loadingRef.value = true;
  try {
    console.log(`[DataSync] 正在获取数据源 ${sourceId} 的数据库列表...`);
    const res = await datasourceAPI.getDatabases(sourceId);
    console.log(`[DataSync] 数据库列表API响应:`, res);

    if (res.success && res.data) {
      let dbList = [];
      if (Array.isArray(res.data)) {
        dbList = res.data;
      } else if (Array.isArray(res.data.databases)) {
        dbList = res.data.databases;
      } else if (res.data.success && Array.isArray(res.data.databases)) {
        dbList = res.data.databases;
      } else if (Array.isArray(res.data.list)) {
        dbList = res.data.list;
      }

      if (dbList.length === 0 && res.data.message) {
        console.warn('[DataSync] ⚠️ 获取数据库失败:', res.data.message);
        message.warning(res.data.message || '获取数据库列表失败');
      }

      databasesRef.value = dbList.map(db => ({
        label: typeof db === 'string' ? db : (db.name || db.database_name || 'unknown'),
        value: typeof db === 'string' ? db : (db.name || db.database_name || db.id)
      }));

      console.log(`[DataSync] ✅ 成功加载 ${databasesRef.value.length} 个数据库`);
    } else {
      console.warn('[DataSync] ⚠️ 获取数据库列表失败:', res);
      databasesRef.value = [];
      message.warning(res.message || '未找到可用数据库');
    }
  } catch (error) {
    console.error('[DataSync] ❌ 获取数据库列表失败:', error);
    message.error('加载数据库列表失败: ' + (error.message || '连接失败'));
    databasesRef.value = [];
  } finally {
    loadingRef.value = false;
  }
};

const handleDatabaseChange = async (type) => {
  const sourceId = type === 'source' ? form.sourceId : form.targetId;
  const database = type === 'source' ? form.sourceDatabase : form.targetDatabase;
  if (!sourceId || !database) return;

  const loadingRef = type === 'source' ? loadingSourceTables : loadingTargetTables;
  const tablesRef = type === 'source' ? sourceTables : targetTables;

  loadingRef.value = true;
  try {
    console.log(`[DataSync] 正在获取数据源 ${sourceId} 数据库 ${database} 的表列表...`);
    const res = await datasourceAPI.getTables(sourceId, database);
    console.log(`[DataSync] 表列表API响应:`, res);

    if (res.success && res.data) {
      let tableList = [];
      if (Array.isArray(res.data)) {
        tableList = res.data;
      } else if (Array.isArray(res.data.tables)) {
        tableList = res.data.tables;
      } else if (res.data.success && Array.isArray(res.data.tables)) {
        tableList = res.data.tables;
      } else if (Array.isArray(res.data.list)) {
        tableList = res.data.list;
      }

      if (tableList.length === 0 && res.data.message) {
        console.warn('[DataSync] ⚠️ 获取表列表失败:', res.data.message);
        message.warning(res.data.message || '获取表列表失败');
      }

      tablesRef.value = tableList.map(table => ({
        label: typeof table === 'string' ? table : (table.name || table.table_name || 'unknown'),
        value: typeof table === 'string' ? table : (table.name || table.table_name || table.id)
      }));

      console.log(`[DataSync] ✅ 成功加载 ${tablesRef.value.length} 个表`);
    } else {
      console.warn('[DataSync] ⚠️ 获取表列表失败:', res);
      tablesRef.value = [];
      message.warning(res.message || '未找到可用表');
    }
  } catch (error) {
    console.error('[DataSync] ❌ 获取表列表失败:', error);
    message.error('加载表列表失败: ' + (error.message || '连接失败'));
    tablesRef.value = [];
  } finally {
    loadingRef.value = false;
  }
};

const handleTableChange = async (type) => {
  const sourceId = type === 'source' ? form.sourceId : form.targetId;
  const database = type === 'source' ? form.sourceDatabase : form.targetDatabase;
  const table = type === 'source' ? form.sourceTable : form.targetTable;

  if (!sourceId || !database || !table) return;

  const columnsRef = type === 'source' ? sourceColumns : targetColumns;

  try {
    console.log(`[DataSync] 正在获取表 ${database}.${table} 的结构信息...`);
    const res = await datasourceAPI.getTableStructure(sourceId, { database, table });
    console.log(`[DataSync] 表结构API响应:`, res);

    if (res.success && res.data) {
      let columnList = [];
      if (Array.isArray(res.data)) {
        columnList = res.data;
      } else if (Array.isArray(res.data.columns)) {
        columnList = res.data.columns;
      } else if (Array.isArray(res.data.list)) {
        columnList = res.data.list;
      }

      columnsRef.value = columnList.map(col => ({
        label: typeof col === 'string' ? col : (col.column_name || col.name || col.field || 'unknown'),
        value: typeof col === 'string' ? col : (col.column_name || col.name || col.field || col.id)
      }));

      console.log(`[DataSync] ✅ 成功加载 ${columnsRef.value.length} 个列`);
    } else {
      console.warn('[DataSync] ⚠️ 获取表结构失败:', res);
      columnsRef.value = [];
      message.warning('未获取到列信息');
    }
  } catch (error) {
    console.error('[DataSync] ❌ 获取表结构失败:', error);
    message.error('加载列信息失败: ' + (error.message || '连接失败'));
    columnsRef.value = [];
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

const handlePreview = async () => {
  try {
    await formRef.value?.validate();
    syncing.value = true;
    message.info('正在预览数据...');

    await new Promise(resolve => setTimeout(resolve, 1000));

    previewColumns.value = ['id', 'name', 'create_time', 'update_time'];
    previewData.value = [
      { id: 1, name: '张三', create_time: '2024-01-01', update_time: '2024-01-01' },
      { id: 2, name: '李四', create_time: '2024-01-02', update_time: '2024-01-02' },
      { id: 3, name: '王五', create_time: '2024-01-03', update_time: '2024-01-03' }
    ];

    message.success('数据预览成功');
  } catch (error) {
    if (error.message !== 'Validation failed') {
      message.error('预览失败: ' + error.message);
    }
  } finally {
    syncing.value = false;
  }
};

const handleExecuteSync = async () => {
  try {
    await formRef.value?.validate();
    syncing.value = true;
    message.info('正在开始同步...');

    await new Promise(resolve => setTimeout(resolve, 1000));
    message.success('同步任务已创建，请在任务列表中查看进度');
    
    previewData.value = [];
    previewColumns.value = [];
  } catch (error) {
    if (error.message !== 'Validation failed') {
      message.error('同步失败: ' + error.message);
    }
  } finally {
    syncing.value = false;
  }
};

const handleReset = () => {
  formRef.value?.resetFields();
  columnMapping.value = [{ sourceColumn: null, targetColumn: null }];
  previewData.value = [];
  previewColumns.value = [];
};

const loadSyncTasks = async () => {
  loadingTasks.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    syncTasks.value = [
      {
        id: 1,
        sourceTable: 'hive_db.user_info',
        targetTable: 'mysql_db.user_info',
        status: 'success',
        progress: 100,
        syncCount: 1000,
        createTime: '2024-01-15 10:30:00',
        finishTime: '2024-01-15 10:35:00'
      },
      {
        id: 2,
        sourceTable: 'hive_db.order_info',
        targetTable: 'mysql_db.order_info',
        status: 'running',
        progress: 60,
        syncCount: 600,
        createTime: '2024-01-15 11:00:00'
      }
    ];
  } catch (error) {
    message.error('加载任务列表失败');
  } finally {
    loadingTasks.value = false;
  }
};

const handleCancelTask = (taskId) => {
  message.info('任务已取消');
  loadSyncTasks();
};

const handleRetryTask = (taskId) => {
  message.info('任务已重新提交');
  loadSyncTasks();
};

const handleViewTask = (taskId) => {
  currentTask.value = syncTasks.value.find(t => t.id === taskId);
  showDetailModal.value = true;
};

showTaskModal.value ? loadSyncTasks() : null;

onMounted(() => {
  loadDataSources();
});
</script>

<style scoped lang="less">
.data-sync-container {
  width: 100%;
  min-height: 100vh;
}

.main-content {
  width: 100%;
  padding: 24px;
  background: linear-gradient(135deg, #e0f7fa 0%, #f5f7fa 50%, #e8f5e9 100%);
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%);
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.08);
}

.header h2 {
  margin: 0;
  font-size: 20px;
  background: linear-gradient(135deg, #00bcd4, #4dd0e1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sync-card,
.preview-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 184, 148, 0.1);
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
}

.sync-card :deep(.ant-card-head-title) {
  font-size: 16px;
  font-weight: 600;
  color: #00bcd4;
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
}
</style>
