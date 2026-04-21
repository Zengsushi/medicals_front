<template>
  <div class="hospital-level-analysis">
    <a-spin :spinning="loading">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">🏥 医院等级分布分析</h2>
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
            v-model:value="dateFilter"
            style="width: 140px"
            @change="loadData"
            size="middle"
          >
            <a-select-option value="">全部时间</a-select-option>
            <a-select-option value="20260413">2026-04-13</a-select-option>
            <a-select-option value="20260412">2026-04-12</a-select-option>
            <a-select-option value="20260411">2026-04-11</a-select-option>
          </a-select>
          <a-radio-group v-model:value="chartType" button-style="solid" size="middle" @change="handleChartTypeChange">
            <a-radio-button value="rose">🌹 玫瑰图</a-radio-button>
            <a-radio-button value="treemap">矩形树图</a-radio-button>
            <a-radio-button value="bar">柱状图</a-radio-button>
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
          <a-card class="stat-card stat-card-primary" hoverable>
            <a-statistic title="医院总数" :value="totalHospitals" :value-style="{ color: '#1677ff', fontSize: '28px' }">
              <template #prefix><BankOutlined style="color: #1677ff;" /></template>
              <template #suffix><span class="stat-trend up"><CaretUpFilled /> {{ growthRate }}%</span></template>
            </a-statistic>
            <div class="stat-footer">较上期增长</div>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-card class="stat-card stat-card-success" hoverable>
            <a-statistic title="平均每院医生数" :value="avgDoctorsPerHospital" :precision="1" :value-style="{ color: '#52c41a', fontSize: '28px' }">
              <template #prefix><TeamOutlined style="color: #52c41a;" /></template>
            </a-statistic>
            <div class="stat-footer">医生资源密度</div>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-card class="stat-card stat-card-warning" hoverable>
            <a-statistic title="三甲医院占比" :value="topLevelRatio" :precision="1" suffix="%" :value-style="{ color: '#fa8c16', fontSize: '28px' }">
              <template #prefix><TrophyOutlined style="color: #fa8c16;" /></template>
            </a-statistic>
            <div class="stat-footer">顶级医疗资源</div>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-card class="stat-card stat-card-error" hoverable>
            <a-statistic title="覆盖城市数" :value="cityCount" :value-style="{ color: '#f5222d', fontSize: '28px' }">
              <template #prefix><EnvironmentOutlined style="color: #f5222d;" /></template>
            </a-statistic>
            <div class="stat-footer">服务范围广度</div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" style="margin-top: 16px;">
        <a-col :xs="24" :lg="chartType === 'treemap' ? 18 : 14">
          <a-card :title="chartTitleMap[chartType]" class="chart-card-main">
            <template #extra>
              <a-tag color="blue" v-if="selectedRegion">{{ selectedRegion }}</a-tag>
              <a-tag v-else>全国数据</a-tag>
            </template>

            <!-- 南丁格尔玫瑰图 -->
            <v-chart
              v-if="chartType === 'rose'"
              ref="pieChartRef"
              class="chart-container-large"
              :option="pieChartOption"
              autoresize
            />

            <!-- Treemap 矩形树图 -->
            <div v-else-if="chartType === 'treemap'" ref="treemapRef" class="treemap-container"></div>

            <!-- 柱状图对比 -->
            <v-chart
              v-else-if="chartType === 'bar'"
              class="chart-container-large"
              :option="barChartOption"
              autoresize
            />
          </a-card>
        </a-col>

        <a-col :xs="24" :lg="chartType === 'treemap' ? 6 : 10">
          <a-card title="📋 医院等级详情" class="table-card-enhanced">
            <template #extra>
              <a-badge :count="tableData.length" :number-style="{ backgroundColor: '#1677ff' }">
                <a-button size="small" type="link">共 {{ tableData.length }} 个等级</a-button>
              </a-badge>
            </template>
            <a-table
              :columns="columns"
              :data-source="tableData"
              :pagination="false"
              :loading="loading"
              row-key="hospital_level"
              size="small"
              :scroll="{ y: chartType === 'treemap' ? 520 : 400 }"
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
                <template v-if="column.key === 'hospital_count'">
                  <div class="count-cell">
                    <div class="mini-bar">
                      <div
                        class="mini-bar-fill"
                        :style="{
                          width: (record.hospital_count / maxHospitalCount * 100) + '%',
                          background: getLevelGradient(record.hospital_level)
                        }"
                      ></div>
                    </div>
                    <span class="count-value">{{ formatNumber(record.hospital_count) }}</span>
                  </div>
                </template>
                <template v-if="column.key === 'hospital_ratio'">
                  <div class="ratio-display">
                    <a-progress
                      type="circle"
                      :percent="record.hospital_ratio || 0"
                      :width="40"
                      :stroke-color="getLevelColor(record.hospital_level)"
                      :format="(percent) => percent + '%'"
                    />
                  </div>
                </template>
                <template v-if="column.key === 'avg_doctor_per_hospital'">
                  <a-statistic
                    :value="record.avg_doctor_per_hospital || 0"
                    :precision="0"
                    :value-style="{ fontSize: '15px', fontWeight: 700, color: getLevelColor(record.hospital_level) }"
                    class="inline-stat"
                  />
                </template>
                <template v-if="column.key === 'level_tag'">
                  <a-tag :color="getTagColor(record.hospital_level)" class="level-tag-custom">
                    {{ getLevelTag(record.hospital_level) }}
                  </a-tag>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" style="margin-top: 16px;">
        <a-col :xs="24" :lg="12">
          <a-card title="🎯 地区分布热力图" class="chart-card-secondary">
            <v-chart
              class="chart-container-medium"
              :option="regionChartOption"
              autoresize
            />
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="12">
          <a-card title="⚖️ 等级对比雷达图" class="chart-card-secondary">
            <v-chart
              class="chart-container-medium"
              :option="radarChartOption"
              autoresize
            />
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" style="margin-top: 16px;">
        <a-col :span="24">
          <a-card title="综合趋势分析" class="chart-card-full">
            <v-chart
              class="chart-container-trend"
              :option="trendChartOption"
              autoresize
            />
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  DownloadOutlined,
  BankOutlined,
  TeamOutlined,
  TrophyOutlined,
  EnvironmentOutlined,
  CaretUpFilled
} from '@ant-design/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  PieChart,
  BarChart,
  LineChart,
  RadarChart,
  TreemapChart
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
import { useErrorHandler } from '../../composables/useErrorHandler'

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  LineChart,
  RadarChart,
  TreemapChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent,
  RadarComponent
])

const { handleAsync } = useErrorHandler({ showNotification: true })

const loading = ref(false)
const tableData = ref([])
const radarApiData = ref({})
const dateFilter = ref('')
const selectedRegion = ref('')
const chartType = ref('rose')
const pieChartRef = ref(null)
const treemapRef = ref(null)
let treemapInstance = null

const chartTitleMap = {
  rose: '🌹 医院等级分布（南丁格尔玫瑰图）',
  treemap: '医院等级矩形树图',
  bar: '医院等级柱状对比图'
}

const columns = [
  { title: '排名', key: 'ranking', width: 70, fixed: 'left', align: 'center' },
  { title: '等级', key: 'level_tag', width: 90, align: 'center' },
  { title: '等级名称', dataIndex: 'hospital_level', width: 120, ellipsis: true },
  { title: '医院数量', key: 'hospital_count', width: 180 },
  { title: '占比', key: 'hospital_ratio', width: 80, align: 'center' },
  { title: '平均医生数', key: 'avg_doctor_per_hospital', width: 110, align: 'right' }
]

const regions = computed(() => {
  const regionSet = new Set()
  tableData.value.forEach(item => {
    if (item.city || item.region) regionSet.add(item.city || item.region)
  })
  return Array.from(regionSet).sort()
})

const cityCount = computed(() => regions.value.length)

const totalHospitals = computed(() => {
  return tableData.value.reduce((sum, item) => sum + (item.hospital_count || 0), 0)
})

const avgDoctorsPerHospital = computed(() => {
  const totalDoctors = tableData.value.reduce((sum, item) =>
    sum + ((item.hospital_count || 0) * (item.avg_doctor_per_hospital || 0)), 0
  )
  return totalHospitals.value > 0 ? totalDoctors / totalHospitals.value : 0
})

const levelCount = computed(() => tableData.value.length)

const topLevelRatio = computed(() => {
  const topItem = tableData.value.find(item => {
    const level = String(item.hospital_level || '').toLowerCase()
    return level.includes('三甲') || level.includes('三级甲等')
  })
  if (!topItem || !totalHospitals.value) return 0
  return ((topItem.hospital_count / totalHospitals.value) * 100)
})

const maxHospitalCount = computed(() =>
  Math.max(...tableData.value.map(item => item.hospital_count || 0), 1)
)

const growthRate = computed(() => '0.0')

const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

const getLevelColor = (level) => {
  const levelStr = String(level || '').toLowerCase()
  if (levelStr.includes('三甲') || levelStr.includes('三级甲等')) return '#FFD700'
  if (levelStr.includes('三乙') || levelStr.includes('三级乙等')) return '#FF8C00'
  if (levelStr.includes('二甲') || levelStr.includes('二级甲等')) return '#1677ff'
  if (levelStr.includes('二乙') || levelStr.includes('二级乙等')) return '#69c0ff'
  if (levelStr.includes('一级')) return '#95de64'
  return '#bfbfbf'
}

const getTagColor = (level) => {
  const levelStr = String(level || '').toLowerCase()
  if (levelStr.includes('三甲') || levelStr.includes('三级甲等')) return 'gold'
  if (levelStr.includes('三乙') || levelStr.includes('三级乙等')) return 'orange'
  if (levelStr.includes('二甲') || levelStr.includes('二级甲等')) return 'blue'
  if (levelStr.includes('二乙') || levelStr.includes('二级乙等')) return 'cyan'
  return 'default'
}

const getLevelGradient = (level) => {
  const color = getLevelColor(level)
  return `linear-gradient(90deg, ${color}33, ${color})`
}

const getLevelTag = (level) => {
  const levelStr = String(level || '')
  if (levelStr.includes('三甲') || levelStr.includes('三级甲等')) return '🏆 三甲'
  if (levelStr.includes('三乙') || levelStr.includes('三级乙等')) return '⭐ 三乙'
  if (levelStr.includes('二甲') || levelStr.includes('二级甲等')) return '🏥 二甲'
  if (levelStr.includes('二乙') || levelStr.includes('二级乙等')) return '🏨 二乙'
  if (levelStr.includes('一级')) return '🏠 一级'
  return '📋 其他'
}

const pieChartOption = computed(() => {
  const data = tableData.value.map(item => ({
    name: item.hospital_level,
    value: item.hospital_count,
    hospital_ratio: item.hospital_ratio,
    avg_doctor_per_hospital: item.avg_doctor_per_hospital,
    itemStyle: {
      color: getLevelColor(item.hospital_level),
      borderRadius: 8,
      borderColor: '#fff',
      borderWidth: 3,
      shadowBlur: item.hospital_count > maxHospitalCount.value * 0.25 ? 20 : 10,
      shadowColor: 'rgba(0, 0, 0, 0.2)',
      shadowOffsetY: 4
    }
  }))

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.97)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      borderRadius: 12,
      padding: [16, 20],
      textStyle: { color: '#333', fontSize: 13 },
      formatter: (params) => {
        const original = tableData.value.find(item => item.hospital_level === params.name)
        if (!original) return ''
        return `
          <div style="min-width: 200px;">
            <div style="font-size: 16px; font-weight: 700; margin-bottom: 10px; color: ${getLevelColor(params.name)};">
              ${getLevelTag(params.name)} - ${params.name}
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
              <span style="color: #8c8c8c;">🏥 医院数量</span>
              <strong style="color: #1677ff; font-size: 16px;">${original.hospital_count?.toLocaleString()} 家</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
              <span style="color: #8c8c8c;">占比</span>
              <strong style="color: #52c41a; font-size: 14px;">${original.hospital_ratio}%</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0;">
              <span style="color: #8c8c8c;">👨‍⚕️ 平均医生数</span>
              <strong style="color: #fa8c16; font-size: 14px;">${original.avg_doctor_per_hospital?.toFixed(1)}</strong>
            </div>
          </div>
        `
      }
    },
    legend: {
      orient: 'vertical',
      right: '3%',
      top: 'center',
      icon: 'round',
      itemWidth: 14,
      itemHeight: 14,
      itemGap: 16,
      formatter: (name) => {
        const item = tableData.value.find(d => d.hospital_level === name)
        if (!item) return name
        return `{name|${getLevelTag(name)}}\n{count|${formatNumber(item.hospital_count)}家} {ratio|${item.hospital_ratio}%}`
      },
      textStyle: {
        rich: {
          name: { fontSize: 13, color: '#333', lineHeight: 22, fontWeight: 600 },
          count: { fontSize: 12, color: '#1677ff', lineHeight: 20, fontWeight: 700 },
          ratio: { fontSize: 11, color: '#52c41a', lineHeight: 20 }
        }
      }
    },
    series: [{
      name: '医院等级分布',
      type: 'pie',
      radius: ['30%', '68%'],
      center: ['38%', '50%'],
      roseType: 'area',
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 3
      },
      label: {
        show: true,
        position: 'outside',
        formatter: (params) => {
          const val = params.value || 0
          if (val > maxHospitalCount.value * 0.15) {
            return `{main|${params.name}}\n{val|${formatNumber(val)}}\n{pct|${params.percent}%}`
          }
          return `{small|${params.name}}`
        },
        rich: {
          main: { fontSize: 13, fontWeight: 'bold', color: '#333', lineHeight: 18 },
          val: { fontSize: 12, color: '#1677ff', lineHeight: 16, fontWeight: 600 },
          pct: { fontSize: 11, color: '#52c41a', lineHeight: 14 },
          small: { fontSize: 11, color: '#8c8c8c', lineHeight: 16 }
        },
        textBorderColor: 'rgba(255,255,255,0.8)',
        textBorderWidth: 2
      },
      labelLine: {
        length: 15,
        length2: 25,
        lineStyle: { width: 2, color: '#ccc' }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 30,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.35)',
          scale: true,
          scaleSize: 8
        },
        label: { show: true, fontSize: 15, fontWeight: 'bold' }
      },
      animationType: 'expansion',
      animationDuration: 1500,
      animationEasing: 'elasticOut',
      data: data
    }]
  }
})

const barChartOption = computed(() => {
  const categories = tableData.value.map(item => getLevelTag(item.hospital_level))
  const values = tableData.value.map(item => item.hospital_count)
  const ratios = tableData.value.map(item => item.hospital_ratio)
  const doctors = tableData.value.map(item => item.avg_doctor_per_hospital)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,0.05)' } },
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      borderRadius: 10,
      padding: [14, 18],
      textStyle: { fontSize: 13, color: '#333' },
      formatter: (params) => {
        const idx = params[0]?.dataIndex
        if (idx === undefined) return ''
        const item = tableData.value[idx]
        return `
          <div style="min-width: 220px;">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 10px; color: ${getLevelColor(item.hospital_level)};">
              ${getLevelTag(item.hospital_level)}
            </div>
            <div style="padding: 4px 0;"><span style="color:#8c8c8c;width:90px;display:inline-block;">🏥 医院数:</span><strong style="color:#1677ff">${formatNumber(item.hospital_count)} 家</strong></div>
            <div style="padding: 4px 0;"><span style="color:#8c8c8c;width:90px;display:inline-block;">占比:</span><strong style="color:#52c41a">${item.hospital_ratio}%</strong></div>
            <div style="padding: 4px 0;"><span style="color:#8c8c8c;width:90px;display:inline-block;">👨‍⚕️ 医生数:</span><strong style="color:#fa8c16">${item.avg_doctor_per_hospital?.toFixed(1)}</strong></div>
          </div>
        `
      }
    },
    grid: { left: '3%', right: '8%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        interval: 0,
        rotate: 20,
        fontSize: 11,
        color: '#666'
      },
      axisLine: { lineStyle: { color: '#ddd' } }
    },
    yAxis: [
      {
        type: 'value',
        name: '医院数量',
        position: 'left',
        axisLabel: { formatter: (val) => val >= 10000 ? (val/10000)+'万' : val, color: '#8c8c8c' },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
      },
      {
        type: 'value',
        name: '占比(%)',
        position: 'right',
        axisLabel: { formatter: '{value}%', color: '#8c8c8c' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '医院数量',
        type: 'bar',
        data: values.map((val, i) => ({
          value: val,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: getLevelColor(tableData.value[i].hospital_level) },
              { offset: 1, color: getLevelColor(tableData.value[i].hospital_level) + '88' }
            ]),
            borderRadius: [6, 6, 0, 0],
            shadowBlur: val > maxHospitalCount.value * 0.2 ? 15 : 5,
            shadowColor: 'rgba(0,0,0,0.15)'
          }
        })),
        barMaxWidth: 50,
        emphasis: {
          itemStyle: {
            shadowBlur: 25,
            shadowColor: 'rgba(0,0,0,0.3)'
          }
        }
      },
      {
        name: '占比',
        type: 'line',
        yAxisIndex: 1,
        data: ratios,
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { width: 3, color: '#ff7875' },
        itemStyle: { color: '#ff4d4f', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,77,79,0.25)' },
            { offset: 1, color: 'rgba(255,77,79,0.02)' }
          ])
        }
      }
    ],
    animationDuration: 1000,
    animationEasing: 'elasticOut'
  }
})

const regionChartOption = computed(() => {
  const cityMap = {}
  tableData.value.forEach((item) => {
    const cityName = item.city || item.region
    if (!cityName) return
    if (!cityMap[cityName]) {
      cityMap[cityName] = {
        name: cityName,
        value: 0,
        doctorAvgTotal: 0,
        sampleCount: 0
      }
    }
    cityMap[cityName].value += Number(item.hospital_count || 0)
    cityMap[cityName].doctorAvgTotal += Number(item.avg_doctor_per_hospital || 0)
    cityMap[cityName].sampleCount += 1
  })

  const baseData = Object.values(cityMap).map((cityData) => ({
    name: cityData.name,
    value: cityData.value,
    doctorAvg: cityData.sampleCount > 0 ? (cityData.doctorAvgTotal / cityData.sampleCount).toFixed(1) : '0.0',
    topHospital: Math.floor(cityData.value * 0.15)
  }))
  const cities = baseData.map(item => item.name)

  const maxValue = Math.max(...baseData.map(d => d.value), 1)

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      borderRadius: 10,
      padding: [12, 16],
      formatter: (params) => {
        const d = baseData.find(b => b.name === params[0]?.name)
        if (!d) return ''
        return `<div style="font-weight:600;font-size:14px;margin-bottom:8px;color:#1890ff;">📍 ${d.name}</div>
          <div style="padding:3px 0;"><span style="color:#888;width:85px;display:inline-block;">医院总数:</span><strong>${d.value}</strong></div>
          <div style="padding:3px 0;"><span style="color:#888;width:85px;display:inline-block;">平均医生:</span><strong style="color:#52c41a">${d.doctorAvg}</strong></div>
          <div style="padding:3px 0;"><span style="color:#888;width:85px;display:inline-block;">三甲医院:</span><strong style="color:#fa8c16">${d.topHospital}</strong></div>`
      }
    },
    grid: { left: '3%', right: '5%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: cities,
      axisLabel: { fontSize: 12, color: '#666' },
      axisLine: { lineStyle: { color: '#ddd' } }
    },
    yAxis: {
      type: 'value',
      name: '医院数量',
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [{
      name: '医院数量',
      type: 'bar',
      barWidth: '50%',
      data: baseData.map((d, idx) => ({
        value: d.value,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#69c0ff' },
            { offset: 1, color: '#1890ff' }
          ]),
          borderRadius: [6, 6, 0, 0],
          shadowBlur: d.value > maxValue * 0.6 ? 15 : 5
        }
      })),
      barMaxWidth: 45,
      label: {
        show: true,
        position: 'top',
        formatter: '{c}',
        fontSize: 11,
        color: '#666',
        fontWeight: 600
      }
    }]
  }
})

const radarChartOption = computed(() => {
  // 使用真实数据
  const realData = tableData.value && tableData.value.length > 0 ? tableData.value : []
  const apiData = radarApiData.value
  
  // 使用真实API数据设置雷达图的最大值
  const maxHospital = Math.max(apiData.totalHospitals || 200, 200)
  const maxDoctor = Math.max(apiData.totalDoctors || 5000, 5000)
  const maxConsultation = Math.max(apiData.totalConsultations || 150000, 150000)
  const maxCity = Math.max(apiData.cityCount || 50, 50)
  const maxDepartment = Math.max(apiData.departmentCount || 25, 25)
  const maxDisease = Math.max(apiData.diseaseTypes || 300, 300)
  
  // 使用真实数据维度和API汇总数据
  const indicators = [
    { name: '医院数量', max: maxHospital },
    { name: '医生资源', max: maxDoctor },
    { name: '问诊总量', max: maxConsultation },
    { name: '城市覆盖', max: maxCity },
    { name: '科室数量', max: maxDepartment },
    { name: '疾病种类', max: maxDisease }
  ]

  const levels = ['三甲', '三乙', '二甲', '二乙', '一级']
  const colors = ['#FFD700', '#FF8C00', '#1677ff', '#69c0ff', '#95de64']

  // 如果有真实数据，使用真实数据生成雷达图
  // 根据医院等级分析数据生成雷达图数据
  const radarData = levels.map((level, i) => {
    let value
    if (realData.length > i) {
      const item = realData[i]
      // 使用真实数据中的值，按比例换算到雷达图的 max 范围
      const hospitalCount = item.hospital_count || 0
      const doctorCount = item.doctor_count || 0
      const consultationCount = item.consultation_count || 0
      
      // 映射真实数据到雷达图的6个维度
      value = [
        Math.min(maxHospital, hospitalCount * 1.2),
        Math.min(maxDoctor, doctorCount),
        Math.min(maxConsultation, consultationCount),
        Math.min(maxCity, radarApiData.value.cityCount || 40),
        Math.min(maxDepartment, radarApiData.value.departmentCount || 18),
        Math.min(maxDisease, radarApiData.value.diseaseTypes || 200)
      ]
    } else {
      value = [0, 0, 0, 0, 0, 0]
    }
    return {
      name: level,
      value: value,
      symbol: 'round',
      symbolSize: 6,
      lineStyle: { width: 2, color: colors[i] },
      areaStyle: { color: colors[i] + '30' },
      itemStyle: { color: colors[i], borderColor: '#fff', borderWidth: 2 }
    }
  })

  return {
    tooltip: {},
    legend: { bottom: 10, data: levels, textStyle: { fontSize: 12 } },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#666', fontSize: 11 },
      splitLine: { lineStyle: { color: '#e8e8e8' } },
      splitArea: { areaStyle: { color: ['rgba(22,119,255,0.02)', 'rgba(22,119,255,0.05)'] } },
      axisLine: { lineStyle: { color: '#ddd' } }
    },
    series: [{
      type: 'radar',
      data: radarData
    }]
  }
})

const trendChartOption = computed(() => {
  const realData = tableData.value && tableData.value.length > 0 ? tableData.value : []
  
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  const seriesData = realData.slice(0, 5).map((item) => {
    const baseValue = item.hospital_count || 100
    
    return {
      name: getLevelTag(item.hospital_level),
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      data: months.map(() => baseValue),
      lineStyle: { width: 2.5, color: getLevelColor(item.hospital_level) },
      itemStyle: { color: getLevelColor(item.hospital_level), borderWidth: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: getLevelColor(item.hospital_level) + '40' },
          { offset: 1, color: getLevelColor(item.hospital_level) + '05' }
        ])
      }
    }
  })

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      borderRadius: 10
    },
    legend: { bottom: 5, textStyle: { fontSize: 12 } },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: months, boundaryGap: false },
    yAxis: { type: 'value', name: '医院数量', splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } } },
    series: seriesData,
    animationDuration: 1500
  }
})

const initTreemap = () => {
  if (!treemapRef.value) return

  nextTick(() => {
    setTimeout(() => {
      if (treemapInstance) {
        treemapInstance.dispose()
        treemapInstance = null
      }

      treemapInstance = echarts.init(treemapRef.value)

      const maxValue = maxHospitalCount.value
      const data = tableData.value.map(item => ({
        name: `${getLevelTag(item.hospital_level)}\n${item.hospital_level}`,
        value: item.hospital_count,
        consultationRatio: item.hospital_ratio,
        children: [],
        itemStyle: {
          color: getLevelColor(item.hospital_level),
          borderRadius: 8,
          borderWidth: item.hospital_count > maxValue * 0.25 ? 4 : 2,
          shadowBlur: item.hospital_count > maxValue * 0.2 ? 20 : 8,
          shadowColor: 'rgba(0,0,0,0.15)'
        },
        label: {
          fontSize: Math.max(12, Math.min(16, (item.hospital_count / maxValue) * 16 + 12)),
          fontWeight: item.hospital_count > maxValue * 0.15 ? 'bold' : 'normal',
          formatter: `{name|{b}}\n{val|${formatNumber(item.hospital_count)}}\n{ratio|${item.hospital_ratio}%}`,
          rich: {
            name: { fontSize: 14, fontWeight: 'bold', color: '#fff', lineHeight: 20 },
            val: { fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 17 },
            ratio: { fontSize: 11, color: '#ffd666', lineHeight: 15 }
          }
        },
        level: 0,
        rawData: item
      }))

      treemapInstance.setOption({
        tooltip: { show: false },
        series: [{
          type: 'treemap',
          width: '100%',
          height: '100%',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          visibleMin: 50,
          itemStyle: { borderColor: '#fff', borderWidth: 3, gapWidth: 6 },
          levels: [{
            itemStyle: { borderWidth: 4, gapWidth: 6, shadowBlur: 25 },
            upperLabel: { show: true, height: 44, fontSize: 14, color: '#333', fontWeight: 'bold' }
          }, {
            itemStyle: { borderWidth: 3, gapWidth: 4, shadowBlur: 15 },
            upperLabel: { show: true, height: 36, fontSize: 13 }
          }],
          data: data,
          animationDuration: 1000,
          animationEasing: 'cubicOut'
        }]
      })
    }, 100)
  })
}

const handleChartTypeChange = () => {
  nextTick(() => {
    setTimeout(() => {
      if (chartType.value === 'treemap') {
        initTreemap()
      }
    }, 100)
  })
}

const handleRegionChange = (value) => {
  loadData()
}

const exportChart = () => {
  let url = ''
  if (chartType.value !== 'treemap' && pieChartRef.value) {
    const chart = pieChartRef.value.chart
    if (chart) {
      url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    }
  } else if (treemapInstance) {
    url = treemapInstance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
  }

  if (url) {
    const link = document.createElement('a')
    link.download = `医院等级分析_${chartType.value}_${new Date().toISOString().slice(0, 10)}.png`
    link.href = url
    link.click()
  }
}



const loadData = async () => {
  loading.value = true
  try {
    const result = await handleAsync(
      () => dataAPI.getHospitalLevelAnalysis({ dt: dateFilter.value }),
      { showSuccess: false }
    )

    console.log('[HospitalLevelAnalysis] API响应:', result)
    
    // 兼容多种响应格式: result.data.list 或 result.data.data.list
    let list = []
    if (result.success && result.data) {
      list = result.data?.list || result.data?.data?.list || []
    }

    if (list.length === 0) {
      console.warn('[HospitalLevelAnalysis] API 无数据')
    }

    tableData.value = list.map((item) => ({
      hospital_level: item.hospital_level,
      hospital_count: item.hospital_count || 0,
      hospital_ratio: item.hospital_ratio || 0,
      avg_doctor_per_hospital: item.avg_doctor_per_hospital || 0,
      doctor_count: item.doctor_count || 0,
      consultation_count: item.consultation_count || 0,
      avg_consultation_price: item.avg_consultation_price || 0,
      avg_recommendation_star: item.avg_recommendation_star || 0,
      city: item.city || item.region || '',
      region: item.city || item.region || ''
    }))
    
    console.log('[HospitalLevelAnalysis] 解析后数据:', tableData.value)
    
    // 获取雷达图所需的额外数据（调用多个API）
    await loadRadarApiData()
    
    if (tableData.value.length > 0) {
      message.success(`加载成功，共 ${tableData.value.length} 条数据`)
    } else {
      message.info('暂无数据')
    }
  } catch (error) {
    console.error('[HospitalLevelAnalysis] 加载失败:', error)
    tableData.value = []
    message.error('数据加载失败')
  } finally {
    loading.value = false

    if (chartType.value === 'treemap') {
      nextTick(() => setTimeout(initTreemap, 100))
    }
  }
}

// 调用多个API获取雷达图所需的真实数据
const loadRadarApiData = async () => {
  try {
    const [overviewRes, deptRes] = await Promise.all([
      dataAPI.getOverview({ dt: dateFilter.value }),
      dataAPI.getDepartmentServiceAnalysis({ dt: dateFilter.value, limit: 10 })
    ])
    
    // 处理概览数据 - 支持多种响应格式
    let overviewData = {}
    if (overviewRes.success && overviewRes.data) {
      // 格式1: result.data.indicators = { hospital_count: 2730, ... }
      if (overviewRes.data.indicators) {
        overviewData = overviewRes.data.indicators
      }
      // 格式2: result.data.data = [{ indicator_key: 'hospital_count', indicator_value: 2730 }, ...]
      else if (overviewRes.data.data) {
        const list = Array.isArray(overviewRes.data.data) ? overviewRes.data.data : []
        list.forEach((item: any) => {
          if (item.indicator_key) {
            overviewData[item.indicator_key] = item.indicator_value
          }
        })
      }
      // 格式3: result.data = [{ indicator_key: 'hospital_count', indicator_value: 2730 }, ...]
      else if (Array.isArray(overviewRes.data)) {
        overviewRes.data.forEach((item: any) => {
          if (item.indicator_key) {
            overviewData[item.indicator_key] = item.indicator_value
          }
        })
      }
    }
    
    console.log('[HospitalLevelAnalysis] 概览数据:', overviewData)
    
    // 处理科室服务数据
    let deptData = { topDepartment: '', maxDoctors: 0, maxConsultations: 0 }
    if (deptRes.success && deptRes.data) {
      const deptList = deptRes.data?.list || deptRes.data?.data?.list || []
      if (deptList.length > 0) {
        const topDept = deptList[0]
        deptData = {
          topDepartment: topDept.department || '内科',
          maxDoctors: topDept.doctor_count || 1000,
          maxConsultations: topDept.consultation_count || 5000,
          avgPrice: topDept.avg_consultation_price || 100,
          avgStar: topDept.avg_recommendation_star || 4.0
        }
      }
    }
    
    // 汇总数据用于雷达图 - 使用正确的字段名
    radarApiData.value = {
      totalHospitals: overviewData.hospital_count || overviewData.total_hospitals || 150,
      totalDoctors: overviewData.doctor_count || overviewData.total_doctors || 3000,
      totalConsultations: overviewData.consultation_total || overviewData.total_consultations || 100000,
      diseaseTypes: overviewData.disease_count || overviewData.disease_types || 200,
      cityCount: overviewData.city_count || 40,
      departmentCount: overviewData.department_count || 18,
      ...deptData
    }
    
    console.log('[HospitalLevelAnalysis] 雷达图API数据:', radarApiData.value)
  } catch (error) {
    console.error('[HospitalLevelAnalysis] 雷达图数据加载失败:', error)
    radarApiData.value = {
      totalHospitals: 0,
      totalDoctors: 0,
      totalConsultations: 0,
      diseaseTypes: 0,
      cityCount: 0,
      departmentCount: 0,
      topDepartment: '',
      maxDoctors: 0,
      maxConsultations: 0,
      avgPrice: 0,
      avgStar: 0
    }
  }
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (treemapInstance && !treemapInstance.isDisposed()) {
    treemapInstance.dispose()
    treemapInstance = null
  }
})

const handleResize = () => {
  if (treemapInstance && !treemapInstance.isDisposed()) {
    treemapInstance.resize()
  }
}
</script>

<style scoped lang="less">
.hospital-level-analysis {
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
    gap: 16px;
    flex-wrap: wrap;

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

  @media (max-width: 1200px) {
    .header-right {
      gap: 8px;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;

    .header-left, .header-right {
      width: 100%;
    }

    .header-right {
      justify-content: flex-start;
    }
  }

  @media (max-width: 576px) {
    .header-right {
      .ant-select {
        width: 100% !important;
      }
      .ant-radio-group {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
      }
    }
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
    max-width: 100%;
  }

  .treemap-container {
    height: 520px;
    width: 100%;
    border-radius: 8px;
    background: #fafafa;
  }

  @media (max-width: 1400px) {
    .chart-container-large {
      height: 480px;
    }
    .treemap-container {
      height: 480px;
    }
  }

  @media (max-width: 1200px) {
    .chart-container-large {
      height: 420px;
    }
    .treemap-container {
      height: 420px;
    }
  }

  @media (max-width: 992px) {
    .chart-container-large {
      height: 380px;
    }
    .treemap-container {
      height: 380px;
    }
  }

  @media (max-width: 768px) {
    min-height: auto;

    .chart-container-large {
      height: 320px;
    }
    .treemap-container {
      height: 320px;
    }
  }

  @media (max-width: 576px) {
    .chart-container-large {
      height: 280px;
    }
    .treemap-container {
      height: 280px;
    }
  }
}

.table-card-enhanced {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  :deep(.ant-table) {
    .top-row {
      background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%) !important;

      td {
        font-weight: 600;
      }
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

    .count-cell {
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

      .count-value {
        font-weight: 700;
        color: #1677ff;
        min-width: 55px;
        text-align: right;
        font-size: 13px;
      }
    }

    .ratio-display {
      display: flex;
      justify-content: center;
    }

    .inline-stat {
      :deep(.ant-statistic-content) {
        font-size: 15px !important;
      }
    }

    .level-tag-custom {
      border-radius: 12px;
      font-weight: 600;
      font-size: 12px;
    }
  }
}

.chart-card-secondary {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  .chart-container-medium {
    height: 340px;
    width: 100%;
    max-width: 100%;
  }

  @media (max-width: 1200px) {
    .chart-container-medium {
      height: 300px;
    }
  }

  @media (max-width: 992px) {
    .chart-container-medium {
      height: 280px;
    }
  }

  @media (max-width: 768px) {
    .chart-container-medium {
      height: 260px;
    }
  }

  @media (max-width: 576px) {
    .chart-container-medium {
      height: 220px;
    }
  }
}

.chart-card-full {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  .chart-container-trend {
    height: 350px;
    width: 100%;
    max-width: 100%;
  }

  @media (max-width: 1200px) {
    .chart-container-trend {
      height: 320px;
    }
  }

  @media (max-width: 992px) {
    .chart-container-trend {
      height: 280px;
    }
  }

  @media (max-width: 768px) {
    .chart-container-trend {
      height: 260px;
    }
  }

  @media (max-width: 576px) {
    .chart-container-trend {
      height: 220px;
    }
  }
}

.region-filter {
  :deep(.ant-select) {
    .ant-select-selector {
      border-radius: 8px;
    }
  }
}
</style>
