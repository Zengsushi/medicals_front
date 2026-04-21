<template>
  <Transition name="chart-fade" appear @after-enter="onTransitionComplete">
    <div 
      class="pie-chart-wrapper"
      ref="chartContainer"
      :aria-label="`饼图统计: ${data.length} 项数据`"
      role="img"
    >
      <!-- 占位符：防止 layout shift -->
      <div v-if="!isReady" class="chart-placeholder">
        <div class="placeholder-content">
          <div class="spinner"></div>
          <span>加载图表...</span>
        </div>
      </div>

      <!-- ECharts 图表 -->
      <v-chart
        v-show="isReady"
        ref="chartRef"
        :option="mergedOption"
        :autoresize="false"
        :update-options="{ notMerge: false }"
        @chart-ready="onChartReady"
        @click="handleChartClick"
      />

      <!-- 装饰性光晕 -->
      <div class="chart-glow" aria-hidden="true"></div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { use } from 'echarts/core'
import { PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 注册必要的组件
use([
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer
])

// ============================
// Props 定义
// ============================
interface Props {
  data?: Array<{ value: number; name: string }>
  containerSize?: { width: number; height: number }
  customOption?: Record<string, any>
  debounceMs?: number
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [
    { value: 320, name: '内科' },
    { value: 240, name: '外科' },
    { value: 180, name: '儿科' },
    { value: 120, name: '急诊' }
  ],
  containerSize: () => ({ width: 0, height: 0 }),
  customOption: () => ({}),
  debounceMs: 300
})

const emit = defineEmits<{
  (e: 'chart-ready', instance: any): void
  (e: 'resize', size: { width: number; height: number }): void
  (e: 'error', error: Error): void
  (e: 'click', params: any): void
}>()

// ============================
// Refs & State
// ============================
const chartContainer = ref<HTMLDivElement | null>(null)
const chartRef = ref<any>(null)
const isReady = ref(true)
const isAnimating = ref(false)
const isUnmounting = ref(false)

// ============================
// 动画配置检测
// ============================
function shouldAnimate(): boolean {
  if (typeof window === 'undefined') return true
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ============================
// 图表配置（带增强动画）
// ============================
const baseOption = computed(() => {
  const animate = shouldAnimate()
  
  return {
    animation: animate,
    animationDuration: 1200,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicInOut',
    animationDurationUpdate: 500,
    
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      backgroundColor: 'rgba(50, 50, 50, 0.95)',
      borderColor: '#4fc3ff',
      borderWidth: 1,
      borderRadius: 8,
      padding: [10, 14],
      textStyle: {
        color: '#fff',
        fontSize: 13
      },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.3);'
    },

    legend: {
      bottom: 0,
      left: 'center',
      textStyle: {
        color: '#ccc',
        fontSize: 12
      },
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
      itemGap: 16,
      animationDelay: (idx: number) => idx * 80
    },

    series: [
      {
        type: 'pie',
        radius: getResponsiveRadius(),
        center: ['50%', '45%'],
        
        label: {
          show: true,
          color: '#ddd',
          fontSize: getResponsiveFontSize(),
          formatter: '{b}\n{d}%',
          animationDelay: (idx: number) => idx * 100 + 200
        },

        labelLine: {
          length: 10,
          length2: 15,
          lineStyle: {
            color: 'rgba(255,255,255,0.3)',
            animationDelay: (idx: number) => idx * 100 + 200
          }
        },

        emphasis: {
          label: {
            show: true,
            fontSize: getResponsiveFontSize(14),
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowColor: 'rgba(79, 195, 255, 0.5)'
          }
        },

        itemStyle: {
          borderRadius: 6,
          borderColor: 'rgba(255,255,255,0.3)',
          borderWidth: 2
        },

        data: props.data,

        // 增强的饼图动画配置
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: function (idx: number) {
          return idx * 120
        },
        
        // 平滑过渡效果
        universalTransition: {
          enabled: true,
          divideShape: 'clone'
        }
      }
    ],

    color: [
      '#4fc3f7', '#5cd9a8', '#ffd93d', '#ff6b8a',
      '#a78bfa', '#f97316', '#06b6d4', '#ec4899'
    ]
  }
})

// 合并自定义配置
const mergedOption = computed(() => ({
  ...baseOption.value,
  ...props.customOption
}))

// ============================
// 响应式配置计算
// ============================
function getResponsiveRadius(): [string, string] {
  const width = props.containerSize.width || 400
  
  if (width <= 375) return ['30%', '55%']
  if (width <= 768) return ['35%', '65%']
  if (width <= 1024) return ['38%', '68%']
  
  return ['40%', '70%']
}

function getResponsiveFontSize(baseSize = 12): number {
  const width = props.containerSize.width || 400
  
  if (width <= 375) return baseSize - 2
  if (width <= 768) return baseSize
  if (width >= 1920) return baseSize + 2
  
  return baseSize
}

// ============================
// ResizeObserver & 生命周期
// ============================
let resizeObserver: ResizeObserver | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function setupResizeObserver() {
  if (!chartContainer.value || typeof window === 'undefined') return

  resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      handleResize(entry.contentRect)
    }
  })

  resizeObserver.observe(chartContainer.value)
}

function handleResize(contentRect: DOMRectReadOnly) {
  const { width, height } = contentRect

  if (debounceTimer) clearTimeout(debounceTimer)

  debounceTimer = setTimeout(() => {
    if (width > 0 && height > 0) {
      emit('resize', { width, height })
      
      // 平滑调整图表尺寸
      if (chartRef.value?.chart) {
        chartRef.value.chart.resize({
          animation: {
            duration: 300,
            easing: 'cubicInOut'
          }
        })
      }
    }
  }, props.debounceMs)
}

function cleanup() {
  isUnmounting.value = true

  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

// ============================
// 事件处理
// ============================
function onChartReady(instance: any) {
  isReady.value = true
  emit('chart-ready', instance)
  
  // 触发进入动画完成
  setTimeout(() => {
    isAnimating.value = false
  }, 1500)
}

function handleChartClick(params: any) {
  emit('click', params)
}

function onTransitionComplete(el: Element) {
  isAnimating.value = false
}

// ============================
// 监听 Props 变化（带平滑过渡）
// ============================
watch(
  () => props.data,
  (newData, oldData) => {
    if (isUnmounting.value) return

    if (newData && isReady.value && chartRef.value?.chart) {
      isAnimating.value = true
      
      // 使用 setOption 的 update 模式实现平滑过渡
      if (!isUnmounting.value && chartRef.value?.chart) {
        chartRef.value.chart.setOption(
          {
            series: [{
              data: newData
            }]
          },
          {
            notMerge: false,
            lazyUpdate: true,
            silent: false
          }
        )
      }
      
      // 动画结束后标记完成
      setTimeout(() => {
        if (!isUnmounting.value) {
          isAnimating.value = false
        }
      }, 600)
    }
  },
  { deep: true }
)

watch(
  () => props.containerSize,
  (newSize, oldSize) => {
    if (newSize && (newSize.width !== oldSize?.width || newSize.height !== oldSize?.height)) {
      baseOption.value.series[0].radius = getResponsiveRadius()
      baseOption.value.series[0].label.fontSize = getResponsiveFontSize()
    }
  },
  { deep: true, immediate: false }
)

// ============================
// 生命周期钩子
// ============================
onMounted(() => {
  setupResizeObserver()
  
  if (chartContainer.value) {
    const rect = chartContainer.value.getBoundingClientRect()
    handleResize(rect)
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped lang="less">
.pie-chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: var(--radius-panel, 14px);
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  
  /* 占位符样式 */
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
    border-radius: var(--radius-panel, 14px);
    
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
        color: rgba(255, 255, 255, 0.5);
      }
    }
  }

  /* 装饰性光晕 - 暂时禁用防止重叠 */
  .chart-glow {
    display: none;
    position: absolute;
    bottom: -30%;
    left: 50%;
    transform: translateX(-50%);
    width: 70%;
    height: 60%;
    background: radial-gradient(
      ellipse at center bottom,
      rgba(79, 195, 255, 0.08) 0%,
      transparent 70%
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.5s ease;
    z-index: 0;
  }

  &:hover .chart-glow {
    opacity: 1;
  }
}

/* ========================================
   Chart Enter/Exit Animation
   ======================================== */

.chart-fade-enter-active {
  animation: chartFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.chart-fade-leave-active {
  animation: chartFadeOut 0.4s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}

@keyframes chartFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(15px);
    filter: blur(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

@keyframes chartFadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* 加载旋转 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ========================================
   Reduced Motion Support
   ======================================== */

@media (prefers-reduced-motion: reduce) {
  .pie-chart-wrapper {
    .chart-glow {
      display: none;
    }
  }

  .chart-fade-enter-active,
  .chart-fade-leave-active {
    animation: none !important;
    transition: opacity 0.01ms !important;
  }

  .placeholder-content .spinner {
    animation: none;
    border-color: rgba(79, 195, 255, 0.3);
  }
}

/* ========================================
   Responsive Adjustments
   ======================================== */

/* ECharts 容器 */
.pie-chart-wrapper :deep(.echarts) {
  width: 100% !important;
  height: 100% !important;
  min-height: 350px !important;
}

.pie-chart-wrapper :deep(.echarts) canvas {
  width: 100% !important;
  height: 100% !important;
}

@media (max-width: 768px) {
  .pie-chart-wrapper {
    min-height: 350px;
  }
}
</style>
