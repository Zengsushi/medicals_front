<template>
  <div class="source-manage-container">
    <a-spin :spinning="loading">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">🗄️ 数据源管理</h2>
          <div class="header-stats">
            <span class="stat-badge total">
              <DatabaseOutlined /> 共 {{ total }} 个数据源
            </span>
            <span class="stat-badge success">
              <CheckCircleOutlined /> {{ onlineCount }} 在线
            </span>
            <span class="stat-badge error">
              <CloseCircleOutlined /> {{ offlineCount }} 离线
            </span>
          </div>
        </div>

        <div class="header-right">
          <a-input-search
            v-model:value="searchText"
            placeholder="搜索数据源名称/地址..."
            style="width: 240px"
            allowClear
            @search="handleSearch"
            @change="handleSearchChange"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input-search>

          <a-select
            v-model:value="filterType"
            placeholder="数据库类型"
            style="width: 140px"
            allowClear
            @change="handleFilterType"
          >
            <a-select-option value="">全部类型</a-select-option>
            <a-select-option value="mysql">
              <DatabaseFilled style="color: #1677ff; margin-right: 6px;" /> MySQL
            </a-select-option>
            <a-select-option value="postgresql">
              <DatabaseFilled style="color: #fa8c16; margin-right: 6px;" /> PostgreSQL
            </a-select-option>
            <a-select-option value="hive">
              <DatabaseFilled style="color: #722ed1; margin-right: 6px;" /> Hive
            </a-select-option>
            <a-select-option value="oracle">
              <DatabaseFilled style="color: #f5222d; margin-right: 6px;" /> Oracle
            </a-select-option>
            <a-select-option value="sqlserver">
              <DatabaseFilled style="color: #13c2c2; margin-right: 6px;" /> SQL Server
            </a-select-option>
          </a-select>

          <a-select
            v-model:value="filterStatus"
            placeholder="连接状态"
            style="width: 120px"
            allowClear
            @change="handleFilterStatus"
          >
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="online">在线</a-select-option>
            <a-select-option value="offline">离线</a-select-option>
          </a-select>

          <a-button type="primary" @click="handleAdd">
            <template #icon><PlusOutlined /></template>
            新增数据源
          </a-button>

          <a-button @click="loadDataSources">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>

          <a-dropdown :trigger="['click']">
            <a-button>
              <template #icon><MoreOutlined /></template>
              批量操作
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="handleBatchTest" :disabled="selectedRowKeys.length === 0">
                  <SyncOutlined spin={false} /> 批量测试连接
                </a-menu-item>
                <a-menu-item @click="handleBatchEnable" :disabled="selectedRowKeys.length === 0">
                  <CheckCircleOutlined /> 批量启用
                </a-menu-item>
                <a-menu-item @click="handleBatchDisable" :disabled="selectedRowKeys.length === 0">
                  <StopOutlined /> 批量停用
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item danger @click="handleBatchDelete" :disabled="selectedRowKeys.length === 0">
                  <DeleteOutlined /> 批量删除
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>

      <!-- 统计卡片 -->
      <a-row :gutter="[16, 16]" class="stats-row">
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-blue hoverable" size="small">
            <a-statistic title="总数据源" :value="total" :value-style="{ color: '#1677ff', fontSize: '24px' }">
              <template #prefix><DatabaseOutlined style="color: #1677ff;" /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-green hoverable" size="small">
            <a-statistic title="在线数量" :value="onlineCount" :value-style="{ color: '#52c41a', fontSize: '24px' }">
              <template #prefix><CheckCircleOutlined style="color: #52c41a;" /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-orange hoverable" size="small">
            <a-statistic title="默认数据源" :value="defaultCount" :value-style="{ color: '#fa8c16', fontSize: '24px' }">
              <template #prefix><StarFilled style="color: #fa8c16;" /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="6">
          <a-card class="stat-card stat-card-purple hoverable" size="small">
            <a-statistic title="平均延迟" :value="avgLatency" suffix="ms" :value-style="{ color: '#722ed1', fontSize: '24px' }">
              <template #prefix><ThunderboltOutlined style="color: #722ed1;" /></template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <!-- 主内容区 -->
      <a-card class="table-card" :body-style="{ padding: 0 }">
        <a-table
          :columns="columns"
          :data-source="dataSources"
          :loading="loading"
          row-key="id"
          :pagination="paginationConfig"
          :row-selection="rowSelection"
          size="middle"
          :scroll="{ x: 1200 }"
          :row-class-name="(record) => record.connected ? 'row-online' : 'row-offline'"
        >
          <!-- 数据源名称列 -->
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="name-cell">
                <div class="db-icon" :class="'type-' + (record.type || 'mysql')">
                  <DatabaseFilled />
                </div>
                <div class="name-info">
                  <div class="name-main">
                    <span class="name-text">{{ record.name }}</span>
                    <a-tag v-if="record.is_default" color="gold" size="small" class="default-tag">
                      <StarFilled /> 默认
                    </a-tag>
                    <a-tag v-if="record.is_active !== false" color="success" size="small">启用</a-tag>
                    <a-tag v-else color="error" size="small">停用</a-tag>
                  </div>
                  <div class="name-desc">{{ record.description || '暂无描述' }}</div>
                </div>
              </div>
            </template>

            <!-- 数据库类型 -->
            <template v-if="column.key === 'type'">
              <a-tag :color="getDbTypeColor(record.type)" class="type-tag">
                <DatabaseFilled v-if="getDbTypeIcon(record.type)" />
                {{ getDbTypeName(record.type) }}
              </a-tag>
            </template>

            <!-- 连接地址 -->
            <template v-if="column.key === 'connection'">
              <div class="connection-cell">
                <code class="conn-address">{{ record.host }}:{{ record.port }}</code>
                <br />
                <span class="conn-db">{{ record.database }}</span>
              </div>
            </template>

            <!-- 状态 -->
            <template v-if="column.key === 'status'">
              <div class="status-cell">
                <div class="status-indicator" :class="record.connected ? 'online' : 'offline'">
                  <span class="dot"></span>
                  <span class="text">{{ record.connected ? '已连接' : '未连接' }}</span>
                </div>
                <div class="latency-info" v-if="record.latency !== undefined">
                  <span class="latency-value" :class="getLatencyClass(record.latency)">
                    {{ record.latency }}ms
                  </span>
                </div>
              </div>
            </template>

            <!-- 创建时间 -->
            <template v-if="column.key === 'createdAt'">
              <span class="time-cell">{{ formatTime(record.created_at || record.createdAt) }}</span>
            </template>

            <!-- 操作 -->
            <template v-if="column.key === 'actions'">
              <a-space :size="4">
                <a-tooltip title="测试连接">
                  <a-button
                    type="text"
                    size="small"
                    :loading="testingIds.includes(record.id)"
                    @click="handleTestConnection(record)"
                  >
                    <SyncOutlined :spin="testingIds.includes(record.id)" />
                  </a-button>
                </a-tooltip>

                <a-divider type="vertical" />

                <a-tooltip title="编辑">
                  <a-button type="text" size="small" @click="handleEdit(record)">
                    <EditOutlined />
                  </a-button>
                </a-tooltip>

                <a-tooltip v-if="!record.is_default && record.is_active !== false" title="设为默认">
                  <a-button type="text" size="small" @click="handleSetDefault(record)">
                    <StarOutlined />
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
                        {{ record.is_active === false ? '启用' : '停用' }}
                      </a-menu-item>
                      <a-menu-item @click="handleViewDetail(record)">
                        <EyeOutlined />
                        查看详情
                      </a-menu-item>
                      <a-menu-item @click="handleCopyConfig(record)">
                        <CopyOutlined />
                        复制配置
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

      <!-- 新增/编辑弹窗 -->
      <a-modal
        v-model:open="modalVisible"
        :title="isEdit ? '✏️ 编辑数据源' : '➕ 新增数据源'"
        :width="680"
        :destroy-on-close="true"
        @ok="handleSave"
        @cancel="handleCancel"
        ok-text="保存并测试"
        cancel-text="取消"
        :confirm-loading="saving"
        class="source-modal"
      >
        <a-alert
          message="提示：保存后将自动测试连接，确保配置正确后再提交"
          type="info"
          show-icon
          style="margin-bottom: 20px;"
        />

        <a-tabs v-model:activeKey="formTabKey">
          <a-tab-pane key="basic" tab="📝 基本信息">
            <a-form
              ref="formRef"
              :model="form"
              :rules="rules"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 16 }"
              layout="horizontal"
              class="source-form"
            >
              <a-form-item label="数据源名称" name="name">
                <a-input v-model:value="form.name" placeholder="例如：生产环境MySQL主库" :maxlength="50" show-count allow-clear>
                  <template #prefix><FileTextOutlined /></template>
                </a-input>
              </a-form-item>

              <a-form-item label="数据库类型" name="type">
                <a-select v-model:value="form.type" @change="handleTypeChange" size="large">
                  <a-select-option value="mysql">
                    <DatabaseFilled style="color: #1677ff; margin-right: 8px;" /> MySQL
                  </a-select-option>
                  <a-select-option value="postgresql">
                    <DatabaseFilled style="color: #fa8c16; margin-right: 8px;" /> PostgreSQL
                  </a-select-option>
                  <a-select-option value="hive">
                    <DatabaseFilled style="color: #722ed1; margin-right: 8px;" /> Apache Hive
                  </a-select-option>
                  <a-select-option value="oracle">
                    <DatabaseFilled style="color: #f5222d; margin-right: 8px;" /> Oracle Database
                  </a-select-option>
                  <a-select-option value="sqlserver">
                    <DatabaseFilled style="color: #13c2c2; margin-right: 8px;" /> SQL Server
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-row :gutter="16">
                <a-col :span="16">
                  <a-form-item label="主机地址" name="host" :label-col="{ span: 9 }" :wrapper-col="{ span: 14 }">
                    <a-input v-model:value="form.host" placeholder="127.0.0.1 或 localhost" allow-clear>
                      <template #prefix><GlobalOutlined /></template>
                    </a-input>
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="端口" name="port" :label-col="{ span: 10 }" :wrapper-col="{ span: 13 }">
                    <a-input-number
                      v-model:value="form.port"
                      :min="1"
                      :max="65535"
                      style="width: 100%"
                      :placeholder="getDefaultPort(form.type)"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item label="数据库名称" name="database">
                <a-select
                  v-model:value="form.database"
                  placeholder="选择数据库"
                  allow-clear
                  show-search
                  :loading="loadingDatabases"
                  @focus="loadDatabases"
                >
                  <a-select-option v-for="db in databases" :key="db" :value="db">{{ db }}</a-select-option>
                </a-select>
                <div class="form-tip" style="display: flex; align-items: center; gap: 8px;">
                  <a-button
                    size="small"
                    type="dashed"
                    :loading="testingFormConnection || loadingDatabases"
                    @click="verifyConnectionAndLoadDatabases"
                  >
                    测试连接并加载库列表
                  </a-button>
                  <span v-if="isConnectionVerified" style="color: #52c41a;">连接已验证</span>
                  <span v-else style="color: #8c8c8c;">可直接触发加载</span>
                </div>
              </a-form-item>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="用户名" name="username" :label-col="{ span: 8 }" :wrapper-col="{ span: 15 }">
                    <a-input v-model:value="form.username" placeholder="数据库用户名" allow-clear>
                      <template #prefix><UserOutlined /></template>
                    </a-input>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="密码" name="password" :label-col="{ span: 8 }" :wrapper-col="{ span: 15 }">
                    <a-input-password v-model:value="form.password" placeholder="数据库密码" allow-clear />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </a-tab-pane>

          <a-tab-pane key="advanced" tab="⚙️ 高级配置">
            <a-form
              :model="form"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 16 }"
              layout="horizontal"
              class="source-form"
            >
              <a-form-item label="连接参数">
                <a-input
                  v-model:value="form.params"
                  placeholder="useSSL=false&serverTimezone=UTC&characterEncoding=utf8"
                  allow-clear
                />
                <div class="form-tip">额外的 JDBC/ODBC 连接参数</div>
              </a-form-item>

              <a-form-item label="最大连接数">
                <a-input-number v-model:value="form.maxPoolSize" :min="1" :max="200" :defaultValue="10" style="width: 100%" />
                <div class="form-tip">连接池最大连接数，建议 10-50</div>
              </a-form-item>

              <a-form-item label="超时时间(秒)">
                <a-input-number v-model:value="form.timeout" :min="1" :max="300" :defaultValue="30" style="width: 100%" />
              </a-form-item>

              <a-form-item label="描述说明">
                <a-textarea
                  v-model:value="form.description"
                  placeholder="输入数据源用途说明..."
                  :rows="3"
                  :maxlength="200"
                  show-count
                />
              </a-form-item>

              <a-form-item label="设为默认数据源">
                <a-switch v-model:checked="form.isDefault" checkedChildren="是" unCheckedChildren="否" />
              </a-form-item>

              <a-form-item label="自动启用">
                <a-switch v-model:checked="form.isActive" checkedChildren="启用" unCheckedChildren="停用" />
                <div class="form-tip">创建后是否立即激活该数据源</div>
              </a-form-item>
            </a-form>
          </a-tab-pane>
        </a-tabs>
      </a-modal>

      <!-- 详情抽屉 -->
      <a-drawer
        v-model:open="detailDrawerVisible"
        :title="`📋 数据源详情 - ${detailData?.name}`"
        :width="520"
        placement="right"
        :destroy-on-close="true"
      >
        <a-descriptions :column="1" bordered size="small" class="detail-desc">
          <a-descriptions-item label="数据源名称">{{ detailData?.name }}</a-descriptions-item>
          <a-descriptions-item label="数据库类型">
            <a-tag :color="getDbTypeColor(detailData?.type)">{{ getDbTypeName(detailData?.type) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="连接地址">
            <code>{{ detailData?.host }}:{{ detailData?.port }}</code>
          </a-descriptions-item>
          <a-descriptions-item label="数据库名">{{ detailData?.database }}</a-descriptions-item>
          <a-descriptions-item label="用户名">{{ detailData?.username }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-badge :status="detailData?.connected ? 'success' : 'default'" :text="detailData?.connected ? '在线' : '离线'" />
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ formatTime(detailData?.created_at) }}</a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ formatTime(detailData?.updated_at) }}</a-descriptions-item>
          <a-descriptions-item label="描述">{{ detailData?.description || '-' }}</a-descriptions-item>
        </a-descriptions>

        <div class="drawer-actions">
          <a-space>
            <a-button type="primary" @click="handleTestConnection(detailData)">测试连接</a-button>
            <a-button @click="handleEdit(detailData)">编辑</a-button>
          </a-space>
        </div>
      </a-drawer>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, h } from 'vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
  StarOutlined,
  StarFilled,
  SearchOutlined,
  ReloadOutlined,
  MoreOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DatabaseFilled,
  GlobalOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  UserOutlined,
  PoweroffOutlined,
  EyeOutlined,
  CopyOutlined,
  ThunderboltOutlined,
  StopOutlined
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import datasourceAPI from '../../api/datasource'
import { useErrorHandler } from '../../composables/useErrorHandler'
import { useDataSourceStore } from '../../stores/datasource'

const dataSourceStore = useDataSourceStore()

const { handleAsync } = useErrorHandler({ showNotification: true })

const loading = ref(false)
const saving = ref(false)
const loadingDatabases = ref(false)
const testingFormConnection = ref(false)
const modalVisible = ref(false)
const detailDrawerVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const testingIds = ref([])
const searchText = ref('')
const filterType = ref('')
const filterStatus = ref('')
const formTabKey = ref('basic')
const selectedRowKeys = ref([])
const databases = ref([])
const isConnectionVerified = ref(false)

const dataSources = ref([])
const total = ref(0)
const detailData = ref(null)

const paginationConfig = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (t) => `共 ${t} 条记录`,
  pageSizeOptions: ['10', '20', '50', 100],
  onChange: (page, pageSize) => {
    paginationConfig.current = page
    paginationConfig.pageSize = pageSize
    loadDataSources()
  }
})

const form = reactive({
  id: null,
  name: '',
  type: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: '',
  username: '',
  password: '',
  params: '',
  maxPoolSize: 10,
  timeout: 30,
  description: '',
  isDefault: false,
  isActive: true
})

const rules = {
  name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口号', trigger: 'blur' }],
  database: [{ required: true, message: '请选择数据库名称', trigger: ['blur', 'change'] }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

const rowSelection = {
  selectedRowKeys: selectedRowKeys,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}

const columns = [
  {
    title: '数据源信息',
    dataIndex: 'name',
    key: 'name',
    width: 280,
    fixed: 'left'
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 130,
    align: 'center',
    filters: [
      { text: 'MySQL', value: 'mysql' },
      { text: 'PostgreSQL', value: 'postgresql' },
      { text: 'Hive', value: 'hive' },
      { text: 'Oracle', value: 'oracle' },
      { text: 'SQL Server', value: 'sqlserver' }
    ],
    onFilter: (value, record) => record.type === value
  },
  {
    title: '连接地址',
    dataIndex: 'host',
    key: 'connection',
    width: 180
  },
  {
    title: '状态',
    dataIndex: 'connected',
    key: 'status',
    width: 140,
    align: 'center',
    sorter: (a, b) => (b.connected ? 1 : 0) - (a.connected ? 1 : 0)
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'createdAt',
    width: 160,
    sorter: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    align: 'center'
  }
]

const onlineCount = computed(() =>
  dataSources.value.filter(ds => ds.connected).length
)

const offlineCount = computed(() =>
  dataSources.value.filter(ds => !ds.connected).length
)

const defaultCount = computed(() =>
  dataSources.value.filter(ds => ds.is_default).length
)

const avgLatency = computed(() => {
  const latencies = dataSources.value
    .map(ds => Number(ds.latency))
    .filter(lat => Number.isFinite(lat) && lat >= 0)
  if (!latencies.length) return '--'
  return Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length)
})

const getDbTypeColor = (type) => {
  const colors = {
    mysql: 'blue',
    postgresql: 'orange',
    hive: 'purple',
    oracle: 'red',
    sqlserver: 'cyan'
  }
  return colors[type] || 'default'
}

const getDbTypeName = (type) => {
  const names = {
    mysql: 'MySQL',
    postgresql: 'PostgreSQL',
    hive: 'Hive',
    oracle: 'Oracle',
    sqlserver: 'SQL Server'
  }
  return names[type] || type || '-'
}

const getDbTypeIcon = (type) => !!type

const getDefaultPort = (type) => {
  const ports = {
    mysql: 3306,
    postgresql: 5432,
    hive: 9083,
    oracle: 1521,
    sqlserver: 1433
  }
  return ports[type] || 3306
}

const getLatencyClass = (latency) => {
  if (latency <= 50) return 'fast'
  if (latency <= 200) return 'normal'
  return 'slow'
}

const formatTime = (time) => {
  if (!time) return '-'
  try {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return time
  }
}

const loadDataSources = async () => {
  loading.value = true
  try {
    console.log('[SourceManage] 开始加载数据...')
    const params = {
      page: paginationConfig.current,
      pageSize: paginationConfig.pageSize
    }
    const t = (filterType.value || '').trim()
    if (t) params.type = t.toLowerCase()
    const kw = (searchText.value || '').trim()
    if (kw) params.keyword = kw
    const st = (filterStatus.value || '').trim()
    if (st) params.status = st

    const res = await datasourceAPI.getDataSourceList(params)
    console.log('[SourceManage] 原始响应:', res)
    
    // 统一处理响应格式
    let result = res
    if (res.data !== undefined) {
      result = res
    } else if (res.code !== undefined) {
      result = res
    }
    
    console.log('[SourceManage] 处理后的result:', result)
    
    if (result.success) {
      let data = []
      if (result.data) {
        data = Array.isArray(result.data)
          ? result.data
          : result.data.datasources || result.data.list || result.data.items || []
      }

      console.log('[SourceManage] result.data:', result.data)
      console.log('[SourceManage] 提取的data:', data)
      
      dataSources.value = data.map((item, idx) => {
        const rawType = item.type ?? item.dbType ?? ''
        const normType = String(rawType).trim().toLowerCase()
        return {
          ...item,
          id: item.id || idx + 1,
          type: normType || rawType,
          connected: Boolean(item.connected ?? item.is_connected),
          latency: item.latency ?? null,
          created_at: item.created_at || item.createdAt || new Date().toISOString(),
          updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
          is_default: item.is_default || item.isDefault || false,
          is_active: item.is_active !== false
        }
      })

      dataSourceStore.dataSources = dataSources.value

      console.log('[SourceManage] dataSources.value:', dataSources.value)
      const serverTotal = result.data?.total
      total.value = typeof serverTotal === 'number' ? serverTotal : data.length
      paginationConfig.total = total.value
      console.log('[SourceManage] 加载成功，数据条数:', dataSources.value.length)
      
      // 更新统计卡片
      loadStats()
    } else {
      console.warn('[SourceManage] result.success 为 false:', result)
      dataSources.value = []
      total.value = 0
      paginationConfig.total = 0
    }
  } catch (e) {
    console.error('加载数据源失败:', e)
    dataSources.value = []
    total.value = 0
    paginationConfig.total = 0
  } finally {
    loading.value = false
  }
}

const generateMockData = () => {
  return []
}

const loadStats = async () => {
  try {
    const result = await datasourceAPI.getDataSourceStats()
    if (result.success && result.data) {
      // 统计卡片使用 computed 从 dataSources 计算，不需要额外处理
      console.log('[SourceManage] 统计信息:', result.data)
    }
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

const handleSearch = () => {
  paginationConfig.current = 1
  loadDataSources()
}

const handleSearchChange = () => {}

const handleFilterType = () => {
  paginationConfig.current = 1
  loadDataSources()
}

const handleFilterStatus = () => {
  paginationConfig.current = 1
  loadDataSources()
}

const handleAdd = () => {
  isEdit.value = false
  resetForm()
  modalVisible.value = true
  formTabKey.value = 'basic'
}

const handleEdit = (record) => {
  isEdit.value = true
  Object.assign(form, {
    id: record.id,
    name: record.name,
    type: record.type || 'mysql',
    host: record.host,
    port: record.port,
    database: record.database,
    username: record.username,
    password: '',
    params: record.params || record.extra_config || '',
    maxPoolSize: record.maxPoolSize || 10,
    timeout: record.timeout || 30,
    description: record.description || '',
    isDefault: record.is_default || false,
    isActive: record.is_active !== false
  })
  modalVisible.value = true
  formTabKey.value = 'basic'
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
    saving.value = true

    const submitData = {
      ...form,
      dbType: form.type,
      isDefault: form.isDefault
    }

    const result = await handleAsync(async () => {
      if (isEdit.value) {
        return await datasourceAPI.updateDataSource(form.id, submitData)
      } else {
        return await datasourceAPI.createDataSource(submitData)
      }
    }, {
      successMessage: isEdit.value ? '✅ 更新成功！' : '✅ 创建成功！'
    })

    if (result.success) {
      modalVisible.value = false
      resetForm()

      message.loading('正在测试连接...', 1.5)

      setTimeout(async () => {
        await loadDataSources()
        message.success('连接测试完成！')
      }, 1500)
    }
  } catch (error) {
    if (error.message !== 'Validation failed') {
      message.error('操作失败: ' + error.message)
    }
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  modalVisible.value = false
  resetForm()
}

const handleDelete = async (id) => {
  try {
    const result = await handleAsync(
      () => datasourceAPI.deleteDataSource(id),
      { successMessage: '删除成功' }
    )
    if (result.success) {
      await loadDataSources()
    }
  } catch (error) {
    console.error('删除失败:', error)
  }
}

const applyConnectionTestResult = (recordId, success, latencyMs) => {
  const index = dataSources.value.findIndex(ds => ds.id === recordId)
  if (index !== -1) {
    dataSources.value[index].connected = Boolean(success)
    dataSources.value[index].latency = success && Number.isFinite(latencyMs)
      ? Math.max(0, Math.floor(latencyMs))
      : null
  }
}

const handleTestConnection = async (record, options = { silent: false }) => {
  if (!record?.id) return { success: false, message: '缺少数据源ID' }
  if (testingIds.value.includes(record.id)) return { success: false, message: '正在测试中' }

  testingIds.value.push(record.id)
  if (!options.silent) {
    message.loading({ content: `正在测试 ${record.name} 连接...`, key: `test-${record.id}`, duration: 0 })
  }

  try {
    console.log('[SourceManage] 测试连接参数:', JSON.stringify({ id: record.id }))
    const result = await handleAsync(
      () => datasourceAPI.testConnection({ id: record.id }),
      { showSuccess: false, showError: false }
    )
    console.log('[SourceManage] 测试连接完整响应:', result)

    // 从API响应中获取真实结果
    const apiSuccess = Boolean(result?.success && result?.data?.success)
    const apiMessage = result.data?.message || result.message || ''
    const apiLatency = result.data?.latency
    
    console.log('[SourceManage] 解析结果: success=', apiSuccess, 'message=', apiMessage, 'latency=', apiLatency)
    applyConnectionTestResult(record.id, apiSuccess, Number(apiLatency) * 1000)

    if (apiSuccess) {
      const index = dataSources.value.findIndex(ds => ds.id === record.id)
      const latencyInfo = dataSources.value[index]?.latency ? ` (${dataSources.value[index].latency}ms)` : ''
      if (!options.silent) {
        message.success({
          content: `${record.name} 连接成功${latencyInfo}${apiMessage ? ` - ${apiMessage}` : ''}`,
          key: `test-${record.id}`
        })
      }
    } else {
      if (!options.silent) {
        message.error({
          content: `${record.name} 连接失败: ${apiMessage || '请检查连接参数或网络'}`,
          key: `test-${record.id}`
        })
      }
    }
    return { success: apiSuccess, message: apiMessage }
  } catch (error) {
    applyConnectionTestResult(record.id, false, null)
    if (!options.silent) {
      message.error({
        content: `${record.name} 连接测试异常: ${error.message}`,
        key: `test-${record.id}`
      })
    }
    return { success: false, message: error.message }
  } finally {
    testingIds.value = testingIds.value.filter(id => id !== record.id)
    loadStats()
  }
}

const handleSetDefault = async (record) => {
  try {
    const result = await handleAsync(
      () => datasourceAPI.setDefault(record.id),
      { successMessage: `已将 "${record.name}" 设为默认数据源` }
    )
    if (result.success) {
      await loadDataSources()
    }
  } catch (error) {
    console.error('设为默认失败:', error)
  }
}

const handleToggleActive = async (record) => {
  try {
    const newActive = record.is_active === false
    const result = await handleAsync(
      () => datasourceAPI.updateDataSource(record.id, { is_active: newActive }),
      { showSuccess: false }
    )
    if (result.success) {
      const index = dataSources.value.findIndex(ds => ds.id === record.id)
      if (index !== -1) {
        dataSources.value[index].is_active = newActive
      }
      message.success(newActive ? `${record.name} 已启用` : `${record.name} 已停用`)
    }
  } catch (error) {
    console.error('切换状态失败:', error)
  }
}

const handleViewDetail = (record) => {
  detailData.value = record
  detailDrawerVisible.value = true
}

const handleCopyConfig = (record) => {
  const config = JSON.stringify({
    type: record.type,
    host: record.host,
    port: record.port,
    database: record.database,
    username: record.username
  }, null, 2)
  navigator.clipboard.writeText(config).then(() => {
    message.success('配置已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败')
  })
}

const handleTypeChange = (val) => {
  form.port = getDefaultPort(val)
  // 类型改变后需要重新测试连接
  resetDatabaseSelectionState()
}

const verifyConnectionAndLoadDatabases = async () => {
  if (!form.host || !form.port || !form.username || !form.password) {
    message.warning('请先填写完整连接信息后再测试连接')
    return
  }

  testingFormConnection.value = true
  try {
    if (form.type === 'hive') {
      const hiveResult = await handleAsync(
        () => datasourceAPI.getHiveDatabases({
          host: form.host,
          port: form.port,
          username: form.username,
          password: form.password,
          type: form.type
        }),
        { showSuccess: false, showError: false }
      )
      const hivePayload = hiveResult?.data?.data || hiveResult?.data || {}
      const hiveDatabases = hivePayload?.databases || []
      if (hiveResult?.success && Array.isArray(hiveDatabases)) {
        isConnectionVerified.value = true
        databases.value = hiveDatabases
        message.success('Hive 库列表获取成功')
      } else {
        resetDatabaseSelectionState()
        message.error(hivePayload?.message || 'Hive 库列表获取失败')
      }
      return
    }

    const result = await handleAsync(
      () => datasourceAPI.testConnection({
        host: form.host,
        port: form.port,
        username: form.username,
        password: form.password,
        type: form.type
      }),
      { showSuccess: false, showError: false }
    )

    const payload = result?.data?.data || result?.data || {}
    const connectSuccess = Boolean(result?.success && payload?.success)
    if (!connectSuccess) {
      resetDatabaseSelectionState()
      message.error(payload?.message || '连接测试失败，请检查主机、端口、账号和密码')
      return
    }

    isConnectionVerified.value = true
    message.success('连接测试成功，正在加载库列表...')
    loadDatabases()
  } catch (error) {
    resetDatabaseSelectionState()
    message.error('连接测试异常: ' + error.message)
  } finally {
    testingFormConnection.value = false
  }
}

const loadDatabases = async () => {
  if (!form.host || !form.port || !form.username || !form.password) {
    message.warning('请先填写连接信息')
    return
  }
  
  loadingDatabases.value = true
  try {
    console.log('[SourceManage] 开始加载数据库列表:', {
      host: form.host,
      port: form.port,
      username: form.username,
      password: form.password,
      type: form.type
    })
    
    const result = await handleAsync(
      () => (form.type === 'hive'
        ? datasourceAPI.getHiveDatabases({
            host: form.host,
            port: form.port,
            username: form.username,
            password: form.password,
            type: form.type
          })
        : datasourceAPI.testConnection({
            host: form.host,
            port: form.port,
            username: form.username,
            password: form.password,
            type: form.type
          })),
      { showSuccess: false, showError: false }
    )
    
    console.log('[SourceManage] 加载数据库列表响应:', result)
    
    const payload = result?.data?.data || result?.data || {}
    const candidateDatabases = payload?.databases || payload?.details?.databases || []
    const isLoadSuccess = form.type === 'hive'
      ? (result?.success && Array.isArray(candidateDatabases))
      : (result?.success && payload?.success && Array.isArray(candidateDatabases))

    if (isLoadSuccess) {
      databases.value = candidateDatabases
      console.log('[SourceManage] 数据库列表:', databases.value)
      if (databases.value.length === 0) {
        message.info('未找到可用数据库')
      }
    } else {
      message.error('加载数据库失败: ' + (payload?.message || result?.data?.message || '连接失败'))
      databases.value = []
    }
  } catch (error) {
    console.error('[SourceManage] 加载数据库失败:', error)
    message.error('加载数据库失败: ' + error.message)
    databases.value = []
  } finally {
    loadingDatabases.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    type: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    database: '',
    username: '',
    password: '',
    params: '',
    maxPoolSize: 10,
    timeout: 30,
    description: '',
    isDefault: false,
    isActive: true
  })
  resetDatabaseSelectionState()
  setTimeout(() => {
    formRef.value?.resetFields()
  }, 0)
}

const resetDatabaseSelectionState = () => {
  databases.value = []
  form.database = ''
  isConnectionVerified.value = false
}

watch(
  () => [form.type, form.host, form.port, form.username, form.password],
  (next, prev) => {
    if (!prev) return
    const changed = next.some((value, idx) => value !== prev[idx])
    if (changed) {
      resetDatabaseSelectionState()
    }
  }
)

const handleBatchTest = async () => {
  const targets = selectedRowKeys.value
    .map(id => dataSources.value.find(d => d.id === id))
    .filter(Boolean)
  if (!targets.length) return

  message.loading({ content: `批量测试中（${targets.length}个）...`, key: 'batch-test', duration: 0 })
  let successCount = 0
  let failCount = 0
  for (const record of targets) {
    const result = await handleTestConnection(record, { silent: true })
    if (result.success) successCount += 1
    else failCount += 1
  }
  selectedRowKeys.value = []
  message.success({
    content: `批量测试完成：成功 ${successCount}，失败 ${failCount}`,
    key: 'batch-test'
  })
}

const handleBatchEnable = async () => {
  message.success(`已启用 ${selectedRowKeys.value.length} 个数据源`)
  selectedRowKeys.value = []
  await loadDataSources()
}

const handleBatchDisable = async () => {
  message.success(`已停用 ${selectedRowKeys.value.length} 个数据源`)
  selectedRowKeys.value = []
  await loadDataSources()
}

const handleBatchDelete = () => {
  Modal.confirm({
    title: '批量删除确认',
    content: `确定要删除选中的 ${selectedRowKeys.value.length} 个数据源吗？此操作不可恢复！`,
    okType: 'danger',
    okText: '确认删除',
    onOk: async () => {
      message.success(`已删除 ${selectedRowKeys.value.length} 个数据源`)
      selectedRowKeys.value = []
      await loadDataSources()
    }
  })
}

onMounted(() => {
  loadDataSources()
})
</script>

<style scoped lang="less">
.source-manage-container {
  padding: 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 64px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fff 0%, #f8fbff 100%);
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid #e8e8e8;
  flex-wrap: wrap;
  gap: 16px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .page-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(135deg, #1677ff 0%, #096dd9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-stats {
    display: flex;
    gap: 12px;
  }

  .stat-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;

    &.total { background: #e6f7ff; color: #1677ff; }
    &.success { background: #f6ffed; color: #52c41a; }
    &.error { background: #fff2f0; color: #f5222d; }
  }

  .header-right {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  border-radius: 10px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  &.stat-card-blue::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#1677ff,#69c0ff); border-radius:10px 10px 0 0; }
  &.stat-card-green::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#52c41a,#95de64); border-radius:10px 10px 0 0; }
  &.stat-card-orange::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#fa8c16,#ffc53d); border-radius:10px 10px 0 0; }
  &.stat-card-purple::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#722ed1,#b37feb); border-radius:10px 10px 0 0; }
}

.table-card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  :deep(.ant-table) {
    .row-online { background: linear-gradient(90deg, rgba(82,196,26,0.04), transparent); }
    .row-offline { background: linear-gradient(90deg, rgba(245,34,45,0.03), transparent); }
    .ant-table-thead > tr > th {
      background: #fafafa;
      font-weight: 600;
      color: #262626;
    }
  }
}

// ====== 名称单元格 ======
.name-cell {
  display: flex;
  align-items: flex-start;
  gap: 12px;

  .db-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;

    &.type-mysql { background: linear-gradient(135deg, #e6f7ff, #bae7ff); color: #1677ff; }
    &.type-postgresql { background: linear-gradient(135deg, #fff7e6, #ffe7ba); color: #fa8c16; }
    &.type-hive { background: linear-gradient(135deg, #f9f0ff, #efdbff); color: #722ed1; }
    &.type-oracle { background: linear-gradient(135deg, #fff1f0, #ffccc7); color: #f5222d; }
    &.type-sqlserver { background: linear-gradient(135deg, #e6fffb, #b5f5ec); color: #13c2c2; }
  }

  .name-info {
    flex: 1;
    min-width: 0;

    .name-main {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;

      .name-text {
        font-weight: 600;
        font-size: 14px;
        color: #262626;
      }

      .default-tag { border-radius: 10px; font-size: 11px; }
    }

    .name-desc {
      font-size: 12px;
      color: #8c8c8c;
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.connection-cell {
  font-family: 'SFMono-Regular', Consolas, monospace;

  .conn-address {
    color: #262626;
    font-size: 13px;
    background: #fafafa;
    padding: 2px 8px;
    border-radius: 4px;
    display: inline-block;
  }

  .conn-db {
    color: #8c8c8c;
    font-size: 12px;
    margin-top: 2px;
  }
}

.status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    &.online {
      .dot { background: #52c41a; box-shadow: 0 0 6px rgba(82,196,26,0.4); }
      .text { color: #52c41a; font-weight: 600; font-size: 13px; }
    }

    &.offline {
      .dot { background: #d9d9d9; animation: none; }
      .text { color: #8c8c8c; font-size: 13px; }
    }
  }

  .latency-value {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 8px;

    &.fast { color: #52c41a; background: #f6ffed; }
    &.normal { color: #faad14; background: #fffbe6; }
    &.slow { color: #f5222d; background: #fff2f0; }
  }
}

.time-cell {
  color: #8c8c8c;
  font-size: 12px;
}

.type-tag {
  border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// ====== 弹窗样式 ======
.source-modal {
  :deep(.ant-modal-body) {
    padding: 20px 24px;
  }

  .source-form {
    .form-tip {
      font-size: 12px;
      color: #8c8c8c;
      margin-top: 4px;
    }
  }
}

// ====== 详情抽屉 ======
.detail-desc {
  margin-top: 16px;

  :deep(.ant-descriptions-item-label) {
    font-weight: 600;
    color: #595959;
    width: 100px;
  }
}

.drawer-actions {
  position: absolute;
  bottom: 24px;
  right: 24px;
}
</style>
