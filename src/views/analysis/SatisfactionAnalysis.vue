<template>
  <div class="satisfaction-wrapper">
    <div class="page-header">
      <h2 class="page-title">⭐ 满意度分析</h2>
    </div>
    
    <a-spin :spinning="loading">
      <a-card class="chart-card" title="各满意度等级平均咨询价格">
        <div class="chart-container">
          <v-chart :option="barChartOption" :autoresize="true" />
        </div>
      </a-card>

      <a-card class="table-card" title="📋 满意度详细数据">
        <a-table :dataSource="tableData" :columns="columns" :pagination="false" :loading="loading" rowKey="level" />
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dataAPI from '../../api/data'

use([BarChart, TooltipComponent, GridComponent, CanvasRenderer])

const loading = ref(false)
const tableData = ref<any[]>([])

const columns = [
  { title: '满意度等级', dataIndex: 'label', key: 'label' },
  { title: '医生数量', dataIndex: 'doctor_count', key: 'doctor_count' },
  { title: '占比(%)', dataIndex: 'doctor_ratio', key: 'doctor_ratio' },
  { title: '平均咨询价格(元)', dataIndex: 'avg_consultation_price', key: 'avg_consultation_price' }
]

const levelColors: Record<number, string> = {
  5: '#52c41a',
  4: '#73d13d',
  3: '#faad14',
  2: '#ff7a45',
  1: '#ff4d4f'
}

const levelLabels: Record<number, string> = {
  5: '★★★★★',
  4: '★★★★',
  3: '★★★',
  2: '★★',
  1: '★'
}

const barChartOption = reactive({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: [] as string[] },
  yAxis: { type: 'value', name: '价格(元)' },
  series: [{
    name: '平均咨询价格',
    type: 'bar',
    barWidth: '50%',
    data: [] as any[],
    itemStyle: { borderRadius: [8, 8, 0, 0] },
    label: { show: true, position: 'top', formatter: '¥{c}' }
  }]
})

const applyChartData = (data: any[]) => {
  const labels = data.map(d => d.label)
  const values = data.map(d => d.avg_consultation_price)
  const colors = data.map(d => levelColors[d.level] || '#5470c6')

  barChartOption.xAxis.data = labels
  barChartOption.series[0].data = values.map((v, i) => ({
    value: v,
    itemStyle: { color: colors[i] }
  }))
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await dataAPI.getSatisfactionAnalysis()

    // 兼容: data = { list } / data = [] / data = { data: { list } }
    const payload = res?.data?.data || res?.data || {}
    const list = Array.isArray(payload?.list)
      ? payload.list
      : Array.isArray(payload)
        ? payload
        : []

    if (res?.success && list.length > 0) {
      const processedData = list.map((item: any) => ({
        level: item.satisfaction_level,
        label: levelLabels[item.satisfaction_level] || `${item.satisfaction_level}星`,
        doctor_count: item.doctor_count || 0,
        doctor_ratio: item.doctor_ratio || 0,
        avg_consultation_price: item.avg_consultation_price || 0
      })).sort((a, b) => b.level - a.level)

      tableData.value = processedData
      applyChartData(processedData)
    } else {
      tableData.value = []
      applyChartData([])
      message.info('暂无数据')
    }
  } catch (error) {
    console.error('[SatisfactionAnalysis] 加载失败:', error)
    message.error('数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.satisfaction-wrapper { padding: 16px; background: #f0f2f5; min-height: 100vh; }
.page-header { margin-bottom: 20px; }
.page-title { margin: 0; font-size: 18px; padding: 16px 20px; background: #fff; border-radius: 8px; }
.chart-card, .table-card { border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px; background: #fff; }
.chart-container { height: 350px; }
</style>
