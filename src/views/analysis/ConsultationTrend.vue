<template>
  <div class="consultation-trend-wrapper">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">问诊服务趋势</h2>
      </div>
      <div class="header-right">
        <div class="period-selector">
          <button 
            v-for="p in periods" 
            :key="p.value"
            :class="['period-btn', { active: currentPeriod === p.value }]"
            @click="changePeriod(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
        <a-range-picker v-model:value="dateRange" @change="handleDateChange" />
        <a-button type="primary" :loading="loading" @click="loadData">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>
    </div>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="16">
        <div class="chart-card">
          <div class="card-header">
            <h3 class="card-title">问诊量趋势</h3>
          </div>
          <div class="chart-container">
            <div ref="trendChartRef" class="chart"></div>
          </div>
        </div>
      </a-col>

      <a-col :xs="24" :lg="8">
        <div class="stat-card">
          <div class="card-header">
            <h3 class="card-title">📋 关键指标</h3>
          </div>
          <div class="stat-list">
            <div class="stat-item highlight">
              <div class="stat-icon total">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-label">总问诊量</span>
                <span class="stat-value primary">{{ stats.totalConsultations?.toLocaleString() || 0 }}</span>
                <span class="stat-trend" :class="growthClass">
                  <span class="trend-icon">{{ growthIcon }}</span>
                  {{ stats.growthRate || '0%' }}
                </span>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon daily">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-label">日均问诊</span>
                <span class="stat-value success">{{ stats.avgDaily?.toLocaleString() || 0 }}</span>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon peak">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-label">峰值日期</span>
                <span class="stat-value warning">{{ stats.peakDate || '-' }}</span>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon response">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-label">平均响应时间</span>
                <span class="stat-value info">{{ stats.avgResponseTime || '-' }}分钟</span>
              </div>
            </div>
          </div>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :span="24">
        <div class="dept-card">
          <div class="card-header">
            <h3 class="card-title">🏥 各科室问诊分布</h3>
            <div class="card-legend" v-if="deptOption.series[0]?.data?.length > 0">
              <span class="legend-item">
                <span class="legend-dot" :style="{ background: '#3b82f6' }"></span>
                共 {{ deptTotal }} 次问诊
              </span>
            </div>
          </div>
          <div class="dept-chart-container">
            <div ref="deptChartRef" class="chart"></div>
          </div>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :span="24">
        <div class="dept-card">
          <div class="card-header">
            <h3 class="card-title">🏥 科室-疾病分布</h3>
          </div>
          <div class="dept-chart-container">
            <div ref="sunburstChartRef" class="chart" style="height: 500px;"></div>
          </div>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart, SunburstChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  DataZoomComponent,
  MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dataAPI from '../../api/data'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  SunburstChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer
])

const loading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const currentPeriod = ref('day')
const trendChartRef = ref<HTMLElement | null>(null)
const deptChartRef = ref<HTMLElement | null>(null)
const sunburstChartRef = ref<HTMLElement | null>(null)
let trendChart: echarts.ECharts | null = null
let deptChart: echarts.ECharts | null = null
let sunburstChart: echarts.ECharts | null = null

const periods = [
  { label: '按日', value: 'day' },
  { label: '按周', value: 'week' },
  { label: '按季度', value: 'quarter' }
]

const stats = reactive({
  totalConsultations: 0,
  avgDaily: 0,
  growthRate: '0%',
  peakDate: '',
  avgResponseTime: 0
})

const trendOption = reactive<echarts.EChartsOption>({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      crossStyle: {
        color: '#999'
      }
    },
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: {
      color: '#333'
    },
    formatter: (params: any) => {
      if (!Array(params) || params.length === 0) return ''
      let html = `<div style="padding: 8px; min-width: 180px;">`
      html += `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">${params[0].axisValue}</div>`
      params.forEach((item: any) => {
        const color = item.color
        const value = typeof item.value === 'number' ? item.value.toLocaleString() : item.value
        const unit = item.seriesName === '问诊量' ? '次' : '%'
        html += `<div style="display: flex; justify-content: space-between; margin: 4px 0;">`
        html += `<span style="color: #666;">${item.seriesName}：</span>`
        html += `<span style="font-weight: 600; color: ${color};">${value}${unit}</span></div>`
      })
      html += '</div>'
      return html
    }
  },
  legend: {
    data: [] as string[],
    top: 10,
    right: 20,
    textStyle: {
      color: '#666'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '18%',
    top: '15%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: [] as string[],
    axisLabel: {
      color: '#666',
      fontSize: 11,
      rotate: 0,
      interval: 'auto',
      formatter: (value: string, index: number) => {
        if (index % 3 !== 0) return ''
        return value
      }
    },
    axisLine: {
      lineStyle: {
        color: '#d1d5db'
      }
    }
  },
  yAxis: [
    {
      type: 'value',
      name: '问诊量',
      position: 'left',
      nameTextStyle: {
        color: '#666',
        padding: [0, 0, 0, 15]
      },
      axisLabel: {
        color: '#666',
        formatter: (value: number) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()
      },
      splitLine: {
        lineStyle: {
          color: '#f3f4f6',
          type: 'dashed'
        }
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#d1d5db'
        }
      }
    },
    {
      type: 'value',
      name: '增长率(%)',
      position: 'right',
      nameTextStyle: {
        color: '#666',
        padding: [0, 0, 0, 15]
      },
      axisLabel: {
        color: '#666',
        formatter: '{value}%'
      },
      splitLine: {
        show: false
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#d1d5db'
        }
      }
    }
  ],
  dataZoom: [
    {
      type: 'inside',
      start: 0,
      end: 100,
      zoomOnMouseWheel: true,
      moveOnMouseMove: true
    },
    {
      show: true,
      type: 'slider',
      bottom: 8,
      height: 25,
      borderColor: '#d1d5db',
      backgroundColor: '#f9fafb',
      fillerColor: 'rgba(59, 130, 246, 0.15)',
      handleStyle: {
        color: '#3b82f6',
        borderColor: '#3b82f6'
      },
      textStyle: {
        color: '#666'
      },
      dataBackground: {
        lineStyle: {
          color: '#3b82f6'
        },
        areaStyle: {
          color: 'rgba(59, 130, 246, 0.2)'
        }
      },
      start: 0,
      end: 100
    }
  ],
  series: [
    {
      name: '问诊量',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      yAxisIndex: 0,
      data: [] as number[],
      lineStyle: {
        width: 3,
        color: '#3b82f6'
      },
      itemStyle: {
        color: '#3b82f6',
        borderWidth: 2,
        borderColor: '#fff'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59, 130, 246, 0.35)' },
          { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }
        ])
      },
      animationDelay: (idx: number) => idx * 30,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    },
    {
      name: '图文问诊',
      type: 'line',
      smooth: true,
      symbol: 'diamond',
      symbolSize: 6,
      yAxisIndex: 1,
      data: [] as number[],
      lineStyle: {
        width: 2,
        color: '#8b5cf6',
        type: 'dashed'
      },
      itemStyle: {
        color: '#8b5cf6',
        borderWidth: 2,
        borderColor: '#fff'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(139, 92, 246, 0.2)' },
          { offset: 1, color: 'rgba(139, 92, 246, 0.02)' }
        ])
      },
      animationDelay: (idx: number) => idx * 30 + 300,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    }
  ]
})

const deptOption = reactive<echarts.EChartsOption>({
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: {
      color: '#333'
    },
    formatter: '{b}: {c} 次 ({d}%)'
  },
  legend: {
    orient: 'vertical',
    right: 20,
    top: 'center',
    textStyle: {
      color: '#666'
    },
    formatter: (name: string) => {
      const item = (deptOption.series as any)[0]?.data?.find((d: any) => d.name === name)
      if (item) {
        return `${name}  ${item.value.toLocaleString()}次`
      }
      return name
    }
  },
  series: [{
    name: '科室分布',
    type: 'pie',
    radius: ['35%', '65%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: true,
    itemStyle: {
      borderRadius: 6,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      show: true,
      position: 'outside',
      formatter: '{b}\n{d}%',
      overflow: 'break',
      fontSize: 11
    },
    labelLine: {
      show: true,
      length: 15,
      length2: 10,
      smooth: true
    },
    emphasis: {
      label: {
        show: true,
        fontSize: 13,
        fontWeight: 'bold'
      },
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.3)'
      }
    },
    data: [] as { name: string; value: number; itemStyle?: any }[]
  }]
})

const sunburstOption = reactive<echarts.EChartsOption>({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  series: [{
    type: 'sunburst',
    data: [] as any[],
    radius: [0, '95%'],
    sort: undefined,
    emphasis: {
      focus: 'ancestor'
    },
    levels: [
      {},
      {
        r0: '10%',
        r: '40%',
        itemStyle: {
          borderWidth: 2
        },
        label: {
          rotate: 'tangential'
        }
      },
      {
        r0: '40%',
        r: '65%',
        label: {
          align: 'right'
        }
      },
      {
        r0: '65%',
        r: '80%',
        label: {
          position: 'outside',
          padding: 3,
          silent: false
        },
        itemStyle: {
          borderWidth: 3
        }
      }
    ]
  }]
})

const deptTotal = computed(() => {
  const data = (deptOption.series as any)[0]?.data || []
  return data.reduce((sum: number, item: any) => sum + item.value, 0)
})

const growthClass = computed(() => {
  const rate = parseFloat(stats.growthRate)
  return rate >= 0 ? 'up' : 'down'
})

const growthIcon = computed(() => {
  const rate = parseFloat(stats.growthRate)
  return rate >= 0 ? '↑' : '↓'
})

const handleDateChange = async () => {
  await loadData()
  // 重新初始化图表以确保数据更新
  setTimeout(() => {
    initTrendChart()
    initDeptChart()
    initSunburstChart()
  }, 100)
}

const changePeriod = async (period: string) => {
  currentPeriod.value = period
  await loadData()
  // 重新初始化图表以确保数据更新
  setTimeout(() => {
    initTrendChart()
    initDeptChart()
    initSunburstChart()
  }, 100)
}

const initTrendChart = () => {
  if (!trendChartRef.value) return

  if (trendChart) {
    trendChart.dispose()
  }

  trendChart = echarts.init(trendChartRef.value)
  trendChart.setOption(trendOption)
}

const initDeptChart = () => {
  if (!deptChartRef.value) return

  if (deptChart) {
    deptChart.dispose()
  }

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  const option = {
    ...deptOption,
    series: [{
      ...(deptOption.series as any)[0],
      data: (deptOption.series as any)[0].data.map((item: any, index: number) => ({
        ...item,
        itemStyle: {
          color: colors[index % colors.length]
        }
      }))
    }]
  }

  deptChart = echarts.init(deptChartRef.value)
  deptChart.setOption(option)
}

const initSunburstChart = () => {
  if (!sunburstChartRef.value) return
  console.log('[ConsultationTrend] 初始化旭日图, 数据:', sunburstOption.series[0]?.data)

  if (sunburstChart) {
    sunburstChart.dispose()
  }

  sunburstChart = echarts.init(sunburstChartRef.value)
  sunburstChart.setOption(sunburstOption)
}

const handleResize = () => {
  trendChart?.resize()
  deptChart?.resize()
  sunburstChart?.resize()
}

const loadData = async () => {
  loading.value = true
  
  let params: any = {}
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    params.startDate = start.format('YYYY-MM-DD')
    params.endDate = end.format('YYYY-MM-DD')
  }
  if (currentPeriod.value) {
    params.period = currentPeriod.value
  }
  
  try {
    console.log('[ConsultationTrend] 开始请求，参数:', params)
    const res = await dataAPI.getConsultationTrend(params)
    console.log('[ConsultationTrend] 响应:', res)
    if (res.success && res.data?.list && Array.isArray(res.data.list)) {
      const rawData = res.data.list
      
      const dateMap = new Map<string, { total: number; tuwen: number }>()
      
      rawData.forEach((item: any) => {
        let date = ''
        const originalDate = item.period_start || item.consultation_date || ''
        const count = item.consultation_count || 0
        const method = item.consultation_method || ''
        
        // 根据不同周期类型处理日期格式
        if (currentPeriod.value === 'day') {
          // 按日：显示月-日
          date = originalDate?.slice(5) || ''
        } else if (currentPeriod.value === 'week') {
          // 按周：直接使用原始日期（后端返回的是每周一的日期）
          date = originalDate?.slice(0, 10) || ''
        } else if (currentPeriod.value === 'quarter') {
          // 按季度：显示格式如 "2025-Q1" 或 "2025年第1季度"
          if (originalDate.includes('Q')) {
            date = originalDate
          } else {
            date = originalDate?.slice(0, 7) || ''
          }
        } else if (currentPeriod.value === 'month') {
          // 按月：显示年月
          date = originalDate?.slice(0, 7) || ''
        }
        
        if (!date || date === '') return
        
        if (!dateMap.has(date)) {
          dateMap.set(date, { total: 0, tuwen: 0 })
        }
        const entry = dateMap.get(date)!
        entry.total += count
        if (method.includes('图文') || method === '图文问诊') {
          entry.tuwen += count
        }
      })
      
      // 对日期进行排序（按时间顺序）
      const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
        // 特殊处理按周和按季度的排序
        if (currentPeriod.value === 'quarter') {
          // 按季度排序：提取年份和季度
          const parseQuarter = (s: string) => {
            const match = s.match(/(\d+)[-]?Q(\d+)/)
            if (match) {
              return parseInt(match[1]) * 4 + parseInt(match[2])
            }
            // 如果是其他格式，返回一个较大的数值
            return 99999
          }
          const quarterA = parseQuarter(a)
          const quarterB = parseQuarter(b)
          if (quarterA !== 99999 && quarterB !== 99999) {
            return quarterA - quarterB
          } else {
            // 如果其中一个解析失败，按字符串排序
            return a.localeCompare(b)
          }
        } else if (currentPeriod.value === 'week') {
          // 按周排序：直接按日期字符串排序（YYYY-MM-DD格式）
          return a.localeCompare(b)
        } else {
          // 按日期排序
          return a.localeCompare(b)
        }
      })
      const trendData = {
        xAxis: { data: sortedDates },
        series: [
          { data: sortedDates.map(d => dateMap.get(d)!.total) },
          { data: sortedDates.map(d => dateMap.get(d)!.tuwen) }
        ]
      }
      
      ;(trendOption.xAxis as any).data = trendData.xAxis.data
      ;(trendOption.series as any)[0].data = trendData.series[0].data
      ;(trendOption.series as any)[1].data = trendData.series[1].data
      
      const values = trendData.series[0].data as number[]
      stats.totalConsultations = values.reduce((sum, val) => sum + val, 0)
      stats.avgDaily = values.length > 0 ? Math.round(stats.totalConsultations / values.length) : 0
      
      const maxValue = Math.max(...values, 0)
      const peakIndex = values.indexOf(maxValue)
      stats.peakDate = trendData.xAxis.data[peakIndex] || '-'
      stats.growthRate = '0%'
      stats.avgResponseTime = 5.0
      
      const deptRes = await dataAPI.getDepartmentService({ limit: 10 })
      if (deptRes.success && deptRes.data?.list && Array.isArray(deptRes.data.list)) {
        ;(deptOption.series as any)[0].data = deptRes.data.list.slice(0, 8).map((item: any) => ({
          name: item.department || '',
          value: item.consultation_count || item.doctor_count || 0
        }))
      } else {
        ;(deptOption.series as any)[0].data = []
      }
      
      const diseaseRes = await dataAPI.getDiseaseAnalysis({ limit: 50 })
      console.log('[ConsultationTrend] 疾病分析响应:', diseaseRes)
      if (diseaseRes.success && diseaseRes.data?.list) {
        const list = diseaseRes.data.list || diseaseRes.data.data?.list || []
        console.log('[ConsultationTrend] 疾病数据:', list)
        
        const deptDiseaseMap = new Map<string, Map<string, number>>()
        const deptTotalMap = new Map<string, number>()
        
        list.forEach((item: any) => {
          const dept = item.department || '未知科室'
          const disease = item.disease_name || item.disease_category || '未知疾病'
          const count = item.consultation_count || 0
          
          if (!deptDiseaseMap.has(dept)) {
            deptDiseaseMap.set(dept, new Map())
          }
          const diseaseMap = deptDiseaseMap.get(dept)!
          diseaseMap.set(disease, (diseaseMap.get(disease) || 0) + count)
          deptTotalMap.set(dept, (deptTotalMap.get(dept) || 0) + count)
        })
        
        const sunburstData: any[] = []
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6']
        
        Array.from(deptDiseaseMap.entries()).slice(0, 8).forEach(([dept, diseaseMap], deptIdx) => {
          const children: any[] = []
          let idx = 0
          diseaseMap.forEach((count, disease) => {
            children.push({
              name: disease,
              value: count,
              itemStyle: { color: colors[idx % colors.length] }
            })
            idx++
          })
          
          sunburstData.push({
            name: dept,
            value: deptTotalMap.get(dept) || 0,
            children: children.slice(0, 10),
            itemStyle: { color: colors[deptIdx % colors.length] }
          })
        })
        
        ;(sunburstOption.series as any)[0].data = sunburstData
      }
      
      message.success(`加载成功，共 ${rawData.length} 条数据`)
    } else {
      console.warn('[ConsultationTrend] API 数据格式异常')
      ;(trendOption.xAxis as any).data = []
      ;(trendOption.series as any)[0].data = []
      ;(deptOption.series as any)[0].data = []
      ;(sunburstOption.series as any)[0].data = []
      message.info('暂无数据')
    }
  } catch (error) {
    console.error('[ConsultationTrend] 加载失败:', error)
    ;(trendOption.xAxis as any).data = []
    ;(trendOption.series as any)[0].data = []
    ;(deptOption.series as any)[0].data = []
    ;(sunburstOption.series as any)[0].data = []
    message.error('数据加载失败')
  } finally {
    loading.value = false
  }

  setTimeout(() => {
    initTrendChart()
    initDeptChart()
    initSunburstChart()
  }, 100)
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  deptChart?.dispose()
})
</script>

<style scoped lang="scss">
.consultation-trend-wrapper {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.header-right {
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
}

.period-selector {
  display: flex;
  gap: 4px;
  background: #f5f5f5;
  padding: 3px;
  border-radius: 6px;

  .period-btn {
    padding: 4px 12px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    color: #666;
    transition: all 0.2s;

    &:hover {
      color: #1677ff;
    }

    &.active {
      background: #1677ff;
      color: #fff;
      box-shadow: 0 2px 4px rgba(22, 119, 255, 0.3);
    }
  }
}

.chart-card, .stat-card, .dept-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.card-legend {
  .legend-item {
    font-size: 13px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
}

.chart-container, .dept-chart-container {
  padding: 16px;
}

.chart {
  height: 380px;
  width: 100%;

  @media (max-width: 768px) {
    height: 300px;
  }
}

.stat-card {
  .stat-list {
    padding: 16px;
    display: grid;
    gap: 14px;
  }
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }

  &.highlight {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-color: #bfdbfe;
  }

  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 10px;
    flex-shrink: 0;

    svg {
      width: 24px;
      height: 24px;
    }

    &.total {
      background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
      color: #2563eb;
    }

    &.daily {
      background: linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%);
      color: #059669;
    }

    &.peak {
      background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
      color: #d97706;
    }

    &.response {
      background: linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%);
      color: #7c3aed;
    }
  }

  .stat-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .stat-label {
    font-size: 13px;
    color: #6b7280;
    font-weight: 500;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
    line-height: 1.2;

    &.primary { color: #2563eb; }
    &.success { color: #059669; }
    &.warning { color: #d97706; }
    &.info { color: #7c3aed; }
  }

  .stat-trend {
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 2px;

    &.up { color: #10b981; }
    &.down { color: #ef4444; }

    .trend-icon {
      font-size: 14px;
    }
  }
}

@media (max-width: 640px) {
  .page-header {
    padding: 12px 14px;
  }

  .page-title {
    font-size: 18px;
  }

  .chart, .dept-chart-container .chart {
    height: 280px;
  }

  .stat-item {
    padding: 12px;

    .stat-icon {
      width: 42px;
      height: 42px;

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .stat-value {
      font-size: 20px;
    }
  }
}
</style>
