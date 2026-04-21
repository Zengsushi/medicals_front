<template>
  <div class="database-monitor">
    <a-row :gutter="16">
      <a-col :span="8">
        <a-card title="选择数据源" class="select-card">
          <a-select
            v-model:value="selectedDatasource"
            style="width: 100%"
            placeholder="请选择数据源"
            @change="loadDatabaseMetrics"
          >
            <a-select-option
              v-for="ds in datasources"
              :key="ds.id"
              :value="ds.id"
            >
              {{ ds.name }} ({{ ds.db_type }})
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

    <div v-if="databaseMetrics" class="metrics-display">
      <a-row :gutter="16" style="margin-top: 20px">
        <a-col :span="8">
          <a-statistic title="内存使用" :value="databaseMetrics.memory_used" suffix="MB">
            <template #suffix>
              / {{ databaseMetrics.memory_total }} MB
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="8">
          <a-statistic title="内存使用率" :value="databaseMetrics.memory_percent" suffix="%">
            <template #value>
              <a-progress
                :percent="Math.round(databaseMetrics.memory_percent)"
                :status="databaseMetrics.memory_percent > 80 ? 'exception' : 'active'"
              />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="8">
          <a-statistic title="查询次数" :value="databaseMetrics.query_count" />
        </a-col>
      </a-row>

      <a-row :gutter="16" style="margin-top: 20px">
        <a-col :span="8">
          <a-statistic title="当前连接数" :value="databaseMetrics.connection_count" />
        </a-col>
        <a-col :span="8">
          <a-statistic title="最大连接数" :value="databaseMetrics.max_connections" />
        </a-col>
        <a-col :span="8">
          <a-statistic title="采集时间">
            <template #value>
              {{ formatTimestamp(databaseMetrics.timestamp) }}
            </template>
          </a-statistic>
        </a-col>
      </a-row>

      <a-divider style="margin: 30px 0" />

      <a-card title="内存使用趋势" style="margin-top: 20px">
        <div ref="memoryChartRef" style="height: 300px"></div>
      </a-card>
    </div>

    <a-empty v-else description="请选择数据源查看监控数据" style="margin-top: 50px" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons-vue'
import axios from 'axios'
import * as echarts from 'echarts'

const selectedDatasource = ref(null)
const datasources = ref([])
const databaseMetrics = ref(null)
const memoryChartRef = ref(null)
let memoryChart = null

const loadDatasources = async () => {
  try {
    const response = await axios.get('/api/datasources?skip=0&limit=100')
    if (response.data.code === 200) {
      datasources.value = response.data.data.datasources || []
    }
  } catch (error) {
    message.error('加载数据源失败')
    console.error(error)
  }
}

const loadDatabaseMetrics = async () => {
  if (!selectedDatasource.value) {
    return
  }
  
  try {
    const response = await axios.get(`/api/monitor/database/${selectedDatasource.value}/latest`)
    if (response.data.code === 200) {
      databaseMetrics.value = response.data.data
      await nextTick()
      renderMemoryChart()
    }
  } catch (error) {
    message.error('加载数据库监控数据失败')
    console.error(error)
  }
}

const refreshMetrics = () => {
  loadDatabaseMetrics()
}

const collectMetrics = async () => {
  if (!selectedDatasource.value) {
    message.warning('请先选择数据源')
    return
  }
  
  try {
    const response = await axios.post(`/api/monitor/database/${selectedDatasource.value}/collect`)
    if (response.data.code === 200) {
      databaseMetrics.value = response.data.data
      message.success('采集成功')
      await nextTick()
      renderMemoryChart()
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

const renderMemoryChart = () => {
  if (!memoryChartRef.value) return
  
  if (!memoryChart) {
    memoryChart = echarts.init(memoryChartRef.value)
  }
  
  // 模拟一些历史数据用于图表展示
  const hours = []
  const memoryData = []
  for (let i = 23; i >= 0; i--) {
    const date = new Date()
    date.setHours(date.getHours() - i)
    hours.push(`${date.getHours()}:00`)
    memoryData.push(Math.floor(Math.random() * 2048) + 1024)
  }
  
  if (databaseMetrics.value) {
    memoryData[23] = databaseMetrics.value.memory_used
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

onMounted(() => {
  loadDatasources()
  
  window.addEventListener('resize', () => {
    if (memoryChart) {
      memoryChart.resize()
    }
  })
})
</script>

<style scoped>
.database-monitor {
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
