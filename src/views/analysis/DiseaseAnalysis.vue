<template>
  <div class="disease-wrapper">
    <a-spin :spinning="loading">
      <div class="page-header">
        <h2 class="page-title">🦠 疾病分布分析</h2>
        <div class="toolbar">
          <a-select v-model:value="distributionMode" style="width: 190px">
            <a-select-option value="balanced">平衡分布（推荐）</a-select-option>
            <a-select-option value="focus">头部聚焦（Top20）</a-select-option>
            <a-select-option value="raw">原始分布（全量）</a-select-option>
          </a-select>
          <a-button type="primary" @click="loadData">
            <template #icon><ReloadOutlined /></template>
            刷新数据
          </a-button>
          <a-button @click="resetChart">
            <template #icon><UndoOutlined /></template>
            重置视图
          </a-button>
        </div>
      </div>

      <a-card class="chart-card">
        <DiseaseTreemap
          ref="treemapRef"
          :data="chartData"
          height="650px"
          :loading="loading"
          @drill-down="handleDrillDown"
          @breadcrumb-click="handleBreadcrumbClick"
        />
      </a-card>

      <a-card class="stats-card" v-if="chartData.length > 0">
        <a-row :gutter="[16, 16]">
          <a-col :span="6">
            <a-statistic title="总就诊人次" :value="totalConsultations" :value-style="{ color: '#1890ff' }">
              <template #prefix><UserOutlined /></template>
            </a-statistic>
          </a-col>
          <a-col :span="6">
            <a-statistic title="疾病大类数" :value="categoryCount" :value-style="{ color: '#52c41a' }">
              <template #prefix><FolderOutlined /></template>
            </a-statistic>
          </a-col>
          <a-col :span="6">
            <a-statistic title="涉及科室数" :value="departmentCount" :value-style="{ color: '#faad14' }">
              <template #prefix><MedicineBoxOutlined /></template>
            </a-statistic>
          </a-col>
          <a-col :span="6">
            <a-statistic title="疾病种类数" :value="diseaseCount" :value-style="{ color: '#f5222d' }">
              <template #prefix><BugOutlined /></template>
            </a-statistic>
          </a-col>
        </a-row>
      </a-card>

      <a-card class="table-card">
        <template #title>分布明细 (Top 20)</template>
        <a-table
          :dataSource="tableData.slice(0, 20)"
          :columns="columns"
          :pagination="false"
          size="middle"
          rowKey="id"
        />
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  UndoOutlined,
  UserOutlined,
  FolderOutlined,
  MedicineBoxOutlined,
  BugOutlined
} from '@ant-design/icons-vue'
import DiseaseTreemap from '../../components/charts/DiseaseTreemap.vue'
import dataAPI from '../../api/data'

const loading = ref(false)
const treemapRef = ref()
const rawChartData = ref<any[]>([])
const distributionMode = ref<'balanced' | 'focus' | 'raw'>('balanced')

interface DiseaseItem {
  id?: number
  disease_category: string
  department: string
  disease_name: string
  consultation_count: number
  consultation_ratio: number
  ranking?: number
  doctor_count?: number
  hospital_count?: number
  city?: string
  region?: string
}

const columns = [
  { title: '疾病大类', dataIndex: 'disease_category', width: 140 },
  { title: '科室', dataIndex: 'department', width: 110 },
  { title: '疾病名称', dataIndex: 'disease_name', minWidth: 160 },
  {
    title: '地区',
    dataIndex: 'city',
    width: 80,
    customRender: ({ text }: any) => {
      if (!text) return '-'
      const colorMap: Record<string, string> = {
        '北京': '#f5222d', '上海': '#fa8c16', '广州': '#faad14', '深圳': '#52c41a',
        '杭州': '#1890ff', '成都': '#722ed1', '武汉': '#eb2f96', '西安': '#13c2c2',
        '南京': '#2f54eb', '重庆': '#fa541c'
      }
      return h('a-tag', { style: { color: colorMap[text] || 'default', borderRadius: '10px' } }, text)
    }
  },
  {
    title: '就诊人次',
    dataIndex: 'consultation_count',
    width: 110,
    sorter: (a: any, b: any) => a.consultation_count - b.consultation_count,
    customRender: ({ text }: any) => text?.toLocaleString()
  },
  {
    title: '占比(%)',
    dataIndex: 'consultation_ratio',
    width: 100,
    sorter: (a: any, b: any) => a.consultation_ratio - b.consultation_ratio,
    customRender: ({ text }: any) => {
      const ratio = Number(text)
      let color = ''
      if (ratio >= 10) color = '#f5222d'
      else if (ratio >= 5) color = '#fa8c16'
      else if (ratio >= 2) color = '#1890ff'
      else color = '#8c8c8c'
      return h('a-tag', { style: { color } }, `${text}%`)
    }
  },
  { title: '排名', dataIndex: 'ranking', width: 70, sorter: (a: any, b: any) => a.ranking - b.ranking }
]

const aggregateByCategory = (rows: DiseaseItem[], topNPerCategory = 8) => {
  const groups = rows.reduce((acc: Record<string, DiseaseItem[]>, item) => {
    const key = item.disease_category || '未分类'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const merged: DiseaseItem[] = []
  Object.keys(groups).forEach((category) => {
    const sorted = [...groups[category]].sort((a, b) => (b.consultation_count || 0) - (a.consultation_count || 0))
    const head = sorted.slice(0, topNPerCategory)
    const tail = sorted.slice(topNPerCategory)
    merged.push(...head)
    if (tail.length > 0) {
      const tailCount = tail.reduce((sum, item) => sum + (item.consultation_count || 0), 0)
      const tailDoctors = tail.reduce((sum, item) => sum + (item.doctor_count || 0), 0)
      const tailHospitals = tail.reduce((sum, item) => sum + (item.hospital_count || 0), 0)
      merged.push({
        id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        disease_category: category,
        department: '其他',
        disease_name: '其他疾病',
        consultation_count: tailCount,
        consultation_ratio: 0,
        ranking: 999,
        doctor_count: tailDoctors,
        hospital_count: tailHospitals,
        city: '',
        region: ''
      })
    }
  })
  return merged
}

const aggregateTopN = (rows: DiseaseItem[], topN = 20) => {
  const sorted = [...rows].sort((a, b) => (b.consultation_count || 0) - (a.consultation_count || 0))
  const head = sorted.slice(0, topN)
  const tail = sorted.slice(topN)
  if (tail.length === 0) return head
  const tailCount = tail.reduce((sum, item) => sum + (item.consultation_count || 0), 0)
  const tailDoctors = tail.reduce((sum, item) => sum + (item.doctor_count || 0), 0)
  const tailHospitals = tail.reduce((sum, item) => sum + (item.hospital_count || 0), 0)
  return [
    ...head,
    {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      disease_category: '其他',
      department: '其他',
      disease_name: '其他疾病',
      consultation_count: tailCount,
      consultation_ratio: 0,
      ranking: 999,
      doctor_count: tailDoctors,
      hospital_count: tailHospitals,
      city: '',
      region: ''
    }
  ]
}

const chartData = computed(() => {
  const source = rawChartData.value
  if (!source.length) return []
  if (distributionMode.value === 'raw') return source
  if (distributionMode.value === 'focus') return aggregateTopN(source, 20)
  return aggregateByCategory(source, 8)
})

const totalConsultations = computed(() => {
  return rawChartData.value.reduce((sum, item) => sum + (item.consultation_count || 0), 0).toLocaleString()
})

const categoryCount = computed(() => {
  return new Set(rawChartData.value.map(item => item.disease_category)).size
})

const departmentCount = computed(() => {
  return new Set(rawChartData.value.map(item => item.department)).size
})

const diseaseCount = computed(() => {
  return rawChartData.value.length
})

const tableData = computed(() => {
  return [...chartData.value].sort((a, b) => b.consultation_count - a.consultation_count)
})



const loadData = async () => {
  loading.value = true
  try {
    const res = await dataAPI.getDiseaseAnalysis()
    if (res.success && res.data?.list && Array.isArray(res.data.list)) {
      const rawData = res.data.list as any[]
      const normalizedData = rawData.map((item, index) => ({
        id: index + 1,
        disease_category: item.disease_category || item.category || '未分类',
        department: item.department || item.dept || '未知科室',
        disease_name: item.disease_name || item.name || item.disease || '未知疾病',
        consultation_count: item.consultation_count || item.count || item.value || 0,
        consultation_ratio: item.consultation_ratio || item.ratio || item.percentage || 0,
        ranking: item.ranking || item.rank || index + 1,
        doctor_count: item.doctor_count || item.doctors || 0,
        hospital_count: item.hospital_count || item.hospitals || 0,
        city: item.city || item.region || item.area || '',
        region: item.city || item.region || item.area || ''
      }))
      const total = normalizedData.reduce((sum, item) => sum + (item.consultation_count || 0), 0)
      rawChartData.value = normalizedData.map((item) => ({
        ...item,
        consultation_ratio: total > 0
          ? Number((((item.consultation_count || 0) / total) * 100).toFixed(2))
          : Number(item.consultation_ratio || 0)
      }))
      message.success(`加载成功，共 ${rawChartData.value.length} 条数据`)
    } else {
      console.warn('[DiseaseAnalysis] API 数据格式异常')
      rawChartData.value = []
      message.info('暂无数据')
    }
  } catch (error) {
    console.error('[DiseaseAnalysis] 加载失败:', error)
    rawChartData.value = []
    message.error('数据加载失败')
  } finally {
    loading.value = false
  }
}

const resetChart = () => {
  if (treemapRef.value) {
    treemapRef.value.reset()
  }
}

const handleDrillDown = (info: { level: number; data: any; name: string }) => {
  console.log(`[DiseaseAnalysis] 下钻到第 ${info.level} 层:`, info.name)
}

const handleBreadcrumbClick = (info: { level: number; data: any; name: string }) => {
  console.log(`[DiseaseAnalysis] 面包屑点击: 第 ${info.level} 层 -`, info.name)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.disease-wrapper {
  padding: 16px;
  background: #f0f2f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
}

.page-title {
  margin: 0;
  font-size: 18px;
}

.toolbar {
  display: flex;
  gap: 12px;
}

.chart-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.stats-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.table-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
</style>
