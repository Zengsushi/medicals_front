<template>
  <div class="doctor-title-distribution">
    <div class="chart-header">
      <h3>医生职称分布</h3>
      <div class="summary">
        <div class="summary-item">
          <span class="label">采集医生</span>
          <span class="value">{{ totalDoctors }}</span>
        </div>
        <div class="summary-item">
          <span class="label">平均价格</span>
          <span class="value">¥{{ avgPrice.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <div class="chart-container">
      <div ref="chartRef" class="chart"></div>
      <div class="doctor-list" v-if="selectedTitle">
        <h4>{{ selectedTitle }} - 医生列表</h4>
        <div class="list-content">
          <div v-if="selectedDoctors.length > 0" class="doctor-items">
            <div v-for="doctor in selectedDoctors" :key="doctor.id" class="doctor-item">
              <div class="doctor-info">
                <span class="doctor-name">{{ doctor.name }}</span>
                <span class="doctor-hospital">{{ doctor.hospital }}</span>
              </div>
              <div class="doctor-stats">
                <span class="price">¥{{ doctor.price.toFixed(2) }}</span>
                <span class="count">{{ doctor.consultation_count }}次咨询</span>
              </div>
            </div>
          </div>
          <div v-else class="no-data">暂无医生数据</div>
        </div>
        <a-button type="link" @click="clearSelection">返回概览</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts';
import { message } from 'ant-design-vue';
import dataAPI from '../../api/data';

interface Doctor {
  id: number;
  name: string;
  hospital: string;
  department: string;
  title: string;
  price: number;
  consultation_count: number;
}

interface ChartData {
  doctor_title: string;
  doctor_count: number;
  doctor_ratio: number;
  avg_consultation_price: number;
}

const props = defineProps<{
  data: ChartData[];
}>();

const chartRef = ref<HTMLElement | null>(null);
let chart: echarts.ECharts | null = null;

const selectedTitle = ref<string>('');
const selectedDoctors = ref<Doctor[]>([]);

const totalDoctors = computed(() => {
  return props.data.reduce((sum, item) => sum + item.doctor_count, 0);
});

const avgPrice = computed(() => {
  if (props.data.length === 0) return 0;
  let totalPrice = 0;
  let totalCount = 0;
  props.data.forEach(item => {
    totalPrice += item.avg_consultation_price * item.doctor_count;
    totalCount += item.doctor_count;
  });
  return totalCount > 0 ? totalPrice / totalCount : 0;
});

const titleColors: Record<string, string> = {
  '主任医师': '#1e3a8a',
  '副主任医师': '#3b82f6',
  '主治医师': '#22c55e',
  '其他': '#6b7280'
};

const initChart = () => {
  if (!chartRef.value || props.data.length === 0) return;

  if (chart) {
    chart.dispose();
  }

  chart = echarts.init(chartRef.value);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data;
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 8px;">${data.name}</div>
            <div>医生数量: ${data.doctor_count}</div>
            <div>占比: ${(data.doctor_ratio * 100).toFixed(2)}%</div>
            <div>平均价格: ¥${data.avg_consultation_price.toFixed(2)}</div>
          </div>
        `;
      }
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      formatter: (name: string) => {
        const item = props.data.find(d => d.doctor_title === name);
        if (item) {
          return `${name}  ${item.doctor_count}人  ${(item.doctor_ratio * 100).toFixed(1)}%`;
        }
        return name;
      }
    },
    series: [
      {
        name: '职称分布',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 5,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          overflow: 'break',
          fontSize: 11
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10,
          smooth: true
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: props.data.map(item => ({
          value: item.doctor_count,
          name: item.doctor_title,
          doctor_count: item.doctor_count,
          doctor_ratio: item.doctor_ratio,
          avg_consultation_price: item.avg_consultation_price,
          itemStyle: {
            color: titleColors[item.doctor_title] || '#6b7280'
          }
        })),
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: (idx: number) => idx * 100
      }
    ],
    graphic: [
      {
        type: 'group',
        left: '35%',
        top: '45%',
        children: [
          {
            type: 'text',
            style: {
              text: totalDoctors.value.toString(),
              x: 0,
              y: 0,
              textAlign: 'center',
              fill: '#333',
              fontSize: 28,
              fontWeight: 'bold'
            }
          },
          {
            type: 'text',
            style: {
              text: '总医生数',
              x: 0,
              y: 25,
              textAlign: 'center',
              fill: '#666',
              fontSize: 12
            }
          }
        ]
      }
    ]
  };

  chart.setOption(option);

  chart.on('click', (params: any) => {
    const title = params.data.name as string;
    showDoctorList(title);
  });
};

const showDoctorList = async (title: string) => {
  selectedTitle.value = title;
  try {
    const res = await dataAPI.getDoctorListByTitle({ title, page: 1, pageSize: 20 });
    const list = res?.success ? (res.data?.list || res.data?.data?.list || []) : [];
    selectedDoctors.value = list.map((item: any, index: number) => ({
      id: item.id || index + 1,
      name: item.doctor_name || item.name || '',
      hospital: item.hospital_name || item.hospital || '',
      department: item.department || '',
      title: item.doctor_title || item.title || title,
      price: Number(item.consultation_price || item.price || 0),
      consultation_count: Number(item.consultation_count || 0)
    }));
  } catch (error) {
    selectedDoctors.value = [];
    message.error('医生列表加载失败');
  }
};

const clearSelection = () => {
  selectedTitle.value = '';
  selectedDoctors.value = [];
};

const handleResize = () => {
  if (chart) {
    chart.resize();
  }
};

watch(() => props.data, () => {
  initChart();
}, { deep: true });

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (chart) {
    chart.dispose();
  }
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped lang="scss">
.doctor-title-distribution {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.summary {
  display: flex;
  gap: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.summary-item .label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.summary-item .value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.chart-container {
  display: flex;
  gap: 20px;
  min-height: 400px;
}

.chart {
  flex: 1;
  min-width: 400px;
  height: 400px;
}

.doctor-list {
  width: 350px;
  background: #fafafa;
  border-radius: 8px;
  padding: 15px;
  overflow-y: auto;
}

.doctor-list h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.list-content {
  max-height: 300px;
  overflow-y: auto;
}

.doctor-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.doctor-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.doctor-item:hover {
  transform: translateX(5px);
}

.doctor-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.doctor-name {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.doctor-hospital {
  font-size: 12px;
  color: #666;
}

.doctor-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.price {
  font-weight: 600;
  color: #f59e0b;
  font-size: 14px;
}

.count {
  font-size: 11px;
  color: #999;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
}

@media (max-width: 768px) {
  .chart-container {
    flex-direction: column;
  }

  .chart {
    width: 100%;
    min-width: unset;
  }

  .doctor-list {
    width: 100%;
  }
}
</style>
