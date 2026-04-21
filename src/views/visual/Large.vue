<template>
  <div class="large-screen-container">
    <div class="screen-header">
      <div class="header-left">
        <div class="logo-icon" aria-hidden="true"></div>
        <div class="header-text">
          <h1>医疗智慧运营监控中心</h1>
          <p>Medical Intelligence Operation Monitoring Center</p>
        </div>
      </div>
      <div class="header-right">
        <div class="date-time">
          <span class="date">{{ currentDate }}</span>
          <span class="time">{{ currentTime }}</span>
        </div>
      </div>
    </div>

    <div class="screen-body">
      <!-- 左侧面板 -->
      <aside class="panel-left">
        <div class="stat-card" v-for="(stat, index) in leftStats" :key="index"
             :style="{ '--delay': index * 0.1 + 's' }">
          <div class="stat-info">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
            <div class="stat-trend" :class="stat.trend > 0 ? 'up' : 'down'">
              {{ stat.trend > 0 ? '↑' : '↓' }} {{ Math.abs(stat.trend) }}%
            </div>
          </div>
        </div>

        <div class="chart-card mini-chart mini-chart--dept">
          <div class="card-title">科室分布</div>
          <div ref="pieChartRef" class="chart-area"></div>
        </div>

        <div class="chart-card mini-chart mini-chart--level">
          <div class="card-title">医院等级分布</div>
          <div ref="hospitalLevelChartRef" class="chart-area"></div>
        </div>
      </aside>

      <!-- 中间主图表区 -->
      <main class="panel-center">
        <div class="main-chart-card">
          <div class="chart-header">
            <h2 class="title">问诊服务趋势分析</h2>
            <div class="controls">
              <button
                v-for="period in periods"
                :key="period.value"
                :class="['period-btn', { active: currentPeriod === period.value }]"
                @click="changePeriod(period.value)"
              >
                {{ period.label }}
              </button>
              <button class="refresh-btn" @click="refreshData" :disabled="loading">
                刷新
              </button>
            </div>
          </div>

          <div ref="mainChartRef" class="main-chart"></div>

          <div class="chart-footer">
            <div class="legend-tags">
              <span
                v-for="method in displayMethods"
                :key="method"
                class="legend-tag"
                :style="{ background: getMethodColor(displayMethods.indexOf(method)) }"
              >
                {{ method === '__OTHER__' ? '其他' : method }}
              </span>
            </div>
            <div class="gender-legend">
              <span class="dot male"></span>男性占比
              <span class="dot female"></span>女性占比
            </div>
          </div>
        </div>

        <div class="grid-charts">
          <div class="chart-card">
            <div class="card-title">医院排名</div>
            <div ref="hospitalRankingChartRef" class="grid-chart"></div>
          </div>
          <div class="chart-card">
            <div class="card-title">医生排名</div>
            <div ref="doctorRankingChartRef" class="grid-chart"></div>
          </div>
        </div>


      </main>

      <!-- 右侧统计面板 -->
      <aside class="panel-right">
        <div class="stats-card">
          <div class="card-title">关键指标</div>
          <div class="stats-grid">
            <div v-for="(item, idx) in statsList" :key="idx" class="stat-item">
              <div class="item-label">{{ item.label }}</div>
              <div class="item-value" :style="{ color: item.color }">{{ item.value }}</div>
              <div v-if="item.sub" class="item-sub">{{ item.sub }}</div>
            </div>
          </div>
        </div>

        <div class="chart-card satisfaction-chart">
          <div class="card-title satisfaction-title">
            <span>科室满意度分析</span>
            <!-- <span class="title-tag">可下钻</span> -->
          </div>
          <div ref="satisfactionChartRef" class="chart-area"></div>
        </div>

        <div class="chart-card">
          <div class="card-title">城市医疗对比</div>
          <div ref="cityComparisonChartRef" class="chart-area"></div>
        </div>

        <div class="trend-mini-card">
          <div class="card-title realtime-title">
            <span class="realtime-icon" aria-hidden="true">
              <span class="pulse-ring"></span>
              <span class="pulse-core"></span>
            </span>
            <span>趋势快照</span>
            <!-- <span class="realtime-badge">统计</span> -->
          </div>
          <div ref="trendMiniRef" class="trend-mini-chart"></div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, PieChart, BarChart, RadarChart, SunburstChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  GraphicComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dayjs from 'dayjs'
import dataAPI from '../../api/data'

echarts.use([
  LineChart,
  PieChart,
  BarChart,
  RadarChart,
  SunburstChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  GraphicComponent,
  CanvasRenderer
])

const mainChartRef = ref(null)
const pieChartRef = ref(null)
const trendMiniRef = ref(null)
const hospitalLevelChartRef = ref(null)
const hospitalRankingChartRef = ref(null)
const doctorRankingChartRef = ref(null)
const satisfactionChartRef = ref(null)
const cityComparisonChartRef = ref(null)

let mainChartInstance = null
let pieChartInstance = null
let trendMiniInstance = null
let hospitalLevelChartInstance = null
let hospitalRankingChartInstance = null
let doctorRankingChartInstance = null
let satisfactionChartInstance = null
let cityComparisonChartInstance = null

const loading = ref(false)
const currentPeriod = ref('day')
const currentTime = ref('')
const currentDate = ref('')

const periods = [
  { label: '按日', value: 'day' },
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' }
]

const leftStats = reactive([
  { label: '累计问诊', value: '0', trend: 0, color: '#0891b2', loading: true },
  { label: '采集医生', value: '0', trend: 0, color: '#059669', loading: true },
  { label: '采集医院', value: '0', trend: 0, color: '#7c3aed', loading: true },
  { label: '今日活跃', value: '0', trend: 0, color: '#f43f5e', loading: true }
])

const gauges = ref([])

const rawData = ref([])

const getISOWeekInfo = (input: string) => {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) {
    return { year: 0, week: 0 }
  }
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: date.getUTCFullYear(), week: weekNo }
}

const aggregateDataByPeriod = (data, period) => {
  console.log('[Large] aggregateDataByPeriod 原始数据:', data.length, '条, period:', period)
  
  // 后端已经按周期聚合好了数据，前端只需要正确解析
  const grouped = {}

  data.forEach(item => {
    // 后端返回的日期字段可能是 month，而不是 consultation_date 或 period_start
    const originalDate = item.period_start || item.consultation_date || item.date || item.month || ''
    console.log('[Large] 处理数据项, date:', originalDate)
    
    let key
    let displayDate

    // 根据后端返回的日期格式进行解析
    if (originalDate.includes('Q')) {
      // 季度格式: 2025-Q1
      key = originalDate
      displayDate = originalDate
    } else if (originalDate.includes('W') || originalDate.includes('周')) {
      // 周格式统一: YYYY-Www（避免 W10 与 W2 的字典序问题）
      const normalizeWeek = (raw: string) => {
        const toWeekDisplay = (year: number, week: number) => `${year}年第${week}周`
        const dateLike = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/)
        if (dateLike) {
          const iso = `${dateLike[1]}-${dateLike[2]}-${dateLike[3]}`
          const info = getISOWeekInfo(iso)
          if (info.year > 0 && info.week > 0) {
            const ww = String(info.week).padStart(2, '0')
            return { key: `${info.year}-W${ww}`, display: toWeekDisplay(info.year, info.week) }
          }
        }
        const direct = String(raw).match(/(\d{4})[-\s]?W(\d{1,2})/i)
        if (direct) {
          const y = Number(direct[1])
          const w = Number(direct[2])
          const ww = String(w).padStart(2, '0')
          return { key: `${y}-W${ww}`, display: toWeekDisplay(y, w) }
        }
        const zh = String(raw).match(/(\d{4}).*?第(\d{1,2})周/)
        if (zh) {
          const y = Number(zh[1])
          const w = Number(zh[2])
          const ww = String(w).padStart(2, '0')
          return { key: `${y}-W${ww}`, display: toWeekDisplay(y, w) }
        }
        return { key: String(raw), display: String(raw) }
      }
      const normalized = normalizeWeek(originalDate)
      key = normalized.key
      displayDate = normalized.display
    } else if (originalDate.includes('-')) {
      // 日期格式: 2025-01-01 或 2024-01
      const date = dayjs(originalDate)
      if (originalDate.length === 7) {
        // 月份格式: 2024-01
        key = originalDate
        displayDate = originalDate
      } else if (period === 'week') {
        const { year: weekYear, week } = getISOWeekInfo(originalDate)
        const weekNo = String(week).padStart(2, '0')
        key = `${weekYear}-W${weekNo}`
        displayDate = `${weekYear}年第${week}周`
      } else if (period === 'month') {
        key = date.format('YYYY-MM')
        displayDate = key
      } else {
        // 按日
        key = originalDate.slice(0, 10)
        displayDate = key.slice(5) // 显示 MM-DD 格式
      }
    } else {
      key = originalDate
      displayDate = originalDate
    }

    console.log('[Large] 解析结果, key:', key, 'displayDate:', displayDate)

    if (!grouped[key]) {
      grouped[key] = {
        date: displayDate,
        originalDate: key,
        methods: {},
        totalMale: 0,
        totalFemale: 0,
        totalCount: 0
      }
    }

    const group = grouped[key]
    const method = item.consultation_method || '未知'
    
    if (!group.methods[method]) {
      group.methods[method] = {
        count: 0,
        maleRatio: [],
        femaleRatio: []
      }
    }

    const methodData = group.methods[method]
    const count = item.consultation_count || item.count || item.total_consultations || 0
    const maleRatio = item.male_ratio || 50
    const femaleRatio = item.female_ratio || 50
    
    methodData.count += count
    methodData.maleRatio.push(maleRatio * count)
    methodData.femaleRatio.push(femaleRatio * count)

    group.totalMale += maleRatio * count
    group.totalFemale += femaleRatio * count
    group.totalCount += count
  })

  const result = Object.values(grouped).map((group) => {
    const methods = {}
    Object.keys(group.methods).forEach((methodName) => {
      const method = group.methods[methodName]
      const totalWeight = method.maleRatio.reduce((a, b) => a + b, 0) +
                         method.femaleRatio.reduce((a, b) => a + b, 0)
      methods[methodName] = {
        count: method.count,
        avgMaleRatio: totalWeight > 0 ? (method.maleRatio.reduce((a, b) => a + b, 0) / totalWeight * 100).toFixed(1) : '0',
        avgFemaleRatio: totalWeight > 0 ? (method.femaleRatio.reduce((a, b) => a + b, 0) / totalWeight * 100).toFixed(1) : '0'
      }
    })

    const totalWeight = group.totalMale + group.totalFemale

    return {
      date: group.date,
      originalDate: group.originalDate,
      methods: methods,
      totalCount: group.totalCount,
      avgMaleRatio: totalWeight > 0 ? (group.totalMale / totalWeight * 100).toFixed(1) : '0',
      avgFemaleRatio: totalWeight > 0 ? (group.totalFemale / totalWeight * 100).toFixed(1) : '0'
    }
  })

  // 排序
  result.sort((a, b) => {
    if (period === 'week') {
      const parseWeek = (s: string) => {
        const m = String(s).match(/(\d{4})[-\s]?W(\d{1,2})/i)
        if (!m) return 0
        return Number(m[1]) * 100 + Number(m[2])
      }
      return parseWeek(a.originalDate) - parseWeek(b.originalDate)
    } else {
      return a.originalDate.localeCompare(b.originalDate)
    }
  })
  
  // 限制显示的数据点数量
  const maxPoints = period === 'month' ? 12 : (period === 'week' ? 12 : 24)
  let limited = result.slice(-maxPoints)

  // 按日视图：剔除末尾“单方式孤点”导致的假尾巴，
  // 收口到“有多方式数据的最后一天”（更贴近数据库有效日）
  if (period === 'day' && limited.length > 1) {
    let lastValidIndex = -1
    for (let i = limited.length - 1; i >= 0; i--) {
      const methodCount = Object.values(limited[i].methods || {}).filter((m: any) => Number(m?.count || 0) > 0).length
      if (methodCount >= 2) {
        lastValidIndex = i
        break
      }
    }

    // 如果没有找到“多方式有效日”，退化为最后一个有总量的点
    if (lastValidIndex < 0) {
      for (let i = limited.length - 1; i >= 0; i--) {
        if (Number(limited[i].totalCount || 0) > 0) {
          lastValidIndex = i
          break
        }
      }
    }

    if (lastValidIndex >= 0 && lastValidIndex < limited.length - 1) {
      limited = limited.slice(0, lastValidIndex + 1)
    }
  }

  return limited
}

const processedData = computed(() => aggregateDataByPeriod(rawData.value, currentPeriod.value))

const allMethods = computed(() => {
  const methodsSet = new Set()
  processedData.value.forEach((item) => {
    Object.keys(item.methods).forEach((method) => methodsSet.add(method))
  })
  return Array.from(methodsSet)
})

const methodTotals = computed(() => {
  const totals: Record<string, number> = {}
  processedData.value.forEach((item: any) => {
    Object.entries(item.methods || {}).forEach(([method, detail]: [string, any]) => {
      totals[method] = (totals[method] || 0) + Number(detail?.count || 0)
    })
  })
  return totals
})

const displayMethods = computed(() => {
  const totals = methodTotals.value
  const sortedMethods = Object.keys(totals).sort((a, b) => (totals[b] || 0) - (totals[a] || 0))
  const maxMethodCount = currentPeriod.value === 'day' ? 5 : 8
  const topMethods = sortedMethods.slice(0, maxMethodCount)
  const restMethods = sortedMethods.slice(maxMethodCount)
  return restMethods.length > 0 ? [...topMethods, '__OTHER__'] : topMethods
})

const dates = computed(() => processedData.value.map((item) => item.date))

const statsList = computed(() => {
  const data = processedData.value
  if (data.length === 0) return []

  const periodLabelMap: Record<string, string> = {
    day: '日',
    week: '周',
    month: '月'
  }
  const periodCompareLabelMap: Record<string, string> = {
    day: '较昨日',
    week: '较上周',
    month: '较上月'
  }
  const currentPeriodLabel = periodLabelMap[currentPeriod.value] || '日'
  const compareLabel = periodCompareLabelMap[currentPeriod.value] || '较上一周期'

  const totalConsultations = data.reduce((sum: number, item: any) => sum + item.totalCount, 0)
  const avgMaleRatio = (data.reduce((sum: number, item: any) => sum + parseFloat(item.avgMaleRatio), 0) / data.length).toFixed(1)
  const avgFemaleRatio = (data.reduce((sum: number, item: any) => sum + parseFloat(item.avgFemaleRatio), 0) / data.length).toFixed(1)

  const lastTwo = data.slice(-2)
  let growthRate = 0
  if (lastTwo.length >= 2) {
    if (Number(lastTwo[0].totalCount) > 0) {
      growthRate = parseFloat(
        ((((lastTwo[1].totalCount - lastTwo[0].totalCount) / lastTwo[0].totalCount) * 100).toFixed(1))
      )
    } else {
      growthRate = Number(lastTwo[1].totalCount) > 0 ? 100 : 0
    }
  }

  const peakItem = data.reduce((max: any, item: any) => item.totalCount > max.totalCount ? item : max, data[0])
  const periodAvg = Math.round(totalConsultations / Math.max(data.length, 1))

  return [
    { label: `总问诊量（按${currentPeriodLabel}）`, value: formatNumber(totalConsultations), color: '#0891b2' },
    { label: '平均男性占比', value: avgMaleRatio + '%', color: '#0ea5e9' },
    { label: '平均女性占比', value: avgFemaleRatio + '%', color: '#f59e0b' },
    { label: compareLabel, value: (growthRate > 0 ? '+' : '') + growthRate + '%', color: growthRate > 0 ? '#10b981' : '#ef4444' },
    { label: '峰值问诊量', value: formatNumber(peakItem.totalCount), sub: peakItem.date, color: '#f97316' },
    { label: `单${currentPeriodLabel}均值`, value: formatNumber(periodAvg), color: '#8b5cf6' }
  ]
})

const getMethodColor = (index) => {
  const colors = ['#0891b2', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6', '#f97316']
  return colors[index % colors.length]
}

const formatNumber = (num) => {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

const loadTrendData = async () => {
  try {
    console.log('[Large] 加载趋势数据, currentPeriod:', currentPeriod.value)
    
    // 从后端API获取问诊趋势数据
    const res = await dataAPI.getConsultationTrend({ period: currentPeriod.value })
    console.log('[Large] 问诊趋势API响应:', res)
    
    if (res.success && res.data) {
      // 处理API返回的数据
      let trendData = []
      if (Array.isArray(res.data.list)) {
        trendData = res.data.list
      } else if (Array.isArray(res.data.data)) {
        trendData = res.data.data
      } else if (Array.isArray(res.data)) {
        trendData = res.data
      }
      
      // 转换数据格式
      rawData.value = trendData.map((item: any) => ({
        consultation_date: item.period_start || item.consultation_date || item.date || item.month,
        consultation_method: item.consultation_method || item.method || '未知',
        consultation_count: item.consultation_count || item.count || item.total_consultations || 0,
        male_ratio: item.male_ratio || item.maleRatio || 50,
        female_ratio: item.female_ratio || item.femaleRatio || 50
      }))

      // 周视图：统一周标签，避免看起来像按月或跨周错位
      if (currentPeriod.value === 'week') {
        rawData.value = rawData.value.map((item: any) => {
          const raw = String(item.consultation_date || '')
          const dateLike = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
          if (dateLike) {
            const isoDate = `${dateLike[1]}-${dateLike[2]}-${dateLike[3]}`
            const info = getISOWeekInfo(isoDate)
            if (info.year > 0 && info.week > 0) {
              return {
                ...item,
                consultation_date: `${info.year}-W${String(info.week).padStart(2, '0')}`
              }
            }
          }
          return item
        })
      }
      
      console.log('[Large] 趋势数据处理后:', rawData.value.length, '条')
      console.log('[Large] 处理后的数据:', rawData.value)
      
      // 手动调用aggregateDataByPeriod函数，查看结果
      const aggregated = aggregateDataByPeriod(rawData.value, currentPeriod.value)
      console.log('[Large] 手动聚合后的数据:', aggregated)
      
      // 计算processedData和allMethods
      const processed = processedData.value
      const methods = allMethods.value
      console.log('[Large] 处理后的数据:', processed)
      console.log('[Large] 所有方法:', methods)
      console.log('[Large] 所有日期:', dates.value)
    } else {
      console.warn('[Large] 趋势数据为空')
      rawData.value = []
    }
  } catch (error) {
    console.error('[Large] 加载趋势数据失败:', error)
    rawData.value = []
  }
}

const changePeriod = async (period) => {
  currentPeriod.value = period
  // 切换周期时，由 loadData 统一刷新，避免重复请求与状态抖动
  await loadData()
  // 延迟更新图表，确保数据已更新
  setTimeout(() => {
    updateCharts()
  }, 100)
}

const refreshData = async () => {
  loading.value = true
  try {
    await loadData()
  } finally {
    loading.value = false
  }
}

const loadData = async () => {
  try {
    console.log('[Large] 加载数据, currentPeriod:', currentPeriod.value)

    // 先加载主趋势图数据，确保问诊服务趋势首屏即可渲染
    await loadTrendData()
    
    // 从后端获取总览数据
    const overviewRes = await dataAPI.getOverview()
    console.log('[Large] 总览API响应:', overviewRes)
    
    if (overviewRes.success && overviewRes.data) {
      // 从返回的数据中提取指标
      let overviewData = []
      if (Array.isArray(overviewRes.data.data)) {
        overviewData = overviewRes.data.data
      } else if (Array.isArray(overviewRes.data)) {
        overviewData = overviewRes.data
      }
      
      const consultationTotal = overviewData.find(item => item.indicator_name === '问诊总量')?.indicator_value || 0
      const doctorCount = overviewData.find(item => item.indicator_name === '医生总数')?.indicator_value || 0
      const hospitalCount = overviewData.find(item => item.indicator_name === '医院总数')?.indicator_value || 0
      
      // 更新卡片数据
      leftStats[0].value = consultationTotal.toLocaleString()
      leftStats[0].trend = 0
      leftStats[0].loading = false
      
      leftStats[1].value = doctorCount.toLocaleString()
      leftStats[1].trend = 0
      leftStats[1].loading = false
      
      leftStats[2].value = hospitalCount.toLocaleString()
      leftStats[2].trend = 0
      leftStats[2].loading = false
      
      const activeRes = await dataAPI.getActiveUsers()
      const activeUsers = activeRes?.success ? (activeRes.data?.today_active || 0) : 0
      leftStats[3].value = Number(activeUsers).toLocaleString()
      leftStats[3].trend = 0
      leftStats[3].loading = false
    } else {
      // 加载失败时，使用空数据
      console.log('[Large] 总览数据加载失败，使用空数据')
      leftStats[0].value = '0'
      leftStats[0].trend = 0
      leftStats[0].loading = false
      
      leftStats[1].value = '0'
      leftStats[1].trend = 0
      leftStats[1].loading = false
      
      leftStats[2].value = '0'
      leftStats[2].trend = 0
      leftStats[2].loading = false
      
      leftStats[3].value = '0'
      leftStats[3].trend = 0
      leftStats[3].loading = false
    }
    
    console.log('[Large] 数据加载完成')
  } catch (error) {
    console.error('[Large] 加载数据失败:', error)
    
    // 加载失败时，使用空数据
    console.log('[Large] 使用空数据')
    leftStats[0].value = '0'
    leftStats[0].trend = 0
    leftStats[0].loading = false
    
    leftStats[1].value = '0'
    leftStats[1].trend = 0
    leftStats[1].loading = false
    
    leftStats[2].value = '0'
    leftStats[2].trend = 0
    leftStats[2].loading = false
    
    leftStats[3].value = '0'
    leftStats[3].trend = 0
    leftStats[3].loading = false
  }

  updateCharts()
}

const initMainChart = () => {
  if (!mainChartRef.value) return

  mainChartInstance = echarts.init(mainChartRef.value)
  updateMainChart()
}

const loadDepartmentData = async () => {
  try {
    const res = await dataAPI.getDepartmentService({ limit: 10 })
    console.log('[Large] 科室服务API响应:', res)
    
    if (res.success && res.data) {
      let departmentData = []
      if (Array.isArray(res.data.list)) {
        departmentData = res.data.list
      } else if (Array.isArray(res.data.data)) {
        departmentData = res.data.data
      } else if (Array.isArray(res.data)) {
        departmentData = res.data
      }
      
      return departmentData.map((item: any) => ({
        name: item.department || item.department_name || '未知科室',
        value: item.consultation_count || item.count || 0
      })).filter((item: any) => item.value > 0)
    }
  } catch (error) {
    console.error('[Large] 加载科室数据失败:', error)
  }
  return []
}

const initPieChart = async () => {
  if (!pieChartRef.value) return

  pieChartInstance = echarts.init(pieChartRef.value)
  
  // 从API获取科室服务分析数据
  const chartData = await loadDepartmentData()
  console.log('[Large] 科室分布数据:', chartData)

  // 使用真实数据，没有数据时显示空图表
  const displayData = chartData

  const palette = ['#0891b2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6']

  const option = {
    backgroundColor: 'transparent',
    color: palette,
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/><b>{c}</b> 次 · {d}%',
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: 'rgba(6,182,212,0.25)',
      borderWidth: 1,
      textStyle: { color: '#334155', fontSize: 12 },
      padding: [8, 12],
      extraCssText: 'box-shadow: 0 4px 14px rgba(6,182,212,0.14); border-radius: 4px;'
    },
    series: [{
      type: 'pie',
      roseType: 'radius',
      radius: ['20%', '66%'],
      center: ['50%', '53%'],
      avoidLabelOverlap: true,
      minAngle: 3,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 1.5
      },
      label: {
        show: true,
        position: 'outside',
        alignTo: 'edge',
        edgeDistance: 6,
        bleedMargin: 2,
        width: 22,
        overflow: 'truncate',
        formatter: (p: any) => (p.percent >= 3 ? `${Math.round(p.percent)}%` : ''),
        color: '#64748b',
        fontSize: 10,
        fontWeight: 500,
        padding: [0, 1]
      },
      labelLine: {
        show: true,
        length: 4,
        length2: 5,
        smooth: false,
        lineStyle: { color: '#cbd5e1', width: 1 }
      },
      labelLayout: {
        hideOverlap: true,
        moveOverlap: 'shiftY',
        edgeDistance: 6
      },
      emphasis: {
        scale: true,
        scaleSize: 6,
        label: { fontSize: 11, fontWeight: 700, color: '#0f172a' },
        itemStyle: {
          shadowBlur: 12,
          shadowColor: 'rgba(6,182,212,0.28)'
        }
      },
      data: displayData
    }]
  }

  pieChartInstance.setOption(option)
}

const loadTrendSnapshotData = async () => {
  try {
    // 使用分析接口返回的业务统计数据（非实时流数据）
    const res = await dataAPI.getDashboardChartData('consultation_trend', { limit: 14 })
    console.log('[Large] 趋势快照API响应:', res)
    
    if (res.success && res.data) {
      let trendData: any[] = []
      if (Array.isArray(res.data.list)) {
        trendData = res.data.list
      } else if (Array.isArray(res.data.data)) {
        trendData = res.data.data
      } else if (Array.isArray(res.data)) {
        trendData = res.data
      }
      
      if (trendData.length === 0) return { labels: [], values: [] }
      
      const normalized = trendData.map((item: any) => {
        const rawLabel =
          item.date ||
          item.consultation_date ||
          item.period_label ||
          item.hour ||
          item.time ||
          ''
        const label = String(rawLabel).length >= 10 ? String(rawLabel).slice(5, 10) : String(rawLabel || '-')
        const value = Number(
          item.consultation_count ??
          item.total_count ??
          item.value ??
          item.count ??
          0
        )
        return { label, value: Number.isFinite(value) ? value : 0 }
      })

      return {
        labels: normalized.map((item) => item.label),
        values: normalized.map((item) => item.value)
      }
    }
  } catch (error) {
    console.error('[Large] 加载趋势快照失败:', error)
  }
  
  // 失败时返回空数据
  return { labels: [], values: [] }
}

const initTrendMini = async () => {
  if (!trendMiniRef.value) return

  trendMiniInstance = echarts.init(trendMiniRef.value)
  
  // 从后端获取非实时趋势快照
  const { labels, values } = await loadTrendSnapshotData()
  console.log('[Large] 趋势快照数据:', { labels, values })

  const option = {
    backgroundColor: 'transparent',
    grid: {
      top: 15,
      right: 10,
      bottom: 20,
      left: 35,
      containLabel: false
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        fontSize: 9,
        color: '#94a3b8',
        interval: 3
      },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { fontSize: 9, color: '#94a3b8' },
      axisLine: { show: false }
    },
    series: [{
      type: 'bar',
      data: values,
      barWidth: '60%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#2563eb' },
          { offset: 1, color: '#93c5fd' }
        ]),
        borderRadius: [3, 3, 0, 0]
      },
      emphasis: {
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1d4ed8' },
            { offset: 1, color: '#bfdbfe' }
          ])
        }
      }
    }],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e2e8f0',
      textStyle: { color: '#334155', fontSize: 11 }
    }
  }

  trendMiniInstance.setOption(option)
}

const loadHospitalLevelData = async () => {
  try {
    const res = await dataAPI.getHospitalLevelAnalysis()
    console.log('[Large] 医院等级分析API响应:', res)
    
    if (res.success && res.data) {
      let levelData = []
      if (Array.isArray(res.data.list)) {
        levelData = res.data.list
      } else if (Array.isArray(res.data.data)) {
        levelData = res.data.data
      } else if (Array.isArray(res.data)) {
        levelData = res.data
      }
      
      return levelData.map((item: any) => ({
        name: item.hospital_level || item.level || '未知等级',
        value: item.hospital_count || item.count || 0
      })).filter((item: any) => item.value > 0)
    }
  } catch (error) {
    console.error('[Large] 加载医院等级数据失败:', error)
  }
  return []
}

const initHospitalLevelChart = async () => {
  if (!hospitalLevelChartRef.value) return

  hospitalLevelChartInstance = echarts.init(hospitalLevelChartRef.value)
  
  // 从API获取医院等级分析数据
  const chartData = await loadHospitalLevelData()
  console.log('[Large] 医院等级分布数据:', chartData)

  // 使用真实数据，没有数据时显示空图表
  const displayData = chartData

  // 等级分布使用同色系阶梯，体现"等级"的有序感
  const palette = ['#0e7490', '#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444']

  const option = {
    backgroundColor: 'transparent',
    color: palette,
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/><b>{c}</b> 家 · {d}%',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: 'rgba(14, 165, 233, 0.25)',
      borderWidth: 1,
      textStyle: { color: '#334155', fontSize: 12 },
      padding: [8, 12],
      extraCssText: 'box-shadow: 0 4px 14px rgba(14,165,233,0.14); border-radius: 4px;'
    },
    series: [{
      type: 'pie',
      roseType: 'radius',
      radius: ['20%', '66%'],
      center: ['50%', '53%'],
      avoidLabelOverlap: true,
      minAngle: 3,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 1.5
      },
      label: {
        show: true,
        position: 'outside',
        alignTo: 'edge',
        edgeDistance: 6,
        bleedMargin: 2,
        width: 22,
        overflow: 'truncate',
        formatter: (p: any) => (p.percent >= 3 ? `${Math.round(p.percent)}%` : ''),
        color: '#64748b',
        fontSize: 10,
        fontWeight: 500,
        padding: [0, 1]
      },
      labelLine: {
        show: true,
        length: 4,
        length2: 5,
        smooth: false,
        lineStyle: { color: '#cbd5e1', width: 1 }
      },
      labelLayout: {
        hideOverlap: true,
        moveOverlap: 'shiftY',
        edgeDistance: 6
      },
      emphasis: {
        scale: true,
        scaleSize: 6,
        label: { fontSize: 11, fontWeight: 700, color: '#0f172a' },
        itemStyle: {
          shadowBlur: 12,
          shadowColor: 'rgba(14,165,233,0.28)'
        }
      },
      data: displayData
    }]
  }

  hospitalLevelChartInstance.setOption(option)
}

const loadHospitalRankingData = async () => {
  try {
    const res = await dataAPI.getHospitalRanking({ limit: 5 })
    console.log('[Large] 医院排名API响应:', res)
    
    if (res.success && res.data) {
      let rankingData = []
      if (Array.isArray(res.data.list)) {
        rankingData = res.data.list
      } else if (Array.isArray(res.data.data)) {
        rankingData = res.data.data
      } else if (Array.isArray(res.data)) {
        rankingData = res.data
      }
      
      return rankingData.map((item: any) => ({
        name: item.hospital_name || item.hospital || '未知医院',
        value: item.avg_recommendation_star || item.recommendation_star || item.score || 0
      })).filter((item: any) => item.value > 0).sort((a: any, b: any) => b.value - a.value)
    }
  } catch (error) {
    console.error('[Large] 加载医院排名数据失败:', error)
  }
  return []
}

const initHospitalRankingChart = async () => {
  if (!hospitalRankingChartRef.value) return

  hospitalRankingChartInstance = echarts.init(hospitalRankingChartRef.value)
  
  // 从API获取医院排名数据
  const rankingData = await loadHospitalRankingData()
  console.log('[Large] 医院排名数据:', rankingData)
  
  // 反转数组，使排名第一的显示在最上面
  const hospitals = rankingData.map((item: any) => item.name).reverse()
  const values = rankingData.map((item: any) => item.value).reverse()

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      max: 5,
      axisLabel: {
        formatter: function(value) {
          return value + '星';
        }
      }
    },
    yAxis: {
      type: 'category',
      data: hospitals,
      axisLabel: {
        fontSize: 11
      }
    },
    series: [{
      type: 'bar',
      data: values,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#1e3a8a' },
          { offset: 1, color: '#38bdf8' }
        ]),
        borderRadius: [0, 4, 4, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: function(params) {
          return params.value + '星';
        }
      }
    }]
  }

  hospitalRankingChartInstance.setOption(option)
}

const loadDoctorRankingData = async () => {
  try {
    const res = await dataAPI.getDoctorRanking({ limit: 5 })
    console.log('[Large] 医生排名API响应:', res)
    
    if (res.success && res.data) {
      let rankingData = []
      if (Array.isArray(res.data.list)) {
        rankingData = res.data.list
      } else if (Array.isArray(res.data.data)) {
        rankingData = res.data.data
      } else if (Array.isArray(res.data)) {
        rankingData = res.data
      }
      
      return rankingData.map((item: any) => ({
        name: item.doctor_name || item.doctor || '未知医生',
        value: item.recommendation_star || item.consultation_count || 0
      })).filter((item: any) => item.value > 0).sort((a: any, b: any) => b.value - a.value)
    }
  } catch (error) {
    console.error('[Large] 加载医生排名数据失败:', error)
  }
  return []
}

const initDoctorRankingChart = async () => {
  if (!doctorRankingChartRef.value) return

  doctorRankingChartInstance = echarts.init(doctorRankingChartRef.value)
  
  // 从API获取医生排名数据
  const rankingData = await loadDoctorRankingData()
  console.log('[Large] 医生排名数据:', rankingData)
  
  // 反转数组，使排名第一的显示在最上面
  const doctors = rankingData.map((item: any) => item.name).reverse()
  const values = rankingData.map((item: any) => item.value).reverse()

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      max: 5,
      axisLabel: {
        formatter: function(value) {
          return value + '星';
        }
      }
    },
    yAxis: {
      type: 'category',
      data: doctors,
      axisLabel: {
        fontSize: 11
      }
    },
    series: [{
      type: 'bar',
      data: values,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#4f46e5' },
          { offset: 1, color: '#a5b4fc' }
        ]),
        borderRadius: [0, 4, 4, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: function(params) {
          return params.value + '星';
        }
      }
    }]
  }

  doctorRankingChartInstance.setOption(option)
}

const loadSatisfactionData = async () => {
  try {
    const res = await dataAPI.getDepartmentSatisfactionAnalysis({ limit: 100 })
    console.log('[Large] 科室满意度API响应:', res)

    if (res.success && res.data) {
      const rawList = Array.isArray(res.data.list)
        ? res.data.list
        : Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : []

      // 中间环统一蓝色阶梯，避免彩虹色显得杂乱
      const categoryBlues = ['#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']

      const categoryMap: Record<string, any> = {}

      rawList.forEach((item: any) => {
        const category = String(item.department || '未分类科室')
        const hospital = String(item.top_hospital || '代表医院')
        const value = Number(item.consultation_count || 0)
        const star = Number(item.avg_recommendation_star || 0)
        if (value <= 0) return

        if (!categoryMap[category]) {
          const color = categoryBlues[Object.keys(categoryMap).length % categoryBlues.length]
          categoryMap[category] = {
            name: category,
            value: 0,
            children: [] as any[],
            itemStyle: { color }
          }
        }

        categoryMap[category].value += value
        categoryMap[category].children.push({
          name: hospital,
          value,
          avg_recommendation_star: star
        })
      })

      // 同一科室下按医院合并，外圈最多展示 5 条时避免同名占多条
      Object.values(categoryMap).forEach((category: any) => {
        const byHospital: Record<string, { name: string; value: number; starWeighted: number }> = {}
        category.children.forEach((c: any) => {
          const key = String(c.name || '代表医院')
          const v = Number(c.value || 0)
          if (!byHospital[key]) {
            byHospital[key] = { name: key, value: 0, starWeighted: 0 }
          }
          byHospital[key].value += v
          const s = Number(c.avg_recommendation_star || 0)
          byHospital[key].starWeighted += s * v
        })
        category.children = Object.values(byHospital).map((h) => ({
          name: h.name,
          value: h.value,
          avg_recommendation_star: h.value > 0 ? h.starWeighted / h.value : 0
        }))
      })

      const categories = Object.values(categoryMap)
        .filter((category: any) => category.value > 0)
        .sort((a: any, b: any) => Number(b.value || 0) - Number(a.value || 0))
      
      /** 第二层（科室环，levels[1]）：略增科室数以让第三层外圈更饱满 */
      const MAX_CATEGORY_COUNT = 8
      /**
       * 第三层（医院环，levels[2]）：每个科室下扇区总数最多 5。
       * 超过 5 家时取问诊量前 4 家 +「其他医院」合并余量，避免出现 5 家 +「其他」共 6 块。
       */
      const MAX_THIRD_RING_SEGMENTS = 5

      const topCategories = categories.slice(0, MAX_CATEGORY_COUNT)
      const otherCategories = categories.slice(MAX_CATEGORY_COUNT)

      topCategories.forEach((category: any) => {
        const sortedChildren = [...category.children].sort(
          (a: any, b: any) => Number(b.value || 0) - Number(a.value || 0)
        )

        if (sortedChildren.length <= MAX_THIRD_RING_SEGMENTS) {
          category.children = sortedChildren
          return
        }

        const headCount = MAX_THIRD_RING_SEGMENTS - 1
        const head = sortedChildren.slice(0, headCount)
        const tailValue = sortedChildren
          .slice(headCount)
          .reduce((sum: number, item: any) => sum + Number(item.value || 0), 0)
        category.children =
          tailValue > 0 ? [...head, { name: '其他医院', value: tailValue }] : head
      })

      const otherCategoryValue = otherCategories.reduce(
        (sum: number, item: any) => sum + Number(item.value || 0),
        0
      )
      if (otherCategoryValue > 0) {
        topCategories.push({
          name: '其他类目',
          value: otherCategoryValue,
          children: [{ name: '其他医院', value: otherCategoryValue }],
          itemStyle: { color: '#475569' }
        })
      }

      return topCategories
    }
  } catch (error) {
    console.error('[Large] 加载科室满意度数据失败:', error)
  }

  return []
}

const initSatisfactionChart = async () => {
  if (!satisfactionChartRef.value) return

  satisfactionChartInstance = echarts.init(satisfactionChartRef.value)
  
  // 从API获取科室满意度分析数据
  const sunburstData = await loadSatisfactionData()
  console.log('[Large] 满意度分析数据:', sunburstData)

  // 使用真实数据，没有数据时显示空图表
  const displayData = sunburstData
  const hasData = Array.isArray(displayData) && displayData.length > 0

  // 计算总问诊量用于中心展示
  const totalConsultations = hasData
    ? displayData.reduce(
        (sum: number, node: any) => sum + Number(node.value || 0),
        0
      )
    : 0

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const percent = Number(params.percent || 0).toFixed(1)
        const star = Number(params.data?.avg_recommendation_star || 0)
        const starText = star > 0 ? `<div style="color:#475569;">满意度：<b style="color:#0f172a;">${star.toFixed(1)} 星</b></div>` : ''
        return `<div style="font-weight:600;margin-bottom:4px;color:#0f172a;">${params.name}</div>
                <div style="color:#475569;">问诊量：<b style="color:#0f172a;">${params.value || 0}</b></div>
                <div style="color:#475569;">占比：<b style="color:#0f172a;">${percent}%</b></div>
                ${starText}`
      },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: 'rgba(56,189,248,0.35)',
      borderWidth: 1,
      textStyle: { color: '#334155', fontSize: 12 },
      padding: [8, 12],
      extraCssText: 'box-shadow: 0 4px 14px rgba(15,23,42,0.08); border-radius: 4px;'
    },
    graphic: hasData ? [
      {
        type: 'text',
        left: 'center',
        top: '46%',
        style: {
          text: String(totalConsultations),
          textAlign: 'center',
          textVerticalAlign: 'middle',
          fill: '#7dd3fc',
          fontSize: 24,
          fontWeight: 700
        }
      },
      {
        type: 'text',
        left: 'center',
        top: '58%',
        style: {
          text: '总问诊',
          textAlign: 'center',
          textVerticalAlign: 'middle',
          fill: '#38bdf8',
          fontSize: 11
        }
      }
    ] : [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: '暂无科室满意度数据',
        fill: '#7dd3fc',
        font: '500 13px sans-serif'
      }
    }],
    series: [{
      type: 'sunburst',
      data: displayData,
      radius: ['18%', '96%'],
      center: ['50%', '52%'],
      sort: (a: any, b: any) => Number(b.getValue() || 0) - Number(a.getValue() || 0),
      nodeClick: 'rootToNode',
      animationDurationUpdate: 450,
      minShowLabelAngle: 4,
      breadcrumb: {
        show: true,
        left: 'center',
        bottom: 0,
        itemStyle: {
          color: 'rgba(30,64,175,0.22)',
          borderColor: 'rgba(56,189,248,0.4)',
          borderWidth: 1
        },
        textStyle: {
          color: '#7dd3fc',
          fontSize: 11
        },
        emptyItemWidth: 24
      },
      itemStyle: {
        borderColor: 'rgba(148, 163, 184, 0.25)',
        borderWidth: 0.5
      },
      emphasis: {
        focus: 'ancestor',
        itemStyle: {
          opacity: 1,
          shadowBlur: 8,
          shadowColor: 'rgba(15, 23, 42, 0.35)'
        }
      },
      levels: [
        {
          r0: '0%',
          r: '18%',
          itemStyle: {
            color: '#172554',
            borderWidth: 0,
            borderColor: 'transparent'
          },
          label: { show: false }
        },
        {
          // 中间环：科室（单色块 + 单行短标签，数值见 tooltip）
          r0: '18%',
          r: '52%',
          itemStyle: {
            borderWidth: 0,
            borderColor: 'transparent'
          },
          label: {
            rotate: 'tangential',
            color: '#f8fafc',
            fontSize: 11,
            fontWeight: 600,
            overflow: 'truncate',
            width: 52,
            formatter: (p: any) => {
              const n = String(p.name || '').trim()
              if (!n) return ''
              return n.length > 7 ? `${n.slice(0, 7)}…` : n
            }
          }
        },
        {
          // 最外层：无填充、无边框，仅保留文字
          r0: '52%',
          r: '96%',
          itemStyle: {
            color: 'transparent',
            borderWidth: 0,
            borderColor: 'transparent'
          },
          emphasis: {
            itemStyle: {
              color: 'transparent',
              borderWidth: 0,
              borderColor: 'transparent'
            }
          },
          label: {
            show: true,
            rotate: 'radial',
            position: 'inside',
            distance: 0,
            color: '#5eead4',
            fontSize: 9,
            fontWeight: 600,
            formatter: (p: any) => {
              const raw = String(p.name || '').trim()
              if (!raw) return ''
              const maxChars = 14
              return raw.length > maxChars ? `${raw.slice(0, maxChars)}…` : raw
            },
            textShadowBlur: 10,
            textShadowColor: 'rgba(94,234,212,0.85)'
          }
        }
      ]
    }]
  }

  satisfactionChartInstance.setOption(option)
}

const loadCityComparisonData = async () => {
  try {
    const res = await dataAPI.getCityMedicalComparison({ limit: 5 })
    console.log('[Large] 城市医疗对比API响应:', res)
    
    if (res.success && res.data) {
      let cityData = []
      if (Array.isArray(res.data.list)) {
        cityData = res.data.list
      } else if (Array.isArray(res.data.data)) {
        cityData = res.data.data
      } else if (Array.isArray(res.data)) {
        cityData = res.data
      }
      
      const cities = cityData.map((item: any) => item.city_name || item.city || '未知城市')
      const hospitalCount = cityData.map((item: any) => item.hospital_count || item.hospitals || 0)
      const doctorCount = cityData.map((item: any) => item.doctor_count || item.doctors || 0)
      
      return { cities, hospitalCount, doctorCount }
    }
  } catch (error) {
    console.error('[Large] 加载城市医疗对比数据失败:', error)
  }
  return { cities: [], hospitalCount: [], doctorCount: [] }
}

const initCityComparisonChart = async () => {
  if (!cityComparisonChartRef.value) return

  cityComparisonChartInstance = echarts.init(cityComparisonChartRef.value)
  
  // 从API获取城市医疗对比数据
  const { cities, hospitalCount, doctorCount } = await loadCityComparisonData()
  console.log('[Large] 城市医疗对比数据:', { cities, hospitalCount, doctorCount })

  // 使用真实数据，没有数据时显示空图表
  const displayCities = cities
  const displayHospitalCount = hospitalCount
  const displayDoctorCount = doctorCount

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['医院数量', '医生数量'],
      fontSize: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: displayCities,
      axisLabel: {
        fontSize: 10,
        rotate: 45
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '医院数量',
        type: 'bar',
        data: displayHospitalCount,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1d4ed8' },
            { offset: 1, color: '#7dd3fc' }
          ]),
          borderRadius: [2, 2, 0, 0]
        }
      },
      {
        name: '医生数量',
        type: 'bar',
        data: displayDoctorCount,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#5b21b6' },
            { offset: 1, color: '#c4b5fd' }
          ]),
          borderRadius: [2, 2, 0, 0]
        }
      }
    ]
  }

  cityComparisonChartInstance.setOption(option)
}

const updateMainChart = () => {
  if (!mainChartInstance) return

  const data = processedData.value
  const methods = displayMethods.value
  const isQuarterMode = false

  const series: any[] = []
  const colors = ['#0891b2', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6', '#f97316']
  const topMethodsSet = new Set(methods.filter((m) => m !== '__OTHER__'))

  methods.forEach((method: string, index: number) => {
    const color = colors[index % colors.length]
    const values = data.map((item: any) => {
      if (method === '__OTHER__') {
        return Object.entries(item.methods || {}).reduce((sum: number, [name, detail]: [string, any]) => {
          if (topMethodsSet.has(name)) return sum
          return sum + Number(detail?.count || 0)
        }, 0)
      }
      return item.methods[method]?.count || 0
    })
    const avgValue = values.reduce((a: number, b: number) => a + b, 0) / values.length

    series.push({
      name: method === '__OTHER__' ? '其他' : method,
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'circle',
      symbolSize: isQuarterMode ? 9 : 7,
      lineStyle: { width: isQuarterMode ? 3.5 : 3, color: color },
      itemStyle: { color: color, borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + (isQuarterMode ? '28' : '40') },
          { offset: 1, color: color + (isQuarterMode ? '05' : '08') }
        ])
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: color, opacity: isQuarterMode ? 0.28 : 0.5 },
        label: { show: !isQuarterMode },
        data: [{
          yAxis: Math.round(avgValue),
          label: { formatter: `平均值: ${Math.round(avgValue)}`, fontSize: 10 }
        }]
      }
    })
  })

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#334155', fontSize: 12 },
      padding: [12, 16],
      extraCssText: 'box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 8px;',
      formatter: (params: any[]) => {
        const dateIndex = params[0]?.dataIndex
        if (dateIndex === undefined) return ''

        const currentDate = data[dateIndex]
        if (!currentDate) return ''

        let result = `<div style="font-weight:bold;margin-bottom:8px;color:#1e293b;font-size:13px;">${currentDate.date}</div>`
        result += `<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">`
        result += `<span style="color:#64748b;">总问诊量:</span> `
        result += `<span style="font-weight:bold;color:#0891b2;font-size:14px;">${formatNumber(currentDate.totalCount)}</span>`
        result += `</div>`

        result += `<div style="margin-bottom:8px;color:#64748b;font-size:12px;">`
        result += `<span style="color:#0ea5e9;">● 男 ${currentDate.avgMaleRatio}%</span> &nbsp;|&nbsp; `
        result += `<span style="color:#f59e0b;">● 女 ${currentDate.avgFemaleRatio}%</span>`
        result += `</div>`

        result += `<div style="margin-top:8px;font-weight:bold;color:#475569;">各方式详情:</div>`

        params.forEach((param: any) => {
          if (!param.seriesName || param.seriesName.includes('占比')) return
          if (param.seriesName === '其他') {
            const otherTotal = Object.entries(currentDate.methods || {}).reduce((sum: number, [name, detail]: [string, any]) => {
              if (topMethodsSet.has(name)) return sum
              return sum + Number(detail?.count || 0)
            }, 0)
            result += `<div style="margin:4px 0;padding:4px 8px;background:#f8fafc;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">`
            result += `<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${param.color};margin-right:6px;"></span>其他</span>`
            result += `<span style="font-weight:bold;color:#334155;">${formatNumber(otherTotal)}</span>`
            result += `</div>`
            return
          }
          const methodData = currentDate.methods[param.seriesName]
          if (methodData) {
            result += `<div style="margin:4px 0;padding:4px 8px;background:#f8fafc;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">`
            result += `<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${param.color};margin-right:6px;"></span>${param.seriesName}</span>`
            result += `<span style="font-weight:bold;color:#334155;margin-right:12px;">${formatNumber(param.value)}</span>`
            result += `<span style="font-size:11px;color:#94a3b8;">男${methodData.avgMaleRatio}%/女${methodData.avgFemaleRatio}%</span>`
            result += `</div>`
          }
        })

        return result
      }
    },
    legend: {
      type: 'scroll',
      data: methods.map((m) => (m === '__OTHER__' ? '其他' : m)),
      top: 5,
      left: 0,
      right: 0,
      textStyle: { fontSize: 12, color: '#64748b' },
      itemWidth: 18,
      itemHeight: 8,
      icon: 'roundRect',
      pageIconColor: '#0891b2',
      pageTextStyle: { color: '#64748b' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates.value,
      boundaryGap: false,
      axisLabel: {
        rotate: 0,
        fontSize: 11,
        color: '#64748b',
        interval: 'auto',
        formatter: (value: string) => {
          // 根据周期类型格式化日期显示
          if (currentPeriod.value === 'week') {
            // 按周：显示 W 周标签
            return value
          } else if (currentPeriod.value === 'month') {
            // 按月：显示年月
            return value
          } else {
            // 按日
            return value
          }
        }
      },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisTick: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: '问诊量',
        position: 'left',
        axisLabel: {
          formatter: (value: number) => formatNumber(value),
          fontSize: 11,
          color: '#64748b'
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { lineStyle: { color: '#cbd5e1' } }
      },
      {
        type: 'value',
        name: '占比 (%)',
        position: 'right',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%',
          fontSize: 11,
          color: '#64748b'
        },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#cbd5e1' } }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        disabled: isQuarterMode,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true
      },
      {
        type: 'slider',
        show: !isQuarterMode,
        height: 24,
        bottom: 5,
        start: 0,
        end: 100,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        fillerColor: 'rgba(6, 182, 212, 0.12)',
        handleStyle: { color: '#06b6d4', borderColor: '#06b6d4' },
        textStyle: { color: '#64748b', fontSize: 10 },
        dataBackground: {
          lineStyle: { color: '#cbd5e1' },
          areaStyle: { color: '#f1f5f9' }
        }
      }
    ],
    series: series,
    animation: true,
    animationDuration: 1200,
    animationEasing: 'cubicOut'
  }

  mainChartInstance.setOption(option, true)
}

const updateCharts = () => {
  updateMainChart()
}

const updateTime = () => {
  const now = new Date()
  currentDate.value = dayjs(now).format('YYYY年MM月DD日 dddd')
  currentTime.value = dayjs(now).format('HH:mm:ss')
}

let timeInterval = null

onMounted(async () => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)

  console.log('[Large] 组件挂载，开始加载数据')
  
  try {
    await loadData()
    console.log('[Large] 数据加载完成')
  } catch (error) {
    console.error('[Large] 加载数据失败:', error)
  }

  // 初始化所有图表
  try {
    console.log('[Large] 开始初始化图表')
    await Promise.all([
      initMainChart(),
      initPieChart(),
      initTrendMini(),
      initHospitalLevelChart(),
      initHospitalRankingChart(),
      initDoctorRankingChart(),
      initSatisfactionChart(),
      initCityComparisonChart()
    ])
    // 首屏兜底：图表实例完成后再主动刷新一次主趋势图
    updateMainChart()
    console.log('[Large] 图表初始化完成')
  } catch (error) {
    console.error('[Large] 初始化图表失败:', error)
  }

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)

  if (mainChartInstance) mainChartInstance.dispose()
  if (pieChartInstance) pieChartInstance.dispose()
  if (trendMiniInstance) trendMiniInstance.dispose()
  if (hospitalLevelChartInstance) hospitalLevelChartInstance.dispose()
  if (hospitalRankingChartInstance) hospitalRankingChartInstance.dispose()
  if (doctorRankingChartInstance) doctorRankingChartInstance.dispose()
  if (satisfactionChartInstance) satisfactionChartInstance.dispose()
  if (cityComparisonChartInstance) cityComparisonChartInstance.dispose()

  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  mainChartInstance?.resize()
  pieChartInstance?.resize()
  trendMiniInstance?.resize()
  hospitalLevelChartInstance?.resize()
  hospitalRankingChartInstance?.resize()
  doctorRankingChartInstance?.resize()
  satisfactionChartInstance?.resize()
  cityComparisonChartInstance?.resize()
}
</script>

<style scoped>
.large-screen-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 25%, #f8fafc 75%, #f1f5f9 100%);
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.screen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%);
  border-bottom: 1px solid rgba(6, 182, 212, 0.15);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  box-shadow: 0 2px 12px rgba(6, 182, 212, 0.35);
  animation: float 3s ease-in-out infinite;
}

.header-text h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #10b981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.header-text p {
  margin: 2px 0 0;
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.header-right .date-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.date {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.time {
  font-size: 26px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #0891b2;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(6, 182, 212, 0.2);
}

.screen-body {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 300px;
  gap: 16px;
  padding: 16px 20px;
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;
  min-height: 0;
}

.panel-left,
.panel-right {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.panel-center {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

/* 左侧统计卡片 */
.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
  transition: all 0.3s ease;
  animation: slideIn 0.6s ease backwards;
  animation-delay: var(--delay);
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(6, 182, 212, 0.12);
  border-color: rgba(6, 182, 212, 0.2);
}

.stat-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
  border-radius: 12px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 2px;
}

.stat-trend {
  font-size: 12px;
  font-weight: 600;
}

.stat-trend.up { color: #10b981; }
.stat-trend.down { color: #ef4444; }

/* 迷你饼图卡片 */
.mini-chart {
  flex: 1;
  min-height: 240px;
  position: relative;
  padding: 12px 12px 8px;
  background: #ffffff;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.mini-chart:hover {
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  border-color: #e2e8f0;
}

.mini-chart .card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.mini-chart .card-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 12px;
  border-radius: 1px;
  background: #0891b2;
}

.mini-chart--level .card-title::before {
  background: #0ea5e9;
}

.chart-area {
  width: 100%;
  height: calc(100% - 28px);
  min-height: 200px;
}

/* 满意度分析图表（旭日图） */
.satisfaction-chart {
  flex: 2;
  min-height: 320px;
  position: relative;
  background: radial-gradient(circle at 50% 45%, #163a86 0%, #0f2b66 38%, #0b1b4a 100%);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  border: 1px solid rgba(56, 189, 248, 0.35);
  overflow: hidden;
}

.satisfaction-chart:hover {
  box-shadow: 0 12px 28px rgba(56, 189, 248, 0.22);
  border-color: rgba(125, 211, 252, 0.75);
}

.satisfaction-chart .chart-area {
  min-height: 280px;
  height: calc(100% - 38px);
  padding-top: 2px;
}

.satisfaction-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #e0f2fe;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.title-tag {
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  color: #67e8f9;
  background: linear-gradient(135deg, rgba(12, 74, 110, 0.55), rgba(14, 116, 144, 0.42));
  border: 1px solid rgba(103, 232, 249, 0.45);
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.2px;
}

/* 网格图表 */
.grid-charts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.grid-chart {
  width: 100%;
  height: 280px;
}

.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
}

/* 主图表区域 */
.main-chart-card {
  flex: 1;
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
}

.controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.period-btn {
  padding: 6px 16px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  transition: all 0.25s ease;
}

.period-btn:hover {
  border-color: #06b6d4;
  color: #0891b2;
}

.period-btn.active {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
}

.refresh-btn {
  padding: 6px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #64748b;
  transition: all 0.25s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #06b6d4;
  color: #fff;
  border-color: #06b6d4;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.main-chart {
  flex: 1;
  min-height: 380px;
  width: 100%;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.legend-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 82%;
  max-height: 58px;
  overflow-y: auto;
  padding-right: 4px;
}

.legend-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 10px;
  color: #fff;
  font-weight: 500;
  line-height: 1.2;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gender-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
  flex-shrink: 0;
  margin-top: 2px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.male { background: #0ea5e9; }
.dot.female { background: #f59e0b; }



/* 右侧卡片 */
.gauge-card,
.stats-card,
.trend-mini-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.realtime-title {
  justify-content: space-between;
  color: #1e293b;
}

.realtime-title > span:nth-child(2) {
  margin-right: auto;
}

.realtime-icon {
  width: 16px;
  height: 16px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pulse-core {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #06b6d4;
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.18);
}

.pulse-ring {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(6, 182, 212, 0.35);
  background: rgba(236, 254, 255, 0.6);
}

.realtime-badge {
  font-size: 10px;
  line-height: 1;
  color: #0891b2;
  background: #ecfeff;
  border: 1px solid #bae6fd;
  padding: 3px 6px;
  border-radius: 3px;
  letter-spacing: 0.4px;
}

.gauge-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.gauge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.gauge-circle {
  position: relative;
  width: 72px;
  height: 72px;
}

.gauge-circle svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.bg-circle {
  fill: none;
  stroke: #f1f5f9;
  stroke-width: 6;
}

.progress-circle {
  fill: none;
  stroke: url(#gradient);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: var(--percent);
  stroke: #06b6d4;
  transition: stroke-dasharray 0.8s ease;
}

.gauge-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  font-weight: 700;
  color: #0891b2;
}

.gauge-name {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.stat-item {
  padding: 10px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  text-align: center;
}

.item-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}

.item-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.item-sub {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}

.trend-mini-card {
  flex: 1;
  min-height: 180px;
}

.trend-mini-chart {
  width: 100%;
  height: calc(100% - 30px);
  min-height: 140px;
}

/* 动画 */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式设计 */
@media (max-width: 1440px) {
  .screen-body {
    grid-template-columns: 250px 1fr 270px;
    gap: 12px;
    padding: 12px 16px;
  }

  .stat-value { font-size: 22px; }
  .time { font-size: 22px; }
  .header-text h1 { font-size: 19px; }
}

@media (max-width: 1200px) {
  .screen-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }

  .panel-left,
  .panel-right {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: visible;
  }

  .stat-card { min-width: 200px; }
  .mini-chart { min-width: 260px; }
  .gauge-card,
  .stats-card,
  .trend-mini-card { min-width: 280px; }
}

@media (max-width: 768px) {
  .screen-header {
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
  }

  .header-right { align-self: stretch; justify-content: center; }

  .screen-body {
    padding: 10px 12px;
    gap: 10px;
  }

  .main-chart { min-height: 300px; }
  .warning-card { height: auto; }
}
</style>
