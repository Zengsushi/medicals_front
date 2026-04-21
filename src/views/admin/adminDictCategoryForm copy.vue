<template>
  <a-drawer
    v-model:open="dialogVisible"
    :title="formTitle"
    width="500px"
    placement="right"
    :closeable="true"
    :mask-closable="false"
    @close="handleClose"
  >
    <a-form>
      <div
        class="form-section basic-info"
        :rules="formRules"
        :colon="false"
        :label-col="{ span: 6 }"
        @finish="handleSubmit"
        @finishFaild="handleSubmitFailed"
      >
        <h4 class="section-title">字典分类</h4>
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item
              label="分类键"
              name="key"
              :colon="false"
              class="form-item"
              :label-col="{ span: 6 }"
            >
              <a-input
                v-model:value="formData.key"
                placeholder="请输入分类键"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item
              label="分类名称"
              name="label"
              :colon="false"
              class="form-item"
              :label-col="{ span: 6 }"
            >
              <a-input
                v-model:value="formData.label"
                placeholder="请输入分类名称"
                :maxlength="100"
                show-count
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item
              label="启用状态"
              :colon="false"
              name="is_active"
              class="form-item"
              :label-col="{ span: 6 }"
            >
              <a-select
                v-model:value="formData.is_active"
                placeholder="请选分类状态"
              >
                <a-select-option :value="1">启用</a-select-option>
                <a-select-option :value="0">停用</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item
              label="可修改状态"
              :colon="false"
              name="is_active"
              class="form-item"
              :label-col="{ span: 6 }"
            >
              <a-select
                v-model:value="formData.is_editable"
                placeholder="是否可修改(默认为可修改)"
              >
                <a-select-option :value="1">可修改</a-select-option>
                <a-select-option :value="0">不可修改</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item
              label="图标"
              :colon="false"
              name="icon"
              class="form-item"
              :label-col="{ span: 6 }"
              @focus="loadCategoryIcon"
            >
              <a-select
                v-model:value="formData.icon"
                placeholder="请选分类图标"
              >
                <a-select-option value="1">1</a-select-option>
                <a-select-option value="2">2</a-select-option>
                <a-select-option value="3">3</a-select-option>
                <a-select-option value="4">4</a-select-option>
                <a-select-option value="5">5</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item
              label="颜色"
              :colon="false"
              name="color"
              class="form-item"
              :label-col="{ span: 6 }"
            >
              <a-input
                v-model:value="formData.color"
                placeholder="请输入分类颜色"
              />
            </a-form-item>
          </a-col>

          <a-col :span="24">
            <a-form-item
              label="分类描述"
              :colon="false"
              name="description"
              class="form-item"
              :label-col="{ span: 6 }"
            >
              <a-textarea
                v-model:value="formData.description"
                placeholder="请输入分类描述"
                allow-clear
                :maxlength="200"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="dialog-footer">
          <a-button @click="handleClose" :disabled="submitLoading"
            >取消</a-button
          >
          <a-button
            type="primary"
            @click="handleSubmit"
            :loading="submitLoading"
            :disabled="!isFormValid"
          >
            {{ isEdit ? "更新" : "保存" }}
          </a-button>
        </div>
      </div>
    </a-form>
  </a-drawer>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  nextTick,
  onBeforeMount,
  onMounted,
  watchEffect,
} from "vue";
import { message } from "ant-design-vue";
const submitLoading = ref(false);
const props = defineProps({
  isEdit: {
    type: Boolean,
    default: false,
  },
  visible: {
    type: Boolean,
    default: false,
  },
  currentItem: {
    type: Object,
    default: () => {},
  },
});
const formData = reactive({
  key: null,
  label: null,
  description: null,
  icon: null,
  is_editable: null,
  color: null,
  is_active: null,
});

const emit = defineEmits(["update:visible", "success"]);

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});
const formTitle = computed(() => {
  return props.isEdit ? "字典编辑" : "字典新增";
});

// TODO:图标加载待实现
const loadCategoryIcon = () => {
  console.log("加载图标");
};

// TODO : 表单清空
const resetForm = () => {
  console.log("清空表单");
  message.warning({
    content: () => "表单清空中...",
    duration: 1,
    onClose: () => {
      dialogVisible.value = false;
      message.success({ content: "表单清空成功", duration: 0.8 });
    },
  });
};

const handleClose = () => {
  nextTick(() => {
    resetForm();
  });
};

// 保存按钮计算
const isFormValid = computed(() => {
  return formData.key && formData.label && formData.icon && formData.is_active;
});

// 表单校验
const formRules = {
  key: [{ required: true, message: "请输入字典键值", tirgger: "blur" }],
  label: [
    { required: true, message: "请输入字典标签", tirgger: "blur" },
    {
      min: 2,
      max: 100,
      message: "资产编号长度在 2 到 100 个字符",
      trigger: "blur",
    },
  ],
  is_active: [{ required: true, message: "请指定分类状态", tirgger: "change" }],
};
// TODO: 表单提交
const handleSubmit = () => {
  formData.is_editable = formData.is_editable ? formData.is_editable : "True";
  emit("success", formData);
};

const handleSubmitFailed = (errorInfo) => {
  message.warning({
    content: () => "请检查表单是否填写完整",
    class: "custom-class",
    style: {
      marginTop: "40vh",
    },
    duration: 1,
  });
};
watchEffect(() => {
  if (props.isEdit) {
    console.log(formData);
    Object.assign(formData, props.currentItem);
  }
});

onMounted(() => {});
</script>

<style scoped>
.form-section {
  margin-bottom: 24px;
  padding: 24px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e8f4fd;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.06);
  transition: all 0.3s ease;
}

.form-section:hover {
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.1);
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
  position: relative;
  padding-left: 12px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item .ant-form-item-label > label {
  color: #262626;
  font-weight: 600;
}

.form-item .ant-input,
.form-item .ant-select-selector,
.form-item .ant-picker,
.form-item .ant-input-number {
  border-radius: 6px;
  border: 1px solid #d9d9d9;
  background: #ffffff;
}

.form-item .ant-input:hover,
.form-item .ant-select-selector:hover,
.form-item .ant-picker:hover,
.form-item .ant-input-number:hover {
  border-color: #40a9ff;
}

.form-item .ant-input:focus,
.form-item .ant-select-focused .ant-select-selector,
.form-item .ant-picker-focused,
.form-item .ant-input-number-focused {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.dialog-footer {
  text-align: right;
  padding: 18px 0;
  background: #ffffff;
}
</style>
