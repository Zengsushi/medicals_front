<template>
  <div class="permission-guide" v-if="visible">
    <div class="guide-header" v-if="showHeader">
      <FileProtectOutlined class="guide-icon" />
      <span class="guide-title">{{ title }}</span>
    </div>

    <div class="guide-content">
      <div class="guide-item" v-for="(item, index) in guideItems" :key="index">
        <div class="guide-step">{{ index + 1 }}</div>
        <div class="guide-text">
          <div class="guide-label">{{ item.label }}</div>
          <div class="guide-desc" v-if="item.description">{{ item.description }}</div>
          <a :href="item.link" v-if="item.link" class="guide-link" target="_blank">
            <LinkOutlined />
            了解更多
          </a>
        </div>
      </div>
    </div>

    <div class="guide-actions">
      <a-button type="primary" @click="handleContactAdmin" v-if="showContact">
        <ContactOutlined />
        联系管理员
      </a-button>
      <a-button @click="handleClose" v-if="showClose">
        <CloseOutlined />
        关闭
      </a-button>
    </div>

    <div class="guide-admin-info" v-if="adminContact">
      <div class="admin-label">管理员联系方式:</div>
      <div class="admin-contact">{{ adminContact }}</div>
    </div>
  </div>
</template>

<script setup>
import {
  FileProtectOutlined,
  ContactOutlined,
  CloseOutlined,
  LinkOutlined
} from '@ant-design/icons-vue';
import { computed } from 'vue';

const props = defineProps({
  permission: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: '权限申请指南'
  },
  showHeader: {
    type: Boolean,
    default: true
  },
  showContact: {
    type: Boolean,
    default: true
  },
  showClose: {
    type: Boolean,
    default: true
  },
  adminContact: {
    type: String,
    default: null
  },
  autoShow: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['contact-admin', 'close']);

const guideItems = computed(() => {
  const [resource, action] = props.permission.split(':');

  const actionText = {
    'view': '查看',
    'create': '创建',
    'update': '修改',
    'delete': '删除',
    'export': '导出',
    'import': '导入',
    'authorize': '授权',
    'manage': '管理'
  }[action] || action;

  const resourceText = {
    'users': '用户',
    'role': '角色',
    'menu': '菜单',
    'dict': '字典',
    'source': '数据源',
    'visual': '可视化',
    'admin': '系统'
  }[resource] || resource;

  return [
    {
      label: '了解所需权限',
      description: `此操作需要 "${resourceText}:${actionText}" 权限 (${props.permission})`
    },
    {
      label: '联系您的管理员',
      description: '向系统管理员申请开通相应权限'
    },
    {
      label: '等待审核',
      description: '管理员审批通过后，您将可以使用该功能'
    }
  ];
});

const visible = computed(() => {
  return props.autoShow;
});

const handleContactAdmin = () => {
  emit('contact-admin');
};

const handleClose = () => {
  emit('close');
  localStorage.setItem(`permission_guide_dismissed_${props.permission}`, 'true');
};
</script>

<style scoped>
.permission-guide {
  background: #f0f5ff;
  border: 1px solid #adc6ff;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.guide-icon {
  font-size: 20px;
  color: #1890ff;
}

.guide-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.guide-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.guide-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.guide-step {
  width: 24px;
  height: 24px;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.guide-text {
  flex: 1;
}

.guide-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.guide-desc {
  font-size: 13px;
  color: #666;
  margin-top: 2px;
}

.guide-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #1890ff;
  margin-top: 4px;
}

.guide-link:hover {
  color: #40a9ff;
}

.guide-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #adc6ff;
}

.guide-admin-info {
  margin-top: 12px;
  padding: 12px;
  background: white;
  border-radius: 4px;
}

.admin-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.admin-contact {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
</style>
