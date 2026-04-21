<template>
  <div class="page-container">

    <!-- ⭐ 页面头部 -->
    <div class="page-header">
      <div>
        <h2>创建用户组</h2>
        <div class="sub-text">统一管理系统权限组织结构</div>
      </div>
    </div>

    <!-- ⭐ 状态统计区（增加页面信息感） -->
    <a-row :gutter="20" class="stat-row">

      <a-col :span="8">
        <a-card class="stat-card">
          <div class="stat-label">今日创建用户组</div>
          <div class="stat-number">2</div>
        </a-card>
      </a-col>

      <a-col :span="8">
        <a-card class="stat-card">
          <div class="stat-label">系统用户组总数</div>
          <div class="stat-number">18</div>
        </a-card>
      </a-col>

      <a-col :span="8">
        <a-card class="stat-card highlight">
          <div class="stat-label">活跃权限组</div>
          <div class="stat-number">12</div>
        </a-card>
      </a-col>

    </a-row>

    <!-- ⭐ 主操作区 -->
    <a-row justify="center">
      <a-col :span="14">

        <a-card class="form-card" title="新建用户组">

          <a-form
            layout="vertical"
            :model="formState"
            @finish="handleSubmit"
          >

            <a-form-item
              label="用户组名称"
              name="name"
              :rules="[{ required: true, message: '请输入名称' }]"
            >
              <a-input v-model:value="formState.name"/>
            </a-form-item>

            <a-form-item label="用户组描述">
              <a-textarea
                v-model:value="formState.desc"
                :rows="3"
              />
            </a-form-item>

            <a-form-item label="状态">
              <a-switch v-model:checked="formState.status"/>
            </a-form-item>

            <div class="form-footer">
              <a-space>
                <a-button @click="goBack" :disabled="loading">返回</a-button>
                <a-button type="primary" html-type="submit" :loading="loading">
                  创建用户组
                </a-button>
              </a-space>
            </div>

          </a-form>

        </a-card>

      </a-col>
    </a-row>

    <!-- ⭐ 页面底部提示区 -->
    <div class="page-tips">
      ⚡ 创建用户组后可在权限管理中分配访问策略
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { userAPI } from "../../api/users";

const router = useRouter();
const loading = ref(false);

const formState = ref({
  name: "",
  desc: "",
  status: true
});

const handleSubmit = async () => {
  loading.value = true;
  try {
    const res = await userAPI.create_user_group(formState.value);
    if (res?.data?.code === 200) {
      message.success("用户组创建成功");
      router.push("/user/manage/group");
    } else {
      message.error("用户组创建失败");
    }
  } catch (error) {
    console.error('创建用户组失败:', error);
    message.error("用户组创建失败");
  } finally {
    loading.value = false;
  }
};

const goBack = () => router.back();
</script>

<style scoped>
.page-container {
  padding: 32px;
  min-height: 100vh;

  background: linear-gradient(
    180deg,
    #f5f7fa 0%,
    #eef2f7 100%
  );
}

/* Header */
.page-header {
  margin-bottom: 26px;
}

.sub-text {
  color: #8c8c8c;
  font-size: 13px;
}

/* ⭐ 统计卡片 */
.stat-row {
  margin-bottom: 26px;
}

.stat-card {
  border-radius: 10px;
  text-align: center;

  transition: all .25s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
}

.stat-card.highlight {
  background: linear-gradient(135deg,#4096ff,#36cfc9);
  color: white;
}

.stat-label {
  font-size: 13px;
  opacity: .85;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  margin-top: 6px;
}

/* Form Card */
.form-card {
  border-radius: 12px;
  box-shadow:
    0 4px 18px rgba(0,0,0,.04);
}

/* Footer */
.form-footer {
  margin-top: 24px;
  text-align: right;
}

.page-tips {
  margin-top: 26px;
  text-align: center;
  color: #999;
  font-size: 13px;
}
</style>