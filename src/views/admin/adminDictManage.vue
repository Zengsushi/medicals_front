<template>
  <div class="dict_layout">
    <!-- 分类菜单 -->
    <AdminDictMenu
      style="position: fixed; height: 100vh"
      :isExpanded="isExpanded"
      :activeTab="activeTab"
      :dictCategoryList="dictCategoryList"
      :currentItem="currentCategoryItem"
      @expand_menu="handleExpandMenu"
      @add="handleAddCategory"
      @edit="handleEditCategory"
      @use_dictCategory="handleUseDictCategory"
      @delete="handleDeleteCategory"
      @dictionList="loadDictionList"
    />
    <div class="dict_main" :class="{ 'main_collapsed': !isExpanded }">
      <AdminDictionList 
        :dataSource="dictList"
        :loading="loading"
        :pagination="pagination"
        :totalCount="totalCount"
        :activeCount="activeCount"
        :inactiveCount="inactiveCount"
        :currentFilter="currentFilter"
        @tableChange="handleTableChange"
        @editRecord="handleEditDict"
        @deleteRecord="handleDeleteDict"
        @toggleStatus="handleToggleStatus"
        @batchDelete="handleBatchDelete"
        @batchToggleStatus="handleBatchToggleStatus"
        @add="handleAddDict"
        @statsFilter="handleStatsFilter"
      />
    </div>
  </div>

  <!-- 字典分类表单 -->
  <AdminDictCategoryForm
    v-model:visible="dictCategoryDialogVisible"
    :currentItem="currentCategoryItem"
    @success="handleCategorySuccess"
  />
  <!-- 字典表单 -->
  <AdminDictionForm 
    v-model:visible="dictionFormVisible"
    :currentItem="currentDictItem"
    :categoryList="dictCategoryList"
    @success="handleDictSuccess"
  />
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import { message } from "ant-design-vue";
import AdminDictCategoryForm from "./adminDictCategoryForm.vue";
import AdminDictMenu from "./adminDictCategoryMenu.vue";
import AdminDictionList from "./adminDictList.vue";
import AdminDictionForm from "./adminDictForm.vue";
import { adminDictApi, adminDictCategoryApi } from "../../api/admin";

// 分类菜单
const isExpanded = ref(true);
const activeTab = ref("");
const dictCategoryList = ref([]);
const currentCategoryItem = ref({});

// 分类表单
const dictCategoryDialogVisible = ref(false);
const categoryIsEdit = ref(false);

// 字典列表
const dictList = ref([]);
const dictionFormVisible = ref(false);
const currentDictItem = ref({});
const dictIsEdit = ref(false);
const loading = ref(false);
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
});
const totalCount = ref(0);
const activeCount = ref(0);
const inactiveCount = ref(0);
const currentFilter = ref('total');

// 展开/收缩分类菜单
const handleExpandMenu = () => {
  isExpanded.value = !isExpanded.value;
};

// 新增分类
const handleAddCategory = () => {
  categoryIsEdit.value = false;
  currentCategoryItem.value = {};
  dictCategoryDialogVisible.value = true;
};

// 新增字典
const handleAddDict = () => {
  dictIsEdit.value = false;
  currentDictItem.value = {};
  dictionFormVisible.value = true;
};

// 编辑分类
const handleEditCategory = (value) => {
  if (value.is_editable) {
    categoryIsEdit.value = true;
    currentCategoryItem.value = value;
    dictCategoryDialogVisible.value = true;
  } else {
    message.warning("此分类为系统分类,不可进行编辑!");
  }
};

// 编辑字典
const handleEditDict = (record) => {
  dictIsEdit.value = true;
  currentDictItem.value = record;
  dictionFormVisible.value = true;
};

const handleUseDictCategory = (key) => {
  activeTab.value = key;
};

const handleDeleteCategory = async (id) => {
  try {
    loading.value = true;
    const res = await adminDictCategoryApi.deletedDictCategory(id);
    if (res.data.code === 200) {
      message.success(res.data.message);
      await loadDictCategoryList();
    } else if (res.data.code === 404) {
      message.error("分类不存在,操作异常");
    } else if (res.data.code === 400) {
      message.error(res.data.message);
    } else if (res.data.code === 500) {
      message.error(res.data.message);
    }
  } catch (error) {
    message.error("删除分类失败");
  } finally {
    loading.value = false;
  }
};

// 字典分类表单提交成功
const handleCategorySuccess = async () => {
  await loadDictCategoryList();
};

// 字典表单提交成功
const handleDictSuccess = async () => {
  await loadDictionList(activeTab.value);
};

// 字典分类列表获取
const loadDictCategoryList = async () => {
  try {
    loading.value = true;
    const res = await adminDictCategoryApi.getDictCategoryList();
    if (res.data.code === 200 && Array.isArray(res.data.data)) {
      dictCategoryList.value = res.data.data;
      if (res.data.data.length > 0 && !activeTab.value) {
        activeTab.value = res.data.data[0].key;
        await loadDictionList(res.data.data[0].id);
      }
    }
  } catch (error) {
    message.error("加载字典分类失败");
  } finally {
    loading.value = false;
  }
};

const loadDictionList = async (categoryId) => {
  if (!categoryId) {
    return;
  }
  try {
    loading.value = true;
    const res = await adminDictApi.getDictList({ 
      categoryId: categoryId,
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      status: currentFilter.value === 'total' ? '' : currentFilter.value
    });
    if (res.data.code === 200) {
      dictList.value = res.data.data.items || [];
      pagination.value.total = res.data.data.total || 0;
      totalCount.value = res.data.data.total || 0;
      activeCount.value = res.data.data.activeCount || 0;
      inactiveCount.value = res.data.data.inactiveCount || 0;
      message.success("获取字典列表成功");
    } else {
      message.error(res.data.message);
    }
  } catch (error) {
    message.error("加载字典列表失败");
  } finally {
    loading.value = false;
  }
};

// 表格变更处理
const handleTableChange = (pagination, filters, sorter) => {
  pagination.value = pagination;
  loadDictionList(activeTab.value);
};

// 删除字典
const handleDeleteDict = async (record) => {
  try {
    loading.value = true;
    const res = await adminDictApi.deleteDict(record.id);
    if (res.data.code === 200) {
      message.success(res.data.message);
      await loadDictionList(activeTab.value);
    } else {
      message.error(res.data.message);
    }
  } catch (error) {
    message.error("删除字典失败");
  } finally {
    loading.value = false;
  }
};

// 切换字典状态
const handleToggleStatus = async (record, status) => {
  try {
    loading.value = true;
    const res = await adminDictApi.updateDictStatus(record.id, { status });
    if (res.data.code === 200) {
      message.success(res.data.message);
      await loadDictionList(activeTab.value);
    } else {
      message.error(res.data.message);
    }
  } catch (error) {
    message.error("切换状态失败");
  } finally {
    loading.value = false;
  }
};

// 批量删除
const handleBatchDelete = async (selected) => {
  try {
    loading.value = true;
    const ids = selected.map(item => item.id);
    const res = await adminDictApi.batchDeleteDict(ids);
    if (res.data.code === 200) {
      message.success(res.data.message);
      await loadDictionList(activeTab.value);
    } else {
      message.error(res.data.message);
    }
  } catch (error) {
    message.error("批量删除失败");
  } finally {
    loading.value = false;
  }
};

// 批量切换状态
const handleBatchToggleStatus = async (selected, status) => {
  try {
    loading.value = true;
    const ids = selected.map(item => item.id);
    const res = await adminDictApi.batchUpdateDictStatus(ids, { status });
    if (res.data.code === 200) {
      message.success(res.data.message);
      await loadDictionList(activeTab.value);
    } else {
      message.error(res.data.message);
    }
  } catch (error) {
    message.error("批量切换状态失败");
  } finally {
    loading.value = false;
  }
};

// 统计过滤
const handleStatsFilter = (type) => {
  currentFilter.value = type;
  loadDictionList(activeTab.value);
};

onMounted(async () => {
  await loadDictCategoryList();
});
</script>
<style scoped>
.dict_layout {
  display: flex;
  flex-shrink: 0;
  min-height: 100vh;
}

.dict_main {
  flex: 1;
  margin-left: 240px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.main_collapsed {
  margin-left: 60px;
}

@media (max-width: 768px) {
  .dict_main {
    margin-left: 0;
    padding: 16px;
  }
}
</style>
