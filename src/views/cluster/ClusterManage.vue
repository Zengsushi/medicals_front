<template>
  <div class="cluster-manage">
    <a-page-header
      title="集群管理"
      sub-title="管理 Hadoop 和 Spark 集群"
      :ghost="false"
    >
      <template #extra>
        <a-button type="primary" @click="showCreateModal">
          <template #icon><PlusOutlined /></template>
          新增集群
        </a-button>
      </template>
    </a-page-header>

    <a-card style="margin-top: 20px">
      <a-table
        :columns="columns"
        :data-source="clusters"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag :color="record.type === 'hadoop' ? 'blue' : 'orange'">
              {{ record.type.toUpperCase() }}
            </a-tag>
          </template>
          <template v-if="column.key === 'status'">
            <a-badge
              :status="record.is_connected ? 'success' : 'error'"
              :text="record.is_connected ? '已连接' : '未连接'"
            />
          </template>
          <template v-if="column.key === 'is_active'">
            <a-switch
              :checked="record.is_active"
              @change="handleToggleActive(record)"
            />
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="testConnection(record)">
                <template #icon><CheckCircleOutlined /></template>
                测试连接
              </a-button>
              <a-button size="small" @click="showEditModal(record)">
                <template #icon><EditOutlined /></template>
                编辑
              </a-button>
              <a-button size="small" type="primary" @click="goToMonitor(record)">
                <template #icon><DashboardOutlined /></template>
                监控
              </a-button>
              <a-popconfirm
                title="确定要删除这个集群吗？"
                @confirm="handleDelete(record)"
              >
                <a-button size="small" danger>
                  <template #icon><DeleteOutlined /></template>
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 创建/编辑集群模态框 -->
    <a-modal
      :title="isEdit ? '编辑集群' : '新增集群'"
      v-model:open="modalVisible"
      @ok="handleSave"
      @cancel="handleCancel"
      :confirmLoading="saveLoading"
      width="700px"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item label="集群名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入集群名称" />
        </a-form-item>
        <a-form-item label="集群类型" name="type">
          <a-select v-model:value="formData.type" placeholder="请选择集群类型">
            <a-select-option value="hadoop">Hadoop</a-select-option>
            <a-select-option value="spark">Spark</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="主节点地址" name="master_host">
          <a-input v-model:value="formData.master_host" placeholder="例如: 192.168.1.100" />
        </a-form-item>
        <a-form-item label="主节点端口" name="master_port">
          <a-input-number
            v-model:value="formData.master_port"
            :min="1"
            :max="65535"
            placeholder="例如: 8088"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="Web UI 地址" name="web_ui_url">
          <a-input v-model:value="formData.web_ui_url" placeholder="例如: http://192.168.1.100:8088" />
        </a-form-item>
        <template v-if="formData.type === 'hadoop'">
          <a-form-item label="HDFS 主节点地址" name="hdfs_host">
            <a-input v-model:value="formData.hdfs_host" placeholder="例如: 192.168.1.100" />
          </a-form-item>
          <a-form-item label="HDFS 端口" name="hdfs_port">
            <a-input-number
              v-model:value="formData.hdfs_port"
              :min="1"
              :max="65535"
              placeholder="默认: 9000"
              style="width: 100%"
            />
          </a-form-item>
        </template>
        <a-form-item label="描述" name="description">
          <a-textarea
            v-model:value="formData.description"
            :rows="3"
            placeholder="请输入集群描述"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DashboardOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const saveLoading = ref(false)
const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const clusters = ref([])

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const columns = [
  {
    title: '集群名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '集群类型',
    dataIndex: 'type',
    key: 'type',
    width: 120
  },
  {
    title: '主节点',
    dataIndex: 'master_host',
    key: 'master_host'
  },
  {
    title: '端口',
    dataIndex: 'master_port',
    key: 'master_port',
    width: 100
  },
  {
    title: '连接状态',
    key: 'status',
    width: 120
  },
  {
    title: '是否启用',
    key: 'is_active',
    width: 100
  },
  {
    title: '最后连接时间',
    dataIndex: 'last_connected_at',
    key: 'last_connected_at',
    width: 180,
    customRender: ({ text }) => {
      if (!text) return '-'
      const date = new Date(text)
      return date.toLocaleString('zh-CN')
    }
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
    customRender: ({ text }) => {
      const date = new Date(text)
      return date.toLocaleString('zh-CN')
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    fixed: 'right'
  }
]

const formData = reactive({
  id: null,
  name: '',
  type: 'hadoop',
  master_host: '',
  master_port: null,
  web_ui_url: '',
  hdfs_host: '',
  hdfs_port: 9000,
  description: '',
  is_active: true
})

const formRules = {
  name: [{ required: true, message: '请输入集群名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择集群类型', trigger: 'change' }],
  master_host: [{ required: true, message: '请输入主节点地址', trigger: 'blur' }]
}

const loadClusters = async () => {
  loading.value = true
  try {
    const response = await axios.get(`/api/clusters?skip=${(pagination.current - 1) * pagination.pageSize}&limit=${pagination.pageSize}`)
    if (response.data.code === 200) {
      clusters.value = response.data.data.clusters || []
      pagination.total = response.data.data.total || clusters.value.length
    }
  } catch (error) {
    message.error('加载集群列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const showCreateModal = () => {
  isEdit.value = false
  Object.assign(formData, {
    id: null,
    name: '',
    type: 'hadoop',
    master_host: '',
    master_port: null,
    web_ui_url: '',
    hdfs_host: '',
    hdfs_port: 9000,
    description: '',
    is_active: true
  })
  modalVisible.value = true
}

const showEditModal = (record) => {
  isEdit.value = true
  Object.assign(formData, record)
  modalVisible.value = true
}

const handleSave = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saveLoading.value = true
  try {
    let response
    if (isEdit.value) {
      response = await axios.patch(`/api/clusters/${formData.id}`, formData)
    } else {
      response = await axios.post('/api/clusters', formData)
    }

    if (response.data.code === 200) {
      message.success(isEdit.value ? '更新成功' : '创建成功')
      modalVisible.value = false
      loadClusters()
    } else {
      message.error(response.data.message || '操作失败')
    }
  } catch (error) {
    message.error('操作失败')
    console.error(error)
  } finally {
    saveLoading.value = false
  }
}

const handleCancel = () => {
  modalVisible.value = false
  formRef.value?.resetFields()
}

const handleDelete = async (record) => {
  try {
    const response = await axios.delete(`/api/clusters/${record.id}`)
    if (response.data.code === 200) {
      message.success('删除成功')
      loadClusters()
    } else {
      message.error(response.data.message || '删除失败')
    }
  } catch (error) {
    message.error('删除失败')
    console.error(error)
  }
}

const handleToggleActive = async (record) => {
  try {
    const response = await axios.patch(`/api/clusters/${record.id}`, {
      is_active: !record.is_active
    })
    if (response.data.code === 200) {
      message.success(record.is_active ? '已禁用' : '已启用')
      loadClusters()
    }
  } catch (error) {
    record.is_active = !record.is_active
    message.error('操作失败')
    console.error(error)
  }
}

const testConnection = async (record) => {
  const hide = message.loading('正在测试连接...', 0)
  try {
    const response = await axios.post('/api/clusters/test-connection', {
      id: record.id
    })
    hide()

    if (response.data.code === 200) {
      const result = response.data.data
      if (result.success) {
        message.success(`连接成功！延迟: ${(result.latency * 1000).toFixed(0)}ms`)
      } else {
        message.error(`连接失败: ${result.message}`)
      }
      loadClusters()
    }
  } catch (error) {
    hide()
    message.error('测试连接失败')
    console.error(error)
  }
}

const goToMonitor = (record) => {
  router.push({
    name: 'systemMonitor',
    query: { clusterId: record.id }
  })
}

const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadClusters()
}

onMounted(() => {
  loadClusters()
})
</script>

<style scoped>
.cluster-manage {
  padding: 10px;
}
</style>
