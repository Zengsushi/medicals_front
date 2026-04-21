<template>
  <div class="dict_main">
    <div class="main_header">
      <h1 class="main_title">字典管理</h1>
      <!-- <p class="main_subtitle">管理系统中的各类字典数据</p> -->
    </div>
    <!-- <a_divider class="custom_divider" dashed /> -->
    <div class="main_content">
      <div class="content_card">
        <!-- <div class="card_header">
          <h4>字典列表</h4>
          <div class="card_handle">
            <div
              class="card_add_button"
              @click="handleFormShow"
              title="新增字典"
            >
              新增
            </div>
            <div
              class="card_add_button"
              @click="handleFormShow"
              title="编辑选中字典"
            >
              编辑
            </div>
            <div
              class="card_add_button"
              @click="handleDeleteDict"
              title="删除选中字典"
            >
              删除
            </div>
          </div>
        </div> -->
        <div class="card_body">
          <adminDictCategoryList />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import adminDictCategoryList from "./adminDictList.vue";
const props = defineProps({
  DictList: {
    type: Object,
    default: () => {},
  },
});
const emit = defineEmits(["formShow"]);
const formData = reactive({});
const DictionList = computed(() => {
  return props.DictList;
});

const handleFormShow = () => {
  emit("formShow");
};

const handleDeleteDict = () => {
  emit("deleteDict");
};
</script>

<style scoped>
.dict_main {
  flex: 1;
  padding: 18px;
  transition: all 0.3s ease;
}

.main_header {
  margin-bottom: 8px;
}

.main_title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.main_subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.main_content {
  margin-top: 18px;
}

.content_card {
  min-height: 700px;
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.card_header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card_handle {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.card_handle div {
  margin-left: 10px;
}

.card_handle div:hover {
  background-color: #66b1ff;
  transition: all 0.3s ease;
  transform: scale(1.02);
}

.card_add_button {
  padding: 8px 16px;
  background-color: #409eff;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.card_header h4 {
  margin: 0;
  font-size: 18px;
  color: #1a1a1a;
}
</style>
