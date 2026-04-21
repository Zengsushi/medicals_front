<template>
  <div class="doctor-title-test">
    <DoctorTitleDistribution :data="testData" />
  </div>
</template>

<script setup lang="ts">
import DoctorTitleDistribution from '@/components/charts/DoctorTitleDistribution.vue';

interface ChartData {
  doctor_title: string;
  doctor_count: number;
  doctor_ratio: number;
  avg_consultation_price: number;
}

const testData: ChartData[] = [
  {
    doctor_title: '主任医师',
    doctor_count: 150,
    doctor_ratio: 0.25,
    avg_consultation_price: 350
  },
  {
    doctor_title: '副主任医师',
    doctor_count: 220,
    doctor_ratio: 0.367,
    avg_consultation_price: 280
  },
  {
    doctor_title: '主治医师',
    doctor_count: 180,
    doctor_ratio: 0.3,
    avg_consultation_price: 200
  },
  {
    doctor_title: '其他',
    doctor_count: 50,
    doctor_ratio: 0.083,
    avg_consultation_price: 120
  }
];
</script>

<style scoped>
.doctor-title-test {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}
</style>
