<template>
  <a-spin :spinning="pageLoading" tip="加载中...">
    <div class="user-home">
      <div class="home-container">
        <!-- 欢迎区域 -->
        <div class="welcome-section">
          <a-card class="welcome-card">
            <div class="welcome-content">
              <div class="welcome-text">
                <h1 class="welcome-title">欢迎回来，{{ userInfo.username }} 👋</h1>
                <p class="welcome-subtitle">今天是 {{ currentDate }}，祝您工作愉快！</p>
              </div>
              <div class="welcome-actions">
                <a-button type="primary" size="large" @click="handleViewDashboard">
                  查看数据大屏
                </a-button>
              </div>
            </div>
          </a-card>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-section">
          <a-row :gutter="[16, 16]">
            <a-col :xs="24" :sm="12" :md="6">
              <a-card class="stat-card">
                <a-statistic
                  title="患者数量"
                  :value="stats.patients"
                  :precision="0"
                  :value-style="{ color: '#1890ff' }"
                >
                  <template #suffix>
                    <span class="trend-up">
                      <CaretUpOutlined /> 12.5%
                    </span>
                  </template>
                </a-statistic>
              </a-card>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-card class="stat-card">
                <a-statistic
                  title="医生数量"
                  :value="stats.doctors"
                  :precision="0"
                  :value-style="{ color: '#52c41a' }"
                >
                  <template #suffix>
                    <span class="trend-up">
                      <CaretUpOutlined /> 8.3%
                    </span>
                  </template>
                </a-statistic>
              </a-card>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-card class="stat-card">
                <a-statistic
                  title="诊疗记录"
                  :value="stats.diagnoses"
                  :precision="0"
                  :value-style="{ color: '#faad14' }"
                >
                  <template #suffix>
                    <span class="trend-up">
                      <CaretUpOutlined /> 15.7%
                    </span>
                  </template>
                </a-statistic>
              </a-card>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-card class="stat-card">
                <a-statistic
                  title="药品种类"
                  :value="stats.medicines"
                  :precision="0"
                  :value-style="{ color: '#f5222d' }"
                >
                  <template #suffix>
                    <span class="trend-up">
                      <CaretUpOutlined /> 5.2%
                    </span>
                  </template>
                </a-statistic>
              </a-card>
            </a-col>
          </a-row>
        </div>

        <!-- 主要内容区域 -->
        <div class="main-content-section">
          <a-row :gutter="[16, 16]">
            <!-- 快捷功能 -->
            <a-col :xs="24" :md="8">
              <a-card class="quick-actions-card" title="快捷功能" :bordered="false">
                <div class="quick-actions-grid">
                  <div class="quick-action-item" @click="handleViewDashboard">
                    <div class="action-icon" style="background: linear-gradient(135deg, #1890ff 0%, #36cfc9 100%);">
                      <FundOutlined />
                    </div>
                    <span class="action-label">数据大屏</span>
                  </div>
                  <div class="quick-action-item" @click="handleViewProfile">
                    <div class="action-icon" style="background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);">
                      <UserOutlined />
                    </div>
                    <span class="action-label">账号资料</span>
                  </div>
                  <div class="quick-action-item" @click="handleViewAnalysis">
                    <div class="action-icon" style="background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);">
                      <BarChartOutlined />
                    </div>
                    <span class="action-label">数据分析</span>
                  </div>
                  <div class="quick-action-item" @click="handleViewPatients">
                    <div class="action-icon" style="background: linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%);">
                      <TeamOutlined />
                    </div>
                    <span class="action-label">患者管理</span>
                  </div>
                  <div class="quick-action-item" @click="handleViewMedicines">
                    <div class="action-icon" style="background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);">
                      <MedicineBoxOutlined />
                    </div>
                    <span class="action-label">药品管理</span>
                  </div>
                </div>
              </a-card>
            </a-col>

            <!-- 数据概览 -->
            <a-col :xs="24" :md="16">
              <a-card class="overview-card" title="数据概览" :bordered="false">
                <a-tabs default-active-key="trend">
                  <a-tab-pane key="trend" tab="趋势分析">
                    <div ref="trendChartRef" class="chart-container" style="height: 300px"></div>
                  </a-tab-pane>
                  <a-tab-pane key="distribution" tab="数据分布">
                    <div ref="distributionChartRef" class="chart-container" style="height: 300px"></div>
                  </a-tab-pane>
                  <a-tab-pane key="recent" tab="最近记录">
                    <a-table
                      :columns="recentColumns"
                      :data-source="recentRecords"
                      pagination={false}
                      size="small"
                      row-key="id"
                    >
                      <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'status'">
                          <a-tag :color="record.status === 'completed' ? 'green' : 'blue'">
                            {{ record.status === 'completed' ? '已完成' : '处理中' }}
                          </a-tag>
                        </template>
                      </template>
                    </a-table>
                  </a-tab-pane>
                </a-tabs>
              </a-card>
            </a-col>
          </a-row>
        </div>

        <!-- 系统公告 -->
        <div class="notice-section">
          <a-card class="notice-card" title="系统公告" :bordered="false">
            <a-list>
              <a-list-item v-for="notice in notices" :key="notice.id">
                <a-list-item-meta
                  :avatar="notificationIcon"
                  :title="notice.title"
                  :description="notice.content"
                >
                  <template #title>
                    <a href="#">{{ notice.title }}</a>
                  </template>
                </a-list-item-meta>
                <div class="notice-time">{{ notice.time }}</div>
              </a-list-item>
            </a-list>
          </a-card>
        </div>
      </div>
    </div>
  </a-spin>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { CaretUpOutlined, FundOutlined, UserOutlined, BarChartOutlined, TeamOutlined, MedicineBoxOutlined, NotificationOutlined } from '@ant-design/icons-vue';
import * as echarts from 'echarts';
import { message } from 'ant-design-vue';
import { userAPI } from '../../api/users';
import { dataAPI } from '../../api/data';
import dayjs from 'dayjs';

const router = useRouter();

// 响应式状态
const pageLoading = ref(false);
const userInfo = ref({ username: 'sushi' });
const currentDate = computed(() => {
  return dayjs().format('YYYY年MM月DD日dddd');
});

// 图标组件
const notificationIcon = {
  component: NotificationOutlined,
  props: {
    style: { color: '#1890ff' }
  }
};

// 统计数据
const stats = ref({
  patients: 0,
  doctors: 0,
  diagnoses: 0,
  medicines: 0
});

// 最近记录
const recentRecords = ref([]);

// 系统公告
const notices = ref([]);

// 表格列配置
const recentColumns = [
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '内容', dataIndex: 'patient', key: 'content', ellipsis: true, render: (_, record) => {
    if (record.patient) return record.patient;
    if (record.medicine) return record.medicine;
    if (record.report) return record.report;
    return '-';
  }},
  { title: '时间', dataIndex: 'time', key: 'time', width: 150 },
  { title: '状态', key: 'status', width: 80, align: 'center' }
];

// 图表引用
const trendChartRef = ref(null);
const distributionChartRef = ref(null);
let trendChart = null;
let distributionChart = null;

// 初始化趋势分析图表
const initTrendChart = (data = null) => {
  if (!trendChartRef.value) return;
  
  trendChart = echarts.init(trendChartRef.value);
  
  // 默认数据
  const defaultData = {
    categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
    series: [
      { name: '患者数量', data: [820, 932, 901, 934, 1290, 1330] },
      { name: '诊疗次数', data: [320, 432, 401, 434, 590, 630] }
    ]
  };
  
  const chartData = data || defaultData;
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: chartData.series.map(item => item.name)
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData.categories
    },
    yAxis: {
      type: 'value'
    },
    series: chartData.series.map((item, index) => {
      const colors = ['#1890ff', '#52c41a'];
      return {
        name: item.name,
        type: 'line',
        stack: 'Total',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${colors[index]}30` },
            { offset: 1, color: `${colors[index]}10` }
          ])
        },
        emphasis: {
          focus: 'series'
        },
        data: item.data,
        lineStyle: {
          color: colors[index],
          width: 3
        },
        itemStyle: {
          color: colors[index]
        }
      };
    })
  };
  
  trendChart.setOption(option);
};

// 初始化分布分析图表
const initDistributionChart = (data = null) => {
  if (!distributionChartRef.value) return;
  
  distributionChart = echarts.init(distributionChartRef.value);
  
  // 默认数据
  const defaultData = [
    { value: 1048, name: '内科', itemStyle: { color: '#5470c6' } },
    { value: 735, name: '外科', itemStyle: { color: '#91cc75' } },
    { value: 580, name: '儿科', itemStyle: { color: '#fac858' } },
    { value: 484, name: '妇产科', itemStyle: { color: '#ee6666' } },
    { value: 300, name: '其他科室', itemStyle: { color: '#73c0de' } }
  ];
  
  const chartData = data || defaultData;
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle'
    },
    series: [
      {
        name: '科室分布',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
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
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: chartData
      }
    ]
  };
  
  distributionChart.setOption(option);
};

// 初始化数据
const initData = async () => {
  pageLoading.value = true;
  try {
    // 获取用户信息
    try {
      const userRes = await userAPI.detail();
      if (userRes.success) {
        userInfo.value = userRes.data;
      }
    } catch (error) {
      console.log('用户信息获取失败，使用默认值');
    }
    
    // 获取统计数据
    try {
      const statsRes = await dataAPI.getHomeStats();
      if (statsRes.success) {
        stats.value = statsRes.data;
      }
    } catch (error) {
      console.log('统计数据获取失败，使用默认值');
      stats.value = {
        patients: 1234,
        doctors: 86,
        diagnoses: 5678,
        medicines: 234
      };
    }
    
    // 获取最近记录
    try {
      const recentRes = await dataAPI.getRecentRecords(4);
      if (recentRes.success) {
        recentRecords.value = recentRes.data;
      }
    } catch (error) {
      console.log('最近记录获取失败，使用默认值');
      recentRecords.value = [
        { id: 1, type: '诊疗', patient: '张三 - 感冒发烧', time: '2024-04-13 10:30', status: 'completed' },
        { id: 2, type: '药品', medicine: '阿莫西林出库', time: '2024-04-13 09:15', status: 'completed' },
        { id: 3, type: '报告', report: '血常规检查报告', time: '2024-04-13 08:45', status: 'processing' },
        { id: 4, type: '诊疗', patient: '李四 - 体检复查', time: '2024-04-12 16:20', status: 'completed' }
      ];
    }
    
    // 获取系统公告
    try {
      const noticesRes = await dataAPI.getSystemNotices(3);
      if (noticesRes.success) {
        notices.value = noticesRes.data;
      }
    } catch (error) {
      console.log('系统公告获取失败，使用默认值');
      notices.value = [
        { id: 1, title: '系统升级通知', content: '系统将于今晚22:00-24:00进行例行维护升级', time: '2024-04-13' },
        { id: 2, title: '新功能上线', content: '数据大屏可视化功能已正式上线，欢迎体验', time: '2024-04-10' },
        { id: 3, title: '安全提醒', content: '请定期修改密码，确保账户安全', time: '2024-04-05' }
      ];
    }
    
    // 获取趋势图表数据
    try {
      const trendRes = await dataAPI.getHomeChartData('trend');
      if (trendRes.success) {
        initTrendChart(trendRes.data);
      } else {
        initTrendChart();
      }
    } catch (error) {
      console.log('趋势图表数据获取失败，使用默认值');
      initTrendChart();
    }
    
    // 获取分布图表数据
    try {
      const distributionRes = await dataAPI.getHomeChartData('distribution');
      if (distributionRes.success) {
        initDistributionChart(distributionRes.data);
      } else {
        initDistributionChart();
      }
    } catch (error) {
      console.log('分布图表数据获取失败，使用默认值');
      initDistributionChart();
    }
    
  } catch (error) {
    console.error('初始化数据失败:', error);
  } finally {
    pageLoading.value = false;
  }
};

const handleResize = () => {
  trendChart?.resize();
  distributionChart?.resize();
};

const handleViewDashboard = () => {
  router.push({ name: 'home' }).catch(() => {});
};

const handleViewProfile = () => {
  router.push({ name: 'userSelfProfile' }).catch(() => {});
};

const handleViewAnalysis = () => {
  router.push({ name: 'analysis' }).catch(() => {});
};

const handleViewPatients = () => {
  message.info('患者管理入口请从左侧菜单进入');
};

const handleViewMedicines = () => {
  message.info('药品管理入口请从左侧菜单进入');
};

onMounted(async () => {
  try {
    await nextTick();
    await initData();
    window.addEventListener('resize', handleResize);
  } catch (error) {
    console.error('初始化首页失败:', error);
    message.error('页面初始化失败，请刷新重试');
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  trendChart?.dispose();
  distributionChart?.dispose();
});
</script>



<style scoped lang="less">
.user-home {
  min-height: calc(100vh - 140px);
  padding: 24px;
  background: #f0f2f5;
}

.home-container {
  max-width: 1600px;
  margin: 0 auto;
}

.welcome-section {
  margin-bottom: 24px;
}

.welcome-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  background: #1890ff;

  :deep(.ant-card-body) {
    padding: 32px;
  }
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text {
  color: white;
}

.welcome-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.welcome-subtitle {
  font-size: 14px;
  margin: 0;
  opacity: 0.95;
}

.welcome-actions {
  .ant-btn-primary {
    height: 40px;
    padding: 0 24px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 20px;
    background: white;
    color: #1890ff;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &:hover {
      background: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }
}

.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.1);
    border-color: #e6f7ff;
  }

  :deep(.ant-statistic-title) {
    font-size: 12px;
    color: #666;
    font-weight: 500;
  }

  :deep(.ant-statistic-content) {
    font-size: 20px;
    font-weight: 600;
  }
}

.trend-up {
  color: #52c41a;
  font-size: 12px;
  font-weight: 500;
}

.main-content-section {
  margin-bottom: 24px;
}

.quick-actions-card,
.overview-card,
.notice-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 100%;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.quick-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #fafafa;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    background: #f0f5ff;
  }

  .action-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .action-label {
    font-size: 12px;
    font-weight: 500;
    color: #333;
  }
}

.chart-container {
  width: 100%;
  height: 300px;
}

.notice-section {
  margin-bottom: 24px;
}

.notice-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .user-home {
    padding: 16px;
  }

  .welcome-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-container {
    height: 250px;
  }
}
</style>
