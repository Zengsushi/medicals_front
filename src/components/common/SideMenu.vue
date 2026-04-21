<template>
  <div class="side-menu" :class="{ 'side-menu-collapsed': !isExpanded }">
    <div class="menu-header">
      <div class="menu-title" v-show="isExpanded">
        <h3>{{ title }}</h3>
      </div>
      <div
        class="menu-toggle"
        @click="handleToggleMenu"
        :title="isExpanded ? '收起菜单' : '展开菜单'"
      >
        <CaretRightOutlined :class="{ 'toggle-rotated': !isExpanded }" />
      </div>
      <div class="menu-actions" v-show="isExpanded">
        <div
          v-if="showAddButton"
          class="menu-action-item"
          @click="handleAdd"
          title="新增"
        >
          <PlusOutlined class="action-icon" />
          <span v-show="isExpanded">{{ addButtonText }}</span>
        </div>
      </div>
    </div>

    <div class="menu-content">
      <template v-for="item in menuItems" :key="item.key">
        <div
          class="menu-item"
          :class="{ 'menu-item-active': isMenuItemActive(item) }"
          @click="handleMenuItemClick(item)"
          @contextmenu.prevent="handleContextMenu($event, item)"
          :title="!isExpanded ? item.label : ''"
        >
          <div class="menu-item-content">
            <div class="menu-item-info">
              <span v-if="item.icon" class="menu-item-icon">
                <component :is="renderIcon(item.icon)" />
              </span>
              <span v-show="isExpanded" class="menu-item-name">{{ item.label }}</span>
              <span v-if="isExpanded && item.children && item.children.length > 0" class="menu-expand-icon" @click.stop="toggleExpand(item)">
                <CaretRightOutlined :class="{ 'expanded': expandedItems.includes(item.key) }" />
              </span>
            </div>
            <div v-if="isExpanded && item.actions && item.actions.length > 0" class="menu-item-actions">
              <div
                v-for="action in item.actions"
                :key="action.key"
                class="menu-item-action"
                :class="{ 'action-disabled': action.disabled }"
                @click.stop="handleItemAction(item, action)"
                :title="action.title"
              >
                <component :is="action.icon" />
              </div>
            </div>
          </div>
        </div>
        <div v-if="item.children && item.children.length > 0 && expandedItems.includes(item.key)" class="sub-menu">
          <template v-for="child in item.children" :key="child.key">
            <div
              class="menu-item sub-menu-item"
              :class="{ 'menu-item-active': isMenuItemActive(child) }"
              @click="handleMenuItemClick(child)"
              @contextmenu.prevent="handleContextMenu($event, child)"
              :title="!isExpanded ? child.label : ''"
            >
              <div class="menu-item-content">
                <div class="menu-item-info">
                  <span v-if="child.icon" class="menu-item-icon">
                    <component :is="renderIcon(child.icon)" />
                  </span>
                  <span v-show="isExpanded" class="menu-item-name">{{ child.label }}</span>
                  <span v-if="isExpanded && child.children && child.children.length > 0" class="menu-expand-icon" @click.stop="toggleExpand(child)">
                    <CaretRightOutlined :class="{ 'expanded': expandedItems.includes(child.key) }" />
                  </span>
                </div>
              </div>
            </div>
            <div v-if="child.children && child.children.length > 0 && expandedItems.includes(child.key)" class="sub-menu level-3">
              <div
                v-for="grandChild in child.children"
                :key="grandChild.key"
                class="menu-item sub-menu-item level-3-item"
                :class="{ 'menu-item-active': isMenuItemActive(grandChild) }"
                @click="handleMenuItemClick(grandChild)"
                @contextmenu.prevent="handleContextMenu($event, grandChild)"
                :title="!isExpanded ? grandChild.label : ''"
              >
                <div class="menu-item-content">
                  <div class="menu-item-info">
                    <span v-if="grandChild.icon" class="menu-item-icon">
                      <component :is="renderIcon(grandChild.icon)" />
                    </span>
                    <span v-show="isExpanded" class="menu-item-name">{{ grandChild.label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="showContextMenu"
      class="context-menu"
      @click.stop
      :style="{ top: contextMenuPosition.y + 'px', left: contextMenuPosition.x + 'px' }"
    >
      <div
        v-for="action in contextMenuActions"
        :key="action.key"
        class="context-menu-item"
        :class="{ 'action-disabled': action.disabled }"
        @click="handleContextMenuAction(action)"
      >
        <component v-if="action.icon" :is="action.icon" class="context-menu-icon" />
        <span>{{ action.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, h } from 'vue';
import { CaretRightOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const renderIcon = (icon) => {
  if (typeof icon === 'function') {
    return icon();
  }
  return icon;
};

const props = defineProps({
  isExpanded: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: '菜单'
  },
  menuItems: {
    type: Array,
    default: () => []
  },
  activeKey: {
    type: String,
    default: ''
  },
  showAddButton: {
    type: Boolean,
    default: true
  },
  addButtonText: {
    type: String,
    default: '新增'
  }
});

const emit = defineEmits([
  'toggle-menu',
  'add',
  'menu-item-click',
  'item-action',
  'context-menu-action'
]);

const expandedItems = ref([]);
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuItem = ref(null);
const contextMenuActions = ref([]);

const isMenuItemActive = (item) => {
  if (props.activeKey === item.key) return true;
  if (item.path && route.path === item.path) return true;
  if (item.children) {
    return item.children.some(child => isMenuItemActive(child));
  }
  return false;
};

const toggleExpand = (item) => {
  const index = expandedItems.value.indexOf(item.key);
  if (index > -1) {
    expandedItems.value.splice(index, 1);
  } else {
    expandedItems.value.push(item.key);
  }
};

const handleToggleMenu = () => {
  emit('toggle-menu');
  const newExpandedState = !props.isExpanded;
  if (newExpandedState) {
    document.body.classList.remove('menu-collapsed');
  } else {
    document.body.classList.add('menu-collapsed');
  }
};

const handleAdd = () => {
  emit('add');
};

const handleMenuItemClick = (item) => {
  emit('menu-item-click', item);
};

const handleItemAction = (item, action) => {
  if (!action.disabled) {
    emit('item-action', item, action);
  }
};

const handleContextMenu = (event, item) => {
  event.preventDefault();
  showContextMenu.value = true;
  contextMenuItem.value = item;
  contextMenuPosition.value = { x: event.clientX + 10, y: event.clientY + 10 };
  
  contextMenuActions.value = item.contextActions || [];
};

const handleContextMenuAction = (action) => {
  if (!action.disabled) {
    emit('context-menu-action', contextMenuItem.value, action);
  }
  showContextMenu.value = false;
};

const closeContextMenu = () => {
  showContextMenu.value = false;
};

onMounted(() => {
  document.addEventListener('click', closeContextMenu);
  document.addEventListener('contextmenu', closeContextMenu);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeContextMenu);
  document.removeEventListener('contextmenu', closeContextMenu);
});
</script>

<style scoped>
.side-menu {
  position: fixed;
  left: 0;
  top: 58px;
  height: calc(100vh - 58px);
  width: 240px;
  background: #666;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  overflow-y: auto;
}

.side-menu-collapsed {
  width: 60px;
}

.menu-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.menu-title h3 {
  color: white;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.menu-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.toggle-rotated {
  transform: rotate(180deg);
}

.menu-actions {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-action-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.action-icon {
  font-size: 16px;
}

.menu-content {
  border-radius: 0 0 12px 12px;
  padding: 16px;
}

.menu-item {
  padding: 12px 16px;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.side-menu-collapsed .menu-item {
  padding: 12px 0;
  display: flex;
  justify-content: center;
}

.side-menu-collapsed .menu-item-content {
  justify-content: center;
}

.side-menu-collapsed .menu-item-info {
  justify-content: center;
  gap: 0;
}

.side-menu-collapsed .sub-menu {
  padding-left: 0;
}

.side-menu-collapsed .sub-menu-item {
  padding: 10px 0;
  display: flex;
  justify-content: center;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.02);
}

.menu-item-active {
  background: rgba(255, 255, 255, 0.15);
  font-weight: 500;
  transition: all 0.3s ease;
}

.menu-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.menu-item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.menu-item-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.menu-item-name {
  font-size: 16px;
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.menu-expand-icon.expanded {
  transform: rotate(90deg);
}

.menu-item-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.menu-item:hover .menu-item-actions {
  opacity: 1;
}

.menu-item-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item-action:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.action-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sub-menu {
  padding-left: 20px;
  margin-bottom: 8px;
}

.sub-menu-item {
  padding: 10px 14px;
  font-size: 14px;
}

.level-3 {
  padding-left: 20px;
}

.level-3-item {
  padding: 8px 12px;
  font-size: 13px;
}

.context-menu {
  display: block;
  min-height: 100px;
  position: fixed;
  top: 0;
  left: 0;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 120px;
  max-width: 250px;
  z-index: 9999;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.context-menu-item:hover {
  background: rgba(24, 144, 255, 0.05);
}

.context-menu-icon {
  font-size: 14px;
  color: #666;
}

/* 滚动条美化 */
.side-menu::-webkit-scrollbar {
  width: 6px;
}

.side-menu::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.side-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.side-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .side-menu {
    transform: translateX(0);
    width: 280px;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
  }

  .side-menu-collapsed {
    transform: translateX(-100%);
    width: 280px;
  }
}
</style>
