<template>
  <div class="satisfaction-test">
    <SatisfactionAnalysis :data="testData" />
  </div>
</template>

<script setup>
import SatisfactionAnalysis from '@/components/charts/SatisfactionAnalysis.vue';

// 测试数据
const testData = [
  {
    satisfaction_level: '五星',
    doctor_count: 120,
    doctor_ratio: 0.4,
    avg_consultation_price: 280
  },
  {
    satisfaction_level: '四星',
    doctor_count: 90,
    doctor_ratio: 0.3,
    avg_consultation_price: 240
  },
  {
    satisfaction_level: '三星',
    doctor_count: 45,
    doctor_ratio: 0.15,
    avg_consultation_price: 200
  },
  {
    satisfaction_level: '二星',
    doctor_count: 30,
    doctor_ratio: 0.1,
    avg_consultation_price: 160
  },
  {
    satisfaction_level: '一星',
    doctor_count: 15,
    doctor_ratio: 0.05,
    avg_consultation_price: 120
  }
];
</script>

<style scoped>
.satisfaction-test {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}
</style>
