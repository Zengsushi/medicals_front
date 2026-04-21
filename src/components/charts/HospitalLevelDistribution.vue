<template>
  <div class="hospital-level-distribution">
    <div class="chart-header">
      <h3>医院等级分布</h3>
      <button class="export-btn" @click="exportChart">
        导出图片
      </button>
    </div>
    
    <div class="chart-container">
      <div ref="chartRef" class="chart"></div>
      <div class="data-table">
        <h4>详细数据</h4>
        <table>
          <thead>
            <tr>
              <th>医院等级</th>
              <th>医院数量</th>
              <th>占比</th>
              <th>平均医生数/医院</th>
              <th>平均价格</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in chartData" :key="item.hospital_level">
              <td :class="['level-tag', item.hospital_level.toLowerCase()]">{{ item.hospital_level }}</td>
              <td>{{ item.hospital_count }}</td>
              <td>{{ (item.hospital_ratio * 100).toFixed(2) }}%</td>
              <td>{{ item.avg_doctor_per_hospital.toFixed(1) }}</td>
              <td>¥{{ item.avg_price?.toFixed(2) || 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import * as echarts from 'echarts';

// 定义 props
const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
});

// 定义 ref
const chartRef = ref(null);
let chart = null;

// 处理数据
const chartData = ref([]);

// 颜色映射
const levelColors = {
  '三甲': '#FFD700', // 金色
  '三乙': '#FFA500', // 橙色
  '二甲': '#4169E1', // 蓝色
  '其他': '#808080'  // 灰色
};

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return;
  
  // 销毁已有实例
  if (chart) {
    chart.dispose();
  }
  
  // 创建新实例
  chart = echarts.init(chartRef.value);
  
  // 配置图表
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        const data = params.data;
        return `
          <div style="padding: 8px;">
            <div><strong>${data.name}</strong></div>
            <div>医院数量: ${data.value}</div>
            <div>平均医生数: ${data.avg_doctor_per_hospital.toFixed(1)}</div>
            <div>平均价格: ¥${data.avg_price?.toFixed(2) || 0}</div>
            <div>占比: ${(data.ratio * 100).toFixed(2)}%</div>
          </div>
        `;
      }
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center'
    },
    series: [
      {
        name: '医院等级',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: chartData.value.map(item => ({
          value: item.hospital_count,
          name: item.hospital_level,
          ratio: item.hospital_ratio,
          avg_doctor_per_hospital: item.avg_doctor_per_hospital,
          avg_price: item.avg_price
        })),
        color: Object.values(levelColors),
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: function(idx) {
          return idx * 100;
        },
        animationDuration: 1500
      }
    ]
  };
  
  // 设置配置
  chart.setOption(option);
};

// 导出图片
const exportChart = () => {
  if (!chart) return;
  
  const dataURL = chart.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  });
  
  const link = document.createElement('a');
  link.download = `医院等级分布_${new Date().toISOString().split('T')[0]}.png`;
  link.href = dataURL;
  link.click();
};

// 响应式调整
const handleResize = () => {
  if (chart) {
    chart.resize();
  }
};

// 监听数据变化
watch(() => props.data, (newData) => {
  chartData.value = newData;
  initChart();
}, { deep: true, immediate: true });

// 生命周期
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

<style scoped>
.hospital-level-distribution {
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

.export-btn {
  background: #409EFF;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.export-btn:hover {
  background: #66B1FF;
}

.chart-container {
  display: flex;
  gap: 20px;
  height: 400px;
}

.chart {
  flex: 1;
  min-width: 300px;
}

.data-table {
  width: 300px;
  overflow-y: auto;
}

.data-table h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.data-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th,
.data-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #e8e8e8;
}

.data-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.level-tag {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.level-tag.三甲 {
  background-color: #FFF3CD;
  color: #856404;
}

.level-tag.三乙 {
  background-color: #FFF3E0;
  color: #E65100;
}

.level-tag.二甲 {
  background-color: #E3F2FD;
  color: #1565C0;
}

.level-tag.其他 {
  background-color: #F5F5F5;
  color: #616161;
}

@media (max-width: 768px) {
  .chart-container {
    flex-direction: column;
    height: auto;
  }
  
  .chart {
    height: 300px;
  }
  
  .data-table {
    width: 100%;
    max-height: 300px;
  }
}
</style>
