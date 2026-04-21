<template>
  <div class="dict_sidebar" :class="{ sidebar_collapsed: !isExpanded }">
    <div class="sidebar_header">
      <div class="sidebar_title" v-show="isExpanded">
        <h3>字典分类</h3>
      </div>
      <div
        class="sidebar_toggle"
        @click="handleMenu"
        :title="isExpanded ? '收起菜单' : '展开菜单'"
      >
        <CaretRightOutlined :class="{ toggle_rotated: !isExpanded }" />
      </div>
      <div class="sidebar_meun">
        <div
          class="sidebar_toggle"
          :class="{ sidebar_hand: isExpanded }"
          title="新增分类"
          @click="handleAddCategory"
        >
          <PlusOutlined class="click_transform" />
          <div v-if="isExpanded" style="font-size: 14px">新增分类</div>
        </div>
        <!-- <div
          class="sidebar_toggle"
          :class="{ sidebar_hand: isExpanded }"
          title="编辑分类"
          @click="handleEditCategory()"
        >
          <FormOutlined class="click_transform" />
          <div v-if="isExpanded">编辑</div>
        </div> -->
      </div>
    </div>

    <div class="sidebar_content" v-show="isExpanded">
      <div
        class="menu_group"
        v-for="value in dictCategoryList"
        :key="value.key"
      >
        <div
          class="menu_item"
          :class="{ active: activeTab === value.key }"
          @click="handledictCategory(value)"
          @contextmenu.prevent="handleRclick($event, value)"
        >
          <div class="menu_content">
            <span>{{ value.label }}</span>
            <div title="此分类为系统分类无法删除" v-if="!value.is_editable">
              <MinusCircleOutlined class="lined_icon" />
            </div>
            <div title="此分类为补充分类可编辑" v-if="value.is_editable">
              <EditOutlined class="edit_icon" />
            </div>
          </div>
        </div>
        <div
          v-if="showContextMenu"
          class="context_menu"
          @click.stop
          :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }"
        >
          <div
            :class="{ cursor_not_allowed: !value.is_editable }"
            @click="handleEditCategory()"
          >
            编辑
          </div>
          <div
            :class="{ cursor_not_allowed: !value.is_editable }"
            @click="headleDeleteCategory(value)"
          >
            删除
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import {
  CaretRightOutlined,
  PlusOutlined,
  FormOutlined,
  MinusCircleOutlined,
  EditOutlined,
} from "@ant-design/icons-vue";
const emit = defineEmits([
  "add",
  "edit",
  "expand_menu",
  "use_dictCategory",
  "delete",
]);
const showContextMenu = ref(false);
const menuPosition = ref({ x: 0, y: 0 });
const menuTarget = ref(null);
const props = defineProps({
  isExpanded: {
    type: Boolean,
    default: true,
  },
  dictCategoryList: {
    type: Array,
    default: () => [],
  },
  activeTab: {
    type: String,
    default: "menu",
  },
  currentItem: {
    type: Object,
    default: () => {},
  },
});

const isExpanded = computed(() => {
  return props.isExpanded;
});
const activeTab = computed(() => {
  return props.activeTab;
});
const dictCategoryList = computed(() => {
  return props.dictCategoryList.filter((item) => item.is_show_menu === 1);
});

const handledictCategory = (value) => {
  emit("use_dictCategory", value.key);
  //  获取指定字典分组的字典列表
  emit("dictionList", value.id);
};
const handleRclick = (event, value) => {
  event.preventDefault();
  handledictCategory(value.key);
  showContextMenu.value = true;
  menuTarget.value = value;
  menuPosition.value = { x: event.clientX + 10, y: event.clientY + 10 };
};
const closeContextMenu = () => {
  showContextMenu.value = false;
};
const handleMenu = () => {
  emit("expand_menu");
};

const handleAddCategory = () => {
  emit("add");
};

const handleEditCategory = () => {
  showContextMenu.value = false;
  emit("edit", menuTarget.value);
};

const headleDeleteCategory = (value) => {
  emit("delete", value.id);
};

const hangdleDefaultDictCategory = () => {
  // 默认加载第一个字典分类的字典列表
  const dictCategoryId = dictCategoryList.value[0]?.id;

  // TODO 备用id获取 调用接口 (待实现 -  不在组件中调用接口 , 而是在父组件中调用接口)

  emit("default_loadDictionList", dictCategoryId);
};

onMounted(() => {
  document.addEventListener("click", closeContextMenu);
  if (!menuPosition.value.x === 0 && !menuPosition.value.y === 0) {
    document.addEventListener("contextmenu", closeContextMenu);
  }
  hangdleDefaultDictCategory();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeContextMenu);
});
</script>
<style scoped>
.dict_sidebar {
  position: fixed;
  color: #1a1a1a;
  width: 240px;
  background: #666;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 100;
}

.sidebar_collapsed {
  width: 60px;
}

.sidebar_header {
  /* display: flex; */
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar_meun {
  /* padding: 20px 16px; */
  padding-top: 10px;
  gap: 10px;
  /* border-bottom: 1px solid rgba(255, 255, 255, 0.1); */
}

.sidebar_title h3 {
  color: white;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.sidebar_toggle {
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

.sidebar_hand {
  margin-top: 6px;
  width: 200px;
  height: 40px;
}

.sidebar_toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.toggle_rotated {
  transform: rotate(180deg);
}

.click_transform {
  transform: rotate(360deg);
}

.click_transform:hover {
  transform: scale(1.2);
}

.sidebar_content {
  border-radius: 0 0 12px 12px;
  padding: 16px;
}

.menu_group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu_item {
  padding: 12px 16px;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.menu_item .menu_content {
  display: flex;
  white-space: nowrap;
  gap: 8px;
}
.menu_item .menu_content span {
  font-size: 16px;
  font-weight: 500;
}
.menu_item .menu_content div {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  font-size: 14px;
  font-weight: 400;
}
.lined_icon {
  transition: transform 0.8s ease;
}
.lined_icon:hover {
  transform: rotate(180deg);
}

.edit_icon {
  transition: transform 1s ease;
}

.edit_icon:hover {
  animation: edit_icon 1s ease-in-out infinite;
}
@keyframes edit_icon {
  25% {
    transform: translateX(1px);
  }
  /* 50%  { transform: translateX(1px); } */
  75% {
    transform: translateX(-1px);
  }
  /* 0%   { transform: translateY(1px); } */
  50% {
    transform: translateY(-1px);
  }
}
.menu_item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.menu_item.active {
  background: rgba(255, 255, 255, 0.15);
  font-weight: 500;
  transition: all 0.3s ease;
}
@media (max-width: 768px) {
  .dict_sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(0);
    transition: transform 0.3s ease;
    width: 280px;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
  }

  .sidebar_collapsed {
    transform: translateX(-100%);
    width: 280px;
  }
}

.context_menu {
  display: block;
  min-height: 100px;
  position: fixed; /* 固定定位，跟随屏幕 */
  top: 0;
  left: 0;
  background: #fff; /* 白色背景 */
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 120px; /* 最小宽度 */
  max-width: 250px; /* 最大宽度，防止太长 */
  z-index: 9999;
}

.context_menu div {
  padding: 12px 16px;
  border-radius: 6px;
  color: #1a1a1a;
  cursor: pointer;
}

.context_menu div:hover {
  background: rgba(24, 144, 255, 0.05);
}

.cursor_not_allowed {
  cursor: not-allowed;
}
</style>
