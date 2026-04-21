<template>
  <div class="region-wrapper">
    <a-spin :spinning="loading">
      <div class="page-header">
        <h2 class="page-title">🌍 区域医疗资源分布</h2>
        <a-button type="primary" @click="loadData">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>

      <a-row :gutter="16">
        <a-col :span="24">
          <a-card title="各省市医院数量排名" class="chart-card">
            <div class="chart-container-bar"><v-chart ref="barChartRef" :option="barOption" :autoresize="true" /></div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="16" style="margin-top: 16px;">
        <a-col :span="12">
          <a-card title="区域分布占比" class="chart-card">
            <div class="chart-container-pie"><v-chart ref="pieChartRef" :option="pieOption" :autoresize="true" /></div>
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card title="区域资源排行榜" class="chart-card">
            <div class="rank-list">
              <div v-for="(item, index) in topRegions" :key="item.name" class="rank-item">
                <span class="rank-num" :class="{ gold: index === 0, silver: index === 1, bronze: index === 2 }">{{ index + 1 }}</span>
                <span class="rank-name">{{ item.name }}</span>
                <span class="rank-value">{{ item.value?.toLocaleString() || '-' }}</span>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="16" style="margin-top: 16px;">
        <a-col :span="24">
          <a-card title="📋 详细数据表" class="detail-card">
            <a-table
              :columns="columns"
              :data-source="tableData"
              :loading="loading"
              :pagination="{ pageSize: 10 }"
              row-key="name"
            >
              <template #bodyCell="{ column, text, record }">
                <template v-if="column.dataIndex === 'value' || column.dataIndex === 'doctorCount'">
                  {{ text != null ? Number(text).toLocaleString() : '-' }}
                </template>
                <template v-if="column.dataIndex === 'rank'">
                  <a-tag :color="getRankColor(record._rank)">{{ record._rank }}</a-tag>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dataAPI from '../../api/data'

use([BarChart, PieChart, LineChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

const loading = ref(false)
const barChartRef = ref()
const pieChartRef = ref()

const rawData = ref<any[]>([])

const COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ad46c4', '#ffb6c1', '#dda0dd']

const barOption = reactive({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '10%', top: '5%', containLabel: true },
  xAxis: { type: 'category', data: [] as string[], axisLabel: { rotate: 30, fontSize: 10 } },
  yAxis: { type: 'value', name: '医院数量' },
  series: [{
    name: '医院数量',
    type: 'bar',
    data: [] as number[],
    itemStyle: {
      color: (params: any) => COLORS[params.dataIndex % COLORS.length],
      borderRadius: [4, 4, 0, 0]
    },
    label: { show: true, position: 'top', fontSize: 9, formatter: '{c}' }
  }]
})

const pieOption = reactive({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '2%', top: 'center', textStyle: { fontSize: 10 } },
  series: [{
    name: '区域分布',
    type: 'pie',
    radius: ['30%', '60%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: true,
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 9 },
    labelLine: { show: true, length: 8, length2: 5 },
    data: [] as any[]
  }]
})

const columns = [
  { title: '排名', dataIndex: 'rank', width: 80 },
  { title: '城市', dataIndex: 'name', width: 150 },
  { title: '医院数量', dataIndex: 'value', sorter: (a: any, b: any) => a.value - b.value },
  { title: '医生数量', dataIndex: 'doctorCount', width: 120, sorter: (a: any, b: any) => a.doctorCount - b.doctorCount }
]

const tableData = computed(() => {
  return rawData.value.map((item, index) => ({
    ...item,
    _rank: index + 1,
    doctorCount: item.doctorCount ?? 0
  }))
})

const topRegions = computed(() => {
  return rawData.value.slice(0, 10).map((item, index) => ({
    ...item,
    _rank: index + 1
  }))
})

const getRankColor = (rank: number) => {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return 'default'
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await dataAPI.getRegionMedicalResource({ limit: 15 })
    const list = res?.success ? (res.data?.list || res.data?.data?.list || []) : []
    if (list.length > 0) {
      rawData.value = list
        .map((item: any) => ({
          name: item.city || item.region || item.area || '未知',
          value: Number(item.hospital_count ?? item.hospitalCount ?? 0),
          doctorCount: Number(item.doctor_count ?? item.doctorCount ?? 0)
        }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 15)
      const reversed = [...rawData.value].reverse()
      barOption.xAxis.data = reversed.map((item: any) => item.name)
      barOption.series[0].data = reversed.map((item: any) => item.value)
      pieOption.series[0].data = rawData.value.slice(0, 8).map((item: any, index: number) => ({
        name: item.name,
        value: item.value,
        itemStyle: { color: COLORS[index % COLORS.length] }
      }))
    } else {
      rawData.value = []
      barOption.xAxis.data = []
      barOption.series[0].data = []
      pieOption.series[0].data = []
    }
  } catch (error) {
    console.error('加载失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.region-wrapper { padding: 16px; background: linear-gradient(135deg, #e0f7fa 0%, #f5f7fa 50%, #e8f5e9 100%); min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #fff; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.page-title { margin: 0; font-size: 18px; background: linear-gradient(135deg, #00bcd4, #4dd0e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.chart-card { border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 184, 148, 0.1); background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%); }
.detail-card { border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 184, 148, 0.1); background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%); }
.chart-container-bar { height: 380px; }
.chart-container-pie { height: 320px; }
.rank-list { max-height: 320px; overflow-y: auto; }
.rank-item { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border-bottom: 1px solid #f0f0f0; transition: all 0.2s; }
.rank-item:hover { background: #f5f5f5; border-radius: 6px; }
.rank-num { width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background: #f0f0f0; color: #666; font-size: 12px; font-weight: bold; }
.rank-num.gold { background: linear-gradient(135deg, #ffd700, #ffb347); color: #fff; }
.rank-num.silver { background: linear-gradient(135deg, #c0c0c0, #e0e0e0); color: #fff; }
.rank-num.bronze { background: linear-gradient(135deg, #cd7f32, #daa520); color: #fff; }
.rank-name { flex: 1; font-weight: 500; color: #333; }
.rank-value { font-weight: bold; color: #00bcd4; font-size: 14px; }
</style>
