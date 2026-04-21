<template>
  <div class="disease-treemap-container" v-if="isReady">
    <div class="treemap-header">
      <div class="header-left">
        <h3 class="title">疾病分布分析</h3>
        <div class="region-filter" v-if="regions.length > 0">
          <a-select
            v-model:value="selectedRegion"
            placeholder="选择地区"
            size="small"
            style="width: 140px"
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

      <div class="breadcrumb" v-if="breadcrumbList.length > 0">
        <span
          class="breadcrumb-item"
          :class="{ active: index === breadcrumbList.length - 1 }"
          v-for="(item, index) in breadcrumbList"
          :key="index"
          @click="handleBreadcrumbClick(index)"
        >
          <span v-if="index > 0" class="separator">/</span>
          {{ item.name }}
        </span>
      </div>
    </div>

    <div class="treemap-main">
      <div
        class="treemap-wrapper"
        ref="chartRef"
        :style="{ height: height, minHeight: '500px' }"
      ></div>

      <div class="side-panel" v-if="showSidePanel">
        <div class="panel-title">📊 数据分布</div>
        <div class="distribution-list">
          <div
            class="distribution-item"
            v-for="(item, index) in topDistribution"
            :key="index"
            :class="{ active: selectedItem === item.name }"
            @click="highlightItem(item.name)"
          >
            <div class="rank-badge" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
            <div class="item-info">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-value">{{ formatNumber(item.value) }} 次</div>
            </div>
            <div class="item-ratio" :style="{ color: getRatioColor(item.ratio) }">
              {{ item.ratio }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="treemap-legend">
      <div class="legend-section">
        <div class="legend-title">就诊占比</div>
        <div class="legend-color-bar">
          <span class="legend-label">低</span>
          <div class="gradient-bar ratio-gradient"></div>
          <span class="legend-label">高</span>
        </div>
      </div>
      <div class="legend-section">
        <div class="legend-title">就诊量级</div>
        <div class="size-legend">
          <div class="size-item small"></div>
          <span>低</span>
          <div class="size-item medium"></div>
          <span>中</span>
          <div class="size-item large"></div>
          <span>高</span>
        </div>
      </div>
    </div>

    <div class="region-stats" v-if="regionStats.length > 0">
      <div class="stat-chip" v-for="stat in regionStats" :key="stat.region">
        <span class="stat-region">{{ stat.region }}</span>
        <span class="stat-count">{{ formatNumber(stat.count) }}</span>
        <span class="stat-percent">{{ stat.percent }}%</span>
      </div>
    </div>
    <div class="region-stats" v-else-if="hasValidData">
      <div class="stat-chip" style="background: #f5f5f5;">
        <span class="stat-region">暂无地区数据</span>
        <span class="stat-count">-</span>
        <span class="stat-percent">-</span>
      </div>
    </div>

    <div class="treemap-tooltip" v-show="showTooltip" :style="tooltipStyle">
      <div class="tooltip-header">
        <span class="tooltip-icon">🏥</span>
        {{ tooltipData.name }}
        <span class="tooltip-level" v-if="tooltipData.level !== undefined">
          L{{ tooltipData.level + 1 }}
        </span>
      </div>
      <div class="tooltip-content">
        <div class="tooltip-row highlight-row">
          <span class="label">就诊人次:</span>
          <span class="value highlight">{{ formatNumber(tooltipData.consultationCount) }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">就诊占比:</span>
          <span class="value">
            <span class="ratio-bar" :style="{ width: Math.min(tooltipData.consultationRatio || 0, 100) + '%' }"></span>
            {{ tooltipData.consultationRatio }}%
          </span>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-row" v-if="tooltipData.rank !== undefined">
          <span class="label">🏆 排名:</span>
          <span class="value rank-value" :class="'rank-' + getRankClass(tooltipData.rank)">
            第 {{ tooltipData.rank }} 名
          </span>
        </div>
        <div class="tooltip-row" v-if="tooltipData.doctorCount !== undefined">
          <span class="label">👨‍⚕️ 医生数:</span>
          <span class="value">{{ tooltipData.doctorCount }} 人</span>
        </div>
        <div class="tooltip-row" v-if="tooltipData.hospitalCount !== undefined">
          <span class="label">🏥 医院数:</span>
          <span class="value">{{ tooltipData.hospitalCount }} 家</span>
        </div>
        <div class="tooltip-row" v-if="tooltipData.region">
          <span class="label">📍 地区:</span>
          <span class="value region-tag">{{ tooltipData.region }}</span>
        </div>
        <div class="tooltip-row" v-if="tooltipData.children && tooltipData.children.length > 0">
          <span class="label">下钻:</span>
          <span class="value click-hint">
            {{ tooltipData.children.length }} 个子分类 ▶
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="loading-placeholder" v-else>
    <a-spin size="large">
      <template #indicator>
        <LoadingOutlined style="font-size: 32px; color: #1890ff;" spin />
      </template>
      <div class="skeleton-content">
        <div class="skeleton-title"></div>
        <div class="skeleton-grid">
          <div v-for="i in 8" :key="i" class="skeleton-block"
               :style="{ animationDelay: i * 0.1 + 's' }"></div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { LoadingOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  height: {
    type: String,
    default: '650px'
  },
  loading: {
    type: Boolean,
    default: false
  },
  showSidePanel: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['drill-down', 'breadcrumb-click', 'region-change'])

const chartRef = ref(null)
let chartInstance = null
const showTooltip = ref(false)
const tooltipData = ref({})
const tooltipStyle = ref({})
const currentLevel = ref(0)
const breadcrumbList = ref([{ name: '全部', level: 0, data: null }])
const isReady = ref(false)
const selectedItem = ref(null)
const selectedRegion = ref('')
const initTimer = null
let allTreemapData = []

const regions = computed(() => {
  const regionSet = new Set()
  props.data.forEach(item => {
    if (item.city || item.region || item.area) {
      regionSet.add(item.city || item.region || item.area)
    }
  })
  return Array.from(regionSet).sort()
})

const topDistribution = computed(() => {
  console.log('[DiseaseTreemap] topDistribution 计算，props.data:', props.data?.length || 0, '条')
  if (!props.data || props.data.length === 0) return []
  
  const categoryMap = {}
  props.data.forEach(item => {
    const category = item.disease_category || '未分类'
    if (!categoryMap[category]) {
      categoryMap[category] = { name: category, value: 0 }
    }
    categoryMap[category].value += item.consultation_count || 0
  })
  
  return Object.values(categoryMap)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map(item => ({
      name: item.name,
      value: item.value,
      ratio: 0
    }))
})

const regionStats = computed(() => {
  if (!props.data || props.data.length === 0) return []
  const statsMap = {}
  let total = 0

  props.data.forEach(item => {
    const region = item.city || item.region || item.area || item.department || item.disease_category || null
    const count = item.consultation_count || 0
    if (region) {
      statsMap[region] = (statsMap[region] || 0) + count
    }
    total += count
  })

  const entries = Object.entries(statsMap)
  if (entries.length === 0) {
    return []
  }

  return entries
    .map(([region, count]) => ({
      region: region.length > 6 ? region.substring(0, 6) + '..' : region,
      count,
      percent: ((count / total) * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})

const hasValidData = computed(() => {
  return props.data && props.data.length > 0
})

const formatNumber = (num) => {
  if (num === undefined || num === null) return '-'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

const getRankClass = (rank) => {
  if (rank <= 3) return 'top'
  if (rank <= 10) return 'good'
  return 'normal'
}

const getRatioColor = (ratio) => {
  if (ratio >= 10) return '#f5222d'
  if (ratio >= 5) return '#fa8c16'
  if (ratio >= 2) return '#1890ff'
  return '#8c8c8c'
}

const getColorByValueAndRatio = (value, ratio, maxValue, maxRatio) => {
  const valuePercent = maxValue > 0 ? value / maxValue : 0
  const ratioPercent = maxRatio > 0 ? ratio / maxRatio : 0
  const combinedScore = valuePercent * 0.6 + ratioPercent * 0.4

  const colorStops = [
    { pos: 0, color: '#91cc75' },
    { pos: 0.15, color: '#73c0de' },
    { pos: 0.3, color: '#5470c6' },
    { pos: 0.45, color: '#9a60b4' },
    { pos: 0.6, color: '#ea7ccc' },
    { pos: 0.75, color: '#fc8452' },
    { pos: 0.9, color: '#ee6666' },
    { pos: 1.0, color: '#c23531' }
  ]

  for (let i = colorStops.length - 1; i >= 0; i--) {
    if (combinedScore >= colorStops[i].pos) {
      return colorStops[i].color
    }
  }

  return colorStops[0].color
}

const buildTreemapData = (rawData) => {
  console.log('[DiseaseTreemap] buildTreemapData 接收数据:', rawData?.length || 0, '条')
  if (!rawData || rawData.length === 0) {
    console.warn('[DiseaseTreemap] 数据为空!')
    return []
  }
  
  console.log('[DiseaseTreemap] 数据样本:', rawData.slice(0, 2))

  const categoryMap = {}
  rawData.forEach(item => {
    const category = item.disease_category || '未分类'
    if (!categoryMap[category]) {
      categoryMap[category] = {
        name: category,
        value: 0,
        consultationRatio: 0,
        children: [],
        rawItems: []
      }
    }
    categoryMap[category].value += item.consultation_count || 0
    categoryMap[category].consultationRatio += item.consultation_ratio || 0
    categoryMap[category].rawItems.push(item)
  })

  const categories = Object.values(categoryMap)
  const maxValue = Math.max(...categories.map(c => c.value))
  const maxRatio = Math.max(...categories.map(c => c.consultationRatio / c.rawItems.length))

  return categories.map(category => ({
    name: category.name,
    value: category.value,
    consultationRatio: parseFloat((category.consultationRatio / category.rawItems.length).toFixed(2)),
    itemStyle: {
      borderWidth: category.value > maxValue * 0.3 ? 3 : 2,
      borderColor: category.value > maxValue * 0.2 ? '#fff' : '#f0f0f0',
      shadowBlur: category.value > maxValue * 0.25 ? 15 : 5,
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      shadowOffsetY: 2
    },
    children: buildDepartmentData(category.rawItems, maxValue, maxRatio),
    rawItems: category.rawItems,
    level: 0
  }))
}

const buildDepartmentData = (items, parentMaxValue, parentMaxRatio) => {
  const deptMap = {}
  items.forEach(item => {
    const dept = item.department || '未知科室'
    if (!deptMap[dept]) {
      deptMap[dept] = {
        name: dept,
        value: 0,
        consultationRatio: 0,
        children: [],
        rawItems: []
      }
    }
    deptMap[dept].value += item.consultation_count || 0
    deptMap[dept].consultationRatio += item.consultation_ratio || 0
    deptMap[dept].rawItems.push(item)
  })

  const depts = Object.values(deptMap)
  const maxValue = Math.max(...depts.map(d => d.value), parentMaxValue || 1)
  const maxRatio = Math.max(...depts.map(d => d.consultationRatio / d.rawItems.length), parentMaxRatio || 1)

  return depts.map(dept => ({
    name: dept.name,
    value: dept.value,
    consultationRatio: parseFloat((dept.consultationRatio / dept.rawItems.length).toFixed(2)),
    itemStyle: {
      borderWidth: dept.value > maxValue * 0.25 ? 2 : 1,
      borderColor: dept.value > maxValue * 0.2 ? '#fff' : '#f0f0f0',
      shadowBlur: dept.value > maxValue * 0.2 ? 12 : 4,
      shadowColor: 'rgba(0, 0, 0, 0.12)'
    },
    children: buildDiseaseData(dept.rawItems, maxValue, maxRatio),
    rawItems: dept.rawItems,
    level: 1
  }))
}

const buildDiseaseData = (items, parentMaxValue, parentMaxRatio) => {
  const maxValue = Math.max(...items.map(i => i.consultation_count || 0), parentMaxValue || 1)
  const maxRatio = Math.max(...items.map(i => i.consultation_ratio || 0), parentMaxRatio || 1)

  return items.map(item => ({
    name: item.disease_name || '未知疾病',
    value: item.consultation_count || 0,
    consultationRatio: item.consultation_ratio || 0,
    rank: item.ranking || 0,
    doctorCount: item.doctor_count || 0,
    hospitalCount: item.hospital_count || 0,
    region: item.city || item.region || item.area || '',
    itemStyle: {
      borderWidth: (item.consultation_count || 0) > maxValue * 0.15 ? 2 : 1,
      borderColor: (item.consultation_count || 0) > maxValue * 0.1 ? '#fff' : '#f0f0f0',
      shadowBlur: (item.consultation_count || 0) > maxValue * 0.1 ? 10 : 3,
      shadowColor: 'rgba(0, 0, 0, 0.1)'
    },
    label: {
      fontSize: Math.max(10, Math.min(14, (item.consultation_count || 0) / maxValue * 14 + 10)),
      fontWeight: (item.consultation_count || 0) > maxValue * 0.15 ? 'bold' : 'normal'
    },
    level: 2,
    rawData: item
  }))
}

const getChartOption = (data) => {
  const visualMin = data.length > 0 ? Math.min(...data.map(d => d.value)) : 0
  const visualMax = data.length > 0 ? Math.max(...data.map(d => d.value)) : 100

  return {
    tooltip: { show: false },
    visualMap: {
      show: false,
      min: 0,
      max: visualMax || 1000,
      inRange: {
        color: [
          '#c6e48b',
          '#7bc96f',
          '#239a3b',
          '#196127',
          '#00441b'
        ]
      }
    },
    series: [{
      type: 'treemap',
      width: '100%',
      height: '85%',
      left: '0%',
      top: '0%',
      roam: false,
      nodeClick: 'link',
      breadcrumb: { show: false },
      visibleMin: 100,
      padding: [10, 10, 60, 10],

      label: {
        show: true,
        formatter: (params) => {
          const val = params.value || 0
          const ratio = params.data?.consultationRatio || 0
          if (val > visualMax * 0.15) {
            return `{name|${params.name}}\n{val|${formatNumber(val)}}\n{ratio|${ratio}%}`
          }
          return `{name|${params.name}}`
        },
        rich: {
          name: {
            fontSize: 13,
            fontWeight: 'bold',
            color: '#fff',
            lineHeight: 18
          },
          val: {
            fontSize: 11,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 16
          },
          ratio: {
            fontSize: 10,
            color: '#ffd666',
            lineHeight: 14
          }
        },
        textBorderColor: 'rgba(0,0,0,0.4)',
        textBorderWidth: 2
      },

      upperLabel: {
        show: true,
        height: 36,
        formatter: (params) => {
          const ratio = params.data?.consultationRatio || 0
          const val = params.value || 0
          return `{name|${params.name}}  {val|${formatNumber(val)}次}  {ratio|${ratio}%}`
        },
        rich: {
          name: {
            fontSize: 13,
            fontWeight: 'bold',
            color: '#333',
            padding: [0, 8, 0, 0]
          },
          val: {
            fontSize: 11,
            color: '#666',
            padding: [0, 8, 0, 0]
          },
          ratio: {
            fontSize: 11,
            fontWeight: 'bold',
            color: '#1890ff',
            padding: [0, 0, 0, 0]
          }
        }
      },

      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2,
        gapWidth: 4
      },

      levels: [{
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 4,
          gapWidth: 4,
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.1)'
        },
        upperLabel: {
          show: true,
          height: 44,
          fontSize: 14,
          color: '#333'
        }
      }, {
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 3,
          gapWidth: 3,
          shadowBlur: 12,
          shadowColor: 'rgba(0, 0, 0, 0.08)'
        },
        upperLabel: {
          show: true,
          height: 38,
          fontSize: 13,
          color: '#333'
        }
      }, {
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          gapWidth: 2,
          shadowBlur: 8,
          shadowColor: 'rgba(0, 0, 0, 0.06)'
        },
        label: {
          fontSize: 11
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            borderWidth: 3,
            borderColor: '#1890ff'
          }
        }
      }],

      data: data,
      animationDuration: 800,
      animationDurationUpdate: 600,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'quinticInOut'
    }]
  }
}

const isDOMReady = () => {
  return chartRef.value && chartRef.value.parentNode !== null
}

const initChart = () => {
  console.log('[DiseaseTreemap] initChart 开始执行')
  console.log('[DiseaseTreemap] props.data:', props.data?.length || 0, '条')
  console.log('[DiseaseTreemap] isReady:', isReady.value)
  
  if (!isDOMReady()) {
    console.warn('[DiseaseTreemap] DOM 未就绪，延迟初始化')
    setTimeout(() => initChart(), 100)
    return
  }

  if (!props.data || props.data.length === 0) {
    console.warn('[DiseaseTreemap] props.data 为空，不初始化图表')
    return
  }

  try {
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }

    chartInstance = echarts.init(chartRef.value)

    let filteredData = props.data
    if (selectedRegion.value) {
      filteredData = props.data.filter(
        item => (item.city || item.region || item.area) === selectedRegion.value
      )
    }

    allTreemapData = buildTreemapData(filteredData)
    chartInstance.setOption(getChartOption(allTreemapData))

    setupChartEvents()
  } catch (error) {
    console.error('[DiseaseTreemap] 初始化失败:', error)
  }
}

const setupChartEvents = () => {
  if (!chartInstance) return

  chartInstance.off('mouseover')
  chartInstance.off('mouseout')
  chartInstance.off('click')

  chartInstance.on('mouseover', (params) => {
    const data = params.data
    if (!data) return

    tooltipData.value = {
      name: data.name,
      rank: data.rank,
      doctorCount: data.doctorCount,
      hospitalCount: data.hospitalCount,
      consultationCount: data.value,
      consultationRatio: data.consultationRatio,
      region: data.region,
      level: data.level,
      children: data.children
    }

    tooltipStyle.value = {
      left: params.event.offsetX + 20 + 'px',
      top: params.event.offsetY + 20 + 'px'
    }
    showTooltip.value = true
    selectedItem.value = data.name
  })

  chartInstance.on('mouseout', () => {
    showTooltip.value = false
    selectedItem.value = null
  })

  chartInstance.on('click', (params) => {
    const data = params.data
    if (!data || !data.children || data.children.length === 0) return

    currentLevel.value++
    breadcrumbList.value.push({
      name: data.name,
      level: currentLevel.value,
      data: data
    })

    drillDown(data.children, data.name)
    emit('drill-down', { level: currentLevel.value, data: data, name: data.name })
  })
}

const drillDown = (childrenData, parentName) => {
  if (!chartInstance || !childrenData) return

  chartInstance.setOption({
    series: [{ data: childrenData }]
  }, true)
}

const handleBreadcrumbClick = (index) => {
  if (index === breadcrumbList.value.length - 1) return

  const clickedItem = breadcrumbList.value[index]
  currentLevel.value = clickedItem.level
  breadcrumbList.value = breadcrumbList.value.slice(0, index + 1)

  if (index === 0) {
    initChart()
  } else {
    const parentData = clickedItem.data
    if (parentData && parentData.children) {
      drillDown(parentData.children, parentData.name)
    }
  }

  emit('breadcrumb-click', { level: index, data: clickedItem.data, name: clickedItem.name })
}

const handleRegionChange = (value) => {
  emit('region-change', value)
  nextTick(() => {
    setTimeout(() => initChart(), 50)
  })
}

const highlightItem = (name) => {
  if (!chartInstance || !name) return

  chartInstance.dispatchAction({
    type: 'highlight',
    seriesIndex: 0,
    name: name
  })

  setTimeout(() => {
    if (chartInstance) {
      chartInstance.dispatchAction({
        type: 'downplay',
        seriesIndex: 0
      })
    }
  }, 2000)
}

const handleResize = () => {
  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance.resize()
  }
}

watch(() => props.data, (newVal) => {
  if (newVal && newVal.length > 0 && isReady.value) {
    nextTick(() => {
      setTimeout(() => initChart(), 50)
    })
  }
}, { deep: true })

onMounted(() => {
  isReady.value = true
  nextTick(() => {
    setTimeout(() => initChart(), 150)
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)

  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance.dispose()
    chartInstance = null
  }

  isReady.value = false
})

defineExpose({
  refresh: () => {
    if (isReady.value) {
      nextTick(() => {
        setTimeout(() => initChart(), 50)
      })
    }
  },
  reset: () => {
    currentLevel.value = 0
    breadcrumbList.value = [{ name: '全部', level: 0, data: null }]
    selectedRegion.value = ''
    if (isReady.value) {
      nextTick(() => {
        setTimeout(() => initChart(), 50)
      })
    }
  }
})
</script>

<style scoped>
.disease-treemap-container {
  position: relative;
  width: 100%;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px;
  padding-bottom: 32px;
  box-sizing: border-box;
  overflow: visible;
}

.loading-placeholder {
  width: 100%;
  min-height: 700px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skeleton-content {
  width: 100%;
  padding: 24px;
}

.skeleton-title {
  height: 28px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 6px;
  margin-bottom: 24px;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  width: 220px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.skeleton-block {
  height: 140px;
  background: linear-gradient(90deg, #f5f5f5 25%, #e8e8e8 50%, #f5f5f5 75%);
  background-size: 200% 100%;
  border-radius: 8px;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.treemap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-item {
  font-size: 13px;
  color: #1890ff;
  cursor: pointer;
  transition: all 0.3s;
  padding: 5px 10px;
  border-radius: 6px;
  font-weight: 500;
}

.breadcrumb-item:hover {
  background: #e6f7ff;
  color: #096dd9;
}

.breadcrumb-item.active {
  color: #8c8c8c;
  cursor: default;
  font-weight: 600;
}

.separator {
  margin: 0 2px;
  color: #d9d9d9;
}

.treemap-main {
  display: flex;
  gap: 16px;
  overflow: visible;
}

.treemap-wrapper {
  flex: 1;
  min-height: 600px;
  position: relative;
  border-radius: 8px;
  overflow: visible;
  background: #fafafa;
}

.side-panel {
  width: 260px;
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e8e8e8;
}

.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 480px;
  overflow-y: auto;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid transparent;
}

.distribution-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.12);
  border-color: #bae7ff;
}

.distribution-item.active {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border-color: #1890ff;
  transform: translateX(4px);
}

.rank-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.rank-badge.rank-1 { background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%); }
.rank-badge.rank-2 { background: linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%); }
.rank-badge.rank-3 { background: linear-gradient(135deg, #cd7f32 0%, #b8860b 100%); }
.rank-badge:not(.rank-1):not(.rank-2):not(.rank-3) {
  background: #f0f0f0;
  color: #8c8c8c;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: #262626;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-value {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 2px;
}

.item-ratio {
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.treemap-legend {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 16px 20px;
  background: #fafafa;
  border-radius: 8px;
  gap: 24px;
}

.legend-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.legend-title {
  font-size: 12px;
  color: #8c8c8c;
  white-space: nowrap;
  font-weight: 500;
}

.legend-color-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gradient-bar {
  width: 160px;
  height: 10px;
  border-radius: 5px;
}

.ratio-gradient {
  background: linear-gradient(to right, #91cc75, #73c0de, #5470c6, #9a60b4, #ea7ccc, #fc8452, #ee6666, #c23531);
}

.legend-label {
  font-size: 11px;
  color: #bfbfbf;
}

.size-legend {
  display: flex;
  align-items: center;
  gap: 6px;
}

.size-legend span {
  font-size: 11px;
  color: #bfbfbf;
}

.size-item {
  border-radius: 3px;
  background: linear-gradient(135deg, #69c0ff 0%, #1890ff 100%);
}

.size-item.small { width: 16px; height: 12px; opacity: 0.5; }
.size-item.medium { width: 28px; height: 16px; opacity: 0.75; }
.size-item.large { width: 40px; height: 20px; opacity: 1; }

.region-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%);
  border-radius: 20px;
  border: 1px solid #bae7ff;
  transition: all 0.3s;
}

.stat-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.stat-region {
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
}

.stat-count {
  font-size: 13px;
  font-weight: 700;
  color: #262626;
}

.stat-percent {
  font-size: 11px;
  color: #8c8c8c;
  background: #fff;
  padding: 2px 6px;
  border-radius: 8px;
}

.treemap-tooltip {
  position: absolute;
  z-index: 99999;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  padding: 16px 20px;
  min-width: 260px;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.tooltip-icon {
  font-size: 18px;
}

.tooltip-level {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.highlight-row {
  background: linear-gradient(135deg, #fff7e6 0%, #fff1b8 100%);
  padding: 8px 12px;
  margin: 0 -8px;
  border-radius: 6px;
}

.tooltip-row .label {
  color: #8c8c8c;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tooltip-row .value {
  color: #262626;
  font-weight: 600;
}

.tooltip-row .value.highlight {
  font-size: 18px;
  font-weight: 800;
  color: #1890ff;
}

.ratio-bar {
  display: inline-block;
  height: 4px;
  background: linear-gradient(90deg, #52c41a, #faad14, #f5222d);
  border-radius: 2px;
  margin-right: 6px;
  vertical-align: middle;
  width: 60px;
  max-width: 80px;
}

.tooltip-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}

.rank-value.top { color: #f5222d; font-weight: 800; }
.rank-value.good { color: #fa8c16; font-weight: 700; }
.rank-value.normal { color: #8c8c8c; }

.region-tag {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  color: #1890ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.click-hint {
  color: #52c41a;
  font-size: 12px;
  font-weight: 600;
}
</style>
