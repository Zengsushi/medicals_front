<template>
  <div class="overview-wrapper">
    <a-spin :spinning="loading">
      <div class="page-header">
        <h2 class="page-title">数据概览</h2>
        <a-button type="primary" @click="loadData" :loading="loading">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </div>

      <!-- 统计卡片 - 使用数据源管理样式 -->
      <a-row :gutter="[16, 16]" class="stats-row">
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card stat-card-blue hoverable" size="small">
            <a-statistic title="医院总数" :value="statsData.hospital_count || 0" :value-style="{ color: '#1677ff', fontSize: '24px' }">
              <template #prefix><HomeOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card stat-card-green hoverable" size="small">
            <a-statistic title="医生总数" :value="statsData.doctor_count || 0" :value-style="{ color: '#52c41a', fontSize: '24px' }">
              <template #prefix><UserOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card stat-card-orange hoverable" size="small">
            <a-statistic title="问诊总量" :value="statsData.consultation_total || 0" :value-style="{ color: '#fa8c16', fontSize: '24px' }">
              <template #prefix><MedicineBoxOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card stat-card-purple hoverable" size="small">
            <a-statistic title="疾病种类" :value="statsData.disease_count || 0" :value-style="{ color: '#722ed1', fontSize: '24px' }">
              <template #prefix><SafetyCertificateOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card stat-card-blue hoverable" size="small">
            <a-statistic title="城市数量" :value="statsData.city_count || 0" :value-style="{ color: '#1677ff', fontSize: '24px' }">
              <template #prefix><GlobalOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card stat-card-green hoverable" size="small">
            <a-statistic title="科室数量" :value="statsData.department_count || 0" :value-style="{ color: '#52c41a', fontSize: '24px' }">
              <template #prefix><ApartmentOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <!-- 图表区域 -->
      <a-row :gutter="16" class="charts-row">
        <a-col :xs="24" :lg="12">
          <a-card title="问诊趋势" class="chart-card">
            <div class="chart-container"><v-chart ref="trendChartRef" :option="trendOption" :autoresize="true" /></div>
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="12">
          <a-card title="🏥 科室分布" class="chart-card">
            <div class="chart-container"><v-chart ref="deptChartRef" :option="deptOption" :autoresize="true" /></div>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { HomeOutlined, UserOutlined, MedicineBoxOutlined, GlobalOutlined, ApartmentOutlined, SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { use } from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dataAPI from '../../api/data'
import { message } from 'ant-design-vue'

use([LineChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

const loading = ref(false)
const trendChartRef = ref()
const deptChartRef = ref()

// 统计数据
const statsData = reactive({
  hospital_count: 0,
  doctor_count: 0,
  consultation_total: 0,
  disease_count: 0,
  city_count: 0,
  department_count: 0
})

const STAT_ALIASES: Record<string, Array<string>> = {
  hospital_count: ['hospital_count', 'total_hospitals', 'hospital_total', 'hospitals'],
  doctor_count: ['doctor_count', 'total_doctors', 'doctor_total', 'doctors'],
  consultation_total: ['consultation_total', 'total_consultations', 'consultation_count', 'total_consultation'],
  disease_count: ['disease_count', 'disease_types', 'total_diseases', 'disease_total'],
  city_count: ['city_count', 'total_cities', 'city_total', 'cities'],
  department_count: ['department_count', 'total_departments', 'department_total', 'departments']
}
const INDICATOR_NAME_MAP: Record<string, string> = {
  医院总数: 'hospital_count',
  医生总数: 'doctor_count',
  问诊总量: 'consultation_total',
  疾病种类: 'disease_count',
  城市数量: 'city_count',
  科室数量: 'department_count'
}

const normalizeOverview = (res: any) => {
  const output: Record<string, number> = {}
  Object.keys(STAT_ALIASES).forEach((k) => { output[k] = 0 })

  const bucket = res?.data
  const fromIndicators = bucket?.indicators && typeof bucket.indicators === 'object'
    ? bucket.indicators
    : null
  if (fromIndicators) {
    Object.keys(STAT_ALIASES).forEach((target) => {
      const value = STAT_ALIASES[target].map((key) => fromIndicators[key]).find((v) => v !== undefined && v !== null)
      output[target] = Number(value || 0)
    })
    return output
  }

  const rawList = Array.isArray(bucket?.data)
    ? bucket.data
    : (Array.isArray(bucket) ? bucket : [])

  if (rawList.length === 0) return output

  // 格式1: [{ indicator_key, indicator_value }]
  const hasIndicatorRows = rawList.some((item: any) => item?.indicator_key || item?.indicator_name)
  if (hasIndicatorRows) {
    rawList.forEach((item: any) => {
      const key = String(item?.indicator_key || '')
      const nameKey = String(item?.indicator_name || '')
      const value = Number(item?.indicator_value || 0)
      const mappedByName = INDICATOR_NAME_MAP[nameKey]
      if (mappedByName) {
        output[mappedByName] = value
      }
      Object.keys(STAT_ALIASES).forEach((target) => {
        if (STAT_ALIASES[target].includes(key)) {
          output[target] = value
        }
      })
    })
    return output
  }

  // 格式2: [{ hospital_count, doctor_count, ... }]（ads_overview 常见）
  const merged = rawList.reduce((acc: Record<string, number>, row: any) => {
    Object.keys(STAT_ALIASES).forEach((target) => {
      const aliasKey = STAT_ALIASES[target].find((key) => row?.[key] !== undefined && row?.[key] !== null)
      if (aliasKey) {
        acc[target] += Number(row[aliasKey] || 0)
      }
    })
    return acc
  }, { hospital_count: 0, doctor_count: 0, consultation_total: 0, disease_count: 0, city_count: 0, department_count: 0 })

  return merged
}

const trendOption = reactive({
  tooltip: { 
    trigger: 'axis',
    confine: true
  },
  grid: {
    top: 30,
    right: 30,
    bottom: 40,
    left: 50,
    containLabel: true
  },
  xAxis: { 
    type: 'category', 
    data: [] as string[],
    axisLabel: { 
      fontSize: 11,
      interval: 'auto',
      formatter: (value: string, index: number) => {
        if (index % 3 !== 0) return ''
        return value
      }
    },
    axisLine: { lineStyle: { color: '#e0e0e0' } }
  },
  yAxis: { 
    type: 'value',
    axisLabel: { fontSize: 11 },
    splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
  },
  series: [{ 
    name: '问诊量', 
    type: 'line', 
    smooth: true, 
    data: [] as number[], 
    areaStyle: { opacity: 0.3 },
    itemStyle: { color: '#1890ff' },
    lineStyle: { width: 2 }
  }]
})

const deptOption = reactive({
  tooltip: { 
    trigger: 'item', 
    formatter: '{b}: {c} ({d}%)',
    confine: true
  },
  legend: { 
    orient: 'horizontal', 
    top: 'bottom',
    left: 'center',
    textStyle: { fontSize: 11 },
    itemWidth: 14,
    itemHeight: 10,
    pageTextStyle: { fontSize: 10 },
    pageIconSize: 10
  },
  grid: {
    top: 10,
    bottom: 60,
    left: 10,
    right: 10,
    containLabel: true
  },
  series: [{ 
    name: '科室分布', 
    type: 'pie', 
    radius: ['30%', '65%'], 
    center: ['50%', '45%'],
    avoidLabelOverlap: true,
    itemStyle: {
      borderRadius: 6,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      show: true,
      fontSize: 11,
      color: '#666'
    },
    labelLine: {
      length: 10,
      length2: 8,
      lineStyle: { color: '#ccc' }
    },
    emphasis: {
      label: {
        show: true,
        fontSize: 13,
        fontWeight: 'bold'
      },
      itemStyle: {
        shadowBlur: 20,
        shadowColor: 'rgba(0, 0, 0, 0.3)'
      }
    },
    data: [] as any[]
  }]
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await dataAPI.getOverview()
    const isSuccess = res?.success === true || res?.code === 200
    if (isSuccess) {
      const normalized = normalizeOverview(res)
      statsData.hospital_count = normalized.hospital_count
      statsData.doctor_count = normalized.doctor_count
      statsData.consultation_total = normalized.consultation_total
      statsData.disease_count = normalized.disease_count
      statsData.city_count = normalized.city_count
      statsData.department_count = normalized.department_count
      const dtInfo = res?.data?.dt || res?.dt ? ` (数据日期: ${res?.data?.dt || res?.dt})` : ''
      message.success(`统计数据加载成功${dtInfo}`)
    } else {
      console.warn('[Overview] 统计数据接口返回失败:', res)
      message.warning('统计数据加载失败，已展示默认值')
    }

    await loadCharts()
  } catch (error) {
    console.error('[Overview] 加载失败:', error)
    message.error('统计数据加载失败')
  } finally {
    loading.value = false
  }
}

const loadCharts = async () => {
  try {
    const [trendRes, deptRes] = await Promise.all([
      dataAPI.getConsultationTrend({ limit: 30 }),
      dataAPI.getDepartmentService({ limit: 10 })
    ])

    // 兼容数据路径: res.data.data.list 或 res.data.list
    const trendData = trendRes.data?.data?.list || trendRes.data?.list || trendRes.data?.data || []
    const deptResData = deptRes.data?.data || deptRes.data
    const deptData = deptResData?.list || deptResData || []

    console.log('[Overview] 科室服务API原始响应:', deptRes)
    console.log('[Overview] 科室服务解析后数据:', deptData)

    if (trendData.length > 0) {
      trendOption.xAxis.data = trendData.map((item: any) => item.consultation_date || item.date || '')
      trendOption.series[0].data = trendData.map((item: any) => item.consultation_count || 0)
    }

    if (deptData.length > 0) {
      console.log('[Overview] 科室数据详情:', deptData)
      deptOption.series[0].data = deptData.map((item: any) => ({
        name: item.department || '',
        value: item.consultation_count || item.doctor_count || 0
      }))
      console.log('[Overview] 饼图最终数据:', deptOption.series[0].data)
    }

    console.log('[Overview] 图表数据加载完成', { trendData: trendData.length, deptData: deptData.length })
  } catch (error) {
    console.error('[Overview] 图表加载失败:', error)
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.overview-wrapper { padding: 16px; background: #f0f2f5; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #fff; padding: 16px 20px; border-radius: 8px; }
.page-title { margin: 0; font-size: 18px; }
.stats-row { margin-bottom: 16px; }

/* 数据源管理卡片样式 */
.stat-card {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  transition: all 0.3s ease;
}
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 8px 8px 0 0;
}
.stat-card.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.stat-card-blue::before { background: linear-gradient(90deg, #1677ff, #69c0ff); }
.stat-card-green::before { background: linear-gradient(90deg, #52c41a, #95de64); }
.stat-card-orange::before { background: linear-gradient(90deg, #fa8c16, #ffc53d); }
.stat-card-purple::before { background: linear-gradient(90deg, #722ed1, #b37feb); }

.charts-row { margin-top: 16px; }
.chart-card { 
  border-radius: 8px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
  overflow: visible !important;
}
.chart-card :deep(.ant-card-body) {
  overflow: visible !important;
  padding: 16px;
}
.chart-container { 
  height: 300px; 
  width: 100%;
  overflow: visible !important;
}
.chart-container .echarts {
  width: 100% !important;
  height: 100% !important;
  overflow: visible !important;
}
</style>