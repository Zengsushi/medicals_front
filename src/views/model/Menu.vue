<template>
  <div class="menu_container" :class="{ menu_content: isCollapse }">
    <div class="menu_title">
      <div @click="handleInclude">
        <div v-show="isCollapse" title="展开">
          <MenuUnfoldOutlined />
        </div>
        <div v-show="!isCollapse" title="收起">
          <MenuFoldOutlined />
        </div>
      </div>
    </div>
    <a-menu
      mode="inline"
      :selectedKeys="selectedKeys"
      :items="menuList"
      @click="handleClick"
      class="menu"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from "vue";
import { MenuUnfoldOutlined, MenuFoldOutlined } from "@ant-design/icons-vue";

const props = defineProps({
  title: {
    type: String,
    default: "默认菜单",
  },
  menu_list: {
    type: Array,
    default: () => [],
  },
  isCollapse: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["menuRouter", "menuInclude"]);
const selectedKeys = ref([]);
const menuList = computed(() => {
  const menuItems: any[] = [];

  props.menu_list.map((item: any) => {
    menuItems.push({
      ...item,
      disabled: false,
    });
  });

  return menuItems;
});
const isCollapse = computed(() => {
  return props.isCollapse;
});

const handleClick = (e: any) => {
  emit("menuRouter", e.key);
};

const handleInclude = () => {
  emit("menuInclude");
};
</script>

<style scoped>
.menu_container {
  display: flex;
  position: fixed;
  width: 220px;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid #f0f0f0;
  flex-direction: column;
  z-index: 999;
  left: 0;
  transition: all 0.3s ease-in-out;
  margin-top: -14px;
}

.menu_content {
  width: 60px;
}

.menu_title {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  border-bottom: 1px solid #f0f0f0;
}

.menu {
  flex: 1;
  overflow-y: auto;
}
</style>
