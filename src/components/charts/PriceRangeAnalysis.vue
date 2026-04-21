<template>
  <div class="price-range-analysis">
    <div class="chart-header">
      <h3>价格区间分析</h3>
    </div>

    <div class="summary-cards">
      <div class="card">
        <div class="card-icon doctor">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div class="card-content">
          <span class="label">采集医生</span>
          <span class="value">{{ totalDoctors.toLocaleString() }}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-icon star">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </div>
        <div class="card-content">
          <span class="label">平均评分</span>
          <span class="value">{{ avgStar.toFixed(2) }}<span class="unit">星</span></span>
        </div>
      </div>
      <div class="card">
        <div class="card-icon range">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
          </svg>
        </div>
        <div class="card-content">
          <span class="label">价格区间数</span>
          <span class="value">{{ chartData.length }}</span>
        </div>
      </div>
    </div>

    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useECharts } from '@/composables/useECharts'

interface PriceRangeData {
  price_range: string
  doctor_count: number
  doctor_ratio: number
  avg_recommendation_star: number
}

const props = defineProps<{
  data: PriceRangeData[]
}>()

const chartRef = ref<HTMLElement | null>(null)
const { setOption, resize } = useECharts(chartRef)

const chartData = computed(() => props.data || [])

const totalDoctors = computed(() => {
  return chartData.value.reduce((sum, item) => sum + item.doctor_count, 0)
})

const avgStar = computed(() => {
  if (chartData.value.length === 0) return 0
  let total = 0
  let count = 0
  chartData.value.forEach(item => {
    total += item.avg_recommendation_star * item.doctor_count
    count += item.doctor_count
  })
  return count > 0 ? total / count : 0
})

const getBarColor = (params: any) => {
  const dataLength = chartData.value.length
  const index = params.dataIndex

  if (dataLength <= 1) return '#3b82f6'

  const ratio = index / (dataLength - 1)
  const r = Math.round(59 + (245 - 59) * ratio)
  const g = Math.round(130 + (108 - 130) * ratio)
  const b = Math.round(246 + (110 - 246) * ratio)

  return `rgb(${r}, ${g}, ${b})`
}

const initChart = () => {
  if (!chartRef.value || chartData.value.length === 0) return

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999'
        }
      },
      formatter: (params: any) => {
        if (!Array(params) || params.length === 0) return ''

        const barParam = params.find((p: any) => p.seriesType === 'bar')
        const lineParam = params.find((p: any) => p.seriesType === 'line')

        if (!barParam && !lineParam) return ''

        const dataItem = chartData.value[barParam?.dataIndex ?? lineParam?.dataIndex]
        if (!dataItem) return ''

        let html = `<div style="padding: 8px; min-width: 200px;">`
        html += `<div style="font-weight: bold; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">`
        html += `${dataItem.price_range}</div>`

        if (barParam) {
          html += `<div style="display: flex; justify-content: space-between; margin: 5px 0;">`
          html += `<span style="color: #666;">医生数量：</span>`
          html += `<span style="font-weight: 600; color: #333;">${barParam.value.toLocaleString()} 人</span></div>`

          html += `<div style="display: flex; justify-content: space-between; margin: 5px 0;">`
          html += `<span style="color: #666;">占比：</span>`
          html += `<span style="font-weight: 600; color: #333;">${(dataItem.doctor_ratio * 100).toFixed(2)}%</span></div>`
        }

        if (lineParam) {
          html += `<div style="display: flex; justify-content: space-between; margin: 5px 0;">`
          html += `<span style="color: #666;">平均评分：</span>`
          html += `<span style="font-weight: 600; color: #f59e0b;">${lineParam.value.toFixed(2)} 星</span></div>`
        }

        html += '</div>'
        return html
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#333'
      }
    },
    legend: {
      data: ['医生数量', '平均评分'],
      top: 10,
      right: 20,
      textStyle: {
        color: '#666'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: chartData.value.map(item => item.price_range),
        axisPointer: {
          type: 'shadow'
        },
        axisLabel: {
          rotate: chartData.value.length > 6 ? 30 : 0,
          fontSize: 12,
          color: '#666',
          interval: 0
        },
        axisLine: {
          lineStyle: {
            color: '#d1d5db'
          }
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '医生数量',
        nameTextStyle: {
          color: '#666',
          padding: [0, 0, 0, 10]
        },
        axisLabel: {
          formatter: '{value}',
          color: '#666'
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
        name: '平均评分 (星)',
        nameTextStyle: {
          color: '#666',
          padding: [0, 0, 0, 10]
        },
        min: 0,
        max: 5,
        interval: 1,
        axisLabel: {
          formatter: '{value}',
          color: '#666'
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
        show: chartData.value.length > 8,
        type: 'slider',
        bottom: 5,
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
        start: 0,
        end: 100
      }
    ],
    series: [
      {
        name: '医生数量',
        type: 'bar',
        yAxisIndex: 0,
        data: chartData.value.map(item => item.doctor_count),
        barWidth: chartData.value.length > 8 ? '40%' : '50%',
        itemStyle: {
          color: getBarColor,
          borderRadius: [4, 4, 0, 0],
          shadowBlur: 5,
          shadowColor: 'rgba(0, 0, 0, 0.1)',
          shadowOffsetX: 0,
          shadowOffsetY: 2
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          }
        },
        animationDelay: (idx: number) => idx * 80,
        animationDuration: 800,
        animationEasing: 'elasticOut'
      },
      {
        name: '平均评分',
        type: 'line',
        yAxisIndex: 1,
        data: chartData.value.map(item => item.avg_recommendation_star),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: '#f59e0b',
          shadowBlur: 5,
          shadowColor: 'rgba(245, 158, 11, 0.3)'
        },
        itemStyle: {
          color: '#f59e0b',
          borderWidth: 2,
          borderColor: '#fff'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0.02)' }
          ])
        },
        emphasis: {
          scale: true,
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(245, 158, 11, 0.5)'
          }
        },
        animationDelay: (idx: number) => idx * 80 + 300,
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      }
    ],
    animation: true,
    animationThreshold: 2000,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  }

  setOption(option)
}

watch(() => props.data, () => {
  initChart()
}, { deep: true, immediate: true })

onMounted(() => {
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
})
</script>

<style scoped lang="scss">
.price-range-analysis {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  }
}

.chart-header {
  margin-bottom: 24px;

  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: -0.01em;
  }
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  cursor: default;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #d1d5db;
  }

  .card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 10px;
    flex-shrink: 0;

    svg {
      width: 26px;
      height: 26px;
    }

    &.doctor {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #2563eb;
    }

    &.star {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #d97706;
    }

    &.range {
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
      color: #059669;
    }
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .label {
      font-size: 13px;
      color: #6b7280;
      font-weight: 500;
    }

    .value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
      display: flex;
      align-items: baseline;
      gap: 4px;

      .unit {
        font-size: 13px;
        font-weight: 500;
        color: #6b7280;
      }
    }
  }
}

.chart-container {
  width: 100%;
  height: 450px;
  position: relative;

  @media (max-width: 1200px) {
    height: 400px;
  }

  @media (max-width: 768px) {
    height: 350px;
  }
}

@media (max-width: 640px) {
  .price-range-analysis {
    padding: 16px;
  }

  .summary-cards {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .card {
    padding: 14px 16px;

    .card-icon {
      width: 42px;
      height: 42px;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .card-content .value {
      font-size: 20px;
    }
  }

  .chart-container {
    height: 320px;
  }
}
</style>
