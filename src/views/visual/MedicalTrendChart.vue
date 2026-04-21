<template>
  <div class="trend-chart-container" ref="chartContainer">
    <!-- 占位符 -->
    <div v-if="!isReady" class="chart-placeholder">
      <div class="placeholder-content">
        <div class="spinner"></div>
        <span>加载趋势数据...</span>
      </div>
    </div>

    <!-- ECharts 图表 -->
    <v-chart
      v-show="isReady"
      ref="chartRef"
      :option="mergedOption"
      :autoresize="false"
      @chart-ready="onChartReady"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 注册组件
use([
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer
])

// 类型定义
interface ContainerSize {
  width: number;
  height: number;
}

interface CustomOption {
  [key: string]: any;
}

interface Props {
  // X轴数据
  categories?: string[];
  // 系列数据（支持多系列）
  seriesData?: number[][];
  // 系列名称
  seriesNames?: string[];
  // 容器尺寸
  containerSize?: ContainerSize;
  // 自定义配置
  customOption?: CustomOption;
  // 防抖时间
  debounceMs?: number;
}

interface EmitEvents {
  (e: 'chart-ready', instance: echarts.ECharts): void;
  (e: 'resize', size: ContainerSize): void;
  (e: 'data-point-click', params: {
    seriesName: string;
    name: string;
    value: number;
    dataIndex: number;
    data: any;
  }): void;
}

// ============================
// Props
// ============================
const props = withDefaults(defineProps<Props>(), {
  // X轴数据
  categories: () => ['1日', '2日', '3日', '4日', '5日', '6日', '7日'],
  // 系列数据（支持多系列）
  seriesData: () => [[120, 180, 150, 210, 190, 230, 260]],
  // 系列名称
  seriesNames: () => ['门诊人数'],
  // 容器尺寸
  containerSize: () => ({ width: 0, height: 0 }),
  // 自定义配置
  customOption: () => ({}),
  // 防抖时间
  debounceMs: 300
})

const emit = defineEmits<EmitEvents>()

// ============================
// Refs
// ============================
const chartContainer = ref<HTMLElement | null>(null)
const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const isReady = ref<boolean>(true)

// ============================
// 响应式配置生成器
// ============================
function getResponsiveGrid() {
  const width = props.containerSize.width || 800
  
  return {
    left: width <= 768 ? '10%' : '3%',
    right: width <= 768 ? '5%' : '4%',
    top: width <= 375 ? '15%' : '12%',
    bottom: width <= 768 ? '15%' : '10%',
    containLabel: true
  }
}

function getResponsiveFontSize(base = 12) {
  const width = props.containerSize.width || 800
  
  if (width <= 375) return base - 2
  if (width <= 768) return base - 1
  if (width >= 1920) return base + 2
  if (width >= 2560) return base + 3
  
  return base
}

function getResponsiveLineWidth(width) {
  if (!width) width = props.containerSize.width || 800
  
  if (width <= 480) return 1.5
  if (width <= 768) return 2
  if (width >= 1920) return 3
  
  return 2.5
}

function shouldShowDataZoom() {
  const dataLength = Math.max(
    props.categories?.length || 0,
    ...props.seriesData.map(s => s?.length || 0)
  )
  
  return dataLength > 14  // 超过两周数据显示滚动条
}

// ============================
// 图表配置
// ============================
const baseOption = computed(() => ({
  backgroundColor: 'transparent',

  title: {
    show: false,
    text: '门诊趋势',
    textStyle: {
      color: '#4fc3ff',
      fontSize: 16,
      fontWeight: 'bold'
    },
    left: 'center',
    top: '5%'
  },

  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      crossStyle: {
        color: '#999'
      },
      lineStyle: {
        color: '#4fc3ff',
        type: 'dashed'
      }
    },
    backgroundColor: 'rgba(20, 30, 50, 0.95)',
    borderColor: '#4fc3ff',
    borderWidth: 1,
    textStyle: {
      color: '#fff',
      fontSize: 13
    },
    formatter: function(params) {
      let result = `<strong>${params[0].axisValue}</strong><br/>`
      
      params.forEach(item => {
        result += `${item.marker} ${item.seriesName}: <strong>${item.value}</strong><br/>`
      })
      
      return result
    }
  },

  legend: {
    data: props.seriesNames,
    bottom: 0,
    textStyle: {
      color: '#ccc',
      fontSize: getResponsiveFontSize(11)
    },
    icon: 'roundRect',
    itemWidth: 18,
    itemHeight: 8
  },

  grid: getResponsiveGrid(),

  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ensureDataConsistency(),
    axisLine: {
      lineStyle: {
        color: 'rgba(255,255,255,0.2)'
      }
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#aaa',
      fontSize: getResponsiveFontSize(11),
      interval: getResponsiveLabelInterval(),
      rotate: props.containerSize.width <= 480 ? 45 : 0
    },
    splitLine: {
      show: false
    }
  },

  yAxis: {
    type: 'value',
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#aaa',
      fontSize: getResponsiveFontSize(11),
      formatter: '{value}'
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255,255,255,0.08)',
        type: 'dashed'
      }
    }
  },

  dataZoom: shouldShowDataZoom() ? [{
    type: 'inside',
    start: 0,
    end: 100,
    zoomLock: true,
    throttle: 100
  }] : [],

  series: generateSeries(),

  responsive: true,
  animationDuration: 1000,
  animationEasing: 'cubicOut'
}))

// 合并自定义配置
const mergedOption = computed(() => ({
  ...baseOption.value,
  ...props.customOption
}))

// ============================
// 数据一致性保证
// ============================
function ensureDataConsistency() {
  const cats = props.categories || []
  const maxLen = cats.length

  return cats
}

function getResponsiveLabelInterval() {
  const width = props.containerSize.width || 800
  
  if (width <= 375) return 1          // 手机：每个都显示
  if (width <= 480) return 0         // 小屏：自动计算
  if (width <= 1024) return 1         // 平板：隔一个显示
  
  return 2                             // 桌面：隔两个显示
}

function generateSeries() {
  const colors = ['#4fc3f7', '#91cc75', '#fac858', '#ee6666', '#73c0de']
  
  return props.seriesData.map((data, index) => ({
    name: props.seriesNames[index] || `系列${index + 1}`,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: getResponsiveSymbolSize(),
    
    lineStyle: {
      width: getResponsiveLineWidth(),
      color: colors[index % colors.length],
      shadowColor: colors[index % colors.length],
      shadowBlur: 8,
      shadowOffsetY: 8
    },
    
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: `${colors[index % colors.length]}40` },
        { offset: 1, color: `${colors[index % colors.length]}05` }
      ])
    },
    
    emphasis: {
      focus: 'series',
      lineStyle: {
        width: 4
      }
    },
    
    data: ensureSeriesDataLength(data),
    
    animationDelay: idx => idx * 150
  }))
}

function ensureSeriesDataLength(data) {
  const catLen = (props.categories || []).length
  
  if (!Array.isArray(data)) return []
  
  // 如果数据长度与 x 轴不一致，截断或填充
  if (data.length > catLen) {
    return data.slice(0, catLen)
  }
  
  if (data.length < catLen) {
    return [...data, ...new Array(catLen - data.length).fill(null)]
  }
  
  return data
}

function getResponsiveSymbolSize() {
  const width = props.containerSize.width || 800
  
  if (width <= 375) return 4
  if (width <= 768) return 5
  if (width >= 1920) return 8
  
  return 6
}

// ============================
// Resize 监听
// ============================
let resizeHandler = null
let debounceTimer = null

function setupResizeListener() {
  cleanup()

  // 使用 ResizeObserver（优先）
  if (window.ResizeObserver && chartContainer.value) {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        handleResize(entry.contentRect)
      }
    })

    observer.observe(chartContainer.value)
    
    resizeHandler = { type: 'observer', instance: observer }
    console.log('[MedicalTrendChart] ResizeObserver attached')
  } else {
    // Fallback: window.resize
    resizeHandler = {
      type: 'window',
      fn: () => handleResize(chartContainer.value?.getBoundingClientRect())
    }
    
    window.addEventListener('resize', resizeHandler.fn, { passive: true })
    console.log('[MedicalTrendChart] Window resize listener attached')
  }
}

function handleResize(contentRect) {
  if (debounceTimer) clearTimeout(debounceTimer)

  debounceTimer = setTimeout(() => {
    const { width, height } = contentRect
    
    if (width > 0 && height > 0) {
      emit('resize', { width, height })
      
      console.log(`[MedicalTrendChart] Resized to ${width}x${height}`)
    }
  }, props.debounceMs)
}

function cleanup() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (resizeHandler) {
    if (resizeHandler.type === 'observer') {
      resizeHandler.instance.disconnect()
    } else if (resizeHandler.type === 'window') {
      window.removeEventListener('resize', resizeHandler.fn)
    }
    
    resizeHandler = null
  }
}

// ============================
// 事件处理
// ============================
function onChartReady(instance) {
  isReady.value = true
  console.log('[MedicalTrendChart] Chart ready')
  
  emit('chart-ready', instance)
  
  // 绑定点击事件
  instance.on('click', handleDataPointClick)
}

function handleDataPointClick(params) {
  if (params.componentType === 'series') {
    emit('data-point-click', {
      seriesName: params.seriesName,
      name: params.name,
      value: params.value,
      dataIndex: params.dataIndex,
      data: params.data
    })
  }
}

// ============================
// Watchers
// ============================
watch(() => props.containerSize, (newSize) => {
  if (newSize?.width > 0) {
    // 响应式调整
    baseOption.value.grid = getResponsiveGrid()
    baseOption.value.xAxis.axisLabel.fontSize = getResponsiveFontSize(11)
    baseOption.value.xAxis.axisLabel.rotate = newSize.width <= 480 ? 45 : 0
    baseOption.value.yAxis.axisLabel.fontSize = getResponsiveFontSize(11)
    
    console.log('[MedicalTrendChart] Container size updated:', newSize)
  }
}, { deep: true })

watch([() => props.categories, () => props.seriesData], () => {
  if (isReady.value) {
    baseOption.value.xAxis.data = ensureDataConsistency()
    baseOption.value.series = generateSeries()
    
    console.log('[MedicalTrendChart] Data updated')
  }
}, { deep: true, immediate: false })

// ============================
// 生命周期
// ============================
onMounted(() => {
  setupResizeListener()
  
  // 初始尺寸检测
  setTimeout(() => {
    if (chartContainer.value) {
      handleResize(chartContainer.value.getBoundingClientRect())
    }
  }, 100)
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped lang="less">
.trend-chart-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  flex: 1;
  display: flex;
  flex-direction: column;

  .chart-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    
    display: flex;
    align-items: center;
    justify-content: center;
    
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    
    .placeholder-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      
      .spinner {
        width: 32px;
        height: 32px;
        
        border: 3px solid rgba(79, 195, 255, 0.2);
        border-top-color: #4fc3ff;
        border-radius: 50%;
        
        animation: spin 0.8s linear infinite;
      }
      
      span {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
      }
    }
  }
}

/* ECharts 容器 */
.trend-chart-container :deep(.echarts) {
  width: 100% !important;
  height: 100% !important;
  min-height: 350px !important;
}

.trend-chart-container :deep(.echarts) canvas {
  width: 100% !important;
  height: 100% !important;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .trend-chart-container {
    min-height: 250px;
    
    .placeholder-content span {
      font-size: 12px;
    }
  }
}

@media (max-width: 480px) {
  .trend-chart-container {
    min-height: 220px;
  }
}

@media (min-width: 1920px) {
  .trend-chart-container {
    min-height: 400px;
  }
}
</style>
