<template>
  <div class="hospital-ranking-wrapper">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">医院排行榜</h2>
      </div>
      <div class="header-right">
        <a-radio-group v-model:value="sortType" button-style="solid" @change="handleSortChange">
          <a-radio-button value="consultation">
            <SortAscendingOutlined /> 问诊量
          </a-radio-button>
          <a-radio-button value="rating">
            <StarOutlined /> 评分
          </a-radio-button>
          <a-radio-button value="doctor">
            <TeamOutlined /> 医生数
          </a-radio-button>
        </a-radio-group>
        <a-button type="primary" @click="loadData" :loading="loading">
          <ReloadOutlined /> 刷新
        </a-button>
      </div>
    </div>

    <a-spin :spinning="loading">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :lg="18">
          <a-card title="TOP 10 医院排行榜" class="chart-card">
            <v-chart
              ref="chartRef"
              class="chart-container"
              :option="barChartOption"
              autoresize
            />
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="6">
          <a-card title="统计信息" class="stats-card">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="医院总数">
                <a-statistic :value="totalHospitals" :value-style="{ color: '#1890ff' }" />
              </a-descriptions-item>
              <a-descriptions-item label="平均问诊量">
                <a-statistic :value="avgConsultation" suffix="次" :value-style="{ color: '#52c41a' }" />
              </a-descriptions-item>
              <a-descriptions-item label="平均评分">
                <a-statistic :value="avgRating" :precision="2" suffix="星" :value-style="{ color: '#faad14' }" />
              </a-descriptions-item>
              <a-descriptions-item label="最高评分医院">
                <span class="top-hospital">{{ topRatedHospital }}</span>
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" style="margin-top: 16px;">
        <a-col :xs="24">
          <a-card title="详细数据列表" class="table-card">
            <a-table
              :columns="columns"
              :data-source="displayData"
              :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }"
              :loading="loading"
              row-key="ranking"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'ranking'">
                  <div class="ranking-cell" :class="'rank-' + record.ranking">
                    <span class="rank-text">#{{ record.ranking }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'hospital_name'">
                  <div class="hospital-cell">
                    <span class="hospital-name">{{ record.hospital_name }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'consultation_count'">
                  <a-statistic :value="record.consultation_count" :value-style="{ fontSize: '16px' }" />
                </template>
                <template v-else-if="column.key === 'avg_recommendation_star'">
                  <a-rate :value="record.avg_recommendation_star" disabled allow-half size="small" />
                  <span class="star-text">({{ record.avg_recommendation_star?.toFixed(1) }})</span>
                </template>
                <template v-else-if="column.key === 'doctor_count'">
                  <a-tag color="blue">{{ record.doctor_count }} 人</a-tag>
                </template>
                <template v-else-if="column.key === 'avg_price'">
                  <span class="price-text">¥{{ record.avg_price || record.avg_consultation_price || 0 }}</span>
                </template>
                <template v-else-if="column.key === 'level'">
                  <a-tag :color="getLevelColor(record.level || record.hospital_level)">
                    {{ record.level || record.hospital_level || '未知' }}
                  </a-tag>
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
import { ref, computed, onMounted, nextTick } from 'vue';
import { StarOutlined, TeamOutlined, SortAscendingOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent
} from 'echarts/components';
import { message } from 'ant-design-vue';
import dataAPI from '../../api/data';

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent
]);

interface HospitalRanking {
  ranking: number;
  hospital_name: string;
  consultation_count: number;
  avg_recommendation_star: number;
  doctor_count: number;
  avg_price?: number;
  avg_consultation_price?: number;
  level?: string;
  hospital_level?: string;
  city?: string;
}

const loading = ref(false);
const sortType = ref<'consultation' | 'rating' | 'doctor'>('consultation');
const allData = ref<HospitalRanking[]>([]);
const chartRef = ref();

const columns = [
  { title: '排名', key: 'ranking', width: 80, align: 'center' as const },
  { title: '医院名称', key: 'hospital_name', dataIndex: 'hospital_name' },
  { title: '等级', key: 'level', width: 100 },
  { title: '问诊量', key: 'consultation_count', width: 120, align: 'right' as const },
  { title: '评分', key: 'avg_recommendation_star', width: 150 },
  { title: '医生数', key: 'doctor_count', width: 100 },
  { title: '平均价格', key: 'avg_price', width: 100, align: 'right' as const },
];

const sortedData = computed(() => {
  const data = [...allData.value];
  switch (sortType.value) {
    case 'rating':
      return data.sort((a, b) => (b.avg_recommendation_star || 0) - (a.avg_recommendation_star || 0));
    case 'doctor':
      return data.sort((a, b) => (b.doctor_count || 0) - (a.doctor_count || 0));
    default:
      return data.sort((a, b) => (b.consultation_count || 0) - (a.consultation_count || 0));
  }
});

const displayData = computed(() => {
  return sortedData.value.map((item, index) => ({
    ...item,
    ranking: index + 1
  }));
});

const top10Data = computed(() => {
  return displayData.value.slice(0, 10).reverse();
});

const totalHospitals = computed(() => allData.value.length);

const avgConsultation = computed(() => {
  if (allData.value.length === 0) return 0;
  const sum = allData.value.reduce((acc, curr) => acc + (curr.consultation_count || 0), 0);
  return Math.round(sum / allData.value.length);
});

const avgRating = computed(() => {
  if (allData.value.length === 0) return 0;
  const sum = allData.value.reduce((acc, curr) => acc + (curr.avg_recommendation_star || 0), 0);
  return sum / allData.value.length;
});

const topRatedHospital = computed(() => {
  if (allData.value.length === 0) return '-';
  const top = allData.value.reduce((prev, curr) =>
    (curr.avg_recommendation_star || 0) > (prev.avg_recommendation_star || 0) ? curr : prev
  );
  return top.hospital_name;
});

const getStarColor = (star: number): string => {
  if (star >= 4.5) return '#52c41a';
  if (star >= 4.0) return '#7cb305';
  if (star >= 3.5) return '#7cb305';
  if (star >= 3.0) return '#fadb14';
  if (star >= 2.5) return '#faad14';
  if (star >= 2.0) return '#fa8c16';
  return '#f5222d';
};

const barChartOption = computed(() => {
  const xAxisName = sortType.value === 'consultation' ? '问诊量' : 
                    sortType.value === 'rating' ? '评分' : '医生数';
  
  const getValue = (item: HospitalRanking) => {
    if (sortType.value === 'rating') return item.avg_recommendation_star || 0;
    if (sortType.value === 'doctor') return item.doctor_count || 0;
    return item.consultation_count || 0;
  };
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: '#333' },
      formatter: (params: any) => {
        const data = params[0];
        const hospital = top10Data.value.find(h => h.hospital_name === data.name) || {};
        return `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${data.name}</div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div>排名: <span style="color: #1890ff; font-weight: 600;">#${hospital.ranking}</span></div>
            <div>等级: <span style="color: #666;">${hospital.level || hospital.hospital_level || '-'}</span></div>
            <div>医生数: <span style="color: #666;">${hospital.doctor_count || 0} 人</span></div>
            <div>评分: <span style="color: #faad14; font-weight: 600;">${hospital.avg_recommendation_star?.toFixed(1) || '-'} 星</span></div>
            <div>平均价格: <span style="color: #52c41a; font-weight: 600;">¥${hospital.avg_price || hospital.avg_consultation_price || '-'}</span></div>
          </div>
        `;
      }
    },
    grid: {
      left: '3%',
      right: '10%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: xAxisName,
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        formatter: (value: number) => {
          if (sortType.value === 'rating') return value.toFixed(1);
          if (value >= 10000) return (value / 10000).toFixed(1) + 'w';
          if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
          return value.toString();
        }
      }
    },
    yAxis: {
      type: 'category',
      data: top10Data.value.map(item => item.hospital_name),
      axisLabel: {
        fontSize: 12,
        width: 120,
        overflow: 'truncate'
      }
    },
    series: [{
      type: 'bar',
      data: top10Data.value.map(item => ({
        value: getValue(item),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: sortType.value === 'rating' ? '#faad14' : (sortType.value === 'doctor' ? '#722ed1' : '#1890ff') },
              { offset: 1, color: sortType.value === 'rating' ? '#faad14' : (sortType.value === 'doctor' ? '#b37feb' : '#69c0ff') }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        }
      })),
      barWidth: '60%',
      label: {
        show: true,
        position: 'right',
        formatter: (params: any) => {
          const value = params.value;
          if (sortType.value === 'rating') return value.toFixed(1);
          if (value >= 10000) return (value / 10000).toFixed(1) + 'w';
          if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
          return value.toString();
        },
        fontSize: 11,
        color: '#666'
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      }
    }],
    animationDuration: 800,
    animationEasing: 'elasticOut'
  };
});

const getRankIcon = (rank: number): string => {
  const icons: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return icons[rank] || '';
};

const getLevelColor = (level: string): string => {
  const colorMap: Record<string, string> = {
    '三级甲等': 'red',
    '三级乙等': 'orange',
    '二级甲等': 'blue',
    '二级乙等': 'cyan',
    '一级医院': 'green'
  };
  return colorMap[level] || 'default';
};

const handleSortChange = () => {
  const labels = { consultation: '问诊量', rating: '评分', doctor: '医生数' };
  message.success(`已切换为按${labels[sortType.value]}排序`);
  
  if (allData.value.length === 0) {
    return;
  }
  
  nextTick(() => {
    if (chartRef.value?.chart && top10Data.value.length > 0) {
      const getValue = (item: any) => {
        if (sortType.value === 'rating') return item.avg_recommendation_star || 0;
        if (sortType.value === 'doctor') return item.doctor_count || 0;
        return item.consultation_count || 0;
      };
      
      const color = sortType.value === 'rating' ? '#faad14' : (sortType.value === 'doctor' ? '#722ed1' : '#1890ff');
      const colorEnd = sortType.value === 'rating' ? '#faad14' : (sortType.value === 'doctor' ? '#b37feb' : '#69c0ff');
      
      chartRef.value.chart.setOption({
        xAxis: {
          type: 'value',
          name: labels[sortType.value],
          nameLocation: 'middle',
          nameGap: 30,
          axisLabel: {
            formatter: (val: number) => {
              if (sortType.value === 'rating') return val.toFixed(1);
              if (val >= 10000) return (val / 10000).toFixed(1) + 'w';
              if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
              return val.toString();
            }
          }
        },
        yAxis: {
          type: 'category',
          data: top10Data.value.map(item => item.hospital_name)
        },
        series: [{
          type: 'bar',
          data: top10Data.value.map(item => ({
            value: getValue(item),
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: color },
                  { offset: 1, color: colorEnd }
                ]
              },
              borderRadius: [0, 4, 4, 0]
            }
          })),
          barWidth: '60%',
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const val = params.value;
              if (sortType.value === 'rating') return val.toFixed(1);
              if (val >= 10000) return (val / 10000).toFixed(1) + 'w';
              if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
              return val.toString();
            },
            fontSize: 11,
            color: '#666'
          }
        }]
      }, { notMerge: true });
    }
  });
};

const loadData = async () => {
  loading.value = true;
  try {
    const dt = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    console.log('[HospitalRanking] 请求API，参数:', { dt })
    const res = await dataAPI.getHospitalRanking({ dt })
    console.log('[HospitalRanking] 响应:', res)
    if (res.success && Array.isArray(res.data?.list)) {
      allData.value = res.data.list;
      message.success(`加载成功，共 ${res.data.list.length} 条数据`);
    } else {
      console.warn('[HospitalRanking] 数据格式异常或为空:', res)
      allData.value = [];
      message.info('暂无数据');
    }
  } catch (error) {
    console.error('[HospitalRanking] 加载失败:', error);
    allData.value = [];
    message.error('数据加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="less">
.hospital-ranking-wrapper {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
  gap: 16px;

  .header-left .page-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .header-right {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.chart-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .chart-container {
    height: 500px;
    width: 100%;
  }
}

.stats-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 100%;

  .top-hospital {
    color: #1890ff;
    font-weight: 600;
  }
}

.table-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.ranking-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;

  &.rank-1 { color: #faad14; }
  &.rank-2 { color: #8c8c8c; }
  &.rank-3 { color: #cd7f32; }

  .rank-icon {
    font-size: 16px;
  }
}

.hospital-cell {
  .hospital-name {
    font-weight: 500;
    color: #333;
  }
}

.star-text {
  margin-left: 8px;
  color: #faad14;
  font-size: 12px;
}

.price-text {
  color: #52c41a;
  font-weight: 600;
}

@media (max-width: 768px) {
  .hospital-ranking-wrapper {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;

    .header-right {
      width: 100%;
      justify-content: flex-start;
    }
  }

  .chart-card .chart-container {
    height: 400px;
  }
}
</style>
