<template>
  <div class="dictionary-table-container">
    <!-- 统计按钮 -->
    <div class="dictionary-stats-container">
      <div class="stats-header">
        <div class="dictionary-stats-buttons">
          <!-- <div
            class="stats-button total"
            @click="handleStatsClick('total')"
            :class="{ 'stats-active': currentFilter === 'total' }"
          >
            <div class="button-icon">T</div>
            <div class="button-content">
              <div class="button-title">总数</div>
              <div class="button-count">{{ totalCount }}</div>
            </div>
          </div> -->
          <div
            class="stats-button active"
            @click="handleStatsClick('active')"
            :class="{ 'stats-active': currentFilter === 'active' }"
          >
            <div class="button-icon">10</div>
            <div class="button-content">
              <div class="button-title">启用</div>
              <div class="button-count">{{ activeCount }}</div>
            </div>
          </div>
          <div
            class="stats-button inactive"
            @click="handleStatsClick('inactive')"
            :class="{ 'stats-active': currentFilter === 'inactive' }"
          >
            <div class="button-icon">2</div>
            <div class="button-content">
              <div class="button-title">停用</div>
              <div class="button-count">{{ inactiveCount }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div class="batch-toolbar" v-if="selectedRowKeys.length">
      <div class="selected-info">
        已选择 {{ selectedRowKeys.length }} 项
        <a-button type="link" size="small" @click="clearSelection"
          >清空</a-button
        >
      </div>
      <div class="batch-actions">
        <a-button
          size="small"
          @click="batchToggleStatus"
          :loading="batchToggleLoading"
        >
          批量{{ allSelectedActive ? "禁用" : "启用" }}
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

    <!-- 表格 -->
    <div class="table-wrapper">
      <div class="table-header">
        <div class="table-title">
          <h4>字典列表</h4>
        </div>
        <div class="table-actions">
          <a-space size="middle">
            <a-button type="primary" @click="handleAdd">
              <template #icon><PlusOutlined /></template>
              新增字典
            </a-button>
            <!-- <a-button @click="handleImport">
              <template #icon><UploadOutlined /></template>
              字典导入
            </a-button>
            <a-button @click="handleExport">
              <template #icon><DownloadOutlined /></template>
              字典导出
            </a-button> -->
            <a-tooltip title="列表管理">
              <a-button @click="showColumnManager = true">
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
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-switch
              :checked="record.status === 'active'"
              :loading="record.toggleLoading"
              @change="(checked) => toggleStatus(record, checked)"
              size="small"
            />
            <span class="status-text">
              {{ record.status === "active" ? "启用" : "禁用" }}
            </span>
          </template>

          <template v-else-if="column.key === 'action'">
            <div class="action-buttons">
              <a-tooltip title="编辑">
                <a-button type="text" size="small" @click="editRecord(record)">
                  <EditOutlined />
                </a-button>
              </a-tooltip>
              <a-popconfirm
                title="确定要删除这个字典吗？"
                @confirm="deleteRecord(record)"
                ok-text="确定"
                cancel-text="取消"
              >
                <a-tooltip title="删除">
                  <a-button
                    type="text"
                    size="small"
                    danger
                    :loading="record.deleteLoading"
                  >
                    <DeleteOutlined />
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
              <a-checkbox v-model:checked="setting.visible">
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
                <a-checkbox v-model:checked="setting.fixed">固定列</a-checkbox>
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
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  UnorderedListOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";

const props = defineProps({
  dataSource: {
    type: Object,
    default: () => {},
  },
  loading: Boolean,
  pagination: Object,
  totalCount: Number,
  activeCount: Number,
  inactiveCount: Number,
  currentFilter: String,
});

const emit = defineEmits([
  "tableChange",
  "editRecord",
  "deleteRecord",
  "toggleStatus",
  "batchDelete",
  "batchToggleStatus",
  "add",
  "import",
  "export",
  "statsFilter",
]);

// reactive state
const selectedRowKeys = ref([]);
const batchToggleLoading = ref(false);
const batchDeleteLoading = ref(false);
const showColumnManager = ref(false);

const columnSettings = ref({
  category: { visible: true, title: "字典分类", width: 120, fixed: false },
  key: { visible: true, title: "字典键", width: 120, fixed: false },
  label: { visible: true, title: "字典名称", width: 150, fixed: false },
  description: { visible: true, title: "字典描述", width: 180, fixed: false },
  status: { visible: true, title: "字典状态", width: 90, fixed: false },
  priority: { visible: true, title: "优先级", width: 80, fixed: false },
  config: { visible: true, title: "拓展配置", width: 288, fixed: false },
  create_time: { visible: false, title: "创建时间", width: 180, fixed: false },
  update_time: { visible: false, title: "更新时间", width: 180, fixed: false },
});

// computed
const allSelectedActive = computed(() => {
  if (!selectedRowKeys.value.length) return false;
  const selectedRecords = props.dataSource.filter((item) =>
    selectedRowKeys.value.includes(item.id)
  );
  return selectedRecords.every((r) => r.status === "active");
});

const columns = computed(() => {
  const baseColumns = {
    category: { title: "字典分类", dataIndex: "category", key: "category" },
    key: { title: "字典键", dataIndex: "key", key: "key" },
    label: { title: "字典名称", dataIndex: "label", key: "label" },
    config: { title: "拓展配置", dataIndex: "config", key: "config" },
    description: {
      title: "字典描述",
      dataIndex: "description",
      key: "description",
    },
    status: { title: "字典状态", dataIndex: "status", key: "status" },
    priority: { title: "优先级", dataIndex: "priority", key: "priority" },
    create_time: {
      title: "创建时间",
      dataIndex: "create_time",
      key: "create_time",
      sorter: true,
    },
    update_time: {
      title: "更新时间",
      dataIndex: "update_time",
      key: "update_time",
      sorter: true,
    },
  };

  const visibleCols = Object.keys(columnSettings.value)
    .filter((k) => columnSettings.value[k].visible)
    .map((k) => ({
      ...baseColumns[k],
      width: columnSettings.value[k].width,
      fixed: columnSettings.value[k].fixed ? "left" : undefined,
    }));

  visibleCols.push({
    title: "操作",
    key: "action",
    align: "center",
    width: 120,
    // fixed: "right",
  });
  return visibleCols;
});

const rowSelection = {
  selectedRowKeys,
  onChange: (keys) => (selectedRowKeys.value = keys),
};

// methods
const clearSelection = () => (selectedRowKeys.value = []);

const handleTableChange = (pagination, filters, sorter) =>
  emit("tableChange", pagination, filters, sorter);

const editRecord = (record) => emit("editRecord", record);

const deleteRecord = async (record) => {
  record.deleteLoading = true;
  try {
    await emit("deleteRecord", record);
    clearSelection();
  } finally {
    record.deleteLoading = false;
  }
};

const toggleStatus = async (record, checked) => {
  record.toggleLoading = true;
  try {
    await emit("toggleStatus", record, checked ? "active" : "inactive");
  } finally {
    record.toggleLoading = false;
  }
};

const batchToggleStatus = async () => {
  if (!selectedRowKeys.value.length) return message.warning("请先选择字典");
  batchToggleLoading.value = true;
  try {
    const selected = props.dataSource.filter((i) =>
      selectedRowKeys.value.includes(i.id)
    );
    await emit("batchToggleStatus", selected, !allSelectedActive.value);
  } finally {
    batchToggleLoading.value = false;
  }
};

const batchDelete = async () => {
  if (!selectedRowKeys.value.length) return message.warning("请先选择字典");
  batchDeleteLoading.value = true;
  try {
    const selected = props.dataSource.filter((i) =>
      selectedRowKeys.value.includes(i.id)
    );
    await emit("batchDelete", selected);
    selectedRowKeys.value = [];
  } finally {
    batchDeleteLoading.value = false;
  }
};

// 列管理方法
const handleColumnManagerOk = () => {
  showColumnManager.value = false;
  localStorage.setItem(
    "dictionaryColumnSettings",
    JSON.stringify(columnSettings.value)
  );
  message.success("列设置已保存");
};
const handleColumnManagerCancel = () => (showColumnManager.value = false);

const selectAllColumns = () =>
  Object.keys(columnSettings.value).forEach(
    (k) => (columnSettings.value[k].visible = true)
  );
const deselectAllColumns = () =>
  Object.keys(columnSettings.value).forEach(
    (k) => (columnSettings.value[k].visible = false)
  );
const resetColumnSettings = () => {
  Object.keys(columnSettings.value).forEach(
    (k) =>
      (columnSettings.value[k].visible = [
        "category",
        "key",
        "label",
        "description",
        "status",
        "priority",
      ].includes(k))
  );
};

// 统计按钮点击
const handleStatsClick = (type) => emit("statsFilter", type);

// 新增/导入/导出
const handleAdd = () => {
  console.log("新增字典");
  emit("add");
};
const handleImport = () => emit("import");
const handleExport = () => emit("export");

// 初始化
onMounted(() => {
  const saved = localStorage.getItem("dictionaryColumnSettings");
  if (saved) Object.assign(columnSettings.value, JSON.parse(saved));
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
  align-items: flex-end;
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

.dictionary-table-container {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 40px);
}

.table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dictionary-stats-container {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.dictionary-stats-buttons {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

.stats-button {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  min-width: 140px;
  height: 50px;
  transition: all 0.3s;
}
.stats-button.stats-active {
  border: 1px solid #1890ff;
}
.button-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #1890ff;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 8px;
  font-size: 14px;
}
.button-content .button-title {
  font-size: 12px;
  color: #666;
}
.button-content .button-count {
  font-size: 16px;
  font-weight: 700;
}

.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}

.status-text {
  margin-left: 8px;
  font-size: 12px;
  color: #8c8c8c;
}

.action-buttons {
  display: flex;
  gap: 4px;
}
</style>
