<template>
  <div class="dept-redirect-wrapper">
    <a-result
      title="科室服务分析已合并"
      sub-title="科室服务分析和医生职称分析已合并到『医护人员结构分析』页面中。"
    >
      <template #extra>
        <a-button type="primary" @click="goToMergedPage">
          前往医护人员结构分析
        </a-button>
      </template>
    </a-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToMergedPage = () => {
  router.push({ name: 'DoctorTitleAnalysis' })
}
</script>

<style scoped>
.dept-redirect-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  background: #f0f2f5;
}
</style>
