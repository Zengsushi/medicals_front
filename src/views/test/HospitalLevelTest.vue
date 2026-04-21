<template>
  <div class="hospital-level-test">
    <HospitalLevelDistribution :data="testData" />
  </div>
</template>

<script setup>
import HospitalLevelDistribution from '@/components/charts/HospitalLevelDistribution.vue';

// 测试数据
const testData = [
  {
    hospital_level: '三甲',
    hospital_count: 150,
    hospital_ratio: 0.3,
    avg_doctor_per_hospital: 120,
    avg_price: 250
  },
  {
    hospital_level: '三乙',
    hospital_count: 200,
    hospital_ratio: 0.4,
    avg_doctor_per_hospital: 80,
    avg_price: 200
  },
  {
    hospital_level: '二甲',
    hospital_count: 100,
    hospital_ratio: 0.2,
    avg_doctor_per_hospital: 50,
    avg_price: 150
  },
  {
    hospital_level: '其他',
    hospital_count: 50,
    hospital_ratio: 0.1,
    avg_doctor_per_hospital: 30,
    avg_price: 100
  }
];
</script>

<style scoped>
.hospital-level-test {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}
</style>
