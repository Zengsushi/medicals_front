<template>
  <div class="title-wrapper">
    <a-spin :spinning="loading">
      <div class="page-header">
        <h2 class="page-title">👨‍⚕️ 医护人员结构分析</h2>
        <a-button type="primary" @click="loadData">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>

      <a-row :gutter="16">
        <a-col :span="24">
          <a-card title="🏥 科室服务分布" class="chart-card">
            <div class="chart-container-dept"><v-chart ref="deptChartRef" :option="deptOption" :autoresize="true" /></div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="16" style="margin-top: 16px;">
        <a-col :span="24">
          <a-card title="👨‍⚕️ 医生职称分布" class="chart-card">
            <div class="chart-container-title"><v-chart ref="titleChartRef" :option="titleOption" :autoresize="true" /></div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="16" style="margin-top: 16px;">
        <a-col :span="24">
          <a-card title="详细数据统计" class="detail-card">
            <a-table
              :columns="columns"
              :data-source="detailData"
              :loading="loading"
              :pagination="{ pageSize: 10 }"
              row-key="name"
            >
              <template #bodyCell="{ column, text }">
                <template v-if="column.dataIndex === 'value'">
                  {{ text?.toLocaleString() }}
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
import { ref, reactive, onMounted } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dataAPI from '../../api/data'

use([PieChart, BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

const loading = ref(false)
const deptChartRef = ref()
const titleChartRef = ref()

const TITLE_COLORS: Record<string, string> = {
  '主任医师': '#ed4014',
  '副主任医师': '#ff7c00',
  '主治医师': '#1890ff',
  '住院医师': '#52c41a',
  '未定职': '#8c8c8c'
}

const DEPT_COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ad46c4']

const deptOption = reactive({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center' },
  series: [{
    name: '科室分布',
    type: 'pie',
    radius: ['35%', '60%'],
    center: ['40%', '50%'],
    avoidLabelOverlap: true,
    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
    label: { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 11 },
    labelLine: { show: true, length: 10, length2: 15 },
    data: [] as any[]
  }]
})

const titleOption = reactive({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center' },
  series: [{
    name: '医生职称',
    type: 'pie',
    radius: ['35%', '60%'],
    center: ['40%', '50%'],
    avoidLabelOverlap: true,
    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
    label: { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 11 },
    labelLine: { show: true, length: 10, length2: 15 },
    data: [] as any[]
  }]
})

const columns = [
  { title: '类别', dataIndex: 'category', width: 120 },
  { title: '名称', dataIndex: 'name', width: 150 },
  { title: '数量', dataIndex: 'value', sorter: (a: any, b: any) => a.value - b.value }
]

const detailData = ref<any[]>([])





const loadDeptData = async () => {
  try {
    const res = await dataAPI.getDepartmentServiceAnalysis()
    if (res.success && res.data) {
      let data = []
      if (Array.isArray(res.data)) {
        data = res.data
      } else if (Array.isArray(res.data?.list)) {
        data = res.data.list
      } else if (Array.isArray(res.data?.data)) {
        data = res.data.data
      }

      if (data.length > 0) {
        const chartData = data.slice(0, 10).map((d: any, index: number) => ({
          name: d.department || d.name || `科室${index + 1}`,
          value: d.consultation_count || d.service_count || d.value || 0,
          itemStyle: { color: DEPT_COLORS[index % DEPT_COLORS.length] }
        }))
        deptOption.series[0].data = chartData
        return data
      }
    }
  } catch (error) {
    console.error('加载科室数据失败:', error)
    deptOption.series[0].data = []
  }
  return []
}

const loadTitleData = async () => {
  try {
    const res = await dataAPI.getDoctorTitleAnalysis()
    if (res.success && res.data) {
      let data = []
      if (Array.isArray(res.data)) {
        data = res.data
      } else if (Array.isArray(res.data?.list)) {
        data = res.data.list
      } else if (Array.isArray(res.data?.data)) {
        data = res.data.data
      }

      if (data.length > 0) {
        const chartData = data.map((item: any) => ({
          name: item.doctor_title || item.title || item.name || '未知',
          value: item.doctor_count || item.count || item.value || 0,
          itemStyle: { color: TITLE_COLORS[item.doctor_title || item.title || item.name] || '#8c8c8c' }
        }))
        titleOption.series[0].data = chartData
        return data
      }
    }
  } catch (error) {
    console.error('加载职称数据失败:', error)
    titleOption.series[0].data = []
  }
  return []
}

const buildDetailData = (deptData: any[], titleData: any[]) => {
  const details: any[] = []

  if (deptData.length > 0) {
    deptData.slice(0, 10).forEach((d: any) => {
      details.push({
        category: '科室',
        name: d.department || d.name || '未知',
        value: d.consultation_count || d.service_count || d.value || 0
      })
    })
  }

  if (titleData.length > 0) {
    titleData.forEach((d: any) => {
      details.push({
        category: '职称',
        name: d.doctor_title || d.title || d.name || '未知',
        value: d.doctor_count || d.count || d.value || 0
      })
    })
  }

  detailData.value = details.length > 0 ? details.sort((a, b) => b.value - a.value) : []
}

const loadData = async () => {
  loading.value = true
  try {
    const [deptData, titleData] = await Promise.all([loadDeptData(), loadTitleData()])
    buildDetailData(deptData, titleData)
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.title-wrapper { padding: 16px; background: linear-gradient(135deg, #e0f7fa 0%, #f5f7fa 50%, #e8f5e9 100%); min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #fff; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.page-title { margin: 0; font-size: 18px; background: linear-gradient(135deg, #00bcd4, #4dd0e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.chart-card { border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 184, 148, 0.1); background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%); }
.detail-card { border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 184, 148, 0.1); background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%); }
.chart-container-dept { height: 420px; }
.chart-container-title { height: 420px; }
</style>
