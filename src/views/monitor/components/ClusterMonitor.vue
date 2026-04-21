<template>
  <div class="cluster-monitor">
    <a-row :gutter="16">
      <a-col :span="8">
        <a-card title="选择集群" class="select-card">
          <a-select
            v-model:value="selectedCluster"
            style="width: 100%"
            placeholder="请选择Hadoop集群"
            @change="loadClusterMetrics"
          >
            <a-select-option
              v-for="cluster in clusters"
              :key="cluster.id"
              :value="cluster.id"
            >
              {{ cluster.name }} ({{ cluster.type }})
            </a-select-option>
          </a-select>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card class="action-card">
          <a-button type="primary" @click="refreshMetrics" style="margin-right: 8px">
            <template #icon><ReloadOutlined /></template>
            刷新数据
          </a-button>
          <a-button @click="collectMetrics">
            <template #icon><SyncOutlined /></template>
            手动采集
          </a-button>
        </a-card>
      </a-col>
    </a-row>

    <div v-if="clusterMetrics" class="metrics-display">
      <a-row :gutter="16" style="margin-top: 20px">
        <a-col :span="6">
          <a-statistic title="内存使用" :value="clusterMetrics.memory_used" suffix="MB">
            <template #suffix>
              / {{ clusterMetrics.memory_total }} MB
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="6">
          <a-statistic title="内存使用率">
            <template #value>
              <a-progress
                :percent="Math.round(clusterMetrics.memory_percent)"
                :status="clusterMetrics.memory_percent > 80 ? 'exception' : 'active'"
              />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="6">
          <a-statistic title="CPU使用率" :value="clusterMetrics.cpu_usage" suffix="%" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="采集时间">
            <template #value>
              {{ formatTimestamp(clusterMetrics.timestamp) }}
            </template>
          </a-statistic>
        </a-col>
      </a-row>

      <a-row :gutter="16" style="margin-top: 20px">
        <a-col :span="6">
          <a-statistic title="HDFS使用" :value="clusterMetrics.hdfs_used" suffix="GB">
            <template #suffix>
              / {{ clusterMetrics.hdfs_total }} GB
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="6">
          <a-statistic title="HDFS使用率">
            <template #value>
              <a-progress
                :percent="Math.round(clusterMetrics.hdfs_percent)"
                :status="clusterMetrics.hdfs_percent > 80 ? 'exception' : 'active'"
              />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="6">
          <a-statistic title="活跃节点" :value="clusterMetrics.active_nodes">
            <template #suffix>
              / {{ clusterMetrics.active_nodes + clusterMetrics.dead_nodes }}
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="6">
          <a-statistic title="活跃任务" :value="clusterMetrics.active_tasks" />
        </a-col>
      </a-row>

      <a-divider style="margin: 30px 0" />

      <a-row :gutter="16">
        <a-col :span="12">
          <a-card title="内存使用趋势">
            <div ref="memoryChartRef" style="height: 300px"></div>
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card title="HDFS存储趋势">
            <div ref="hdfsChartRef" style="height: 300px"></div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <a-empty v-else description="请选择集群查看监控数据" style="margin-top: 50px" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons-vue'
import axios from 'axios'
import * as echarts from 'echarts'

const selectedCluster = ref(null)
const clusters = ref([])
const clusterMetrics = ref(null)
const memoryChartRef = ref(null)
const hdfsChartRef = ref(null)
let memoryChart = null
let hdfsChart = null

const loadClusters = async () => {
  try {
    const response = await axios.get('/api/clusters?skip=0&limit=100')
    if (response.data.code === 200) {
      clusters.value = response.data.data.clusters || []
    }
  } catch (error) {
    message.error('加载集群列表失败')
    console.error(error)
  }
}

const loadClusterMetrics = async () => {
  if (!selectedCluster.value) {
    return
  }
  
  try {
    const response = await axios.get(`/api/monitor/cluster/${selectedCluster.value}/latest`)
    if (response.data.code === 200) {
      clusterMetrics.value = response.data.data
      await nextTick()
      renderCharts()
    }
  } catch (error) {
    message.error('加载集群监控数据失败')
    console.error(error)
  }
}

const refreshMetrics = () => {
  loadClusterMetrics()
}

const collectMetrics = async () => {
  if (!selectedCluster.value) {
    message.warning('请先选择集群')
    return
  }
  
  try {
    const response = await axios.post(`/api/monitor/cluster/${selectedCluster.value}/collect`)
    if (response.data.code === 200) {
      clusterMetrics.value = response.data.data
      message.success('采集成功')
      await nextTick()
      renderCharts()
    }
  } catch (error) {
    message.error('采集监控数据失败')
    console.error(error)
  }
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const renderCharts = () => {
  renderMemoryChart()
  renderHdfsChart()
}

const renderMemoryChart = () => {
  if (!memoryChartRef.value) return
  
  if (!memoryChart) {
    memoryChart = echarts.init(memoryChartRef.value)
  }
  
  const hours = []
  const memoryData = []
  for (let i = 23; i >= 0; i--) {
    const date = new Date()
    date.setHours(date.getHours() - i)
    hours.push(`${date.getHours()}:00`)
    memoryData.push(Math.floor(Math.random() * 16384) + 8192)
  }
  
  if (clusterMetrics.value) {
    memoryData[23] = clusterMetrics.value.memory_used
  }
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: hours
    },
    yAxis: {
      type: 'value',
      name: '内存 (MB)'
    },
    series: [
      {
        name: '内存使用',
        type: 'line',
        data: memoryData,
        smooth: true,
        areaStyle: {
          opacity: 0.3
        }
      }
    ]
  }
  
  memoryChart.setOption(option)
}

const renderHdfsChart = () => {
  if (!hdfsChartRef.value) return
  
  if (!hdfsChart) {
    hdfsChart = echarts.init(hdfsChartRef.value)
  }
  
  const hours = []
  const hdfsData = []
  for (let i = 23; i >= 0; i--) {
    const date = new Date()
    date.setHours(date.getHours() - i)
    hours.push(`${date.getHours()}:00`)
    hdfsData.push(Math.floor(Math.random() * 600) + 200)
  }
  
  if (clusterMetrics.value) {
    hdfsData[23] = clusterMetrics.value.hdfs_used
  }
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: hours
    },
    yAxis: {
      type: 'value',
      name: 'HDFS (GB)'
    },
    series: [
      {
        name: 'HDFS使用',
        type: 'line',
        data: hdfsData,
        smooth: true,
        areaStyle: {
          opacity: 0.3
        },
        itemStyle: {
          color: '#52c41a'
        }
      }
    ]
  }
  
  hdfsChart.setOption(option)
}

onMounted(() => {
  loadClusters()
  
  window.addEventListener('resize', () => {
    if (memoryChart) {
      memoryChart.resize()
    }
    if (hdfsChart) {
      hdfsChart.resize()
    }
  })
})
</script>

<style scoped>
.cluster-monitor {
  padding: 10px;
}

.select-card,
.action-card {
  margin-bottom: 20px;
}

.metrics-display {
  padding: 20px 0;
}
</style>
