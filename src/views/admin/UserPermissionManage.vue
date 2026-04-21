<template>
  <div class="user-permission-manage">
    <div class="content">
      <div class="header-actions">
        <div class="search-box">
          <a-input-search
            v-model:value="leftKeyword"
            placeholder="搜索普通用户..."
            enter-button
            size="large"
            @search="fetchUsers"
          />
        </div>
        <div class="action-buttons">
          <a-button @click="fetchUsers" :loading="userLoading">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </div>
      </div>

      <a-card class="user-permission-card" :loading="userLoading">
        <div class="user-transfer-wrapper">
          <div class="transfer-panel">
            <div class="panel-header">
              <h3>普通用户</h3>
              <a-input-search
                v-model:value="leftKeyword"
                placeholder="搜索用户"
                style="width: 200px"
                allow-clear
              />
            </div>
            <div class="panel-actions">
              <a-checkbox 
                :checked="isAllLeftSelected" 
                @change="toggleSelectAllLeft"
              >
                全选
              </a-checkbox>
              <span>{{ selectedLeft.length }} 已选</span>
            </div>
            <a-list
              :data-source="filteredLeftUsers"
              :locale="{ emptyText: '暂无普通用户' }"
              class="user-list"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-checkbox
                    :checked="selectedLeft.includes(item.id)"
                    :disabled="item.is_superuser"
                    @change="(e) => toggleUserSelection('left', item.id, e.target.checked)"
                  >
                    <a-avatar :size="32" :src="item.avatar || defaultAvatar" />
                    <span class="user-info">
                      <span class="username">
                        {{ item.username }}
                        <a-tag v-if="item.is_superuser" color="red" style="margin-left: 8px">系统管理员</a-tag>
                      </span>
                      <span class="email">{{ item.email || '-' }}</span>
                    </span>
                  </a-checkbox>
                </a-list-item>
              </template>
            </a-list>
          </div>

          <div class="transfer-buttons">
            <a-button 
              type="primary" 
              shape="circle"
              :disabled="selectedLeft.length === 0"
              :loading="userSaving"
              @click="moveToAdmin"
            >
              <RightOutlined />
            </a-button>
            <a-button 
              shape="circle"
              :disabled="selectedRight.length === 0"
              :loading="userSaving"
              @click="moveToUser"
            >
              <LeftOutlined />
            </a-button>
          </div>

          <div class="transfer-panel">
            <div class="panel-header">
              <h3>管理员用户</h3>
              <a-input-search
                v-model:value="rightKeyword"
                placeholder="搜索用户"
                style="width: 200px"
                allow-clear
              />
            </div>
            <div class="panel-actions">
              <a-checkbox 
                :checked="isAllRightSelected" 
                @change="toggleSelectAllRight"
              >
                全选
              </a-checkbox>
              <span>{{ selectedRight.length }} 已选</span>
            </div>
            <a-list
              :data-source="filteredRightUsers"
              :locale="{ emptyText: '暂无管理员用户' }"
              class="user-list"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-checkbox
                    :checked="selectedRight.includes(item.id)"
                    :disabled="item.is_superuser"
                    @change="(e) => toggleUserSelection('right', item.id, e.target.checked)"
                  >
                    <a-avatar :size="32" :src="item.avatar || defaultAvatar" />
                    <span class="user-info">
                      <span class="username">
                        {{ item.username }}
                        <a-tag v-if="item.is_superuser" color="red" style="margin-left: 8px">系统管理员</a-tag>
                      </span>
                      <span class="email">{{ item.email || '-' }}</span>
                    </span>
                  </a-checkbox>
                </a-list-item>
              </template>
            </a-list>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { 
  ReloadOutlined,
  RightOutlined,
  LeftOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { userAPI } from '../../api/users';

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlOSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjIwIiBmaWxsPSIjOWVhM2FiIi8+PHBhdGggZD0iTTIwIDg1IGMwIC0yNSAyNSAtNDAgMzAgLTQwIGMxMCAwIDMwIDE1IDMwIDQwIGwwIDAiIGZpbGw9IiM5ZWEzYWIiLz48L3N2Zz4=';

const userLoading = ref(false);
const userSaving = ref(false);
const normalUsers = ref([]);
const adminUsers = ref([]);
const selectedLeft = ref([]);
const selectedRight = ref([]);
const leftKeyword = ref('');
const rightKeyword = ref('');

const filteredLeftUsers = computed(() => {
  if (!leftKeyword.value) return normalUsers.value;
  const kw = leftKeyword.value.toLowerCase();
  return normalUsers.value.filter(
    u => u.username?.toLowerCase().includes(kw) || u.email?.toLowerCase().includes(kw)
  );
});

const filteredRightUsers = computed(() => {
  if (!rightKeyword.value) return adminUsers.value;
  const kw = rightKeyword.value.toLowerCase();
  return adminUsers.value.filter(
    u => u.username?.toLowerCase().includes(kw) || u.email?.toLowerCase().includes(kw)
  );
});

const isAllLeftSelected = computed(() => {
  return filteredLeftUsers.value.length > 0 && 
         filteredLeftUsers.value.every(u => selectedLeft.value.includes(u.id));
});

const isAllRightSelected = computed(() => {
  return filteredRightUsers.value.length > 0 && 
         filteredRightUsers.value.every(u => selectedRight.value.includes(u.id));
});

const fetchUsers = async () => {
  userLoading.value = true;
  try {
    const res = await userAPI.get_user_list({ page: 1, page_size: 1000 });
    if (res?.success && res?.code === 200 && res?.data?.user_list) {
      const users = res.data.user_list;
      normalUsers.value = users.filter(u => !u.is_staff && !u.is_superuser);
      adminUsers.value = users.filter(u => u.is_staff || u.is_superuser);
      
      selectedLeft.value = selectedLeft.value.filter(id => {
        const user = users.find(u => u.id === id);
        return user && !user.is_superuser;
      });
      
      selectedRight.value = selectedRight.value.filter(id => {
        const user = users.find(u => u.id === id);
        return user && !user.is_superuser;
      });
    }
  } catch (error) {
    console.error('获取用户列表失败:', error);
  } finally {
    userLoading.value = false;
  }
};

const toggleUserSelection = (side, id, checked) => {
  const selected = side === 'left' ? selectedLeft : selectedRight;
  if (checked) {
    if (!selected.value.includes(id)) {
      selected.value.push(id);
    }
  } else {
    const index = selected.value.indexOf(id);
    if (index > -1) {
      selected.value.splice(index, 1);
    }
  }
};

const toggleSelectAllLeft = (e) => {
  if (e.target.checked) {
    selectedLeft.value = filteredLeftUsers.value.map(u => u.id);
  } else {
    selectedLeft.value = [];
  }
};

const toggleSelectAllRight = (e) => {
  if (e.target.checked) {
    selectedRight.value = filteredRightUsers.value.map(u => u.id);
  } else {
    selectedRight.value = [];
  }
};

const moveToAdmin = async () => {
  if (selectedLeft.value.length === 0) {
    message.warning('请先选择要升级的用户');
    return;
  }
  userSaving.value = true;
  let successCount = 0;
  let failCount = 0;
  
  try {
    for (const id of selectedLeft.value) {
      try {
        const res = await userAPI.update_user_permissions(id, {
          role: 'admin',
          permissions: []
        });
        
        if (res?.success && res?.code === 200) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
        console.error(`升级用户 ${id} 异常:`, err);
      }
    }
    
    if (successCount > 0) {
      message.success(`成功升级 ${successCount} 个用户`);
    }
    if (failCount > 0) {
      message.warning(`${failCount} 个用户升级失败`);
    }
    
    selectedLeft.value = [];
    await fetchUsers();
  } catch (error) {
    console.error('移动用户失败:', error);
    message.error('移动用户失败');
  } finally {
    userSaving.value = false;
  }
};

const moveToUser = async () => {
  if (selectedRight.value.length === 0) {
    message.warning('请先选择要降级的用户');
    return;
  }
  userSaving.value = true;
  let successCount = 0;
  let failCount = 0;
  
  try {
    for (const id of selectedRight.value) {
      try {
        const res = await userAPI.update_user_permissions(id, {
          role: 'user',
          permissions: []
        });
        
        if (res?.success && res?.code === 200) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
        console.error(`降级用户 ${id} 异常:`, err);
      }
    }
    
    if (successCount > 0) {
      message.success(`成功降级 ${successCount} 个用户`);
    }
    if (failCount > 0) {
      message.warning(`${failCount} 个用户降级失败`);
    }
    
    selectedRight.value = [];
    await fetchUsers();
  } catch (error) {
    console.error('移动用户失败:', error);
    message.error('移动用户失败');
  } finally {
    userSaving.value = false;
  }
};

onMounted(async () => {
  await fetchUsers();
});
</script>

<style scoped lang="less">
.user-permission-manage {
  width: 100%;
  padding: 0;
}

.content {
  width: 100%;
  padding: 24px;
  background: #f0f2f5;
  min-height: 600px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.search-box {
  max-width: 320px;
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.user-permission-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.user-transfer-wrapper {
  display: flex;
  gap: 24px;
  align-items: stretch;
}

.transfer-panel {
  flex: 1;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #1a1a1a;
    }
  }

  .panel-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    color: #666;
  }

  .user-list {
    max-height: 500px;
    overflow-y: auto;

    :deep(.ant-list-item) {
      padding: 12px 16px;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      margin-left: 12px;

      .username {
        font-size: 14px;
        font-weight: 500;
        color: #1a1a1a;
      }

      .email {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

.transfer-buttons {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  padding: 0 8px;
}

@media (max-width: 768px) {
  .content {
    padding: 16px;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .search-box {
    max-width: 100%;
  }
  
  .user-transfer-wrapper {
    flex-direction: column;
  }
  
  .transfer-buttons {
    flex-direction: row;
  }
}
</style>
