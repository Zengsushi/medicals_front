<template>
  <div class="system-monitor">
    <a-card title="系统监控概览" class="monitor-card">
      <div class="monitor-tabs">
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="database" tab="数据库监控">
            <DatabaseMonitor />
          </a-tab-pane>
          <a-tab-pane key="cluster" tab="Hadoop集群监控">
            <ClusterMonitor />
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import DatabaseMonitor from './components/DatabaseMonitor.vue'
import ClusterMonitor from './components/ClusterMonitor.vue'

const activeTab = ref('database')
</script>

<style scoped>
.system-monitor {
  padding: 20px;
}

.monitor-card {
  margin-bottom: 20px;
}

.monitor-tabs {
  min-height: 500px;
}
</style>
