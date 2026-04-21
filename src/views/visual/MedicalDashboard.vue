<template>
  <div class="medical-comparison-container">
    <div class="header">
      <h2>城市医疗资源对比分析</h2>
      <div class="filter-section">
        <label>数据筛选：</label>
        <select v-model="filterType" @change="updateCharts">
          <option value="consultation_count">按问诊量</option>
          <option value="hospital_count">按医院数</option>
          <option value="doctor_count">按医生数</option>
        </select>
      </div>
    </div>

    <div class="main-content">
      <div class="map-section">
        <div class="map-container" ref="mapChartRef"></div>
        <div class="map-legend">
          <div class="legend-title">{{ filterTypeLabel }}分布</div>
          <div class="legend-colors">
            <span class="color-block low"></span>
            <span>低</span>
            <span class="color-block medium"></span>
            <span>中</span>
            <span class="color-block high"></span>
            <span>高</span>
          </div>
        </div>
        <div class="breadcrumb" v-if="currentProvince">
          <span @click="backToChina">中国</span>
          <span> > {{ currentProvince }}</span>
        </div>
      </div>

      <div class="ranking-section">
        <h3>TOP10 城市排行榜</h3>
        <div class="ranking-list" ref="rankingChartRef"></div>
      </div>
    </div>

    <div class="trend-section">
      <h3>医疗资源趋势分析</h3>
      <div class="trend-chart" ref="trendChartRef"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { dataAPI } from '@/api/data'
import { message } from 'ant-design-vue'

const mapChartRef = ref(null)
const rankingChartRef = ref(null)
const trendChartRef = ref(null)

let mapChart = null
let rankingChart = null
let trendChart = null
let chinaMapData = null

const currentProvince = ref('')
const filterType = ref('consultation_count')
const loading = ref(false)

const cityDataFromApi = ref([])

const filterTypeLabel = computed(() => {
  const labels = {
    consultation_count: '问诊量',
    hospital_count: '医院数',
    doctor_count: '医生数'
  }
  return labels[filterType.value]
})

const trendData = ref({
  months: [],
  consultation: []
})

const cityCoordinates = {
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
  '苏州': [120.62, 31.32]
}

const provinceCoordinates = {
  '北京': [116.46, 39.92],
  '天津': [117.2, 39.13],
  '河北': [114.48, 38.03],
  '山西': [112.53, 37.87],
  '内蒙古': [111.65, 40.82],
  '辽宁': [123.43, 41.8],
  '吉林': [125.32, 43.82],
  '黑龙江': [128.68, 47.75],
  '上海': [121.48, 31.22],
  '江苏': [118.76, 32.06],
  '浙江': [120.19, 30.26],
  '安徽': [117.25, 31.86],
  '福建': [118.3, 26.08],
  '江西': [115.86, 28.68],
  '山东': [118.01, 36.67],
  '河南': [113.62, 34.75],
  '湖北': [114.29, 30.59],
  '湖南': [112.98, 28.2],
  '广东': [113.27, 23.17],
  '广西': [108.33, 22.84],
  '海南': [110.35, 20.02],
  '重庆': [106.54, 29.59],
  '四川': [104.06, 30.67],
  '贵州': [106.71, 26.6],
  '云南': [101.49, 25.04],
  '西藏': [91.11, 29.65],
  '陕西': [108.95, 34.27],
  '甘肃': [103.83, 36.06],
  '青海': [101.78, 36.62],
  '宁夏': [106.23, 38.49],
  '新疆': [87.62, 43.79],
  '香港': [114.15, 22.3],
  '澳门': [113.55, 22.2],
  '台湾': [121.5, 25.03]
}

const provinceCityMap = {
  '北京': ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区'],
  '上海': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'],
  '广东': ['广州', '深圳', '珠海', '东莞', '佛山', '中山', '惠州', '江门', '茂名', '湛江', '肇庆', '汕头', '韶关', '梅州', '汕尾', '河源', '阳江', '清远', '潮州', '揭阳', '云浮'],
  '浙江': ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水'],
  '江苏': ['南京', '苏州', '无锡', '常州', '镇江', '南通', '扬州', '盐城', '徐州', '淮安', '连云港', '泰州', '宿迁'],
  '四川': ['成都', '绵阳', '德阳', '宜宾', '南充', '乐山', '眉山', '自贡', '内江', '广元', '遂宁', '雅安', '资阳', '攀枝花', '泸州', '达州', '巴中', '广安'],
  '湖北': ['武汉', '宜昌', '襄阳', '荆州', '黄石', '十堰', '孝感', '荆门', '鄂州', '黄冈', '咸宁', '随州', '恩施', '仙桃', '潜江', '天门', '神农架'],
  '陕西': ['西安', '宝鸡', '咸阳', '铜川', '渭南', '延安', '榆林', '汉中', '安康', '商洛'],
  '重庆': ['渝中区', '万州区', '涪陵区', '渝北区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '璧山区', '大足区', '綦江区', '合川区', '永川区', '江津区', '长寿区', '开州区', '云阳县', '奉节县', '巫山县'],
  '山东': ['济南', '青岛', '烟台', '威海', '潍坊', '淄博', '临沂', '济宁', '泰安', '德州', '聊城', '滨州', '菏泽', '枣庄', '日照', '东营'],
  '河南': ['郑州', '洛阳', '开封', '南阳', '新乡', '安阳', '焦作', '商丘', '信阳', '周口', '驻马店', '平顶山', '许昌', '漯河', '濮阳', '三门峡', '鹤壁'],
  '河北': ['石家庄', '保定', '唐山', '邯郸', '秦皇岛', '邢台', '张家口', '承德', '沧州', '廊坊', '衡水'],
  '湖南': ['长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西'],
  '安徽': ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '阜阳', '宿州', '滁州', '六安', '宣城', '池州', '亳州'],
  '福建': ['福州', '厦门', '泉州', '漳州', '莆田', '宁德', '三明', '南平', '龙岩'],
  '江西': ['南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶'],
  '辽宁': ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛'],
  '吉林': ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边'],
  '黑龙江': ['哈尔滨', '齐齐哈尔', '牡丹江', '佳木斯', '大庆', '鸡西', '双鸭山', '伊春', '七台河', '鹤岗', '黑河', '绥化', '大兴安岭'],
  '山西': ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁'],
  '内蒙古': ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安', '锡林郭勒', '阿拉善'],
  '广西': ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左'],
  '海南': ['海口', '三亚', '三沙', '儋州', '五指山', '琼海', '文昌', '万宁', '东方'],
  '贵州': ['贵阳', '遵义', '六盘水', '安顺', '毕节', '铜仁', '黔西南', '黔东南', '黔南'],
  '云南': ['昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆'],
  '西藏': ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里'],
  '陕西': ['西安', '宝鸡', '咸阳', '铜川', '渭南', '延安', '榆林', '汉中', '安康', '商洛'],
  '甘肃': ['兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏', '甘南'],
  '青海': ['西宁', '海东', '海北', '黄南', '海南', '果洛', '玉树', '海西'],
  '宁夏': ['银川', '石嘴山', '吴忠', '固原', '中卫'],
  '新疆': ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '巴音郭楞', '阿克苏', '克孜勒苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰'],
  '天津': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区']
}

const currentView = ref('china')

const getProvinceAdCode = (provinceName) => {
  const adCodeMap = {
    '北京': '110000', '天津': '120000', '河北': '130000', '山西': '140000',
    '内蒙古': '150000', '辽宁': '210000', '吉林': '220000', '黑龙江': '230000',
    '上海': '310000', '江苏': '320000', '浙江': '330000', '安徽': '340000',
    '福建': '350000', '江西': '360000', '山东': '370000', '河南': '410000',
    '湖北': '420000', '湖南': '430000', '广东': '440000', '广西': '450000',
    '海南': '460000', '重庆': '500000', '四川': '510000', '贵州': '520000',
    '云南': '530000', '西藏': '540000', '陕西': '610000', '甘肃': '620000',
    '青海': '630000', '宁夏': '640000', '新疆': '650000', '台湾': '710000',
    '香港': '810000', '澳门': '820000'
  }
  return adCodeMap[provinceName] || ''
}

const loadProvinceMap = async (provinceName, adCode) => {
  try {
    const response = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adCode}_full.json`)
    const provinceData = await response.json()
    return provinceData
  } catch (error) {
    console.error(`Failed to load province map for ${provinceName}:`, error)
    return null
  }
}

const drillDown = async (provinceName) => {
  if (!provinceCityMap[provinceName]) {
    console.log('该省份暂不支持下钻:', provinceName)
    return
  }

  const adCode = getProvinceAdCode(provinceName)
  if (!adCode) return

  currentProvince.value = provinceName
  currentView.value = 'province'

  const provinceData = await loadProvinceMap(provinceName, adCode)
  if (!provinceData) return

  echarts.registerMap(provinceName, provinceData)

  const cities = provinceCityMap[provinceName] || []
  const cityDataMap = new Map(cityDataFromApi.value.map((item) => [item.city, Number(item[filterType.value] || 0)]))
  const cityData = cities.map((city) => ({
    name: city,
    value: cityDataMap.get(city) || 0
  }))

  const center = provinceCoordinates[provinceName] || [104, 36]

  const option = {
    backgroundColor: '#f5f7fa',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#ccc',
      borderWidth: 1,
      padding: [10, 15],
      textStyle: { color: '#333', fontSize: 13 },
      formatter: function(params) {
        if (params.seriesType === 'map') {
          return `<div style="font-weight:bold;">${params.name}</div><div style="margin-top:4px;">数据加载中...</div>`
        }
        return ''
      }
    },
    visualMap: {
      min: 0,
      max: 600000,
      left: 'left',
      top: 'bottom',
      text: ['高', '低'],
      calculable: true,
      inRange: {
        color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
      }
    },
    geo: {
      map: provinceName,
      roam: true,
      zoom: 1.2,
      center: center,
      label: { show: true, fontSize: 10 },
      itemStyle: {
        areaColor: '#e0e8f0',
        borderColor: '#fff',
        borderWidth: 1
      },
      emphasis: {
        label: { show: true, color: '#fff' },
        itemStyle: { areaColor: '#4575b4' }
      }
    },
    series: [{
      name: '城市数据',
      type: 'map',
      map: provinceName,
      geoIndex: 0,
      data: cityData
    }]
  }

  mapChart.setOption(option)
}

const isMapReady = ref(false)

const initMapChart = async () => {
  if (!mapChartRef.value) return

  mapChart = echarts.init(mapChartRef.value)

  try {
    const response = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
    chinaMapData = await response.json()
    echarts.registerMap('china', chinaMapData)
    isMapReady.value = true
  } catch (error) {
    console.error('Failed to load China map data:', error)
    return
  }

  updateMapChart()
}

const updateMapChart = () => {
  if (!mapChart) return
  if (!isMapReady.value) {
    console.warn('[MedicalDashboard] 地图未加载完成，等待中...')
    setTimeout(updateMapChart, 100)
    return
  }

  const dataSource = cityDataFromApi.value

  const mapData = dataSource.map(item => ({
    name: item.city,
    value: item[filterType.value]
  }))

  const scatterData = dataSource.map(item => ({
    name: item.city,
    value: [...(cityCoordinates[item.city] || [0, 0]), item.hospital_count, item.doctor_count, item.consultation_count, item.avg_recommendation_star, item.ranking, item.hot_hospital, item.hot_department]
  }))

  const option = {
    backgroundColor: '#f5f7fa',
    title: {
      text: '',
      left: 'center',
      top: 20,
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#ccc',
      borderWidth: 1,
      padding: [10, 15],
      textStyle: {
        color: '#333',
        fontSize: 13
      },
      formatter: function(params) {
        if (params.seriesType === 'scatter') {
          const data = params.data
          return `
            <div style="font-weight:bold;margin-bottom:8px;font-size:14px;">${data.name}</div>
            <div style="margin:4px 0;"><span style="color:#666;">排名：</span><span style="color:#e74c3c;font-weight:bold;">第 ${data.value[5]} 名</span></div>
            <div style="margin:4px 0;"><span style="color:#666;">热门医院：</span><span style="color:#3498db;">${data.value[6]}</span></div>
            <div style="margin:4px 0;"><span style="color:#666;">热门科室：</span><span style="color:#27ae60;">${data.value[7]}</span></div>
            <hr style="margin:8px 0;border:none;border-top:1px solid #eee;">
            <div style="margin:4px 0;"><span style="color:#666;">医院数量：</span>${data.value[2]} 家</div>
            <div style="margin:4px 0;"><span style="color:#666;">医生数量：</span>${data.value[3].toLocaleString()} 人</div>
            <div style="margin:4px 0;"><span style="color:#666;">问诊量：</span>${data.value[4].toLocaleString()} 次</div>
            <div style="margin:4px 0;"><span style="color:#666;">推荐星级：</span>${data.value[8]} ⭐</div>
          `
        }
        return ''
      }
    },
    visualMap: {
      min: Math.min(...dataSource.map(d => Number(d[filterType.value] || 0)), 0),
      max: Math.max(...dataSource.map(d => Number(d[filterType.value] || 0)), 1),
      left: 'left',
      top: 'bottom',
      text: ['高', '低'],
      calculable: true,
      inRange: {
        color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
      },
      textStyle: {
        color: '#666'
      }
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.2,
      center: [104, 36],
      label: {
        show: false
      },
      itemStyle: {
        areaColor: '#e0e8f0',
        borderColor: '#fff',
        borderWidth: 1
      },
      emphasis: {
        label: {
          show: true,
          color: '#fff'
        },
        itemStyle: {
          areaColor: '#4575b4'
        }
      }
    },
    series: [
      {
        name: '地图',
        type: 'map',
        map: 'china',
        geoIndex: 0,
        data: mapData,
        selectedMode: 'single',
        select: {
          itemStyle: {
            areaColor: '#313695'
          }
        }
      },
      {
        name: '医疗资源',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: function(val) {
          return Math.sqrt(val[3]) / 20
        },
        showEffectOn: 'render',
        rippleEffect: {
          brushType: 'stroke',
          scale: 3
        },
        label: {
          formatter: '{b}',
          position: 'right',
          show: true,
          fontSize: 11,
          color: '#333'
        },
        itemStyle: {
          color: '#e74c3c',
          shadowBlur: 10,
          shadowColor: 'rgba(231, 76, 60, 0.5)'
        },
        zlevel: 1
      }
    ]
  }

  mapChart.setOption(option)

  mapChart.off('click')
  mapChart.on('click', function(params) {
    if (currentView.value === 'china') {
      if (params.name && provinceCityMap[params.name]) {
        drillDown(params.name)
      } else if (params.componentType === 'series' && params.seriesType === 'scatter') {
        console.log('点击了城市:', params.name)
      }
    }
  })
}

const initRankingChart = () => {
  if (!rankingChartRef.value) return

  rankingChart = echarts.init(rankingChartRef.value)
  updateRankingChart()
}

const updateRankingChart = () => {
  if (!rankingChart) return

  const dataSource = cityDataFromApi.value

  const sortedData = [...dataSource]
    .sort((a, b) => b[filterType.value] - a[filterType.value])
    .slice(0, 10)
    .reverse()

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '15%',
      right: '15%',
      top: '5%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'category',
      data: sortedData.map(d => d.city),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 12,
        color: '#666',
        formatter: function(value) {
          const index = sortedData.findIndex(d => d.city === value)
          return `{${index < 3 ? 'top' : 'normal'}|${value}}`
        },
        rich: {
          top: {
            color: '#e74c3c',
            fontWeight: 'bold',
            fontSize: 13
          },
          normal: {
            color: '#666'
          }
        }
      }
    },
    series: [
      {
        type: 'bar',
        data: sortedData.map((d, index) => ({
          value: d[filterType.value],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: index < 3 ? '#e74c3c' : '#74add1' },
              { offset: 1, color: index < 3 ? '#c0392b' : '#4575b4' }
            ]),
            borderRadius: [0, 4, 4, 0]
          }
        })),
        barWidth: 18,
        label: {
          show: true,
          position: 'right',
          formatter: function(params) {
            if (filterType.value === 'consultation_count') {
              return (params.value / 10000).toFixed(0) + '万'
            }
            return params.value.toLocaleString()
          },
          color: '#666',
          fontSize: 11
        }
      }
    ]
  }

  rankingChart.setOption(option)
}

const initTrendChart = () => {
  if (!trendChartRef.value) return

  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

const updateTrendChart = () => {
  if (!trendChart) return

  const option = {
    backgroundColor: '#fafbfc',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['问诊量（万次）'],
      bottom: 10,
      textStyle: {
        color: '#666'
      }
    },
    grid: {
      left: '5%',
      right: '5%',
      top: '10%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.value.months,
      axisLine: {
        lineStyle: { color: '#ddd' }
      },
      axisLabel: {
        color: '#666'
      }
    },
    yAxis: {
      type: 'value',
      name: '问诊量',
      position: 'left',
      axisLine: {
        show: true,
        lineStyle: { color: '#e74c3c' }
      },
      axisLabel: {
        color: '#666',
        formatter: '{value}'
      },
      splitLine: {
        lineStyle: { color: '#eee' }
      }
    },
    series: [
      {
        name: '问诊量（万次）',
        type: 'line',
        data: trendData.value.consultation.map(v => v / 10000),
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#e74c3c'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(231, 76, 60, 0.3)' },
            { offset: 1, color: 'rgba(231, 76, 60, 0.05)' }
          ])
        },
        itemStyle: {
          color: '#e74c3c'
        }
      }
    ]
  }

  trendChart.setOption(option)
}

const updateCharts = () => {
  updateMapChart()
  updateRankingChart()
}

const backToChina = () => {
  currentProvince.value = ''
  currentView.value = 'china'
  updateMapChart()
}

const handleResize = () => {
  mapChart && mapChart.resize()
  rankingChart && rankingChart.resize()
  trendChart && trendChart.resize()
}

const loadData = async () => {
  loading.value = true
  try {
    const result = await dataAPI.getCityMedicalComparison({})
    const cityList = result?.success ? (result.data?.list || result.data?.data?.list || []) : []
    if (cityList.length > 0) {
      cityDataFromApi.value = cityList.map((item, idx) => ({
        ...item,
        city: item.city || item.city_name || '',
        hospital_count: item.hospital_count || item.hospitals || 0,
        doctor_count: item.doctor_count || item.doctors || 0,
        consultation_count: item.consultation_count || item.consultations || 0,
        avg_recommendation_star: item.avg_recommendation_star || item.star || 0,
        ranking: item.ranking || idx + 1,
        hot_hospital: item.hot_hospital || item.top_hospital || '',
        hot_department: item.hot_department || item.top_department || ''
      }))
      message.success(`加载成功，共 ${cityDataFromApi.value.length} 条数据`)
      updateMapChart()
      updateRankingChart()
      const trendRes = await dataAPI.getConsultationTrend({ period: 'month', limit: 12 })
      const trendList = trendRes?.success ? (trendRes.data?.list || trendRes.data?.data?.list || []) : []
      const groupedTrend = {}
      trendList.forEach((item) => {
        const month = String(item.consultation_date || item.month || '').slice(0, 7)
        groupedTrend[month] = (groupedTrend[month] || 0) + Number(item.consultation_count || 0)
      })
      const months = Object.keys(groupedTrend).sort()
      trendData.value = {
        months,
        consultation: months.map((month) => groupedTrend[month])
      }
      updateTrendChart()
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
  initMapChart()
  initRankingChart()
  initTrendChart()

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)

  try {
    if (mapChart) {
      mapChart.dispose()
      mapChart = null
    }
    if (rankingChart) {
      rankingChart.dispose()
      rankingChart = null
    }
    if (trendChart) {
      trendChart.dispose()
      trendChart = null
    }
  } catch (e) {
    console.warn('ECharts dispose error:', e)
  }
})
</script>

<style scoped>
.medical-comparison-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #0c1426 0%, #1a2332 100%);
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
}

.header {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  background: linear-gradient(135deg, #4fc3ff 0%, #00d4aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-section label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.filter-section select {
  padding: 8px 16px;
  border: 2px solid #4fc3ff;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  transition: all 0.3s ease;
  background: white;
  color: #333;
}

.filter-section select:hover {
  border-color: #00d4aa;
}

.filter-section select:focus {
  border-color: #4fc3ff;
  box-shadow: 0 0 0 3px rgba(79, 195, 255, 0.2);
}

.main-content {
  flex: 1;
  display: flex;
  gap: 20px;
  min-height: 0;
}

.map-section {
  flex: 2;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.map-container {
  flex: 1;
  min-height: 400px;
}

.map-legend {
  position: absolute;
  bottom: 30px;
  left: 30px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.legend-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.legend-colors {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #999;
}

.color-block {
  width: 20px;
  height: 12px;
  border-radius: 2px;
}

.color-block.low {
  background: #e0f3f8;
}

.color-block.medium {
  background: #74add1;
}

.color-block.high {
  background: #313695;
}

.breadcrumb {
  position: absolute;
  top: 30px;
  left: 30px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: #4fc3ff;
}

.breadcrumb span:first-child:hover {
  text-decoration: underline;
}

.ranking-section {
  flex: 1;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-width: 350px;
}

.ranking-section h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.ranking-list {
  flex: 1;
  min-height: 300px;
}

.trend-section {
  height: 280px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.trend-section h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.trend-chart {
  flex: 1;
}
</style>
