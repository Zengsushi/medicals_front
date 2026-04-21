<template>
  <div class="price-wrapper">
    <a-spin :spinning="loading"><div class="page-header"><h2 class="page-title">💰 价格区间分析</h2></div>
      <a-card class="chart-card"><div class="chart-container"><v-chart ref="chartRef" :option="chartOption" :autoresize="true" /></div></a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dataAPI from '../../api/data'

use([BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

const loading = ref(false)
const chartOption = reactive({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: [] as string[] },
  yAxis: { type: 'value' },
  series: [{ name: '问诊量', type: 'bar', data: [] as number[] }]
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await dataAPI.getPriceRangeAnalysis({ pageSize: 20 })
    const list = res?.success ? (res.data?.list || res.data?.data?.list || []) : []
    if (list.length > 0) {
      chartOption.xAxis.data = list.map((item: any) => item.price_range || '未知区间')
      chartOption.series[0].data = list.map((item: any) => Number(item.consultation_count || 0))
    } else {
      chartOption.xAxis.data = []
      chartOption.series[0].data = []
    }
  } catch (error) { console.error('加载失败:', error) }
  finally { loading.value = false }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.price-wrapper { padding: 16px; background: #f0f2f5; min-height: 100vh; }
.page-title { margin: 0; font-size: 18px; margin-bottom: 20px; padding: 16px 20px; background: #fff; border-radius: 8px; }
.chart-card { border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.chart-container { height: 400px; }
</style>
