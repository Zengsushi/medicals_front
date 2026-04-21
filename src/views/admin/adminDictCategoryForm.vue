<template>
  <a-drawer
    v-model:open="dialogVisible"
    :title="formTitle"
    width="600px"
    placement="right"
    :closeable="true"
    :mask-closable="false"
    @close="handleClose"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
    >
      <div class="form-section basic-info">
        <h4 class="section-title">字典分类</h4>
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="分类键" name="key">
              <a-input
                v-model:value="formData.key"
                placeholder="请输入分类键"
                :disabled="isEdit"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="分类名称" name="label">
              <a-input
                v-model:value="formData.label"
                placeholder="请输入分类名称"
                :maxlength="100"
                show-count
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="启用状态" name="is_active">
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
            <a-form-item label="可修改状态" name="is_editable">
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
            <a-form-item label="分组类型" name="type">
              <a-select
                v-model:value="formData.type"
                placeholder="请选分组类型"
              >
                <a-select-option :value="0">菜单</a-select-option>
                <a-select-option :value="1">热点</a-select-option>
                <a-select-option :value="2">定义</a-select-option>
                <a-select-option :value="3">全局选项</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="图标" name="icon">
              <a-select
                v-model:value="formData.icon"
                placeholder="请选分类图标"
              >
                <a-select-option value="menu">菜单图标</a-select-option>
                <a-select-option value="setting">设置图标</a-select-option>
                <a-select-option value="database">数据库图标</a-select-option>
                <a-select-option value="layout">布局图标</a-select-option>
                <a-select-option value="fund">资金图标</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="颜色" name="color">
              <a-input
                v-model:value="formData.color"
                placeholder="请输入分类颜色 (例如: #1890ff)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="分类描述" name="description">
              <a-textarea
                v-model:value="formData.description"
                placeholder="请输入分类描述"
                allow-clear
                :maxlength="200"
                :rows="3"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="dialog-footer">
          <a-button @click="handleClose" :disabled="submitLoading">取消</a-button>
          <a-button
            type="primary"
            @click="handleSubmit"
            :loading="submitLoading"
          >
            {{ isEdit ? "更新" : "保存" }}
          </a-button>
        </div>
      </div>
    </a-form>
  </a-drawer>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { message } from "ant-design-vue";
import { adminDictCategoryApi } from "../../api/admin";

const submitLoading = ref(false);
const formRef = ref(null);

const props = defineProps({
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
  key: '',
  label: '',
  description: '',
  icon: '',
  is_editable: 1,
  color: '',
  is_active: 1,
  type: 0,
  user_id: computed(() => {
    return localStorage.getItem("user_id") || null;
  }),
});

const emit = defineEmits(["update:visible", "success"]);

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

const isEdit = computed(() => {
  return props.currentItem && Object.keys(props.currentItem).length > 0;
});

const formTitle = computed(() => {
  return isEdit.value ? "编辑字典分类" : "新增字典分类";
});

// 表单校验
const formRules = {
  key: [
    { required: true, message: "请输入分类键值", trigger: "blur" },
    { pattern: /^[a-zA-Z0-9_]+$/, message: "分类键只能包含字母、数字和下划线", trigger: "blur" }
  ],
  label: [
    { required: true, message: "请输入分类名称", trigger: "blur" },
    { min: 2, max: 100, message: "分类名称长度在 2 到 100 个字符", trigger: "blur" },
  ],
  is_active: [{ required: true, message: "请指定分类状态", trigger: "change" }],
  is_editable: [{ required: true, message: "请指定可修改状态", trigger: "change" }],
  type: [{ required: true, message: "请指定分组类型", trigger: "change" }],
  icon: [{ required: true, message: "请选择分类图标", trigger: "change" }],
};

// 监听 currentItem 变化
watch(() => props.currentItem, (newVal) => {
  if (newVal && Object.keys(newVal).length > 0) {
    Object.assign(formData, newVal);
  } else {
    resetForm();
  }
}, { immediate: true, deep: true });

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    key: '',
    label: '',
    description: '',
    icon: '',
    is_editable: 1,
    color: '',
    is_active: 1,
    type: 0,
  });
  formRef.value?.resetFields();
};

const handleClose = () => {
  dialogVisible.value = false;
  setTimeout(() => {
    resetForm();
  }, 300);
};

// 表单提交
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    
    if (!formData.user_id) {
      return message.error("用户登录状态异常!");
    }
    
    submitLoading.value = true;
    
    let result;
    if (isEdit.value) {
      result = await adminDictCategoryApi.updateDictCategory(formData.id, formData);
    } else {
      result = await adminDictCategoryApi.addDictCategory(formData);
    }
    
    if (result.data.code === 200 || result.data.code === 201) {
      message.success(result.data.message);
      emit("success");
      handleClose();
    } else {
      message.error(result.data.message);
    }
  } catch (error) {
    console.error("提交失败:", error);
    message.error("提交失败，请检查数据");
  } finally {
    submitLoading.value = false;
  }
};

onMounted(() => {
  if (props.currentItem && Object.keys(props.currentItem).length > 0) {
    Object.assign(formData, props.currentItem);
  }
});
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

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background: #1890ff;
  border-radius: 2px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
