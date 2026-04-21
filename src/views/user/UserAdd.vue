<template>
  <div class="user-form-wrapper">
    <a-card title="基础信息" class="form-card">
      <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="用户名" name="username">
              <a-input v-model:value="formState.username" />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="密码" name="password">
              <a-input-password v-model:value="formState.password" />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="邮箱" name="email">
              <a-input v-model:value="formState.email" />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="手机号" name="phone">
              <a-input v-model:value="formState.phone" />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="名" name="first_name">
              <a-input v-model:value="formState.first_name" />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="姓" name="last_name">
              <a-input v-model:value="formState.last_name" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 头像 -->
        <a-form-item label="头像">
          <div class="avatar-box">
            <a-upload :before-upload="beforeUpload" :show-upload-list="false">
              <div class="avatar-wrapper">
                <img
                  v-if="formState.avatar"
                  :src="formState.avatar"
                  class="avatar-img"
                />
                <div v-else class="avatar-placeholder">点击上传</div>
              </div>
            </a-upload>
          </div>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 权限区域 -->
    <a-card title="权限设置" class="form-card">
      <div class="switch-group">
        <div class="switch-item">
          <span>是否启用</span>
          <a-switch v-model:checked="formState.is_active" />
        </div>

        <div class="switch-item">
          <span>是否员工</span>
          <a-switch v-model:checked="formState.is_staff" />
        </div>

        <div class="switch-item">
          <span>是否超级管理员(占位)</span>
          <a-switch v-model:checked="formState.is_superuser" />
        </div>
      </div>
    </a-card>

    <!-- 按钮区域 -->
    <div class="form-footer">
      <a-button type="default">取消</a-button>
      <a-button type="primary" @click="handleSubmit"> 创建用户 </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { type FormInstance, type UploadProps } from "ant-design-vue";
import { userAPI } from "../../api/users";
import { useErrorHandler } from "../../composables/useErrorHandler";

const { handleAsync } = useErrorHandler({ showNotification: true });

interface UserForm {
  username: string;
  password: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  avatar: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

const formRef = ref();

const formState = reactive({
  username: "",
  password: "",
  email: "",
  phone: "",
  first_name: "",
  last_name: "",
  avatar: "",
  is_active: false,
  is_staff: false,
  is_superuser: false,
});

const rules = {
  username: [{ required: true, message: "请输入用户名" }],
  password: [{ required: true, message: "请输入密码" }],
  email: [
    { required: true, message: "请输入邮箱" },
    { type: "email", message: "邮箱格式错误" },
  ],
  phone: [{ required: true, message: "请输入手机号" }],
};

const beforeUpload: UploadProps["beforeUpload"] = (file) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    formState.avatar = reader.result as string;
  };
  return false;
};

const resetForm = () => {
  Object.assign(formState, {
    username: "",
    password: "",
    email: "",
    phone: "",
    first_name: "",
    last_name: "",
    avatar: "",
    is_active: false,
    is_staff: false,
    is_superuser: false,
  });
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    
    const result = await handleAsync(
      () => userAPI.create_user(formState),
      {
        successMessage: '用户创建成功',
        errorMessage: '用户创建失败'
      }
    );

    if (result.success) {
      resetForm();
    }
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};
</script>

<style scoped>
.user-form-wrapper {
  padding: 16px;
}

.form-card {
  margin-bottom: 16px;
  border-radius: 10px;
}

.avatar-box {
  display: flex;
  justify-content: center;
}

.avatar-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px dashed #d9d9d9;
  cursor: pointer;
  transition: all 0.3s;
}

.avatar-wrapper:hover {
  border-color: #1677ff;
  box-shadow: 0 0 8px rgba(22, 119, 255, 0.4);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.switch-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
}
</style>
