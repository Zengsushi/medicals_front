<template>
  <div class="hardware-asset-table-container">
    <!-- 硬件设备统计按钮组 -->
    <div class="hardware-stats-container">
      <div class="stats-header">
        <div class="page-title">
          <h3>
            <UnorderedListOutlined class="title-icon" />
            字典管理
          </h3>
        </div>

        <!-- 硬件设备统计按钮组 -->
        <div class="hardware-stats-buttons">
          <div
            class="stats-button active"
            :class="{ 'stats-active': currentFilter === 'in_use' }"
            @click="handleStatsClick('in_use')"
          >
            <div class="button-icon">
              <i class="anticon anticon-check-circle"></i>
            </div>
            <div class="button-content">
              <div class="button-title">启用</div>
              <div class="button-count">{{ inUseCount || 0 }}</div>
            </div>
          </div>

          <div
            class="stats-button scrapped"
            :class="{ 'stats-active': currentFilter === 'scrapped' }"
            @click="handleStatsClick('scrapped')"
          >
            <div class="button-icon">
              <i class="anticon anticon-delete"></i>
            </div>
            <div class="button-content">
              <div class="button-title">停用</div>
              <div class="button-count">{{ scrappedCount || 0 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 查询筛选区域 -->
    <div class="filter-section">
      <div class="filter-header">
        <h3 class="filter-title">
          <SearchOutlined class="title-icon" />
          查询筛选
        </h3>
        <div class="filter-actions">
          <a-space size="middle">
            <a-button
              type="link"
              @click="toggleAdvancedFilter"
              class="expand-btn"
            >
              {{ showAdvancedFilter ? "收起" : "展开" }}
              <DownOutlined :class="{ 'rotate-180': showAdvancedFilter }" />
            </a-button>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">
              <template #icon><ReloadOutlined /></template>
              重置
            </a-button>
          </a-space>
        </div>
      </div>
      <div class="filter-content">
        <!-- 基础搜索 - 始终显示 -->
        <a-row :gutter="[12, 8]">
          <a-col :span="24">
            <div class="filter-item">
              <label class="filter-label">字典分类</label>
              <a-input
                :value="searchKeyword"
                @input="handleSearchInput"
                placeholder="输入设备名称或序列号"
                allow-clear
              >
                <template #prefix><SearchOutlined /></template>
              </a-input>
            </div>
          </a-col>
        </a-row>

        <!-- 高级筛选 - 可折叠 -->
        <div v-show="showAdvancedFilter" class="advanced-filter">
          <a-divider>高级筛选</a-divider>
          <a-row :gutter="[12, 8]">
            <a-col :xl="12" :lg="12" :md="24" :sm="24">
              <div class="filter-item">
                <label class="filter-label">制造商</label>
                <a-select
                  :value="manufacturer"
                  @change="handleManufacturerChange"
                  placeholder="选择制造商"
                  allow-clear
                  :loading="dictionaryLoading"
                  style="width: 100%"
                >
                  <a-select-option
                    v-for="option in manufacturerOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </div>
            </a-col>
            <a-col :xl="12" :lg="12" :md="24" :sm="24">
              <div class="filter-item">
                <label class="filter-label">资产类型</label>
                <a-select
                  :value="assetType"
                  @change="handleTypeChange"
                  placeholder="选择资产类型"
                  allow-clear
                  :loading="dictionaryLoading"
                  style="width: 100%"
                >
                  <a-select-option
                    v-for="option in assetTypeOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </div>
            </a-col>
          </a-row>
        </div>
      </div>
    </div>

    <!-- 批量操作工具栏 -->
    <div class="batch-toolbar" v-if="selectedRowKeys.length > 0">
      <div class="selected-info">
        <span>已选择 {{ selectedRowKeys.length }} 项</span>
        <a-button type="link" size="small" @click="clearSelection"
          >清空</a-button
        >
      </div>
      <div class="batch-actions">
        <a-button
          type="primary"
          size="small"
          @click="batchUpdateMonitoring"
          :loading="batchMonitoringLoading"
        >
          批量监控
        </a-button>
        <a-button
          size="small"
          @click="batchToggleStatus"
          :loading="batchToggleLoading"
        >
          批量{{ allSelectedActive ? "停用" : "启用" }}
        </a-button>
        <a-button
          type="danger"
          size="small"
          @click="batchDelete"
          :loading="batchDeleteLoading"
        >
          批量删除
        </a-button>
      </div>
    </div>

    <!-- 硬件设施列表表格 -->
    <div class="table-wrapper">
      <!-- 表格头部 -->
      <div class="table-header">
        <div class="table-title">
          <h4>设备列表</h4>
        </div>
        <div class="table-actions">
          <a-space size="middle">
            <a-button
              v-if="currentFilter !== 'scrapped'"
              type="primary"
              @click="handleAdd"
            >
              <template #icon><PlusOutlined /></template>
              新增设备
            </a-button>
            <!-- <a-button v-if="currentFilter !== 'scrapped'" @click="handleImport">
              <template #icon><UploadOutlined /></template>
              导入数据
            </a-button> -->
            <a-button v-if="currentFilter !== 'scrapped'" @click="handleExport">
              <template #icon><DownloadOutlined /></template>
              导出数据
            </a-button>
            <a-tooltip v-if="currentFilter !== 'scrapped'" title="批量监控">
              <a-button @click="handleHeaderBatchMonitoring">
                <template #icon><ApiOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="列表管理">
              <a-button @click="handleListManagement">
                <template #icon><UnorderedListOutlined /></template>
              </a-button>
            </a-tooltip>
          </a-space>
        </div>
      </div>
      <a-table
        :columns="columns"
        :data-source="dataSource"
        :row-key="(record) => record.id"
        :pagination="pagination"
        :loading="loading"
        :row-selection="rowSelection"
        size="middle"
        @change="handleTableChange"
      >
        <!-- 使用新的v-slot语法 -->
        <template #bodyCell="{ column, record }">
          <!-- 监控状态列 -->
          <template v-if="column.key === 'monitoring_status'">
            <a-switch
              :checked="record.monitoring_status"
              :loading="record.toggleLoading"
              @change="(checked) => toggleMonitoring(record, checked)"
              size="small"
            />
            <span class="monitoring-text">
              {{ record.monitoring_status ? "已监控" : "未监控" }}
            </span>
          </template>
          <!-- 操作列 -->
          <template v-else-if="column.key === 'action'">
            <div class="action-buttons">
              <a-tooltip title="查看详情">
                <a-button
                  type="text"
                  size="small"
                  @click="viewDetails(record)"
                  class="action-btn"
                >
                  <template #icon><EyeOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="编辑">
                <a-button
                  type="text"
                  size="small"
                  @click="editAsset(record)"
                  class="action-btn"
                >
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="历史记录">
                <a-button
                  type="text"
                  size="small"
                  @click="viewHistory(record)"
                  class="action-btn"
                >
                  <template #icon><HistoryOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-popconfirm
                title="确定要删除这个设备吗？"
                @confirm="deleteAsset(record)"
                ok-text="确定"
                cancel-text="取消"
              >
                <a-tooltip title="删除">
                  <a-button
                    type="text"
                    size="small"
                    danger
                    :loading="record.deleteLoading"
                    class="action-btn danger"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 列管理弹窗 -->
    <a-modal
      v-model:open="showColumnManager"
      title="列管理"
      width="600px"
      @ok="handleColumnManagerOk"
      @cancel="handleColumnManagerCancel"
    >
      <div class="column-manager">
        <div class="column-manager-header">
          <h4>自定义表格列显示</h4>
          <div class="column-actions">
            <a-button size="small" @click="selectAllColumns">全选</a-button>
            <a-button size="small" @click="deselectAllColumns">全不选</a-button>
            <a-button size="small" @click="resetColumnSettings">重置</a-button>
          </div>
        </div>

        <div class="column-list">
          <div
            v-for="(setting, key) in columnSettings"
            :key="key"
            class="column-item"
          >
            <div class="column-control">
              <a-checkbox
                v-model:checked="setting.visible"
                @change="handleColumnVisibilityChange(key, $event)"
              >
                {{ setting.title }}
              </a-checkbox>
            </div>

            <div class="column-settings" v-if="setting.visible">
              <div class="setting-item">
                <label>宽度:</label>
                <a-input-number
                  v-model:value="setting.width"
                  :min="80"
                  :max="500"
                  size="small"
                  style="width: 80px"
                />
              </div>

              <div class="setting-item">
                <a-checkbox
                  v-model:checked="setting.fixed"
                  @change="handleColumnFixedChange(key, $event)"
                >
                  固定列
                </a-checkbox>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import dayjs from "dayjs";
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  ApiOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from "@ant-design/icons-vue";

// Props
const props = defineProps({
  dataSource: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  pagination: {
    type: Object,
    default: () => ({
      current: 1,
      pageSize: 20,
      total: 0,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) =>
        `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
    }),
  },
  searchKeyword: {
    type: String,
    default: "",
  },
  assetStatus: {
    type: [String, Array],
    default: () => [],
  },
  assetType: {
    type: String,
    default: "",
  },
  manufacturer: {
    type: String,
    default: "",
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  activeCount: {
    type: Number,
    default: 0,
  },
  availableCount: {
    type: Number,
    default: 0,
  },
  warrantyCount: {
    type: Number,
    default: 0,
  },
  scrappedCount: {
    type: Number,
    default: 0,
  },
  inUseCount: {
    type: Number,
    default: 0,
  },
  tableMode: {
    type: String,
    default: "all", // 'all', 'in_use', 'scrapped'
    validator: (value) => ["all", "in_use", "scrapped"].includes(value),
  },
  currentFilter: {
    type: String,
    default: "active",
  },
});

// Emits
const emit = defineEmits([
  "tableChange",
  "viewDetails",
  "editAsset",
  "deleteAsset",
  "toggleMonitoring",
  "batchUpdateMonitoring",
  "batchDelete",
  "batchToggleStatus",
  "openDrawer",
  "add",
  "import",
  "export",
  "headerBatchMonitoring",
  "listManagement",
  "search",
  "reset",
  "searchInput",
  "statusChange",
  "typeChange",
  "manufacturerChange",
  "viewHistory",
  "statsFilter",
]);

// 响应式数据
const selectedRowKeys = ref([]);
const batchMonitoringLoading = ref(false);
const batchDeleteLoading = ref(false);
const batchToggleLoading = ref(false);
const showAdvancedFilter = ref(false);
const manufacturerOptions = ref([]);

// 列管理相关状态
const showColumnManager = ref(false);
const columnSettings = ref({
  asset_tag: { visible: true, title: "资产标签", width: 120, fixed: false },
  serial_number: { visible: true, title: "序列号", width: 120, fixed: false },
  model: { visible: true, title: "型号", width: 150, fixed: false },
  manufacturer: { visible: true, title: "制造商", width: 90, fixed: false },
  warranty_status_display: {
    visible: true,
    title: "保修状态",
    width: 100,
    fixed: false,
  },
  use_years: { visible: true, title: "使用年限", width: 80, fixed: false },
  monitoring_status: {
    visible: true,
    title: "监控状态",
    width: 90,
    fixed: false,
  },
  location: { visible: true, title: "位置", width: 150, fixed: false },
  asset_owner: { visible: true, title: "资产责任人", width: 100, fixed: false },
  supplier_info: {
    visible: true,
    title: "供应商责任人",
    width: 220,
    fixed: false,
  },
  created_at: { visible: false, title: "创建时间", width: 120, fixed: false },
});

// 统计按钮点击处理
const handleStatsClick = (filterType) => {
  emit("statsFilter", filterType);
};

// 字典数据
const assetStatusOptions = ref([]);
const assetTypeOptions = ref([]);
const dictionaryLoading = ref(false);

// 表格列配置
const columns = computed(() => {
  // 定义所有可能的列配置
  const allColumnConfigs = {
    asset_tag: {
      title: "资产标签",
      dataIndex: "asset_tag",
      key: "asset_tag",
      sorter: true,
      ellipsis: true,
    },
    serial_number: {
      title: "序列号",
      dataIndex: "serial_number",
      key: "serial_number",
      ellipsis: true,
    },
    model: {
      title: "型号",
      dataIndex: "model",
      key: "model",
      ellipsis: true,
    },
    manufacturer: {
      title: "制造商",
      dataIndex: "manufacturer",
      key: "manufacturer",
    },
    warranty_status_display: {
      title: "保修状态",
      dataIndex: "warranty_status_display",
      key: "warranty_status_display",
    },
    use_years: {
      title: "使用年限",
      dataIndex: "use_years",
      key: "use_years",
      customRender: ({ text, record }) => {
        const currentTime = dayjs();
        const warrantyStartDate = dayjs(record.warranty_start_date);
        const useYears = currentTime.diff(warrantyStartDate, "year");
        if (useYears >= 0) {
          return `${useYears}年`;
        } else {
          return "-";
        }
      },
    },
    monitoring_status: {
      title: "监控状态",
      dataIndex: "monitoring_status",
      key: "monitoring_status",
    },
    location: {
      title: "位置",
      dataIndex: "location",
      key: "location",
      ellipsis: true,
    },
    asset_owner: {
      title: "资产责任人",
      dataIndex: "asset_owner",
      key: "asset_owner",
      customRender: ({ text, record }) => {
        if (text && text.first_name) {
          return text.first_name;
        }
        return "-";
      },
    },
    supplier_info: {
      title: "供应商责任人",
      dataIndex: "supplier_info",
      key: "supplier_info",
      ellipsis: true,
      customRender: ({ text, record }) => {
        if (text && text.contact_person) {
          return text.contact_person;
        }
        return "-";
      },
    },
    created_at: {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      sorter: true,
    },
  };

  // 根据当前筛选条件和列设置生成动态列
  const dynamicColumns = [];

  // 根据列设置添加可见列
  Object.keys(columnSettings.value).forEach((key) => {
    const setting = columnSettings.value[key];
    if (setting.visible && allColumnConfigs[key]) {
      const column = {
        ...allColumnConfigs[key],
        title: setting.title,
        width: setting.width,
      };

      // 如果列设置为固定，添加fixed属性
      if (setting.fixed) {
        column.fixed = "left";
      }

      dynamicColumns.push(column);
    }
  });

  // 添加固定在右侧的操作列
  const actionColumn = {
    title: "操作",
    key: "action",
    align: "center",
    width: 120,
    fixed: "right",
  };

  return [...dynamicColumns, actionColumn];
});

// 行选择配置
const rowSelection = {
  selectedRowKeys: selectedRowKeys,
  onChange: (keys) => {
    selectedRowKeys.value = keys;
  },
  onSelectAll: (selected, selectedRows, changeRows) => {
    console.log("onSelectAll:", selected, selectedRows, changeRows);
  },
};

// 计算属性
const allSelectedActive = computed(() => {
  if (selectedRowKeys.value.length === 0) return false;
  const selectedRecords = props.dataSource.filter((item) =>
    selectedRowKeys.value.includes(item.id)
  );
  return selectedRecords.every((record) => record.status === "active");
});

// 方法
// 设备状态相关
const getAssetStatusColor = (status) => {
  const statusMap = {
    active: "success",
    available: "processing",
    maintenance: "warning",
    retired: "error",
  };
  return statusMap[status] || "default";
};

const clearSelection = () => {
  selectedRowKeys.value = [];
};

const handleTableChange = (pagination, filters, sorter) => {
  emit("tableChange", pagination, filters, sorter);
};

const viewDetails = (record) => {
  emit("viewDetails", record);
};

const editAsset = (record) => {
  emit("edit", record);
};

const viewHistory = (record) => {
  emit("viewHistory", record);
};

const deleteAsset = async (record) => {
  record.deleteLoading = true;
  try {
    //调用后台删除
    emit("delete", record);
    // 如果删除成功，从选中列表中移除
    const index = selectedRowKeys.value.indexOf(record.id);
    if (index > -1) {
      selectedRowKeys.value.splice(index, 1);
    }
  } finally {
    record.deleteLoading = false;
  }
};

const toggleMonitoring = async (record, checked) => {
  record.toggleLoading = true;
  try {
    await emit("toggleMonitoring", record, checked);
  } finally {
    record.toggleLoading = false;
  }
};

const batchUpdateMonitoring = async () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning("请先选择要操作的设备");
    return;
  }

  batchMonitoringLoading.value = true;
  try {
    const selectedRecords = props.dataSource.filter((item) =>
      selectedRowKeys.value.includes(item.id)
    );
    await emit("batchUpdateMonitoring", selectedRecords);
  } finally {
    batchMonitoringLoading.value = false;
  }
};

const batchDelete = async () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning("请先选择要删除的设备");
    return;
  }

  batchDeleteLoading.value = true;
  try {
    const selectedRecords = props.dataSource.filter((item) =>
      selectedRowKeys.value.includes(item.id)
    );
    await emit("batchDelete", selectedRecords);
    // 清空选择
    selectedRowKeys.value = [];
  } finally {
    batchDeleteLoading.value = false;
  }
};

const batchToggleStatus = async () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning("请先选择要操作的设备");
    return;
  }

  batchToggleLoading.value = true;
  try {
    const selectedRecords = props.dataSource.filter((item) =>
      selectedRowKeys.value.includes(item.id)
    );
    await emit("batchToggleStatus", selectedRecords, !allSelectedActive.value);
  } finally {
    batchToggleLoading.value = false;
  }
};

// 表格头部按钮事件处理
const handleAdd = () => {
  //打开弹窗
  emit("add");
};

const handleImport = () => {
  emit("import");
};

const handleExport = () => {
  emit("export");
};

const handleHeaderBatchMonitoring = () => {
  emit("headerBatchMonitoring");
};

const handleListManagement = () => {
  showColumnManager.value = true;
};

// 列管理相关方法
const handleColumnManagerOk = () => {
  showColumnManager.value = false;
  // 保存列设置到本地存储
  localStorage.setItem(
    "hardwareAssetColumnSettings",
    JSON.stringify(columnSettings.value)
  );
  message.success("列设置已保存");
};

const handleColumnManagerCancel = () => {
  showColumnManager.value = false;
};

const handleColumnVisibilityChange = (key, event) => {
  columnSettings.value[key].visible = event.target.checked;
};

const handleColumnFixedChange = (key, event) => {
  columnSettings.value[key].fixed = event.target.checked;
};

const selectAllColumns = () => {
  Object.keys(columnSettings.value).forEach((key) => {
    columnSettings.value[key].visible = true;
  });
};

const deselectAllColumns = () => {
  Object.keys(columnSettings.value).forEach((key) => {
    columnSettings.value[key].visible = false;
  });
};

const resetColumnSettings = () => {
  columnSettings.value = {
    asset_tag: { visible: true, title: "资产标签", width: 120, fixed: false },
    serial_number: { visible: true, title: "序列号", width: 120, fixed: false },
    model: { visible: true, title: "型号", width: 150, fixed: false },
    manufacturer: { visible: true, title: "制造商", width: 90, fixed: false },
    warranty_status_display: {
      visible: true,
      title: "保修状态",
      width: 100,
      fixed: false,
    },
    use_years: { visible: true, title: "使用年限", width: 80, fixed: false },
    monitoring_status: {
      visible: true,
      title: "监控状态",
      width: 90,
      fixed: false,
    },
    location: { visible: true, title: "位置", width: 150, fixed: false },
    asset_owner: {
      visible: true,
      title: "资产责任人",
      width: 100,
      fixed: false,
    },
    supplier_info: {
      visible: true,
      title: "供应商责任人",
      width: 220,
      fixed: false,
    },
    created_at: { visible: false, title: "创建时间", width: 120, fixed: false },
  };
};

// 筛选相关事件处理
const handleSearch = () => {
  emit("search");
};

const handleReset = () => {
  emit("reset");
};

const handleSearchInput = (e) => {
  emit("searchInput", e.target.value);
};

const handleStatusChange = (value) => {
  emit("statusChange", value);
};

const handleTypeChange = (value) => {
  emit("typeChange", value);
};

const handleManufacturerChange = (value) => {
  emit("manufacturerChange", value);
};

const toggleAdvancedFilter = () => {
  showAdvancedFilter.value = !showAdvancedFilter.value;
};

// 字典数据加载方法
const loadDictionaryData = async () => {
  try {
    dictionaryLoading.value = true;

    // 加载设备状态字典
    const statusResponse = await dictionaryAPI.getDictionaryByCategory(
      "status"
    );
    if (statusResponse.data && statusResponse.data.results) {
      assetStatusOptions.value = statusResponse.data.results.map((item) => ({
        value: item.value,
        label: item.label,
        color: getAssetStatusColor(item.value),
      }));
    }

    // 加载制造商字典
    const manufacturerResponse = await dictionaryAPI.getDictionaryByCategory(
      "manufacturer"
    );
    if (manufacturerResponse.data.data.length > 0) {
      manufacturerOptions.value = manufacturerResponse.data.data.map(
        (item) => ({
          value: item.key,
          label: item.label,
        })
      );
    }
    // 加载设备类型字典
    const typeResponse = await dictionaryAPI.getDictionaryByCategory(
      "asset_type"
    );
    if (typeResponse.data.data.length > 0) {
      console.log("typeResponse:", typeResponse.data.data);
      assetTypeOptions.value = typeResponse.data.data.map((item) => ({
        value: item.key,
        label: item.label,
      }));
    }
  } catch (error) {
    console.error("加载字典数据失败:", error);
    message.error("加载字典数据失败");
  } finally {
    dictionaryLoading.value = false;
  }
};

// 加载列设置
const loadColumnSettings = () => {
  const savedSettings = localStorage.getItem("hardwareAssetColumnSettings");
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      // 合并保存的设置和默认设置，确保新增的列也有默认值
      Object.keys(columnSettings.value).forEach((key) => {
        if (parsed[key]) {
          columnSettings.value[key] = {
            ...columnSettings.value[key],
            ...parsed[key],
          };
        }
      });
    } catch (error) {
      console.error("加载列设置失败:", error);
    }
  }
};

// 组件挂载时加载字典数据和列设置
onMounted(() => {
  loadDictionaryData();
  loadColumnSettings();
});

// 暴露方法给父组件
defineExpose({
  clearSelection,
  getSelectedRowKeys: () => selectedRowKeys.value,
  getSelectedRecords: () =>
    props.dataSource.filter((item) => selectedRowKeys.value.includes(item.id)),
  loadDictionaryData,
});
</script>

<style scoped>
/* 简洁容器样式 */
.hardware-asset-table-container {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  min-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  position: relative;
}

.table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 硬件设备统计容器样式 */
.hardware-stats-container {
  background: #fff;
  overflow: hidden;
}

/* 统计头部样式 */
.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  color: white;
}

.page-title h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.9);
}

/* 硬件设备统计按钮组样式 */
.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
  padding: 0 24px;
  gap: 24px;
}

.hardware-stats-buttons {
  display: flex;
  gap: 16px;
  flex: 1;
  justify-content: center;
  max-width: 500px;
}

.table-actions {
  flex-shrink: 0;
}

.stats-button {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  min-width: 160px;
  max-width: 200px;
  height: 56px;
}

.stats-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}

.stats-button.stats-active {
  border: 1px solid #1890ff;
  box-shadow: 0 4px 16px rgba(24, 144, 255, 0.2);
  transform: translateY(-2px);
}

.button-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 14px;
  flex-shrink: 0;
}

.button-content {
  flex: 1;
}

.button-title {
  font-size: 11px;
  color: #666;
  margin-bottom: 1px;
  font-weight: 500;
}

.button-count {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 2px;
}

/* 不同状态的颜色主题 */
.stats-button.total .button-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.stats-button.total .button-count {
  color: #667eea;
}

.stats-button.active .button-icon {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  color: white;
}

.stats-button.active .button-count {
  color: #1890ff;
}

.stats-button.available .button-icon {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
  color: white;
}

.stats-button.available .button-count {
  color: #52c41a;
}

.stats-button.warranty .button-icon {
  background: linear-gradient(135deg, #fa709a, #fee140);
  color: white;
}

.stats-button.warranty .button-count {
  color: #fa8c16;
}

.stats-button.scrapped .button-icon {
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  color: white;
}

.stats-button.scrapped .button-count {
  color: #ff4d4f;
}

/* 表格头部样式 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e9ecef;
  border-radius: 6px 6px 0 0;
}

.table-title h4 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #262626;
}

/* 简洁操作按钮区域 */
.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .hardware-stats-buttons {
    max-width: none;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .table-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
  }

  .stats-inline {
    width: 100%;
    justify-content: space-between;
  }

  .stat-item {
    flex: 1;
    min-width: 0;
  }

  .hardware-stats-buttons {
    flex-direction: column;
    gap: 12px;
  }

  .stats-button {
    min-width: auto;
    max-width: none;
  }
}

/* 简洁搜索过滤区域 */
.filter-section {
  background: #ffffff;
  border-bottom: 1px solid #e9ecef;
}

.expand-btn {
  padding: 4px 8px;
  font-size: 12px;
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

.advanced-filter {
  margin-top: 12px;
  animation: fadeIn 0.3s ease;
  margin-top: 8px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;
}

.filter-title {
  font-size: 15px;
  font-weight: bold;
  color: #495057;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.title-icon {
  color: #1890ff;
  font-size: 14px;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-content {
  padding: 16px 24px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #262626;
  font-size: 13px;
}

/* 简洁批量操作区域 */
.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  font-weight: 500;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.asset-name {
  font-weight: 500;
}

.monitoring-text {
  margin-left: 8px;
  font-size: 12px;
  color: #8c8c8c;
}

.no-data {
  color: #bfbfbf;
}

.time-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-text {
  font-size: 13px;
  color: #262626;
  font-weight: 500;
}

.time-relative {
  font-size: 11px;
  color: #8c8c8c;
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: #f5f5f5;
  transform: scale(1.1);
}

.action-btn.danger:hover {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.action-btn .anticon {
  font-size: 14px;
}

/* 简洁输入框样式 */
:deep(.ant-input) {
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  transition: all 0.2s ease;
}

:deep(.ant-input:focus) {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

:deep(.ant-select) {
  border-radius: 6px;
}

:deep(.ant-select .ant-select-selector) {
  border-radius: 6px !important;
  border: 1px solid #d1d5db !important;
  background: #ffffff !important;
}

:deep(.ant-select:not(.ant-select-disabled):hover .ant-select-selector) {
  border-color: #2563eb !important;
}

/* 表格样式优化 */
:deep(.ant-table) {
  font-size: 13px;
}

:deep(.ant-table-container) {
  display: flex;
  flex-direction: column;
}

:deep(.ant-table-content) {
  overflow: auto;
}

:deep(.ant-table-body) {
  overflow-y: visible;
}

:deep(.ant-table-thead > tr > th) {
  background: #ffffff;
  font-weight: 600;
  color: #262626;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: #ffffff;
}

:deep(.ant-table-row-selected) {
  background: #e6f7ff;
}

:deep(.ant-table-row-selected:hover > td) {
  background: #bae7ff;
}

:deep(.ant-pagination) {
  margin: 12px 16px;
  text-align: right;
  flex-shrink: 0;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

/* 列管理弹窗样式 */
.column-manager {
  padding: 16px 0;
}

.column-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.column-manager-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.column-actions {
  display: flex;
  gap: 8px;
}

.column-list {
  max-height: 400px;
  overflow-y: auto;
}

.column-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.column-item:last-child {
  border-bottom: none;
}

.column-control {
  margin-bottom: 8px;
}

.column-settings {
  margin-left: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-item label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

:deep(.ant-switch) {
  min-width: 28px;
}

:deep(.ant-tag) {
  margin: 0;
  border-radius: 4px;
}

/* 只有操作列居中对齐 */
:deep(.ant-table-tbody > tr > td:nth-child(7)) {
  text-align: center !important;
}

:deep(.ant-table-thead > tr > th:nth-child(7)) {
  text-align: center !important;
}
</style>
