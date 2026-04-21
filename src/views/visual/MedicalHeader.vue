<template>
  <div class="header">
    <div class="header-left">
      <div class="logo-icon" aria-hidden="true"></div>
      <div class="header-content">
        <h1>医疗智慧运营监控中心</h1>
        <div class="subtitle">Medical Intelligence Operation Monitoring Center</div>
      </div>
    </div>
    
    <div class="header-right">
      <div class="date-info">
        <span class="date">{{ dateText }}</span>
        <span class="weekday">{{ weekdayText }}</span>
      </div>
      <div class="time-info">
        <span class="time">{{ timeText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const dateText = ref("");
const weekdayText = ref("");
const timeText = ref("");
let timer = null;

const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

const updateTime = () => {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  dateText.value = `${year}年${month}月${day}日`;
  
  weekdayText.value = weekdays[now.getDay()];
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  timeText.value = `${hours}:${minutes}:${seconds}`;
};

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped lang="less">
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 24px;
  background: linear-gradient(90deg, rgba(79, 195, 255, 0.15) 0%, rgba(79, 195, 255, 0.05) 50%, rgba(79, 195, 255, 0.15) 100%);
  border-radius: 12px;
  border: 1px solid rgba(79, 195, 255, 0.2);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #4fc3ff, transparent);
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 1;
}

.logo-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #4fc3ff, #00d4aa);
  box-shadow: 0 2px 14px rgba(79, 195, 255, 0.35);
  animation: iconFloat 3s ease-in-out infinite;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #4fc3ff 0%, #00d4aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
}

.subtitle {
  font-size: 12px;
  color: rgba(79, 195, 255, 0.6);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
  z-index: 1;
}

.date-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.date {
  font-size: 16px;
  font-weight: 500;
  color: #fff;
}

.weekday {
  font-size: 12px;
  color: rgba(79, 195, 255, 0.7);
}

.time-info {
  background: linear-gradient(135deg, rgba(79, 195, 255, 0.2) 0%, rgba(79, 195, 255, 0.1) 100%);
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(79, 195, 255, 0.3);
}

.time {
  font-family: 'Courier New', monospace;
  font-size: 28px;
  font-weight: 700;
  color: #4fc3ff;
  letter-spacing: 3px;
  text-shadow: 0 0 20px rgba(79, 195, 255, 0.5);
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    padding: 12px 16px;
  }

  .header-left {
    justify-content: center;
  }

  h1 {
    font-size: 20px;
    letter-spacing: 1px;
  }

  .subtitle {
    font-size: 10px;
  }

  .header-right {
    justify-content: center;
    gap: 16px;
  }

  .time {
    font-size: 22px;
  }
}
</style>
