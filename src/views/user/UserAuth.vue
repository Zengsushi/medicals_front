<template>
  <div class="transfer-page">
    <!-- 页面标题 -->
    <a-page-header
      title="管理员权限管理"
      sub-title="支持批量用户角色调整与权限分配"
      :ghost="false"
    >
      <template #extra>
        <a-space>
          <a-button @click="refreshData" :loading="loading">
            <ReloadOutlined /> 刷新
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- 操作工具栏 -->
    <a-card class="toolbar-card" :bordered="false">
      <a-space wrap>
        <a-button-group>
          <a-button @click="selectAll('left')">
            <CheckSquareOutlined /> 全选左侧
          </a-button>
          <a-button @click="invertSelection('left')">
            <SwapOutlined /> 反选
          </a-button>
        </a-button-group>
        
        <a-button-group>
          <a-button @click="selectAll('right')">
            <CheckSquareOutlined /> 全选右侧
          </a-button>
          <a-button @click="invertSelection('right')">
            <SwapOutlined /> 反选
          </a-button>
        </a-button-group>
        
        <a-button @click="clearSelection" :disabled="!hasSelection">
          <ClearOutlined /> 清空选择
        </a-button>
        
        <a-tag v-if="hasSelection" color="blue">
          已选择 {{ selectedLeft.length + selectedRight.length }} 项
        </a-tag>
      </a-space>
    </a-card>

    <!-- 穿梭框主体 -->
    <a-row :gutter="24" class="transfer-row">
      <!-- 普通用户列表 -->
      <a-col :xs="24" :lg="10">
        <a-card 
          :title="`普通用户 (${filteredLeftUsers.length})`" 
          class="list-card"
          :bordered="false"
        >
          <a-input-search
            v-model:value="leftKeyword"
            placeholder="搜索用户名或邮箱"
            allow-clear
            class="search-input"
          />
          
          <a-divider style="margin: 12px 0" />
          
          <a-checkbox-group v-model:value="selectedLeft" class="user-list">
            <VirtualList
              :data-source="filteredLeftUsers"
              :height="400"
              :item-height="56"
            >
              <template #item="{ item: user }">
                <div :key="user.id" class="user-item">
                  <a-checkbox :value="user.id" :disabled="user.is_superuser">
                    <div class="user-info">
                      <a-avatar 
                        :src="user.avatar" 
                        :style="{ backgroundColor: getAvatarColor(user.username) }"
                      >
                        {{ user.username.charAt(0).toUpperCase() }}
                      </a-avatar>
                      <div class="user-meta">
                        <div class="username">
                          {{ user.username }}
                          <a-tag v-if="user.is_superuser" color="red" size="small" style="margin-left: 8px">系统管理员</a-tag>
                        </div>
                        <div v-if="user.email" class="user-email">{{ user.email }}</div>
                      </div>
                    </div>
                  </a-checkbox>
                </div>
              </template>
              
              <template #empty>
                <a-empty description="暂无普通用户" />
              </template>
            </VirtualList>
          </a-checkbox-group>
        </a-card>
      </a-col>

      <!-- 操作按钮 -->
      <a-col :xs="24" :lg="4" class="action-col">
        <div class="action-buttons">
          <a-tooltip title="设为管理员">
            <a-button
              type="primary"
              shape="circle"
              size="large"
              :disabled="selectedLeft.length === 0"
              :loading="saving"
              @click="moveToAdmin"
            >
              <ArrowRightOutlined />
            </a-button>
          </a-tooltip>
          
          <a-tooltip title="降为普通用户">
            <a-button
              danger
              shape="circle"
              size="large"
              :disabled="selectedRight.length === 0 || adminUsers.length <= selectedRight.length"
              :loading="saving"
              @click="moveToUser"
            >
              <ArrowLeftOutlined />
            </a-button>
          </a-tooltip>
        </div>
      </a-col>

      <!-- 管理员列表 -->
      <a-col :xs="24" :lg="10">
        <a-card 
          :title="`管理员用户 (${filteredRightUsers.length})`" 
          class="list-card"
          :bordered="false"
        >
          <a-input-search
            v-model:value="rightKeyword"
            placeholder="搜索用户名或邮箱"
            allow-clear
            class="search-input"
          />
          
          <a-divider style="margin: 12px 0" />
          
          <a-checkbox-group v-model:value="selectedRight" class="user-list">
            <VirtualList
              :data-source="filteredRightUsers"
              :height="400"
              :item-height="56"
            >
              <template #item="{ item: user }">
                <div :key="user.id" class="user-item">
                  <a-checkbox :value="user.id" :disabled="user.is_superuser">
                    <div class="user-info">
                      <a-avatar 
                        :src="user.avatar"
                        :style="{ backgroundColor: user.is_superuser ? '#cf1322' : '#52c41a' }"
                      >
                        {{ user.username.charAt(0).toUpperCase() }}
                      </a-avatar>
                      <div class="user-meta">
                        <div class="username">
                          {{ user.username }}
                          <a-tag v-if="user.is_superuser" color="red" size="small">系统管理员</a-tag>
                          <a-tag v-else color="blue" size="small">管理员</a-tag>
                        </div>
                        <div v-if="user.email" class="user-email">{{ user.email }}</div>
                      </div>
                    </div>
                  </a-checkbox>
                </div>
              </template>
              
              <template #empty>
                <a-empty description="暂无管理员" />
              </template>
            </VirtualList>
          </a-checkbox-group>
        </a-card>
      </a-col>
    </a-row>

    <!-- 权限说明 -->
    <a-card class="info-card" :bordered="false">
      <a-alert
        message="权限说明"
        description="普通用户仅允许基础访问权限；管理员拥有系统管理操作权限，包括用户管理、系统配置等敏感操作。请谨慎分配管理员权限。"
        type="info"
        show-icon
      />
    </a-card>

    <!-- 底部操作栏 -->
    <a-affix :offset-bottom="24">
      <div class="footer-bar">
        <a-space>
          <span class="change-summary">
            <Badge :count="changeCount" :overflow-count="999" :show-zero="false">
              <span>待保存的更改</span>
            </Badge>
          </span>
          <a-button @click="resetChanges">重置</a-button>
          <a-button 
            type="primary" 
            size="large"
            :loading="saving"
            :disabled="!hasChanges"
            @click="handleSave"
          >
            <SaveOutlined /> 保存修改
          </a-button>
        </a-space>
      </div>
    </a-affix>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  message, 
  Modal,
  Badge
} from 'ant-design-vue';
import {
  ReloadOutlined,
  CheckSquareOutlined,
  SwapOutlined,
  ClearOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  SaveOutlined
} from '@ant-design/icons-vue';
import { useUserTransfer } from './composables/useUserTransfer';
import VirtualList from './components/VirtualList.vue';

// 使用组合式函数
const {
  loading,
  saving,
  normalUsers,
  adminUsers,
  selectedLeft,
  selectedRight,
  leftKeyword,
  rightKeyword,
  stats,
  filteredLeftUsers,
  filteredRightUsers,
  hasSelection,
  moveToAdmin,
  moveToUser,
  selectAll,
  invertSelection,
  clearSelection,
  saveChanges,
  fetchUsers
} = useUserTransfer();

// 原始数据备份（用于检测变更）
const originalData = ref({ normal: [] as number[], admin: [] as number[] });

// 计算未保存的更改数量
const changeCount = computed(() => {
  const currentNormalIds = normalUsers.value.map(u => u.id);
  const currentAdminIds = adminUsers.value.map(u => u.id);
  const origNormalIds = originalData.value.normal;
  const origAdminIds = originalData.value.admin;
  
  // 计算新增到管理员的数量
  const addedToAdmin = currentAdminIds.filter(id => !origAdminIds.includes(id)).length;
  // 计算从管理员移除的数量
  const removedFromAdmin = origAdminIds.filter(id => !currentAdminIds.includes(id)).length;
  
  return addedToAdmin + removedFromAdmin;
});

// 是否有未保存的更改
const hasChanges = computed(() => {
  return changeCount.value > 0;
});

// 生成头像颜色
const getAvatarColor = (username: string): string => {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// 刷新数据
const refreshData = async () => {
  loading.value = true;
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 800));
    // 这里应该调用实际的 API
    message.success('数据已刷新');
  } finally {
    loading.value = false;
  }
};

// 重置更改
const resetChanges = () => {
  Modal.confirm({
    title: '确认重置',
    content: '这将放弃所有未保存的更改，是否继续？',
    onOk: () => {
      // 恢复原始数据
      clearSelection();
      message.info('已重置到上次保存的状态');
    }
  });
};

// 保存处理
const handleSave = async () => {
  if (adminUsers.value.length === 0) {
    message.error('系统必须至少保留一个管理员');
    return;
  }
  
  Modal.confirm({
    title: '确认保存',
    content: `确定要保存这些权限更改吗？此操作将立即生效。`,
    okText: '确认保存',
    cancelText: '再检查一下',
    onOk: async () => {
      const success = await saveChanges();
      if (success) {
        // 更新原始数据备份
        originalData.value = {
          normal: normalUsers.value.map(u => u.id),
          admin: adminUsers.value.map(u => u.id)
        };
      }
    }
  });
};

// 初始化
onMounted(async () => {
  // 获取用户列表
  await fetchUsers();
  // 备份原始数据
  originalData.value = {
    normal: normalUsers.value.map(u => u.id),
    admin: adminUsers.value.map(u => u.id)
  };
});
</script>

<style scoped lang="scss">
.transfer-page {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
  padding-bottom: 80px;
}

.toolbar-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.transfer-row {
  margin-bottom: 24px;
}

.list-card {
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  height: 100%;
  
  :deep(.ant-card-head) {
    border-bottom: 1px solid #f0f0f0;
    font-weight: 500;
  }
  
  :deep(.ant-card-body) {
    padding: 16px;
  }
}

.search-input {
  margin-bottom: 8px;
}

.user-list {
  width: 100%;
}

.user-item {
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
  margin-bottom: 4px;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  :deep(.ant-checkbox-wrapper) {
    width: 100%;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 8px;
}

.user-meta {
  flex: 1;
  min-width: 0;
  
  .username {
    font-size: 14px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .user-email {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    margin-top: 2px;
  }
}

.action-col {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  
  @media (max-width: 992px) {
    padding: 16px 0;
  }
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  @media (max-width: 992px) {
    flex-direction: row;
  }
  
  .ant-btn {
    width: 48px;
    height: 48px;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:disabled {
      opacity: 0.5;
    }
  }
}

.info-card {
  border-radius: 8px;
  margin-bottom: 24px;
}

.footer-bar {
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  
  .change-summary {
    color: rgba(0, 0, 0, 0.45);
    margin-right: 16px;
  }
}

// 响应式适配
@media (max-width: 768px) {
  .transfer-page {
    padding: 16px;
  }
}
</style>