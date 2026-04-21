<template>
  <div class="admin-home">
    <a-spin :spinning="pageLoading" tip="加载中...">
      <div class="admin-container">
        <!-- 管理员欢迎区域 -->
        <section class="admin-welcome-section">
          <a-row :gutter="[24, 0]">
            <a-col :xs="24" :lg="16">
              <a-card :bordered="false" class="welcome-card admin-welcome-card">
                <div class="welcome-header">
                  <div class="welcome-info">
                    <a-avatar :size="64" class="admin-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                      <template #icon><UserOutlined /></template>
                    </a-avatar>
                    <div class="welcome-text">
                      <h1 class="welcome-title">管理员控制台</h1>
                      <p class="welcome-desc">
                        {{ userInfo?.username || '管理员' }}，欢迎回来！系统运行正常，当前在线用户
                        <a-tag color="blue">{{ onlineUsers }}</a-tag> 人
                      </p>
                    </div>
                  </div>
                </div>
              </a-card>
            </a-col>

            <a-col :xs="24" :lg="8">
              <a-card :bordered="false" class="system-status-card">
                <template #title>
                  <span><ThunderboltOutlined /> 系统状态</span>
                </template>
                <div class="status-grid">
                  <div class="status-item" v-for="status in systemStatus" :key="status.label">
                    <div class="status-dot" :class="status.status"></div>
                    <span class="status-label">{{ status.label }}</span>
                  </div>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </section>

        <!-- 核心指标卡片 -->
        <section class="metrics-section">
          <a-row :gutter="[16, 16]">
            <a-col :xs="24" :sm="12" :lg="6" v-for="metric in metricsData" :key="metric.title">
              <a-card :bordered="false" class="metric-card" hoverable @click="handleMetricClick(metric)">
                <div class="metric-content">
                  <div class="metric-icon" :style="{ background: metric.gradient }">
                    <component :is="metric.icon" />
                  </div>
                  <div class="metric-info">
                    <div class="metric-value" :style="{ color: metric.color }">
                      {{ metric.value.toLocaleString() }}
                    </div>
                    <div class="metric-label">{{ metric.title }}</div>
                  </div>
                  <div class="metric-trend" :class="metric.trend > 0 ? 'up' : 'down'">
                    <CaretUpOutlined v-if="metric.trend > 0" />
                    <CaretDownOutlined v-else />
                    {{ Math.abs(metric.trend) }}%
                  </div>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </section>

        <!-- 主要管理区域 -->
        <a-row :gutter="[16, 16]" class="main-management-section">
          <!-- 左侧：快捷操作 -->
          <a-col :xs="24" :lg="8">
            <a-card title="快捷操作" :bordered="false" class="quick-ops-card">
              <div class="quick-ops-list">
                <div
                  v-for="op in quickOperations"
                  :key="op.key"
                  class="quick-op-item"
                  @click="handleQuickOp(op)"
                >
                  <div class="op-icon" :style="{ background: op.color }">
                    <component :is="op.icon" />
                  </div>
                  <div class="op-content">
                    <div class="op-label">{{ op.label }}</div>
                    <div class="op-desc">{{ op.desc }}</div>
                  </div>
                  <RightOutlined class="op-arrow" />
                </div>
              </div>
            </a-card>

            <!-- 待办事项 -->
            <a-card :bordered="false" class="todo-card" style="margin-top: 16px;">
              <template #title>
                <span style="display: flex; align-items: center; gap: 8px;">
                  待办事项
                  <a-badge 
                    :count="todoCount" 
                    :number-style="{ 
                      background: 'rgba(255, 255, 255, 0.25)', 
                      color: 'white', 
                      boxShadow: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }"
                  />
                </span>
              </template>
              <a-list :data-source="todoList" size="small">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta :title="item.title" :description="item.time">
                      <template #avatar>
                        <a-badge 
                          :status="item.priority === 'high' ? 'error' : item.priority === 'medium' ? 'warning' : 'success'" 
                          :text="item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'"
                        />
                      </template>
                    </a-list-item-meta>
                    <a-button type="link" size="small">处理</a-button>
                  </a-list-item>
                </template>
                <template #empty>
                  <a-empty description="暂无待办事项" :image="null" />
                </template>
              </a-list>
            </a-card>
          </a-col>

          <!-- 右侧：数据监控 -->
          <a-col :xs="24" :lg="16">
            <a-card title="数据监控面板" :bordered="false" class="monitor-card">
              <a-tabs v-model:activeKey="monitorTab">
                <a-tab-pane key="activity" tab="用户活动">
                  <div class="chart-wrapper" ref="activityChartRef"></div>
                </a-tab-pane>
                <a-tab-pane key="resources" tab="资源使用">
                  <div class="chart-wrapper" ref="resourceChartRef"></div>
                </a-tab-pane>
                <a-tab-pane key="logs" tab="系统日志">
                  <a-timeline mode="left" :items="logItems" />
                </a-tab-pane>
              </a-tabs>
            </a-card>

            <!-- 最近用户 -->
            <a-card title="最近注册用户" :bordered="false" style="margin-top: 16px;">
              <a-table
                :columns="userColumns"
                :dataSource="recentUsers"
                :pagination="{ pageSize: 5, size: 'small' }"
                :loading="userTableLoading"
                size="small"
                rowKey="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'avatar'">
                    <a-avatar :src="record.avatar" :size="32">
                      {{ (record.real_name || record.username)?.charAt(0)?.toUpperCase() }}
                    </a-avatar>
                  </template>
                  <template v-if="column.key === 'role'">
                    <a-tag :color="record.role === 'admin' || record.role === 'superadmin' ? 'blue' : 'green'">
                      {{ record.role_name }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'status'">
                    <a-badge :status="record.is_active ? 'success' : 'default'" :text="record.is_active ? '活跃' : '离线'" />
                  </template>
                  <template v-if="column.key === 'action'">
                    <a-space>
                      <a-button type="link" size="small" @click="viewUser(record)">查看</a-button>
                      <a-button type="link" size="small" danger @click="disableUser(record)">禁用</a-button>
                    </a-space>
                  </template>
                </template>
                <template #empty>
                  <a-empty description="暂无数据" :image="null" />
                </template>
              </a-table>
            </a-card>
          </a-col>
        </a-row>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  UserOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  MonitorOutlined,
  BarChartOutlined,
  RightOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined
} from '@ant-design/icons-vue';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import { analyseApi } from '../../api/admin';

// 类型定义
interface SystemStatus {
  label: string;
  status: 'online' | 'warning' | 'offline';
}

interface MetricData {
  title: string;
  value: number;
  icon: any;
  gradient: string;
  color: string;
  trend: number;
  path: string | null;
}

interface QuickOperation {
  key: string;
  label: string;
  desc: string;
  icon: any;
  color: string;
  path: string | null;
}

interface TodoItem {
  id: number;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
}

interface UserColumn {
  title: string;
  dataIndex: string;
  key: string;
  width?: number;
  fixed?: string;
}

interface UserRecord {
  id: number;
  username: string;
  real_name?: string;
  role: string;
  role_name: string;
  date_joined: string;
  is_active: boolean;
  avatar?: string;
}

interface LogItem {
  color: string;
  children: string;
}

const router = useRouter();
const authStore = useAuthStore();

const pageLoading = ref(false);
const userTableLoading = ref(false);
const monitorTab = ref<string>('activity');
const activityChartRef = ref<HTMLElement | null>(null);
const resourceChartRef = ref<HTMLElement | null>(null);
const onlineUsers = ref<number>(0);

let activityChart: echarts.ECharts | null = null;
let resourceChart: echarts.ECharts | null = null;

const userInfo = computed(() => authStore.currentUser);

const systemStatus = reactive<SystemStatus[]>([

]);

const metricsData = reactive<MetricData[]>([
  {
    title: '总用户数',
    value: 0,
    icon: TeamOutlined,
    gradient: '#667eea',
    color: '#667eea',
    trend: 0,
    path: '/user/manage'
  },
  {
    title: '今日活跃',
    value: 0,
    icon: BarChartOutlined,
    gradient: '#f5576c',
    color: '#f5576c',
    trend: 0,
    path: '/visual/large'
  },
  {
    title: '数据记录',
    value: 0,
    icon: DatabaseOutlined,
    gradient: '#00f2fe',
    color: '#00f2fe',
    trend: 0,
    path: '/database/manage'
  },
  {
    title: '系统告警',
    value: 0,
    icon: SafetyCertificateOutlined,
    gradient: '#fa709a',
    color: '#fa709a',
    trend: 0,
    path: '/admin/settings/menus'
  }
]);

const quickOperations = reactive<QuickOperation[]>([
  {
    key: 'manageUsers',
    label: '用户管理',
    desc: '管理系统用户和权限',
    icon: TeamOutlined,
    color: '#43e97b',
    path: '/user/manage/list'
  },
  {
    key: 'menuManage',
    label: '菜单配置',
    desc: '管理系统菜单和权限',
    icon: SettingOutlined,
    color: '#fa709a',
    path: '/admin/settings/menus'
  },
  {
    key: 'dataManage',
    label: '数据源管理',
    desc: '配置和管理数据源连接',
    icon: DatabaseOutlined,
    color: '#30cfd0',
    path: '/database/manage'
  }
]);

const todoList = ref<TodoItem[]>([
  // { id: 1, title: '审核新注册用户申请 (3条)', time: '10分钟前', priority: 'high' },
  // { id: 2, title: '更新系统安全策略', time: '1小时前', priority: 'medium' },
  // { id: 3, title: '备份数据库数据', time: '2小时前', priority: 'low' },
  // { id: 4, title: '检查系统日志异常', time: '3小时前', priority: 'medium' }
]);

const todoCount = computed(() => todoList.value.length);

const userColumns = reactive<UserColumn[]>([
  { title: '头像', dataIndex: 'avatar', key: 'avatar', width: 80 },
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '角色', dataIndex: 'role_name', key: 'role', width: 100 },
  { title: '注册时间', dataIndex: 'date_joined', key: 'date_joined', width: 180 },
  { title: '状态', dataIndex: 'is_active', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
]);

const recentUsers = ref<UserRecord[]>([]);

// 获取管理员首页统计数据
const fetchAdminStats = async () => {
  try {
    const res = await analyseApi.getAdminHomeStats();
    const ok =
      res &&
      (res.success === true ||
        (Number(res.code) === 200 && res.data !== undefined && res.data !== null));
    if (!ok) {
      console.warn('[fetchAdminStats] 接口返回异常:', res);
      return;
    }
    const stats = res.data;
    if (!stats || typeof stats !== 'object') {
      console.warn('[fetchAdminStats] data 非对象:', stats);
      return;
    }

    // 更新在线用户数
    onlineUsers.value = Number(stats.online_users ?? 0);

    // 更新指标卡片数据（与卡片标题一一对应）
    metricsData[0].value = Number(stats.total_users || 0);
    metricsData[1].value = Number(stats.active_today || 0);
    metricsData[2].value = Number(stats.total_records || 0);
    metricsData[3].value = Number(stats.system_alerts || 0);

    // 「用户活动」使用登录审计趋势，不用问诊 ADS（避免无 ADS 数据时图表被清空）
    const loginTrend = stats.login_activity_trend;
    if (Array.isArray(loginTrend) && loginTrend.length > 0) {
      updateActivityChart(loginTrend);
    }

    if (stats.department_dist && stats.department_dist.length > 0) {
      updateDepartmentChart(stats.department_dist);
    }

    message.success('数据加载成功');
  } catch (error) {
    console.error('获取管理员首页统计数据失败:', error);
  }
};

// 更新活动图表
const updateActivityChart = (trendData: any[]) => {
  if (!activityChart) return;
  
  const dates = trendData.map(d => d.date?.slice(5) || '');
  const values = trendData.map(d => d.value || 0);
  
  activityChart.setOption({
    xAxis: { data: dates },
    series: [{ data: values }]
  });
};

// 更新科室图表
const updateDepartmentChart = (deptData: any[]) => {
  if (!resourceChart) return;
  
  resourceChart.setOption({
    series: [{ data: deptData }]
  });
};

// 获取最近注册用户
const fetchRecentUsers = async () => {
  userTableLoading.value = true;
  try {
    const res = await analyseApi.getRecentUsers(7, 10);
    console.log('[fetchRecentUsers] 完整响应:', res);
    console.log('[fetchRecentUsers] res.data:', res?.data);
    
    const responseData = res?.data || res;
    console.log('[fetchRecentUsers] responseData:', responseData);
    
    const userList = responseData?.user_list || responseData?.users || [];
    console.log('[fetchRecentUsers] 用户列表:', userList);
    
    if (res?.success && userList.length > 0) {
      recentUsers.value = userList;
      console.log('[fetchRecentUsers] 用户列表已更新，数量:', recentUsers.value.length);
    } else if (res?.code === 200 && userList.length > 0) {
      recentUsers.value = userList;
      console.log('[fetchRecentUsers] 用户列表已更新(code判断)，数量:', recentUsers.value.length);
    } else {
      console.warn('[fetchRecentUsers] 无数据或请求失败，res:', res);
      message.warning('暂无最近注册用户数据');
    }
  } catch (error) {
    console.error('[fetchRecentUsers] 获取失败:', error);
    console.error('[fetchRecentUsers] 错误详情:', error.response?.data);
    message.error('获取最近注册用户失败: ' + (error.response?.data?.message || error.message));
  } finally {
    userTableLoading.value = false;
  }
};

const logItems = ref<LogItem[]>([
  { color: 'green', children: '系统启动成功，所有服务正常运行' },
  { color: 'blue', children: '用户 张三 登录系统 (IP: 192.168.1.100)' },
  { color: 'orange', children: '数据同步任务完成，更新 1256 条记录' },
  { color: 'red', children: '检测到异常登录尝试，已自动封禁 IP' },
  { color: 'blue', children: '管理员修改了系统配置参数' }
]);

// 加载系统日志数据
const loadSystemLogs = async () => {
  try {
    const res = await analyseApi.getSystemLogs(10)
    console.log('[adminHome] 系统日志API响应:', res)
    if (res.success && res.data?.list) {
      logItems.value = res.data.list.map((log: any) => {
        let color = 'blue'
        if (log.status === 'error') color = 'red'
        else if (log.status === 'warning') color = 'orange'
        else if (log.status === 'success') color = 'green'
        
        return {
          color,
          children: `${log.username} - ${log.action} (${log.time})`
        }
      })
    }
  } catch (e) {
    console.error('[adminHome] 获取系统日志失败:', e)
  }
};

const handleMetricClick = (metric: MetricData) => {
  if (metric.path) {
    router.push(metric.path);
  }
};

const handleQuickOp = (op: QuickOperation) => {
  if (op.path) {
    router.push(op.path);
  } else if (op.key === 'exportData') {
    message.info('导出功能开发中...');
  }
};

const viewUser = (record: UserRecord) => {
  router.push({ name: 'userdetail', query: { id: record.id } });
};

const disableUser = (record: UserRecord) => {
  Modal.confirm({
    title: '确认禁用用户',
    content: `确定要禁用用户 "${record.username}" 吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk() {
      message.success(`用户 ${record.username} 已被禁用`);
    }
  });
};

const initActivityChart = async () => {
  if (!activityChartRef.value) return;

  activityChart = echarts.init(activityChartRef.value);

  // 从API获取用户活动数据
  let chartData = { dates: [], values: [] }
  try {
    const res = await analyseApi.getUserActivity('week', 7)
    console.log('[adminHome] 用户活动API响应:', res)
    const activityOk =
      res &&
      (res.success === true ||
        (Number(res.code) === 200 && res.data !== undefined && res.data !== null))
    if (activityOk && res.data?.list?.length) {
      chartData.dates = res.data.list.map((item: any) => item.date)
      chartData.values = res.data.list.map(
        (item: any) => item.active_users ?? item.login_count ?? 0
      )
    }
  } catch (e) {
    console.error('[adminHome] 获取用户活动失败:', e)
  }

  // 如果没有数据，使用默认
  if (chartData.dates.length === 0) {
    chartData.dates = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    chartData.values = [0,0,0,0,0,0,1]
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.dates,
      axisLine: { lineStyle: { color: '#ddd' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      name: '活跃用户数',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [{
    type: 'bar',
    barWidth: '50%',
    data: chartData.values,
    itemStyle: {
      borderRadius: [8, 8, 0, 0],
      color: '#667eea'
    },
    emphasis: {
      itemStyle: {
        color: '#513cc9'
      }
    }
  }]
  };

  activityChart.setOption(option);
};

const initResourceChart = async () => {
  if (!resourceChartRef.value) return;

  resourceChart = echarts.init(resourceChartRef.value);

  // 从API获取资源使用数据
  let resourceData = {
    cpu: 45,
    memory: 65,
    disk: 55,
    network: 40
  }
  try {
    const res = await analyseApi.getResourceUsage()
    console.log('[adminHome] 资源使用API响应:', res)
    if (res.success && res.data) {
      resourceData = {
        cpu: res.data.cpu?.value || 45,
        memory: res.data.memory?.value || 65,
        disk: res.data.disk?.value || 55,
        network: res.data.network?.value || 40
      }
    }
  } catch (e) {
    console.error('[adminHome] 获取资源使用失败:', e)
  }

  const option = {
    tooltip: {
      formatter: '{b}: {c}%'
    },
    series: [
      {
        type: 'gauge',
        center: ['25%', '55%'],
        radius: '75%',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 10,
        itemStyle: {
          color: '#5470c6'
        },
        progress: {
          show: true,
          width: 30
        },
        pointer: {
          show: false
        },
        axisLine: {
          lineStyle: {
            width: 30,
            color: [[1, '#eef3ff']]
          }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: {
          offsetCenter: [0, '30%'],
          fontSize: 14,
          color: '#666'
        },
        detail: {
          fontSize: 28,
          fontWeight: 'bold',
          color: '#333',
          formatter: '{value}%'
        },
        data: [{ value: resourceData.cpu, name: 'CPU使用率' }]
      },
      {
        type: 'gauge',
        center: ['75%', '55%'],
        radius: '75%',
        min: 0,
        max: 100,
        startAngle: 200,
        endAngle: -20,
        splitNumber: 10,
        itemStyle: {
          color: '#91cc75'
        },
        progress: {
          show: true,
          width: 30
        },
        pointer: { show: false },
        axisLine: {
          lineStyle: {
            width: 30,
            color: [[1, '#f0fff0']]
          }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: {
          offsetCenter: [0, '30%'],
          fontSize: 14,
          color: '#666'
        },
        detail: {
          fontSize: 28,
          fontWeight: 'bold',
          color: '#333',
          formatter: '{value}%'
        },
        data: [{ value: resourceData.memory, name: '内存使用率' }]
      }
    ]
  };

  resourceChart.setOption(option);
};

const handleResize = () => {
  activityChart?.resize();
  resourceChart?.resize();
};

onMounted(async () => {
  pageLoading.value = true;

  try {
    await nextTick();
    await initActivityChart();
    await initResourceChart();
    
    // 获取管理员首页统计数据
    await fetchAdminStats();
    
    // 获取最近注册用户
    await fetchRecentUsers();
    
    // 获取系统日志
    await loadSystemLogs();

    window.addEventListener('resize', handleResize);
  } catch (error) {
    console.error('初始化管理首页失败:', error);
    message.error('页面初始化失败，请刷新重试');
  } finally {
    pageLoading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  activityChart?.dispose();
  resourceChart?.dispose();
});
</script>



<style scoped lang="less">
.admin-home {
  min-height: calc(100vh - 140px);
  padding: 24px;
  background: #f8f9fa;
}

.admin-container {
  max-width: 1600px;
  margin: 0 auto;
}

.admin-welcome-section {
  margin-bottom: 24px;
}

.admin-welcome-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  height: 100%;

  .ant-card-body {
    padding: 24px;
  }
}

.welcome-header {
  height: 100%;
}

.welcome-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.admin-avatar {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  background: #667eea !important;
}

.welcome-text {
  flex: 1;

  .welcome-title {
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: #333;
  }

  .welcome-desc {
    font-size: 15px;
    color: #666;
    margin: 0;
    line-height: 1.6;
  }
}

.system-status-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 100%;

  .ant-card-head-title {
    font-weight: 600;
    color: #333;
  }
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s ease;

  &:hover {
    background: #f0f5ff;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;

    &.online {
      background: #52c41a;
      box-shadow: 0 0 8px rgba(82, 196, 26, 0.5);
    }

    &.warning {
      background: #faad14;
      box-shadow: 0 0 8px rgba(250, 173, 20, 0.5);
      animation: pulse 2s infinite;
    }

    &.offline {
      background: #ff4d4f;
    }
  }

  .status-label {
    font-size: 13px;
    color: #666;
    font-weight: 500;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.metrics-section {
  margin-bottom: 24px;
}

.metric-card {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f0f0f0;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 28px rgba(102, 126, 234, 0.15);
    border-color: #667eea;
  }

  .ant-card-body {
    padding: 20px;
  }
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.metric-info {
  flex: 1;

  .metric-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }

  .metric-label {
    font-size: 13px;
    color: #999;
    margin-top: 4px;
  }
}

.metric-trend {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;

  &.up {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.1);
  }

  &.down {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.1);
    
    svg {
      transform: translateY(2px);
    }
  }
}

.main-management-section {
  margin-bottom: 24px;
}

.quick-ops-card,
.monitor-card,
.todo-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.todo-card {
  :deep(.ant-card-head) {
    background: #667eea;
    border-radius: 12px 12px 0 0;
    padding: 16px 20px;
    
    .ant-card-head-title {
      color: white;
      font-weight: 600;
      font-size: 15px;
    }
    
    .ant-card-extra {
      color: rgba(255, 255, 255, 0.9);
    }
  }
  
  :deep(.ant-card-body) {
    padding: 0;
  }
  
  :deep(.ant-list) {
    padding: 8px 0;
  }
  
  :deep(.ant-list-item) {
    padding: 14px 20px;
    transition: all 0.3s ease;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background: #f8f9fa;
    }
  }
  
  :deep(.ant-list-item-meta) {
    align-items: center;
  }
  
  :deep(.ant-list-item-meta-avatar) {
    margin-inline-end: 12px;
  }
  
  :deep(.ant-list-item-meta-title) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: keep-all;
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 2px;
  }
  
  :deep(.ant-list-item-meta-description) {
    white-space: nowrap;
    font-size: 12px;
    color: #999;
  }
  
  :deep(.ant-btn-link) {
    padding: 4px 12px;
    height: auto;
    font-size: 13px;
    color: #667eea;
    background: rgba(102, 126, 234, 0.1);
    border-radius: 6px;
    transition: all 0.3s ease;
    
    &:hover {
      color: #513cc9;
      background: rgba(102, 126, 234, 0.2);
      transform: translateY(-1px);
    }
  }
}

.quick-ops-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-op-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;

  &:hover {
    background: #f8f9fa;
    border-color: #d6e4ff;
    transform: translateX(4px);
  }

  .op-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: white;
    flex-shrink: 0;
  }

  .op-content {
    flex: 1;

    .op-label {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 2px;
    }

    .op-desc {
      font-size: 12px;
      color: #999;
    }
  }

  .op-arrow {
    color: #bbb;
    font-size: 14px;
    transition: all 0.3s ease;
  }

  &:hover .op-arrow {
    color: #667eea;
    transform: translateX(4px);
  }
}

.chart-wrapper {
  width: 100%;
  height: 380px;
  margin-top: 16px;
}

@media (max-width: 992px) {
  .welcome-info {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .welcome-text .welcome-title {
    font-size: 22px;
  }

  .status-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .metrics-section .ant-col {
    margin-bottom: 16px;
  }
}

@media (max-width: 768px) {
  .admin-home {
    padding: 16px;
  }

  .status-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .metric-value {
    font-size: 24px !important;
  }

  .chart-wrapper {
    height: 300px;
  }
}
</style>
