<template>
  <div class="virtual-list" :style="{ height: height + 'px' }">
    <div class="virtual-list-content">
      <slot name="item" v-for="(item, index) in dataSource" :item="item" :index="index" />
    </div>
    <slot name="empty">
      <a-empty v-if="!dataSource || dataSource.length === 0" description="暂无数据" />
    </slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dataSource: any[];
  height?: number;
  itemHeight?: number;
}>();
</script>

<style scoped>
.virtual-list {
  overflow-y: auto;
}
.virtual-list-content {
  display: flex;
  flex-direction: column;
}
</style>