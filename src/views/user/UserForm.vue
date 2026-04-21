<template>
  <a-drawer
    v-model:open="dialogVisible"
    :title="formTitle"
    width="328"
    placement="right"
    :mask-closable="false"
    @close="handleClose"
  >
    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      class="form"
    >
      <a-form-item label="用户名" name="username">
        <a-input v-model:value="formState.username" />
      </a-form-item>

      <a-form-item label="密码" name="password" v-if="!props.edit">
        <a-input-password v-model:value="formState.password" />
      </a-form-item>

      <a-form-item label="手机号" name="phone">
        <a-input v-model:value="formState.phone" />
      </a-form-item>

      <a-form-item label="邮箱" name="email">
        <a-input v-model:value="formState.email" />
      </a-form-item>

      <a-form-item label="姓">
        <a-input v-model:value="formState.first_name" />
      </a-form-item>

      <a-form-item label="名">
        <a-input v-model:value="formState.last_name" />
      </a-form-item>

      <a-form-item label="头像">
        <a-upload
          list-type="picture-card"
          :show-upload-list="false"
          :before-upload="beforeUpload"
          @change="handleChange"
        >
          <img v-if="formState.avatar" :src="formState.avatar" />
          <div v-else>上传</div>
        </a-upload>
      </a-form-item>

      <a-form-item>
        <a-button type="primary" block @click="handleSubmitAction">
          {{ props.edit ? "保存" : "创建" }}
        </a-button>
      </a-form-item>
    </a-form>
  </a-drawer>
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import { message, Modal } from "ant-design-vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  edit: {
    type: Boolean,
    default: false
  },
  record: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:visible', 'success', 'update', 'close', 'create']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => {
    if (!val && hasFormChanged()) {
      showConfirmDialog();
    } else {
      emit("update:visible", val);
    }
  },
});

const formTitle = computed(() => (props.edit ? "编辑用户" : "添加用户"));

const formRef = ref(null);

const defaultForm = () => ({
  username: "",
  password: "",
  phone: "",
  email: "",
  first_name: "",
  last_name: "",
  avatar: "",
});

// 保存表单的初始状态，用于判断是否有变更
let initialFormState = defaultForm();

const formState = reactive(defaultForm());

// 监听 visible 变化，重置表单和初始状态
watch(
  () => props.visible,
  (val) => {
    if (val) {
      resetForm();
      if (!props.edit) {
        // 添加用户模式：确保表单完全为空，没有任何默认数据
        Object.assign(initialFormState, defaultForm());
        Object.assign(formState, defaultForm());
      }
    }
  },
);

watch(
  () => props.record,
  (val) => {
    if (val && props.edit) {
      // 将 null 值转换为空字符串
      const safeRecord = {
        ...val,
        first_name: val.first_name || "",
        last_name: val.last_name || "",
        avatar: val.avatar || "",
        last_login_ip: val.last_login_ip || "",
        introduce: val.introduce || ""
      };
      Object.assign(initialFormState, safeRecord);
      Object.assign(formState, safeRecord);
      formState.password = "";
      initialFormState.password = "";
    }
  },
  { immediate: true },
);

// 判断表单是否有变更
const hasFormChanged = () => {
  if (props.edit) {
    // 编辑模式：比较与初始状态的差异
    return (
      formState.username !== initialFormState.username ||
      formState.phone !== initialFormState.phone ||
      formState.email !== initialFormState.email ||
      formState.first_name !== initialFormState.first_name ||
      formState.last_name !== initialFormState.last_name ||
      formState.avatar !== initialFormState.avatar
    );
  } else {
    // 添加模式：检查是否有任何字段被填写
    return (
      formState.username !== "" ||
      formState.password !== "" ||
      formState.phone !== "" ||
      formState.email !== "" ||
      formState.first_name !== "" ||
      formState.last_name !== "" ||
      formState.avatar !== ""
    );
  }
};

// 显示确认对话框
const showConfirmDialog = () => {
  Modal.confirm({
    title: '确认关闭',
    content: '您有未保存的更改，确定要关闭吗？',
    okText: '确定关闭',
    cancelText: '继续编辑',
    onOk: () => {
      emit("update:visible", false);
      emit("close");
      resetForm();
    },
    onCancel: () => {
      // 用户选择继续编辑，保持弹窗打开
      emit("update:visible", true);
    },
  });
};

const rules = computed(() => {
  const baseRules = {
    username: [
      { required: true, message: "请输入用户名" },
      { min: 3, max: 20, message: "用户名长度在 3-20 之间" }
    ],
    phone: [
      { required: true, message: "请输入手机号" },
      { pattern: /^1[3-9]\d{9}$/, message: "手机号格式错误" }
    ],
    email: [
      { required: true, message: "请输入邮箱" },
      { type: "email", message: "邮箱格式错误" }
    ],
    first_name: [
      { max: 50, message: "名字长度不能超过 50" }
    ],
    last_name: [
      { max: 50, message: "姓氏长度不能超过 50" }
    ]
  };

  if (!props.edit) {
    baseRules.password = [
      { required: true, message: "请输入密码" },
      { min: 6, message: "密码长度至少为 6" },
      { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, message: "密码必须包含大小写字母和数字" }
    ];
  }

  return baseRules;
});

const prepareData = (data) => {
  // 确保所有可能为 null 的字段都转换为空字符串
  return {
    ...data,
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    avatar: data.avatar || "",
    last_login_ip: data.last_login_ip || "",
    introduce: data.introduce || ""
  };
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    emit("success", prepareData(formState));
  } catch (err) {
    message.error("请检查表单");
  }
};

const handleEditSubmit = async () => {
  try {
    await formRef.value?.validate();
    emit("update", prepareData(formState));
  } catch (err) {
    message.error("请检查表单");
  }
};

const handleSubmitAction = () => {
  if (props.edit) {
    handleEditSubmit();
  } else {
    handleSubmit();
  }
};

const resetForm = () => {
  Object.assign(formState, defaultForm());
  Object.assign(initialFormState, defaultForm());
  formRef.value?.clearValidate();
};

const handleClose = () => {
  if (hasFormChanged()) {
    showConfirmDialog();
  } else {
    emit("close");
    resetForm();
  }
};

const beforeUpload = (file) => {
  const isImage = file.type.startsWith("image/");
  if (!isImage) {
    message.error("只能上传图片");
  }
  return isImage;
};

const handleChange = (info) => {
  if (info.file.status === "done") {
    formState.avatar = URL.createObjectURL(info.file.originFileObj);
  }
};
</script>

<style scoped>
.form {
  padding: 20px;
  max-width: 288px;
}
</style>
