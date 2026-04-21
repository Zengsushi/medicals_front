<template>
  <div class="doctor-title-chart">
    <a-spin :spinning="loading">
      <a-card title="👨‍⚕️ 医生职称分布" class="chart-card">
        <template #extra>
          <a-button type="primary" @click="loadData" :loading="loading"><template #icon><ReloadOutlined /></template>刷新</a-button>
        </template>
        <div class="chart-container"><v-chart ref="chartRef" :option="chartOption" :autoresize="true" /></div>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GraphicComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dataAPI from '../../api/data'

use([PieChart, TooltipComponent, LegendComponent, GraphicComponent, CanvasRenderer])

const TITLE_COLORS: Record<string, string> = {
  '主任医师': '#1e3a8a', '副主任医师': '#60a5fa',
  '主治医师': '#22c55e', '其他': '#9ca3af'
}

const loading = ref(false)
const chartRef = ref()
const chartData = ref<any[]>([])
const totalDoctors = computed(() => chartData.value.reduce((sum: number, item: any) => sum + item.doctor_count, 0))

const chartOption = reactive({
  tooltip: { trigger: 'item', formatter: (params: any) => `<b>${params.data.title}</b><br/>医生数: ${params.data.doctor_count}<br/>占比: ${params.data.doctor_ratio}%` },
  legend: { orient: 'vertical', left: 'left', selectedMode: 'single' },
  graphic: [{ type: 'group', left: 'center', top: 'middle', children: [
    { type: 'text', style: { text: '0', fontSize: 28, fontWeight: 'bold', fill: '#333' } },
    { type: 'text', top: 30, style: { text: '采集医生', fontSize: 14, fill: '#666' } }
  ]}],
  series: [{
    name: '医生职称分布', type: 'pie', radius: ['35%', '65%'], center: ['50%', '50%'],
    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
    label: { show: true, position: 'outside', formatter: '{b}\n{d}%' },
    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' }, label: { fontSize: 14, fontWeight: 'bold' } },
    data: [] as any[]
  }]
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await dataAPI.getDoctorTitleAnalysis()
    if (res.success && Array.isArray(res.data)) {
      chartData.value = res.data.map((item: any) => ({
        title: item.doctor_title, name: item.doctor_title,
        value: item.doctor_count, doctor_count: item.doctor_count,
        doctor_ratio: item.doctor_ratio, avg_price: item.avg_consultation_price,
        itemStyle: { color: TITLE_COLORS[item.doctor_title] || '#9ca3af' }
      }))
      chartOption.series[0].data = chartData.value
      if (chartOption.graphic?.[0]?.children?.[0]) {
        chartOption.graphic[0].children[0].style.text = totalDoctors.value.toLocaleString()
      }
    }
  } catch (error) { console.error('加载失败:', error) }
  finally { loading.value = false }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.doctor-title-chart { height: 100%; }
.chart-card { height: 100%; }
.chart-card :deep(.ant-card-body) { height: calc(100% - 57px); padding: 16px; }
.chart-container { height: 100%; min-height: 500px; }
</style>
