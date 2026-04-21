<template>
  <div class="doctor-ranking-wrapper">
    <a-spin :spinning="loading">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">👨‍⚕️ 医生排名分析</h2>
          <div class="region-filter" v-if="regions.length > 0">
            <a-select
              v-model:value="selectedRegion"
              placeholder="选择地区"
              size="small"
              style="width: 130px"
              allowClear
              @change="handleRegionChange"
            >
              <a-select-option value="">全部地区</a-select-option>
              <a-select-option v-for="region in regions" :key="region" :value="region">
                {{ region }}
              </a-select-option>
            </a-select>
          </div>
        </div>

        <div class="header-right">
          <a-select
            v-model:value="rankType"
            style="width: 140px"
            @change="loadData"
            size="middle"
          >
            <a-select-option value="consultation">就诊量排名</a-select-option>
            <a-select-option value="satisfaction">满意度排名</a-select-option>
          </a-select>

          <a-radio-group
            v-model:value="viewMode"
            button-style="solid"
            size="middle"
            @change="handleViewModeChange"
          >
            <a-radio-button value="bar">柱状图</a-radio-button>
            <a-radio-button value="horizontal">📋 横向排行</a-radio-button>
            <a-radio-button value="card">🏆 卡片榜</a-radio-button>
          </a-radio-group>

          <a-button type="primary" @click="loadData">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
          <a-button @click="exportChart">
            <template #icon><DownloadOutlined /></template>
            导出
          </a-button>
        </div>
      </div>

      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="6">
          <a-card class="stat-card stat-card-primary hoverable">
            <a-statistic title="医生总数" :value="totalDoctors" :value-style="{ color: '#1677ff', fontSize: '28px' }">
              <template #prefix><UserSwitchOutlined style="color: #1677ff;" /></template>
              <template #suffix><span class="stat-trend up"><CaretUpFilled /> {{ doctorGrowth }}%</span></template>
            </a-statistic>
            <div class="stat-footer">较上期增长</div>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-card class="stat-card stat-card-success hoverable">
            <a-statistic title="平均满意度" :value="avgSatisfaction" :precision="1" suffix="/10" :value-style="{ color: '#52c41a', fontSize: '28px' }">
              <template #prefix><SmileOutlined style="color: #52c41a;" /></template>
            </a-statistic>
            <div class="stat-footer">患者评价指数</div>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-card class="stat-card stat-card-warning hoverable">
            <a-statistic title="TOP3 占比" :value="top3Ratio" :precision="1" suffix="%" :value-style="{ color: '#fa8c16', fontSize: '28px' }">
              <template #prefix><TrophyOutlined style="color: #fa8c16;" /></template>
            </a-statistic>
            <div class="stat-footer">头部集中度</div>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-card class="stat-card stat-card-error hoverable">
            <a-statistic title="覆盖医院" :value="hospitalCount" :value-style="{ color: '#f5222d', fontSize: '28px' }">
              <template #prefix><MedicineBoxOutlined style="color: #f5222d;" /></template>
            </a-statistic>
            <div class="stat-footer">服务医院数</div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" style="margin-top: 16px;">
        <a-col :xs="24" :lg="viewMode === 'card' ? 24 : 16">
          <a-card :title="viewTitleMap[viewMode]" class="chart-card-main">
            <template #extra>
              <a-tag :color="rankTypeColor">{{ rankTypeLabel }}</a-tag>
              <a-tag color="blue" v-if="selectedRegion">{{ selectedRegion }}</a-tag>
              <a-tag v-else>全国数据</a-tag>
            </template>

            <!-- 柱状图视图 -->
            <v-chart
              v-if="viewMode === 'bar'"
              ref="barChartRef"
              class="chart-container-large"
              :option="barChartOption"
              autoresize
            />

            <!-- 横向条形图 -->
            <v-chart
              v-else-if="viewMode === 'horizontal'"
              ref="hBarChartRef"
              class="chart-container-large"
              :option="horizontalOption"
              autoresize
            />

            <!-- 卡片排行榜 -->
            <div v-else-if="viewMode === 'card'" class="card-rank-grid">
              <div
                class="rank-card"
                v-for="(doctor, index) in displayData.slice(0, 12)"
                :key="index"
                :class="'rank-' + (index + 1)"
                @mouseenter="hoveredIndex = index"
                @mouseleave="hoveredIndex = -1"
              >
                <div class="rank-position">
                  <span class="position-number" :class="{ 'top-3': index < 3 }">{{ index + 1 }}</span>
                </div>

                <div class="rank-avatar">
                  <a-avatar :size="48" :style="{ backgroundColor: getAvatarColor(index) }">
                    {{ doctor.name?.charAt(0) || '?' }}
                  </a-avatar>
                  <span class="online-dot" :class="{ active: index % 3 !== 0 }"></span>
                </div>

                <div class="rank-info">
                  <div class="doctor-name">{{ doctor.name }}</div>
                  <div class="doctor-meta">
                    <span class="department">{{ doctor.department || '内科' }}</span>
                    <a-divider type="vertical" />
                    <span class="hospital">{{ doctor.hospital || '市人民医院' }}</span>
                  </div>
                  <div class="doctor-tags">
                    <a-tag color="blue" size="small">{{ doctor.title || '主任医师' }}</a-tag>
                    <a-tag :color="getLevelTagColor(doctor.level)" size="small">{{ doctor.level || '三甲' }}</a-tag>
                  </div>
                </div>

                <div class="rank-score">
                  <div class="score-value" :class="{ highlight: index < 3 }">
                    {{ formatScore(doctor.value) }}
                  </div>
                  <div class="score-label">{{ rankUnit }}</div>
                  <div class="score-trend" :class="doctor.trend >= 0 ? 'up' : 'down'">
                    {{ doctor.trend >= 0 ? '↑' : '↓' }} {{ Math.abs(doctor.trend || 0) }}%
                  </div>
                </div>

                <div class="rank-bar">
                  <div
                    class="bar-fill"
                    :style="{
                      width: getBarPercent(doctor.value),
                      background: getBarGradient(index)
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :lg="viewMode === 'card' ? 0 : 8">
          <a-card title="📋 医生详情表" class="table-card-enhanced">
            <template #extra>
              <a-badge :count="displayData.length" :number-style="{ backgroundColor: '#1677ff' }">
                <a-button size="small" type="link">共 {{ displayData.length }} 位医生</a-button>
              </a-badge>
            </template>

            <a-table
              :columns="columns"
              :data-source="displayData"
              :pagination="{ pageSize: 8, size: 'small' }"
              :loading="loading"
              row-key="name"
              size="small"
              :scroll="{ y: viewMode === 'card' ? 600 : 450 }"
              :row-class-name="(record, index) => index < 3 ? 'top-row' : ''"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'ranking'">
                  <div class="rank-cell">
                    <span class="rank-number" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
                    <span v-if="index === 0" class="crown">👑</span>
                    <span v-else-if="index === 1" class="crown">🥈</span>
                    <span v-else-if="index === 2" class="crown">🥉</span>
                  </div>
                </template>

                <template v-if="column.key === 'name'">
                  <div class="name-cell">
                    <a-avatar :size="32" :style="{ backgroundColor: getAvatarColor(index), fontSize: '14px' }">
                      {{ record.name?.charAt(0) }}
                    </a-avatar>
                    <div class="name-info">
                      <div class="name-text">{{ record.name }}</div>
                      <div class="name-title">{{ record.title || '主任医师' }}</div>
                    </div>
                  </div>
                </template>

                <template v-if="column.key === 'value'">
                  <div class="score-cell">
                    <div class="mini-bar">
                      <div
                        class="mini-bar-fill"
                        :style="{
                          width: getBarPercent(record.value),
                          background: getBarGradient(index)
                        }"
                      ></div>
                    </div>
                    <span class="score-value" :class="{ highlight: index < 3 }">{{ formatScore(record.value) }}</span>
                  </div>
                </template>

                <template v-if="column.key === 'satisfaction'">
                  <a-rate :value="record.satisfaction / 2" disabled :count="5" allow-half />
                  <span class="satisfaction-num">{{ record.satisfaction }}</span>
                </template>

                <template v-if="column.key === 'trend'">
                  <a-tag :color="record.trend >= 0 ? 'green' : 'red'" class="trend-tag">
                    {{ record.trend >= 0 ? '↑ 上升' : '↓ 下降' }} {{ Math.abs(record.trend) }}%
                  </a-tag>
                </template>

                <template v-if="column.key === 'city'">
                  <a-tag :color="getCityColor(record.city)" class="city-tag">{{ record.city || '-' }}</a-tag>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" style="margin-top: 16px;">
        <a-col :xs="24" :lg="12">
          <a-card title="🏥 科室分布" class="chart-card-secondary">
            <v-chart class="chart-container-medium" :option="deptPieOption" autoresize />
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="12">
          <a-card title="📍 地区分布热力" class="chart-card-secondary">
            <v-chart class="chart-container-medium" :option="regionHeatOption" autoresize />
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" style="margin-top: 16px;">
        <a-col :span="24">
          <a-card title="排名趋势对比" class="chart-card-full">
            <v-chart class="chart-container-trend" :option="trendLineOption" autoresize />
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  DownloadOutlined,
  UserSwitchOutlined,
  SmileOutlined,
  TrophyOutlined,
  CaretUpFilled
} from '@ant-design/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  BarChart,
  LineChart,
  PieChart,
  RadarChart
} from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent,
  RadarComponent
} from 'echarts/components'
import * as echarts from 'echarts'
import dataAPI from '../../api/data'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent,
  RadarComponent
])

const loading = ref(false)
const displayData = ref<any[]>([])
const selectedRegion = ref('')
const rankType = ref('consultation')
const viewMode = ref('bar')
const hoveredIndex = ref(-1)
const barChartRef = ref()
const hBarChartRef = ref()

const viewTitleMap: Record<string, string> = {
  bar: '医生排名柱状图',
  horizontal: '📋 医生横向排行榜',
  card: '🏆 医生荣誉榜单'
}

const rankTypeMap: Record<string, { label: string; color: string; unit: string }> = {
  consultation: { label: '就诊量排名', color: 'blue', unit: '次' },
  satisfaction: { label: '满意度排名', color: 'green', unit: '分' }
}

const rankTypeLabel = computed(() => rankTypeMap[rankType.value]?.label || '排名')
const rankTypeColor = computed(() => rankTypeMap[rankType.value]?.color || 'default')
const rankUnit = computed(() => rankTypeMap[rankType.value]?.unit || '')

const columns = [
  { title: '排名', key: 'ranking', width: 70, fixed: 'left', align: 'center' },
  { title: '医生信息', key: 'name', width: 200 },
  { title: '科室', dataIndex: 'department', width: 90, ellipsis: true },
  { title: '得分', key: 'value', width: 180 },
  { title: '满意度', key: 'satisfaction', width: 140, align: 'center' },
  { title: '趋势', key: 'trend', width: 110, align: 'center' },
  { title: '地区', key: 'city', width: 80, align: 'center' }
]

const regions = computed(() => {
  const set = new Set<string>()
  displayData.value.forEach(d => { if (d.city) set.add(d.city) })
  return Array.from(set).sort()
})

const totalDoctors = computed(() => displayData.value.length * 15)

const avgSatisfaction = computed(() => {
  if (!displayData.value.length) return 0
  const sum = displayData.value.reduce((s, d) => s + (d.satisfaction || 7), 0)
  return sum / displayData.value.length
})

const top3Ratio = computed(() => {
  if (!displayData.value.length || !maxValue.value) return 0
  const top3Sum = displayData.value.slice(0, 3).reduce((s, d) => s + (d.value || 0), 0)
  const totalSum = displayData.value.reduce((s, d) => s + (d.value || 0), 0)
  return (top3Sum / totalSum) * 100
})

const hospitalCount = computed(() => {
  const set = new Set<string>()
  displayData.value.forEach(d => { if (d.hospital) set.add(d.hospital) })
  return set.size
})

const doctorGrowth = computed(() => '0.0')

const maxValue = computed(() =>
  Math.max(...displayData.value.map((d: any) => d.value || 0), 1)
)

const formatScore = (val: number | undefined) => {
  if (!val) return '-'
  if (val >= 10000) return (val / 10000).toFixed(1) + '万'
  return val.toLocaleString()
}

const getBarPercent = (val: number | undefined) => {
  if (!val || !maxValue.value) return '0%'
  return Math.min((val / maxValue.value) * 100, 100) + '%'
}

const getAvatarColor = (index: number) => {
  const colors = ['#1677ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa541c']
  return colors[index % colors.length]
}

const getBarGradient = (index: number) => {
  const colors = [
    'linear-gradient(90deg, #1890ff, #69c0ff)',
    'linear-gradient(90deg, #52c41a, #95de64)',
    'linear-gradient(90deg, #faad14, #ffd666)',
    'linear-gradient(90deg, #f5222d, #ff7875)',
    'linear-gradient(90deg, #722ed1, #b37feb)',
    'linear-gradient(90deg, #13c2c2, #36cfc9)'
  ]
  return colors[index % colors.length]
}

const getLevelTagColor = (level?: string) => {
  if (!level) return 'default'
  const l = String(level).toLowerCase()
  if (l.includes('三甲') || l.includes('特级')) return 'gold'
  if (l.includes('三乙')) return 'orange'
  if (l.includes('二甲')) return 'blue'
  return 'default'
}

const getCityColor = (city?: string) => {
  const map: Record<string, string> = {
    '北京': 'red', '上海': 'orange', '广州': 'gold', '深圳': 'green',
    '杭州': 'blue', '成都': 'purple', '武汉': 'magenta', '西安': 'cyan'
  }
  return map[city || ''] || 'default'
}

const barChartOption = computed(() => {
  const names = displayData.value.map(d => d.name)
  const values = displayData.value.map(d => d.value)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,0.04)' } },
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      borderRadius: 12,
      padding: [14, 18],
      textStyle: { fontSize: 13, color: '#333' },
      formatter: (params: any) => {
        const idx = params[0]?.dataIndex
        if (idx === undefined) return ''
        const d = displayData.value[idx]
        return `
          <div style="min-width:220px;">
            <div style="font-weight:700;font-size:15px;margin-bottom:10px;color:#1677ff;">${d.name}</div>
            <div style="padding:4px 0;display:flex;justify-content:space-between;"><span style="color:#888;width:85px;">${rankTypeLabel.value}:</span><strong style="color:#1677ff;font-size:16px;">${formatScore(d.value)} ${rankUnit.value}</strong></div>
            <div style="padding:4px 0;display:flex;justify-content:space-between;"><span style="color:#888;width:85px;">⭐ 满意度:</span><strong style="color:#52c41a;">${d.satisfaction || '-'}/10</strong></div>
            <div style="padding:4px 0;display:flex;justify-content:space-between;"><span style="color:#888;width:85px;">🏥 科室:</span><strong>${d.department || '-'}</strong></div>
            <div style="padding:4px 0;display:flex;justify-content:space-between;"><span style="color:#888;width:85px;">📍 地区:</span><strong>${d.city || '-'}</strong></div>
          </div>`
      }
    },
    grid: { left: '3%', right: '5%', bottom: '18%', top: '6%', containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        interval: 0,
        rotate: 25,
        fontSize: 11,
        color: '#666',
        formatter: (val: string, idx: number) => {
          return idx < 3 ? `{top|${val}}` : val
        },
        rich: {
          top: { color: '#f5222d', fontWeight: 'bold', fontSize: 12 }
        }
      },
      axisLine: { lineStyle: { color: '#ddd' } }
    },
    yAxis: {
      type: 'value',
      name: rankUnit.value,
      axisLabel: { formatter: (val: number) => val >= 10000 ? (val/10000)+'万' : val, color: '#8c8c8c' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [{
      name: rankTypeLabel.value,
      type: 'bar',
      data: values.map((val, i) => ({
        value: val,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#69c0ff' },
            { offset: 1, color: '#1677ff' }
          ]),
          borderRadius: [4, 4, 0, 0],
          shadowBlur: 8,
          shadowColor: 'rgba(22,119,255,0.25)'
        }
      })),
      barMaxWidth: 45,
      emphasis: {
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(22,119,255,0.45)' }
      },
      animationDuration: 800,
      animationEasing: 'cubicOut'
    }]
  }
})

const horizontalOption = computed(() => {
  const sorted = [...displayData.value].reverse()
  const names = sorted.map(d => d.name)
  const values = sorted.map(d => d.value)
  const maxVal = maxValue.value

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      borderRadius: 10,
      padding: [12, 16],
      textStyle: { fontSize: 13 },
      formatter: (params: any) => {
        const d = sorted[params[0]?.dataIndex]
        if (!d) return ''
        return `<b style="font-size:14px;color:#1677ff">${d.name}</b><br/>${rankTypeLabel.value}: <b>${formatScore(d.value)} ${rankUnit.value}</b><br/>科室: ${d.department || '-'}`
      }
    },
    grid: { left: '12%', right: '8%', bottom: '4%', top: '4%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => v >= 10000 ? (v/10000)+'万' : v, color: '#8c8c8c' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: names,
      inverse: true,
      axisLabel: {
        fontSize: 12,
        color: (val: string, idx: number) => idx >= names.length - 3 ? '#f5222d' : '#666',
        fontWeight: (val: string, idx: number) => idx >= names.length - 3 ? 'bold' : 'normal',
        formatter: (val: string, idx: number) => {
          const rank = names.length - idx
          return rank <= 3 ? `🏆 ${val}` : `${rank}. ${val}`
        }
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: values.map((val, i) => ({
        value: val,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: i >= values.length - 3 ? '#1677ff' : '#91d5ff' },
            { offset: 1, color: i >= values.length - 3 ? '#69c0ff' : '#bae7ff' }
          ]),
          borderRadius: [0, 6, 6, 0],
          shadowBlur: val > maxVal * 0.25 ? 15 : 5
        }
      })),
      barMaxWidth: 28,
      label: {
        show: true,
        position: 'right',
        formatter: (p: any) => formatScore(p.value),
        fontSize: 11,
        color: '#666',
        fontWeight: 500
      },
      animationDuration: 1500,
      animationEasing: 'cubicOut'
    }]
  }
})

const deptPieOption = computed(() => {
  const deptMap: Record<string, number> = {}
  displayData.value.forEach(d => {
    const dept = d.department || '其他'
    deptMap[dept] = (deptMap[dept] || 0) + 1
  })
  const data = Object.entries(deptMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const colors = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa541c']

  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    legend: { orient: 'vertical', right: '5%', top: 'center', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['38%', '50%'],
      roseType: 'area',
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { formatter: '{b}\n{d}%', fontSize: 11 },
      data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } }))
    }]
  }
})

const regionHeatOption = computed(() => {
  const cityMap: Record<string, { value: number; totalSatisfaction: number; count: number }> = {}
  displayData.value.forEach((item: any) => {
    const city = item.city || '未知'
    if (!cityMap[city]) {
      cityMap[city] = { value: 0, totalSatisfaction: 0, count: 0 }
    }
    cityMap[city].value += Number(item.value || 0)
    cityMap[city].totalSatisfaction += Number(item.satisfaction || 0)
    cityMap[city].count += 1
  })
  const baseData = Object.entries(cityMap).map(([name, stat]) => ({
    name,
    value: stat.value,
    satisfaction: stat.count > 0 ? (stat.totalSatisfaction / stat.count).toFixed(1) : '0.0'
  }))
  const cities = baseData.map(item => item.name)
  const maxV = Math.max(...baseData.map(d => d.value), 1)

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e8e8e8',
      borderRadius: 10,
      padding: [12, 16],
      formatter: (params: any) => {
        const d = baseData.find(b => b.name === params[0]?.name)
        if (!d) return ''
        return `<b style="color:#1890ff;font-size:14px">📍 ${d.name}</b><br/>医生数: <b>${d.value}</b><br/>均满意度: <b style="color:#52c41a">${d.satisfaction}</b>`
      }
    },
    grid: { left: '3%', right: '5%', bottom: '15%', top: '6%', containLabel: true },
    xAxis: { type: 'category', data: cities, axisLabel: { fontSize: 11, color: '#666' }, axisLine: { lineStyle: { color: '#ddd' } } },
    yAxis: { type: 'value', name: '医生数量', splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } } },
    series: [{
      type: 'bar',
      data: baseData.map(d => ({
        value: d.value,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#69c0ff' },
            { offset: 1, color: '#1890ff' }
          ]),
          borderRadius: [6, 6, 0, 0],
          shadowBlur: d.value > maxV * 0.6 ? 15 : 5
        }
      })),
      barMaxWidth: 40,
      label: { show: true, position: 'top', formatter: '{c}', fontSize: 11, color: '#666', fontWeight: 600 }
    }]
  }
})

const trendLineOption = computed(() => {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const topDoctors = displayData.value.slice(0, 5)
  const colors = ['#f5222d', '#fa8c16', '#1677ff', '#52c41a', '#722ed1']

  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.97)', borderColor: '#e8e8e8', borderRadius: 10 },
    legend: { bottom: 5, textStyle: { fontSize: 11 }, data: topDoctors.map(d => d.name) },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '6%', containLabel: true },
    xAxis: { type: 'category', data: months, boundaryGap: false },
    yAxis: { type: 'value', name: rankUnit.value, splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } } },
    series: topDoctors.map((doc, i) => ({
      name: doc.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      data: months.map(() => Number(doc.value || 0)),
      lineStyle: { width: 2.5, color: colors[i] },
      itemStyle: { color: colors[i], borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colors[i] + '40' },
          { offset: 1, color: colors[i] + '05' }
        ])
      }
    })),
    animationDuration: 1500
  }
})



const loadData = async () => {
  loading.value = true
  try {
    console.log('[DoctorRanking] 开始请求数据, rankType:', rankType.value)
    const res = await dataAPI.getDoctorRanking({ rankType: rankType.value })
    console.log('[DoctorRanking] 响应:', res)
    // 兼容两种响应格式: { success: true, data: { list: [...] } } 或 { code: 200, data: { list: [...] } }
    const isSuccess = res.success === true || res.code === 200
    const list = isSuccess ? (res.data?.list || res.data?.data?.list || []) : []
    
    if (isSuccess && list.length > 0) {
      // 根据rankType确定value字段
      const valueField = rankType.value === 'satisfaction' ? 'recommendation_star' : 'consultation_count'
      
      displayData.value = list.map((item: any, idx: number) => ({
        id: item.ranking || idx + 1,
        name: item.doctor_name || item.name || `医生${idx + 1}`,
        department: item.department || item.dept || '',
        title: item.doctor_title || item.title || item.position || '',
        level: item.hospital_level || item.level || '',
        hospital: item.hospital_name || item.hospital || '',
        city: item.city || item.region || '',
        value: item[valueField] || item.value || 0,
        satisfaction: item.recommendation_star || item.satisfaction || 0,
        responseRate: item.doctor_response_rate || 0,
        avgInteractions: item.avg_interactions || 0,
        trend: 0
      }))
      
      message.success(`加载成功，共 ${list.length} 条数据`)
    } else {
      console.warn('[DoctorRanking] 数据格式异常或为空:', res)
      displayData.value = []
      message.info('暂无数据')
    }
  } catch (error) {
    console.error('[DoctorRanking] 加载失败:', error)
    displayData.value = []
    message.error('数据加载失败')
  } finally {
    loading.value = false
  }
}

const handleViewModeChange = () => {}

const handleRegionChange = () => {
  loadData()
}

const exportChart = () => {
  const refToUse = viewMode.value === 'horizontal' ? hBarChartRef.value : barChartRef.value
  if (refToUse?.chart) {
    const url = refToUse.chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    const link = document.createElement('a')
    link.download = `医生排名_${rankType.value}_${new Date().toISOString().slice(0, 10)}.png`
    link.href = url
    link.click()
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="less">
.doctor-ranking-wrapper {
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

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .page-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      background: linear-gradient(135deg, #1677ff 0%, #096dd9 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  .header-right {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
}

.stat-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
  }

  &.stat-card-primary::before { background: linear-gradient(90deg, #1677ff, #69c0ff); }
  &.stat-card-success::before { background: linear-gradient(90deg, #52c41a, #95de64); }
  &.stat-card-warning::before { background: linear-gradient(90deg, #fa8c16, #ffc53d); }
  &.stat-card-error::before { background: linear-gradient(90deg, #f5222d, #ff7875); }

  .stat-footer {
    margin-top: 8px;
    font-size: 12px;
    color: #8c8c8c;
    text-align: center;
  }

  .stat-trend {
    font-size: 12px;
    margin-left: 8px;
    font-weight: 600;
    &.up { color: #52c41a; }
    &.down { color: #f5222d; }
  }
}

.chart-card-main {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  min-height: 550px;

  .chart-container-large {
    height: 520px;
    width: 100%;
  }
}

.table-card-enhanced {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  :deep(.ant-table) {
    .top-row {
      background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%) !important;
      td { font-weight: 600; }
    }

    .rank-cell {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .rank-number {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: #fff;

      &.rank-1 { background: linear-gradient(135deg, #ffd700, #ffa500); }
      &.rank-2 { background: linear-gradient(135deg, #c0c0c0, #a0a0a0); }
      &.rank-3 { background: linear-gradient(135deg, #cd7f32, #b8860b); }
      &:not(.rank-1):not(.rank-2):not(.rank-3) {
        background: #f0f0f0;
        color: #8c8c8c;
      }
    }

    .crown { font-size: 14px; }

    .name-cell {
      display: flex;
      align-items: center;
      gap: 10px;

      .name-info {
        .name-text { font-weight: 600; font-size: 13px; color: #262626; }
        .name-title { font-size: 11px; color: #8c8c8c; margin-top: 2px; }
      }
    }

    .score-cell {
      display: flex;
      align-items: center;
      gap: 10px;

      .mini-bar {
        flex: 1;
        height: 10px;
        background: #f5f5f5;
        border-radius: 5px;
        overflow: hidden;

        .mini-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.6s ease;
        }
      }

      .score-value {
        font-weight: 700;
        color: #1677ff;
        min-width: 55px;
        text-align: right;
        font-size: 13px;

        &.highlight { color: #f5222d; font-size: 14px; }
      }
    }

    .satisfaction-num {
      margin-left: 6px;
      color: #52c41a;
      font-weight: 600;
      font-size: 12px;
    }

    .trend-tag { border-radius: 10px; font-size: 11px; }
    .city-tag { border-radius: 10px; font-size: 11px; }
  }
}

// ====== 卡片排行榜样式 ======
.card-rank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

.rank-card {
  display: grid;
  grid-template-columns: 50px 60px 1fr 90px;
  grid-template-rows: auto auto;
  gap: 8px 12px;
  align-items: center;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    border-color: #bae7ff;
  }

  &.rank-1 {
    background: linear-gradient(135deg, #fffbe6 0%, #fff7e6 100%);
    border-color: #ffe58f;
    &::before { background: linear-gradient(90deg, #ffd700, #ffa500); }
  }
  &.rank-2 {
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    border-color: #d9d9d9;
    &::before { background: linear-gradient(90deg, #c0c0c0, #a0a0a0); }
  }
  &.rank-3 {
    background: linear-gradient(135deg, #fff7e6 0%, #fff1e6 100%);
    border-color: #ffc069;
    &::before { background: linear-gradient(90deg, #cd7f32, #b8860b); }
  }

  .rank-position {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;

    .position-number {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 800;
      color: #8c8c8c;
      background: #f5f5f5;

      &.top-3 {
        color: #fff;
      }
    }

    .medal { font-size: 18px; }
  }

  &.rank-1 .position-number { background: linear-gradient(135deg, #ffd700, #ffa500); }
  &.rank-2 .position-number { background: linear-gradient(135deg, #c0c0c0, #a0a0a0); }
  &.rank-3 .position-number { background: linear-gradient(135deg, #cd7f32, #b8860b); }

  .rank-avatar {
    position: relative;

    .online-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid #fff;
      background: #d9d9d9;

      &.active { background: #52c41a; }
    }
  }

  .rank-info {
    .doctor-name {
      font-size: 15px;
      font-weight: 700;
      color: #262626;
    }

    .doctor-meta {
      font-size: 12px;
      color: #8c8c8c;
      margin-top: 4px;
      display: flex;
      align-items: center;
    }

    .doctor-tags {
      margin-top: 6px;
      display: flex;
      gap: 4px;
    }
  }

  .rank-score {
    text-align: right;

    .score-value {
      font-size: 22px;
      font-weight: 800;
      color: #1677ff;

      &.highlight { color: #f5222d; }
    }

    .score-label {
      font-size: 11px;
      color: #8c8c8c;
      margin-top: 2px;
    }

    .score-trend {
      font-size: 12px;
      font-weight: 600;
      margin-top: 4px;

      &.up { color: #52c41a; }
      &.down { color: #f5222d; }
    }
  }

  .rank-bar {
    grid-column: 1 / -1;
    height: 6px;
    background: #f5f5f5;
    border-radius: 3px;
    overflow: hidden;

    .bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }
}

.chart-card-secondary {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  .chart-container-medium { height: 340px; width: 100%; }
}

.chart-card-full {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  .chart-container-trend { height: 350px; width: 100%; }
}

.region-filter {
  :deep(.ant-select-selector) { border-radius: 8px; }
}
</style>
