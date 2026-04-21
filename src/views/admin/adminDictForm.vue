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
        <a-form-item label="字典分类" name="category_id">
          <a-select
            v-model:value="formData.category_id"
            placeholder="请选择字典分类"
            :options="categoryOptions"
            filter-option
            show-search
          />
        </a-form-item>

        <a-form-item label="字典键" name="key">
          <a-input
            v-model:value="formData.key"
            placeholder="请输入字典键"
            :disabled="isEdit"
          />
        </a-form-item>

        <a-form-item label="字典名称" name="label">
          <a-input
            v-model:value="formData.label"
            placeholder="请输入字典名称"
          />
        </a-form-item>

        <a-form-item label="字典描述" name="description">
          <a-textarea
            v-model:value="formData.description"
            placeholder="请输入字典描述"
            :rows="3"
          />
        </a-form-item>

        <a-form-item label="状态" name="status">
          <a-radio-group v-model:value="formData.status">
            <a-radio value="active">启用</a-radio>
            <a-radio value="inactive">禁用</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="优先级" name="priority">
          <a-input-number
            v-model:value="formData.priority"
            :min="0"
            :max="999"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="拓展配置" name="config">
          <a-input
            v-model:value="formData.config"
            placeholder="请输入JSON格式的拓展配置"
          />
          <div class="form-hint">示例: {"color": "#1890ff", "icon": "user"}</div>
        </a-form-item>

        <div class="form-actions">
          <a-button @click="handleClose">取消</a-button>
          <a-button type="primary" @click="handleSubmit" :loading="loading">
            {{ isEdit ? '更新' : '保存' }}
          </a-button>
        </div>
      </a-form>
    </a-drawer>    
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { message } from "ant-design-vue";
import { adminDictApi } from "../../api/admin";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  currentItem: {
    type: Object,
    default: () => {}
  },
  categoryList: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["update:visible", "success"]);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),  
});

const formRef = ref(null);
const loading = ref(false);
const isEdit = ref(false);
const formData = ref({
  category_id: null,
  key: '',
  label: '',
  description: '',
  status: 'active',
  priority: 0,
  config: ''
});

const formRules = {
  category_id: [{ required: true, message: '请选择字典分类', trigger: 'blur' }],
  key: [{ required: true, message: '请输入字典键', trigger: 'blur' }],
  label: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  priority: [{ required: true, message: '请输入优先级', trigger: 'blur' }]
};

const formTitle = computed(() => {
  return isEdit.value ? '编辑字典' : '新增字典';
});

const categoryOptions = computed(() => {
  return props.categoryList.map(item => ({
    label: item.label,
    value: item.id
  }));
});

watch(() => props.currentItem, (newVal) => {
  if (newVal && Object.keys(newVal).length > 0) {
    isEdit.value = true;
    formData.value = {
      ...newVal,
      category_id: newVal.category_id || newVal.categoryId
    };
  } else {
    isEdit.value = false;
    resetForm();
  }
}, { immediate: true, deep: true });

const resetForm = () => {
  formData.value = {
    category_id: null,
    key: '',
    label: '',
    description: '',
    status: 'active',
    priority: 0,
    config: ''
  };
  formRef.value?.resetFields();
};

const handleClose = () => {
  dialogVisible.value = false;
  setTimeout(() => {
    resetForm();
  }, 300);
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    loading.value = true;

    let result;
    if (isEdit.value) {
      result = await adminDictApi.updateDict(formData.value.id, formData.value);
    } else {
      result = await adminDictApi.addDict(formData.value);
    }

    if (result.data.code === 200 || result.data.code === 201) {
      message.success(result.data.message);
      emit('success');
      handleClose();
    } else {
      message.error(result.data.message);
    }
  } catch (error) {
    console.error('提交失败:', error);
    message.error('提交失败，请检查数据');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (props.currentItem && Object.keys(props.currentItem).length > 0) {
    isEdit.value = true;
    formData.value = {
      ...props.currentItem,
      category_id: props.currentItem.category_id || props.currentItem.categoryId
    };
  }
});
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.form-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.4;
}
</style>
