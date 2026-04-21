<template>
  <div class="satisfaction-analysis">
    <div class="chart-header">
      <h3>满意度分析</h3>
      <div class="summary">
        <div class="summary-item">
          <span class="label">平均满意度</span>
          <span class="value">{{ avgSatisfaction.toFixed(1) }}<span class="unit">星</span></span>
        </div>
        <div class="summary-item">
          <span class="label">采集医生</span>
          <span class="value">{{ totalDoctors }}</span>
        </div>
        <div class="summary-item">
          <span class="label">平均咨询价格</span>
          <span class="value">¥{{ avgPrice.toFixed(2) }}</span>
        </div>
      </div>
    </div>
    
    <div class="gauge-container">
      <div 
        v-for="item in chartData" 
        :key="item.satisfaction_level"
        class="gauge-item"
        @click="showDoctorDetails(item)"
      >
        <div class="gauge-header">
          <h4>{{ item.satisfaction_level }}</h4>
          <div class="gauge-info">
            <div class="doctor-count">医生数: {{ item.doctor_count }}</div>
            <div class="price">平均价格: ¥{{ item.avg_consultation_price.toFixed(2) }}</div>
          </div>
        </div>
        <div ref="gaugeRefs" class="gauge"></div>
        <div class="gauge-value">
          <span class="percentage">{{ (item.doctor_ratio * 100).toFixed(2) }}%</span>
          <span class="label">占比</span>
        </div>
      </div>
    </div>
    
    <div class="price-chart-container">
      <h4>各满意度等级平均价格对比</h4>
      <div ref="priceChartRef" class="price-chart"></div>
    </div>
    
    <!-- 医生详情弹窗 -->
    <a-modal
      v-model:visible="doctorDetailsVisible"
      :title="`${selectedLevel}医生详情`"
      width="800"
    >
      <div class="doctor-details">
        <div v-if="selectedDoctors.length > 0">
          <a-table :data-source="selectedDoctors" :columns="doctorColumns">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'price'">
                ¥{{ record.price.toFixed(2) }}
              </template>
              <template v-if="column.key === 'rating'">
                <span class="rating">
                  <span v-for="i in 5" :key="i" class="star">
                    {{ i <= record.rating ? '★' : '☆' }}
                  </span>
                </span>
              </template>
            </template>
          </a-table>
        </div>
        <div v-else class="no-data">
          暂无医生数据
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts';
import { message } from 'ant-design-vue';
import dataAPI from '../../api/data';

// 定义 props
const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
});

// 定义 ref
const gaugeRefs = ref([]);
const priceChartRef = ref(null);
const gauges = ref([]);
let priceChart = null;

// 弹窗状态
const doctorDetailsVisible = ref(false);
const selectedLevel = ref('');
const selectedDoctors = ref([]);

// 处理数据
const chartData = ref([]);

// 计算属性
const avgSatisfaction = computed(() => {
  if (chartData.value.length === 0) return 0;
  let total = 0;
  let count = 0;
  chartData.value.forEach(item => {
    const level = item.satisfaction_level.replace('星', '');
    const levelNum = parseInt(level);
    total += levelNum * item.doctor_count;
    count += item.doctor_count;
  });
  return count > 0 ? total / count : 0;
});

const totalDoctors = computed(() => {
  return chartData.value.reduce((sum, item) => sum + item.doctor_count, 0);
});

const avgPrice = computed(() => {
  if (chartData.value.length === 0) return 0;
  let totalPrice = 0;
  let totalDoctors = 0;
  chartData.value.forEach(item => {
    totalPrice += item.avg_consultation_price * item.doctor_count;
    totalDoctors += item.doctor_count;
  });
  return totalDoctors > 0 ? totalPrice / totalDoctors : 0;
});

// 医生详情表格列配置
const doctorColumns = [
  { title: '医生姓名', dataIndex: 'name', key: 'name' },
  { title: '医院', dataIndex: 'hospital', key: 'hospital' },
  { title: '科室', dataIndex: 'department', key: 'department' },
  { title: '职称', dataIndex: 'title', key: 'title' },
  { title: '满意度', dataIndex: 'rating', key: 'rating' },
  { title: '咨询价格', dataIndex: 'price', key: 'price' },
  { title: '咨询量', dataIndex: 'consultation_count', key: 'consultation_count' }
];

// 颜色映射
const levelColors = {
  '五星': '#52c41a', // 绿色
  '四星': '#73d13d', // 浅绿色
  '三星': '#faad14', // 黄色
  '二星': '#fa8c16', // 橙色
  '一星': '#f5222d'  // 红色
};

// 初始化仪表盘
const initGauges = () => {
  // 清空现有仪表盘
  gauges.value.forEach(gauge => {
    if (gauge) {
      gauge.dispose();
    }
  });
  gauges.value = [];
  
  // 初始化新仪表盘
  const gaugeElements = gaugeRefs.value;
  if (!gaugeElements || gaugeElements.length === 0) return;
  
  chartData.value.forEach((item, index) => {
    if (gaugeElements[index]) {
      const gauge = echarts.init(gaugeElements[index]);
      const option = {
        series: [
          {
            type: 'gauge',
            startAngle: 180,
            endAngle: 0,
            min: 0,
            max: 1,
            splitNumber: 10,
            axisLine: {
              lineStyle: {
                width: 20,
                color: [
                  [item.doctor_ratio, levelColors[item.satisfaction_level]],
                  [1, '#e8e8e8']
                ]
              }
            },
            pointer: {
              icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
              length: '12%',
              width: 20,
              offsetCenter: [0, '-60%'],
              itemStyle: {
                color: 'auto'
              }
            },
            axisTick: {
              length: 12,
              lineStyle: {
                color: 'auto',
                width: 2
              }
            },
            splitLine: {
              length: 20,
              lineStyle: {
                color: 'auto',
                width: 5
              }
            },
            axisLabel: {
              color: '#464646',
              fontSize: 12,
              distance: -60,
              formatter: function (value) {
                return (value * 100).toFixed(0) + '%';
              }
            },
            title: {
              offsetCenter: [0, '-10%'],
              fontSize: 14
            },
            detail: {
              fontSize: 24,
              offsetCenter: [0, '10%'],
              valueAnimation: true,
              formatter: function (value) {
                return (value * 100).toFixed(2) + '%';
              },
              color: 'auto'
            },
            data: [
              {
                value: item.doctor_ratio,
                name: '占比'
              }
            ]
          }
        ],
        animation: true,
        animationDuration: 1500,
        animationEasing: 'elasticOut'
      };
      
      gauge.setOption(option);
      gauges.value.push(gauge);
    }
  });
};

// 初始化价格对比柱状图
const initPriceChart = () => {
  if (!priceChartRef.value) return;
  
  // 销毁已有实例
  if (priceChart) {
    priceChart.dispose();
  }
  
  // 创建新实例
  priceChart = echarts.init(priceChartRef.value);
  
  // 配置图表
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params) {
        const data = params[0];
        return `${data.name}<br/>平均价格: ¥${data.value.toFixed(2)}`;
      }
    },
    xAxis: {
      type: 'category',
      data: chartData.value.map(item => item.satisfaction_level),
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: '平均价格 (¥)',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [
      {
        name: '平均价格',
        type: 'bar',
        data: chartData.value.map(item => item.avg_consultation_price),
        itemStyle: {
          color: function(params) {
            const level = chartData.value[params.dataIndex].satisfaction_level;
            return levelColors[level];
          }
        },
        animationDelay: function(idx) {
          return idx * 100;
        },
        animationDuration: 1000
      }
    ],
    animation: true
  };
  
  // 设置配置
  priceChart.setOption(option);
};

// 显示医生详情
const toRatingLevel = (level) => {
  const levelMap = {
    '非常满意': 5,
    '满意': 4,
    '一般': 3,
    '不满意': 2,
    '非常不满意': 1,
    '五星': 5,
    '四星': 4,
    '三星': 3,
    '二星': 2,
    '一星': 1
  }
  return levelMap[level] || parseInt(String(level).replace('星', '')) || 0
}

const showDoctorDetails = async (item) => {
  selectedLevel.value = item.satisfaction_level;
  try {
    const expectedRating = toRatingLevel(item.satisfaction_level)
    const res = await dataAPI.getDoctorRanking({ rankType: 'satisfaction', limit: 100 })
    const list = res?.success ? (res.data?.list || res.data?.data?.list || []) : []
    selectedDoctors.value = list
      .filter((doctor) => Math.round(Number(doctor.recommendation_star || 0)) === expectedRating)
      .slice(0, 30)
      .map((doctor, index) => ({
        key: doctor.doctor_id || index + 1,
        name: doctor.doctor_name || '',
        hospital: doctor.hospital_name || '',
        department: doctor.department || '',
        title: doctor.doctor_title || '',
        rating: Math.round(Number(doctor.recommendation_star || 0)),
        price: Number(doctor.consultation_price || 0),
        consultation_count: Number(doctor.consultation_count || 0)
      }))
  } catch (error) {
    selectedDoctors.value = []
    message.error('医生详情加载失败')
  }

  doctorDetailsVisible.value = true;
};

// 响应式调整
const handleResize = () => {
  gauges.value.forEach(gauge => {
    if (gauge) {
      gauge.resize();
    }
  });
  
  if (priceChart) {
    priceChart.resize();
  }
};

// 监听数据变化
watch(() => props.data, (newData) => {
  chartData.value = newData;
  // 延迟初始化，确保DOM已更新
  setTimeout(() => {
    initGauges();
    initPriceChart();
  }, 100);
}, { deep: true, immediate: true });

// 生命周期
onMounted(() => {
  // 延迟初始化，确保DOM已更新
  setTimeout(() => {
    initGauges();
    initPriceChart();
  }, 100);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  gauges.value.forEach(gauge => {
    if (gauge) {
      gauge.dispose();
    }
  });
  
  if (priceChart) {
    priceChart.dispose();
  }
  
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.satisfaction-analysis {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.chart-header {
  margin-bottom: 30px;
}

.chart-header h3 {
  margin: 0 0 20px 0;
  color: #1a1a1a;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.summary {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  min-width: 140px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.summary-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.summary-item .label {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-item .value {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: baseline;
}

.summary-item .unit {
  font-size: 14px;
  color: #999;
  margin-left: 6px;
  font-weight: 500;
}

.gauge-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.gauge-item {
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.gauge-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transform: scaleX(0);
  transition: transform 0.4s ease;
}

.gauge-item:hover::before {
  transform: scaleX(1);
}

.gauge-item:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  border-color: rgba(102, 126, 234, 0.2);
}

.gauge-header {
  margin-bottom: 16px;
}

.gauge-header h4 {
  margin: 0 0 12px 0;
  color: #1a1a1a;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.gauge-info {
  font-size: 13px;
  color: #666;
  display: flex;
  justify-content: space-around;
  gap: 12px;
}

.gauge-info div {
  background: #f0f2f5;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
}

.gauge {
  height: 200px;
  margin-bottom: 12px;
}

.gauge-value {
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
}

.gauge-value .percentage {
  display: block;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
}

.gauge-value .label {
  font-size: 13px;
  color: #999;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.price-chart-container {
  margin-top: 40px;
  padding: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.price-chart-container h4 {
  margin: 0 0 24px 0;
  color: #1a1a1a;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.price-chart {
  height: 350px;
}

.doctor-details {
  max-height: 450px;
  overflow-y: auto;
  padding: 8px;
}

.doctor-details::-webkit-scrollbar {
  width: 8px;
}

.doctor-details::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.doctor-details::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.doctor-details::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.no-data {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  margin: 20px;
}

.rating {
  color: #ffc107;
  font-size: 18px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.star {
  margin-right: 3px;
  display: inline-block;
  animation: starPulse 2s ease-in-out infinite;
}

.star:nth-child(1) { animation-delay: 0s; }
.star:nth-child(2) { animation-delay: 0.1s; }
.star:nth-child(3) { animation-delay: 0.2s; }
.star:nth-child(4) { animation-delay: 0.3s; }
.star:nth-child(5) { animation-delay: 0.4s; }

@keyframes starPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@media (max-width: 768px) {
  .satisfaction-analysis {
    padding: 16px;
  }
  
  .summary {
    flex-direction: column;
    gap: 12px;
  }
  
  .summary-item {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    padding: 16px 20px;
  }
  
  .gauge-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .gauge {
    height: 160px;
  }
  
  .price-chart {
    height: 280px;
  }
}

@media (max-width: 480px) {
  .gauge-container {
    grid-template-columns: 1fr;
  }
  
  .gauge {
    height: 180px;
  }
  
  .chart-header h3 {
    font-size: 18px;
  }
  
  .summary-item .value {
    font-size: 24px;
  }
}
</style>
