<template>
  <div class="city-medical-compare">
    <a-spin :spinning="loading">
      <div class="page-header">
        <div class="header-left"><h2 class="page-title">🏙️ 城市医疗资源对比</h2></div>
        <div class="header-right">
          <a-radio-group v-model:value="compareType" button-style="solid" @change="handleTypeChange">
            <a-radio-button value="consultation_count">按问诊量</a-radio-button>
            <a-radio-button value="hospital_count">按医院数</a-radio-button>
            <a-radio-button value="doctor_count">按医生数</a-radio-button>
          </a-radio-group>
          <a-button type="primary" @click="loadData"><template #icon><ReloadOutlined /></template>刷新</a-button>
        </div>
      </div>

      <a-row :gutter="16">
        <a-col :span="14">
          <a-card title="📍 中国医疗资源分布地图" class="map-card">
            <div class="chart-container-map" v-if="isMapReady"><v-chart ref="mapChartRef" :option="mapOption" :autoresize="true" /></div>
            <div v-else class="chart-container-map" style="display:flex;align-items:center;justify-content:center;color:#999;">
              正在加载地图...
            </div>
          </a-card>
        </a-col>
        <a-col :span="10">
          <a-card title="医疗资源排名" class="rank-card">
            <div class="chart-container-bar"><v-chart ref="barChartRef" :option="barOption" :autoresize="true" /></div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="16" style="margin-top: 16px;">
        <a-col :span="24">
          <a-card title="城市医疗资源详细对比" class="detail-card">
            <div class="chart-container-detail"><v-chart ref="detailChartRef" :option="detailOption" :autoresize="true" /></div>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { ScatterChart, BarChart, LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent, VisualMapComponent, GeoComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import * as echarts from 'echarts'
import dataAPI from '../../api/data'

use([ScatterChart, BarChart, LineChart, TooltipComponent, GridComponent, LegendComponent, VisualMapComponent, GeoComponent, CanvasRenderer])

const loading = ref(false)
const mapChartRef = ref()
const barChartRef = ref()
const detailChartRef = ref()
const compareType = ref('consultation_count')
const cityData = ref<any[]>([])

const cityCoordinates: Record<string, [number, number]> = {
  '北京': [116.46, 39.92],
  '上海': [121.48, 31.22],
  '广州': [113.23, 23.16],
  '深圳': [114.07, 22.62],
  '杭州': [120.19, 30.26],
  '成都': [104.06, 30.67],
  '武汉': [114.29, 30.59],
  '西安': [108.95, 34.27],
  '南京': [118.78, 32.04],
  '重庆': [106.54, 29.59],
  '天津': [117.2, 39.13],
  '苏州': [120.62, 31.32],
  '郑州': [113.65, 34.76],
  '长沙': [112.98, 28.21],
  '沈阳': [123.43, 41.8],
  '青岛': [120.38, 36.07],
  '济南': [116.98, 36.67],
  '大连': [121.62, 38.91],
  '哈尔滨': [126.63, 45.75],
  '长春': [125.32, 43.82],
  '福州': [119.3, 26.08],
  '厦门': [118.1, 24.48],
  '昆明': [102.71, 25.04],
  '贵阳': [106.71, 26.6],
  '南宁': [108.33, 22.84],
  '合肥': [117.25, 31.86],
  '太原': [112.53, 37.87],
  '石家庄': [114.48, 38.03],
  '兰州': [103.83, 36.06],
  '乌鲁木齐': [87.62, 43.79],
  '拉萨': [91.11, 29.65],
  '呼和浩特': [111.65, 40.82],
  '海口': [110.35, 20.02],
  '三亚': [109.52, 18.25],
  '温州': [120.67, 28.0],
  '宁波': [121.56, 29.86],
  '无锡': [120.29, 31.57],
  '佛山': [113.12, 23.02],
  '东莞': [113.75, 23.05],
  '泉州': [118.58, 24.93],
  '常州': [119.97, 31.81],
  '徐州': [117.2, 34.26],
  '南通': [120.86, 32.01],
  '绍兴': [120.58, 30.0],
  '潍坊': [119.1, 36.62],
  '扬州': [119.42, 32.39],
  '盐城': [120.13, 33.38],
  '泰州': [119.9, 32.45],
  '镇江': [119.44, 32.2],
  '金华': [119.64, 29.08],
  '台州': [121.42, 28.66],
  '嘉兴': [120.76, 30.74],
  '湖州': [120.1, 30.86],
  '惠州': [114.4, 23.12],
  '中山': [113.38, 22.52],
  '珠海': [113.57, 22.27],
  '江门': [113.06, 22.61],
  '湛江': [110.36, 21.27],
  '茂名': [110.93, 21.66],
  '桂林': [110.28, 25.29],
  '柳州': [109.4, 24.33],
  '遵义': [106.9, 27.73],
  '绵阳': [104.68, 31.47],
  '洛阳': [112.45, 34.62],
  '开封': [114.35, 34.79],
  '保定': [115.47, 38.87],
  '唐山': [118.18, 39.63],
  '秦皇岛': [119.59, 39.94],
  '吉林': [126.55, 43.88],
  '齐齐哈尔': [123.95, 47.33],
  '大庆': [125.03, 46.59],
  '洛阳': [112.45, 34.62],
  '襄阳': [112.12, 32.08],
  '宜昌': [111.28, 30.7],
  '荆州': [112.24, 30.33],
  '南阳': [112.53, 33.0],
  '赣州': [114.93, 25.85],
  '九江': [116.0, 29.71],
  '芜湖': [118.38, 31.33],
  '蚌埠': [117.38, 32.92],
  '阜阳': [115.82, 32.89],
  '宿州': [116.96, 33.64],
  '滁州': [118.32, 32.3],
  '淮安': [119.02, 33.6],
  '连云港': [119.22, 34.59],
  '丽水': [119.92, 28.47],
  '龙岩': [117.02, 25.08],
  '漳州': [117.65, 24.52],
  '莆田': [119.0, 25.45],
  '三明': [117.63, 26.26],
  '宁德': [119.52, 26.66],
  '南平': [118.16, 26.65],
  '滨州': [118.02, 37.38],
  '德州': [116.3, 37.44],
  '聊城': [115.98, 36.45],
  '济宁': [116.58, 35.41],
  '泰安': [117.08, 36.18],
  '临沂': [118.35, 35.05],
  '菏泽': [115.48, 35.23],
  '枣庄': [117.32, 34.82],
  '日照': [119.52, 35.42],
  '东营': [118.67, 37.43],
  '威海': [122.12, 37.5],
  '莱芜': [117.67, 36.21],
  '安庆': [117.02, 30.53],
  '淮南': [116.98, 32.62],
  '马鞍山': [118.5, 31.67],
  '淮北': [116.8, 33.95],
  '铜陵': [117.8, 30.93],
  '池州': [117.48, 30.66],
  '宣城': [118.75, 30.94],
  '亳州': [115.77, 33.84],
  '六安': [116.5, 31.77],
  '黄山': [118.33, 29.72],
  '朔州': [112.43, 39.33],
  '忻州': [112.73, 38.42],
  '晋中': [112.75, 37.68],
  '运城': [111.0, 35.02],
  '临汾': [111.52, 36.08],
  '吕梁': [111.13, 37.52],
  '晋城': [112.83, 35.49],
  '长治': [113.12, 36.2],
  '阳泉': [113.57, 37.85],
  '大同': [113.3, 40.08],
  '葫芦岛': [120.86, 40.75],
  '锦州': [121.13, 41.1],
  '丹东': [124.35, 40.0],
  '抚顺': [123.97, 41.88],
  '营口': [122.23, 40.67],
  '辽阳': [123.17, 41.27],
  '盘锦': [122.07, 41.12],
  '铁岭': [123.83, 42.29],
  '朝阳': [120.45, 41.57],
  '阜新': [121.97, 42.01],
  '本溪': [123.68, 41.3],
  '四平': [124.35, 43.17],
  '辽源': [125.15, 42.9],
  '通化': [125.93, 41.73],
  '白山': [126.42, 41.94],
  '松原': [124.82, 45.14],
  '白城': [122.83, 45.62],
  '延边': [129.51, 42.89],
  '绥化': [126.97, 46.64],
  '黑河': [127.53, 50.24],
  '伊春': [128.9, 47.73],
  '鹤岗': [130.3, 47.35],
  '双鸭山': [131.15, 46.65],
  '鸡西': [130.97, 45.3],
  '七台河': [131.0, 45.77],
  '牡丹江': [129.63, 44.55],
  '大兴安岭': [124.12, 51.24],
  '梧州': [111.28, 23.48],
  '北海': [109.12, 21.49],
  '防城港': [108.35, 21.7],
  '钦州': [108.62, 21.98],
  '贵港': [109.6, 23.1],
  '玉林': [110.18, 22.65],
  '百色': [106.62, 23.9],
  '贺州': [111.55, 24.4],
  '河池': [108.06, 24.7],
  '来宾': [109.22, 23.75],
  '崇左': [107.37, 22.4],
  '铜川': [108.95, 34.9],
  '宝鸡': [107.15, 34.38],
  '咸阳': [108.7, 34.33],
  '渭南': [109.77, 34.5],
  '延安': [109.48, 36.6],
  '榆林': [109.73, 38.28],
  '汉中': [107.02, 33.07],
  '安康': [109.02, 32.7],
  '商洛': [109.93, 33.87],
  '白银': [104.13, 36.54],
  '天水': [105.72, 34.58],
  '武威': [102.63, 37.93],
  '张掖': [100.45, 38.93],
  '平凉': [106.67, 35.55],
  '酒泉': [98.5, 39.74],
  '庆阳': [107.63, 35.73],
  '定西': [104.57, 35.58],
  '陇南': [104.92, 33.4],
  '临夏': [103.22, 35.6],
  '甘南': [102.91, 34.99],
  '海东': [102.4, 36.48],
  '海北': [100.9, 36.96],
  '黄南': [102.02, 35.52],
  '海南州': [100.62, 36.29],
  '果洛': [100.23, 34.48],
  '玉树': [97.0, 33.0],
  '海西': [97.37, 37.37],
  '石嘴山': [106.38, 39.02],
  '吴忠': [106.2, 37.97],
  '固原': [106.28, 36.0],
  '中卫': [105.18, 37.5],
  '克拉玛依': [84.87, 45.6],
  '吐鲁番': [89.18, 42.95],
  '哈密': [93.52, 42.83],
  '昌吉': [87.3, 44.02],
  '博尔塔拉': [82.07, 44.91],
  '巴音郭楞': [86.15, 41.76],
  '阿克苏': [80.26, 41.17],
  '克孜勒苏': [76.17, 39.72],
  '喀什': [75.98, 39.47],
  '和田': [79.92, 37.12],
  '伊犁': [81.32, 43.92],
  '塔城': [82.98, 46.75],
  '阿勒泰': [88.13, 47.84],
  '西宁': [101.78, 36.62],
  '果洛': [100.23, 34.48],
  '海西': [97.37, 37.37],
  '那曲': [92.05, 31.48],
  '林芝': [94.37, 29.68],
  '山南': [91.77, 29.23],
  '日喀则': [88.88, 29.27],
  '昌都': [97.18, 31.14],
  '阿里': [80.1, 32.5],
  '神农架': [110.68, 31.75],
  '仙桃': [113.45, 30.37],
  '潜江': [112.9, 30.42],
  '天门': [113.1, 30.66],
  '恩施': [109.47, 30.3],
  '随州': [113.38, 31.69],
  '荆门': [112.2, 31.03],
  '孝感': [113.92, 30.93],
  '黄石': [115.03, 30.2],
  '咸宁': [114.32, 29.85],
  '黄冈': [114.87, 30.45],
  '鄂州': [114.88, 30.39],
  '十堰': [110.78, 32.65],
  '荆州': [112.24, 30.33],
  '襄阳': [112.12, 32.08],
  '宜昌': [111.28, 30.7],
  '娄底': [111.96, 27.73],
  '邵阳': [111.47, 27.23],
  '岳阳': [113.12, 29.37],
  '张家界': [110.47, 29.13],
  '益阳': [112.35, 28.55],
  '郴州': [113.02, 25.78],
  '永州': [111.62, 26.43],
  '怀化': [109.98, 27.55],
  '湘西': [109.73, 28.32],
  '吉首': [109.73, 28.3],
  '衡阳': [112.57, 26.9],
  '湘潭': [112.93, 27.83],
  '株洲': [113.13, 27.83],
  '韶关': [113.6, 24.82],
  '汕头': [116.68, 23.35],
  '梅州': [116.1, 24.28],
  '河源': [114.69, 23.74],
  '清远': [113.05, 23.68],
  '潮州': [116.62, 23.66],
  '揭阳': [116.37, 23.55],
  '汕尾': [115.36, 22.78],
  '云浮': [112.03, 22.92],
  '阳江': [111.98, 21.87],
  '茂名': [110.93, 21.66],
  '湛江': [110.36, 21.27],
  '安顺': [105.93, 26.25],
  '遵义': [106.9, 27.73],
  '六盘水': [104.83, 26.6],
  '毕节': [105.28, 27.3],
  '铜仁': [109.18, 27.72],
  '黔西南': [104.9, 25.1],
  '黔东南': [107.98, 26.58],
  '黔南': [107.52, 26.26],
  '曲靖': [103.79, 25.49],
  '玉溪': [102.52, 24.35],
  '保山': [99.17, 25.12],
  '昭通': [103.72, 27.34],
  '丽江': [100.23, 26.88],
  '普洱': [100.97, 22.83],
  '临沧': [100.08, 23.88],
  '楚雄': [101.52, 25.03],
  '红河': [103.37, 23.36],
  '文山': [104.22, 23.37],
  '西双版纳': [100.8, 22.02],
  '大理': [100.27, 25.59],
  '德宏': [98.58, 24.43],
  '怒江': [98.85, 25.82],
  '迪庆': [99.7, 27.73],
  '攀枝花': [101.72, 26.58],
  '自贡': [104.78, 29.34],
  '泸州': [105.42, 28.87],
  '德阳': [104.4, 31.13],
  '绵阳': [104.68, 31.47],
  '广元': [105.83, 32.43],
  '遂宁': [105.57, 30.51],
  '内江': [105.06, 29.58],
  '乐山': [103.77, 29.56],
  '南充': [106.11, 30.8],
  '眉山': [103.85, 30.07],
  '宜宾': [104.63, 28.77],
  '广安': [106.63, 30.47],
  '达州': [107.47, 31.2],
  '雅安': [103.0, 29.98],
  '巴中': [106.75, 31.87],
  '资阳': [104.63, 30.12],
  '阿坝': [102.22, 31.9],
  '甘孜': [101.96, 30.05],
  '凉山': [102.27, 27.88]
}

const compareTypeLabels: Record<string, string> = {
  hospital_count: '医院数',
  doctor_count: '医生数',
  consultation_count: '问诊量',
  avg_hospital_level: '平均等级',
  avg_consultation_price: '平均价格',
  avg_recommendation_star: '平均评分'
}

const compareTypeLabel = computed(() => compareTypeLabels[compareType.value] || '数值')

const top10Cities = computed(() => {
  return [...cityData.value].sort((a, b) => b[compareType.value] - a[compareType.value]).slice(0, 10)
})

const maxValue = computed(() => {
  if (cityData.value.length === 0) return 10000
  return Math.max(...cityData.value.map((d: any) => d[compareType.value] || 0), 1)
})

const mapOption = reactive({
  tooltip: {
    trigger: 'item',
    formatter: (params: any) => {
      if (params.data && params.data.value) {
        const value = params.data.value[2]
        return `${params.data.name}<br/>${compareTypeLabel.value}: ${value?.toLocaleString() || '-'}`
      }
      return params.data?.name || ''
    }
  },
  visualMap: {
    type: 'continuous',
    min: 0,
    max: 0,
    calculable: true,
    orient: 'vertical',
    left: 'right',
    bottom: '20%',
    inRange: {
      color: ['#50a3ba', '#eac736', '#d94e5d']
    },
    text: ['高', '低']
  },
  geo: {
    map: '',
    roam: true,
    zoom: 1.2,
    center: [105, 36],
    label: {
      show: false
    },
    itemStyle: {
      borderColor: '#4891d3',
      borderWidth: 1,
      areaColor: '#e6f0f7',
      shadowColor: 'rgba(0, 0, 0, 0.2)',
      shadowBlur: 10
    },
    emphasis: {
      label: {
        show: true,
        color: '#333'
      },
      itemStyle: {
        areaColor: '#c8e6f5'
      }
    }
  },
  series: [{
    name: '',
    type: 'scatter',
    coordinateSystem: 'geo',
    data: [] as any[],
    symbolSize: (val: any) => {
      const value = val[2] || 0
      const baseSize = 8
      const maxVal = maxValue.value
      return Math.max(baseSize, Math.min(40, (value / maxVal) * 40 + baseSize))
    },
    emphasis: {
      scale: 1.5
    },
    itemStyle: {
      color: (params: any) => {
        const value = params.data?.value?.[2] || 0
        const ratio = value / maxValue.value
        if (ratio > 0.7) return '#d94e5d'
        if (ratio > 0.4) return '#eac736'
        return '#50a3ba'
      },
      shadowBlur: 10,
      shadowColor: 'rgba(0, 0, 0, 0.3)'
    }
  }]
})

const barOption = reactive({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const data = params[0]
      return `${data.name}<br/>${data.seriesName}: ${data.value?.toLocaleString() || '-'}`
    }
  },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'value',
    axisLabel: {
      formatter: (val: number) => val >= 10000 ? (val / 10000).toFixed(1) + '万' : val.toString()
    }
  },
  yAxis: {
    type: 'category',
    data: [] as string[],
    axisLabel: { fontSize: 11 }
  },
  series: [{
    name: '',
    type: 'bar',
    data: [] as number[],
    itemStyle: {
      color: (params: any) => {
        const ratio = params.value / maxValue.value
        if (ratio > 0.7) return '#d94e5d'
        if (ratio > 0.4) return '#eac736'
        return '#50a3ba'
      },
      borderRadius: [0, 4, 4, 0]
    },
    label: {
      show: true,
      position: 'right',
      formatter: (params: any) => params.value >= 10000 ? (params.value / 10000).toFixed(1) + '万' : params.value.toString(),
      fontSize: 10
    }
  }]
})

const detailOption = reactive({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross' }
  },
  legend: {
    data: [],
    bottom: 0
  },
  grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
  xAxis: {
    type: 'category',
    data: [] as string[],
    axisLabel: { rotate: 30, fontSize: 11 }
  },
  yAxis: [
    {
      type: 'value',
      name: '',
      position: 'left',
      axisLabel: {
        formatter: (val: number) => val >= 10000 ? (val / 10000).toFixed(0) + '万' : val.toString()
      }
    }
  ],
  series: [
    {
      name: '',
      type: 'bar',
      data: [] as number[],
      itemStyle: { color: '#5470c6' },
      barWidth: '40%'
    }
  ]
})

const loadMapData = () => {
  if (!cityData.value || cityData.value.length === 0 || !mapOption) return
  
  // 更新 visualMap 的最大值
  const maxVal = maxValue.value
  mapOption.visualMap.max = maxVal
  
  const mapData = cityData.value
    .filter((city: any) => cityCoordinates[city.city])
    .map((city: any) => ({
      name: city.city,
      value: [...cityCoordinates[city.city], city[compareType.value] || 0]
    }))
  mapOption.series[0].name = compareTypeLabel.value
  mapOption.series[0].data = mapData
  
  console.log('[CityMedicalComparison] loadMapData - maxVal:', maxVal, 'data:', mapData.length)
}

const loadBarData = () => {
  if (!cityData.value || cityData.value.length === 0 || !barOption) return
  const sorted = [...cityData.value].sort((a, b) => b[compareType.value] - a[compareType.value]).slice(0, 10)
  barOption.series[0].name = compareTypeLabel.value
  barOption.yAxis.data = sorted.map((d: any) => d.city).reverse()
  barOption.series[0].data = sorted.map((d: any) => d[compareType.value] || 0).reverse()
}

const loadDetailData = () => {
  if (!cityData.value || cityData.value.length === 0) return
  if (!detailOption) return
  
  const sorted = [...cityData.value].sort((a, b) => b[compareType.value] - a[compareType.value]).slice(0, 15)
  const option = detailOption
  if (!option || !option.legend) return
  
  option.legend.data = [compareTypeLabel.value]
  option.yAxis[0].name = compareTypeLabel.value
  option.series[0].name = compareTypeLabel.value
  option.xAxis.data = sorted.map((d: any) => d.city)
  option.series[0].data = sorted.map((d: any) => d[compareType.value] || 0)
}

const handleTypeChange = () => {
  console.log('[CityMedicalComparison] 对比类型切换:', compareType.value)
  console.log('[CityMedicalComparison] 城市数据条数:', cityData.value.length)
  console.log('[CityMedicalComparison] maxValue:', maxValue.value)
  
  // 强制重新计算并加载数据
  setTimeout(() => {
    loadMapData()
    loadBarData()
    loadDetailData()
  }, 50)
}

const isMapReady = ref(false)

const initChinaMap = async () => {
  try {
    const response = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
    const chinaGeoJson = await response.json()
    echarts.registerMap('china', chinaGeoJson)
    mapOption.geo.map = 'china'
    isMapReady.value = true
    console.log('[CityMedicalComparison] 中国地图加载成功')
  } catch (error) {
    console.error('加载中国地图数据失败:', error)
  }
}

const loadData = async () => {
  loading.value = true
  try {
    console.log('[CityMedicalComparison] 开始请求数据...')
    const res = await dataAPI.getCityMedicalComparison()
    console.log('[CityMedicalComparison] API响应:', res)
    
    if (res.success && Array.isArray(res.data?.list)) {
      cityData.value = res.data.list
      console.log('[CityMedicalComparison] 城市数据:', cityData.value)
      
      // 等待图表初始化完成
      setTimeout(() => {
        try {
          loadMapData()
          loadBarData()
          loadDetailData()
        } catch (e) {
          console.error('[CityMedicalComparison] 图表加载失败:', e)
        }
      }, 100)
    } else {
      console.warn('[CityMedicalComparison] 数据为空:', res)
    }
  } catch (error) {
    console.error('[CityMedicalComparison] 加载失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await initChinaMap()
  await loadData()
})
</script>

<style scoped>
.city-medical-compare { padding: 16px; background: linear-gradient(135deg, #e0f7fa 0%, #f5f7fa 50%, #e8f5e9 100%); min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%); padding: 16px 20px; border-radius: 12px; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 12px rgba(0, 184, 148, 0.08); }
.page-title { margin: 0; font-size: 18px; background: linear-gradient(135deg, #00bcd4, #4dd0e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.header-right { display: flex; gap: 12px; align-items: center; }
.map-card, .rank-card, .detail-card { border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 184, 148, 0.1); margin-bottom: 16px; background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%); }
.chart-container-map { height: 480px; }
.chart-container-bar { height: 480px; }
.chart-container-detail { height: 350px; }
</style>
