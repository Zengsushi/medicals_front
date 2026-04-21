<template>
  <div class="group-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h2>用户组管理</h2>
        <span class="sub-title">统一管理系统用户组权限</span>
      </div>

      <a-button type="primary" @click="openCreateDrawer">
        新建用户组
      </a-button>
    </div>

    <!-- Search -->
    <a-card class="search-card">
      <a-input
        v-model:value="keyword"
        placeholder="搜索用户组名称"
        allow-clear
        style="width: 260px"
      />
    </a-card>

    <!-- Table -->
    <a-card class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredGroups"
        row-key="id"
        bordered
        size="middle"
        :loading="loading"
      >

        <template #bodyCell="{ column, record }">

          <template v-if="column.key === 'action'">
            <a-space>

              <a @click="openEditDrawer(record)">编辑</a>

              <a-popconfirm
                title="确认删除该用户组?"
                @confirm="deleteGroup(record.id)"
              >
                <a class="danger-link">删除</a>
              </a-popconfirm>

            </a-space>
          </template>

        </template>

      </a-table>
    </a-card>

    <!-- Drawer Form -->
    <a-drawer
      v-model:open="drawerVisible"
      :title="drawerTitle"
      width="360"
    >
      <a-form layout="vertical">

        <a-form-item label="用户组名称">
          <a-input v-model:value="formState.name" />
        </a-form-item>

        <a-form-item label="描述">
          <a-textarea
            v-model:value="formState.desc"
            :rows="4"
          />
        </a-form-item>

        <a-form-item label="状态">
          <a-switch v-model:checked="formState.status" />
        </a-form-item>

        <a-button
          type="primary"
          block
          @click="submitGroup"
        >
          保存
        </a-button>

      </a-form>
    </a-drawer>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import { userAPI } from "../../api/users";

/* -------- 类型 -------- */

interface Group {
  id: number;
  name: string;
  desc: string;
  status: boolean;
}

/* -------- 状态 -------- */

const keyword = ref("");
const loading = ref(false);

const groups = ref<Group[]>([
  { id: 1, name: "普通用户组", desc: "基础访问权限", status: true },
  { id: 2, name: "管理员组", desc: "系统管理权限", status: true },
]);

/* -------- 表单 -------- */

const drawerVisible = ref(false);
const drawerTitle = ref("");
const saving = ref(false);

const formState = ref<Group>({
  id: 0,
  name: "",
  desc: "",
  status: true
});

/* -------- 生命周期 -------- */

onMounted(() => {
  fetchGroups();
});

/* -------- API 调用 -------- */

async function fetchGroups() {
  loading.value = true;
  try {
    const res = await userAPI.get_user_groups();
    if (res?.data?.code === 200) {
      groups.value = Array.isArray(res.data.data) ? res.data.data : [];
    }
  } catch (error) {
    console.error('获取用户组失败:', error);
    message.error('获取用户组失败');
  } finally {
    loading.value = false;
  }
}

/* -------- Table Columns -------- */

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 80
  },
  {
    title: "用户组名称",
    dataIndex: "name"
  },
  {
    title: "描述",
    dataIndex: "desc"
  },
  {
    title: "状态",
    dataIndex: "status"
  },
  {
    title: "操作",
    key: "action",
    width: 160
  }
];

/* -------- 计算过滤 -------- */

const filteredGroups = computed(() => {
  return groups.value.filter(g =>
    g.name.toLowerCase().includes(keyword.value.toLowerCase())
  );
});

/* -------- 方法 -------- */

const openCreateDrawer = () => {
  drawerTitle.value = "新建用户组";

  formState.value = {
    id: 0,
    name: "",
    desc: "",
    status: true
  };

  drawerVisible.value = true;
};

const openEditDrawer = (record: Group) => {
  drawerTitle.value = "编辑用户组";

  formState.value = { ...record };

  drawerVisible.value = true;
};

const submitGroup = async () => {
  saving.value = true;
  try {
    if (formState.value.id === 0) {
      // 创建新用户组
      const res = await userAPI.create_user_group(formState.value);
      if (res?.data?.code === 200) {
        message.success('用户组创建成功');
        await fetchGroups();
      } else {
        message.error('用户组创建失败');
      }
    } else {
      // 编辑用户组
      const res = await userAPI.update_user_group(formState.value.id, formState.value);
      if (res?.data?.code === 200) {
        message.success('用户组更新成功');
        await fetchGroups();
      } else {
        message.error('用户组更新失败');
      }
    }
    drawerVisible.value = false;
  } catch (error) {
    console.error('保存用户组失败:', error);
    message.error('保存用户组失败');
  } finally {
    saving.value = false;
  }
};

const deleteGroup = async (id: number) => {
  try {
    const res = await userAPI.delete_user_group(id);
    if (res?.data?.code === 200) {
      message.success('用户组删除成功');
      await fetchGroups();
    } else {
      message.error('用户组删除失败');
    }
  } catch (error) {
    console.error('删除用户组失败:', error);
    message.error('删除用户组失败');
  }
};
</script>

<style scoped>
.group-page {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.sub-title {
  color: #888;
  font-size: 13px;
}

.search-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.table-card {
  border-radius: 8px;
}

.danger-link {
  color: #ff4d4f;
}
</style>