<template>
  <Transition
    name="card-fade"
    appear
    @before-enter="onBeforeEnter"
    @after-enter="onAfterEnter"
  >
    <div 
      class="stat-card"
      :class="{ 'is-animating': isAnimating }"
      :style="itemStyle"
      :aria-label="`${title}: ${displayValue}, ${trend}`"
      role="article"
      tabindex="0"
    >
      <div class="card-header">
        <h3 class="card-title">{{ title }}</h3>
      </div>

      <div class="card-body">
        <div class="value-container" :aria-label="`当前值: ${value}`">
          <span 
            class="animated-value" 
            :class="{ 'counting': isAnimating }"
          >
            {{ displayValue }}
          </span>
          <span v-if="suffix" class="value-suffix">{{ suffix }}</span>
        </div>

        <div class="trend-indicator" :class="trendClass" :aria-label="`趋势: ${trend}`">
          <Transition name="trend-slide" mode="out-in">
            <span :key="trend" class="trend-value">
              {{ trendIcon }} {{ trend }}
            </span>
          </Transition>
        </div>
      </div>

      <div class="card-glow" aria-hidden="true"></div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted, ref } from 'vue'
import { useAnimatedCount } from '../../composables/useAnimatedCount'

interface Props {
  title: string
  value: string | number
  trend: string
  /** 数值后缀（如 %、人等） */
  suffix?: string
  /** 动画时长（毫秒） */
  duration?: number
  /** 是否启用数字滚动 */
  enableCountUp?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  suffix: '',
  duration: 1500,
  enableCountUp: true
})

const emit = defineEmits<{
  (e: 'animationComplete'): void
}>()

const isUnmounted = ref(false)

const { count, isAnimating, startAnimation } = useAnimatedCount({
  start: 0,
  end: props.value,
  duration: props.duration,
  decimals: typeof props.value === 'string' && props.value.includes('.') ? 1 : 0
})

const displayValue = computed(() => {
  if (props.enableCountUp) {
    return count.value
  }
  return props.value
})

const trendClass = computed(() => {
  if (!props.trend) return 'trend-neutral'
  if (props.trend.startsWith('+')) return 'trend-up'
  if (props.trend.startsWith('-')) return 'trend-down'
  return 'trend-neutral'
})

const trendIcon = computed(() => {
  if (!props.trend) return '→'
  if (props.trend.startsWith('+')) return '↑'
  if (props.trend.startsWith('-')) return '↓'
  return '→'
})

const itemStyle = computed(() => ({
  '--stagger-delay': `var(--item-index, 0) * 100ms`,
  '--animation-duration': `${props.duration}ms`
}))

watch(() => props.value, (newVal, oldVal) => {
  if (newVal !== oldVal && props.enableCountUp && !isUnmounted.value) {
    startAnimation()
  }
})

function onBeforeEnter(el: Element) {
  if (isUnmounted.value) return
  ;(el as HTMLElement).style.opacity = '0'
  ;(el as HTMLElement).style.transform = 'translateY(20px)'
}

function onAfterEnter(el: Element) {
  if (isUnmounted.value) return
  emit('animationComplete')
}

onUnmounted(() => {
  isUnmounted.value = true
})
</script>

<style scoped lang="less">
.stat-card {
  position: relative;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.03) 100%
  );
  border-radius: var(--radius-panel, 14px);
  padding: var(--panel-padding-base, 16px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  
  transition: 
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.4s ease,
    border-color 0.3s ease;
  
  cursor: default;
  outline: none;

  &:hover {
    transform: translateY(-4px) scale(1.02);
    border-color: rgba(79, 195, 255, 0.3);
    box-shadow: 
      0 12px 40px rgba(0, 0, 0, 0.4),
      0 0 30px rgba(79, 195, 255, 0.15);
    
    .card-glow {
      opacity: 1;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus, #4fc3f7);
    outline-offset: 2px;
  }

  &.is-animating {
    .animated-value.counting {
      animation: valuePulse 0.5s ease-in-out;
    }
  }
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.card-body {
  position: relative;
  z-index: 1;
}

.value-container {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.animated-value {
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 700;
  color: #4fc3ff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  transition: color 0.3s ease;
  
  &.counting {
    background: linear-gradient(
      135deg,
      #4fc3ff 0%,
      #00d4aa 50%,
      #4fc3ff 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 2s linear infinite;
  }
}

.value-suffix {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

.trend-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;

  &.trend-up {
    color: #5cd9a8;
    background: rgba(92, 217, 168, 0.12);
  }

  &.trend-down {
    color: #ff6b8a;
    background: rgba(255, 107, 138, 0.12);
  }

  &.trend-neutral {
    color: #ffd93d;
    background: rgba(255, 217, 61, 0.12);
  }
}

.trend-value {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle at center,
    rgba(79, 195, 255, 0.08) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

/* ========================================
   Transition Animations
   ======================================== */

/* 卡片进入动画 */
.card-fade-enter-active {
  animation: cardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--stagger-delay, 0ms);
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 趋势变化滑动 */
.trend-slide-enter-active {
  animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.trend-slide-leave-active {
  animation: slideOutLeft 0.25s cubic-bezier(0.55, 0, 1, 0.45);
  position: absolute;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOutLeft {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-20px);
  }
}

/* 数字脉冲 */
@keyframes valuePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 渐变闪光 */
@keyframes shimmer {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}



/* ========================================
   Reduced Motion Support
   ======================================== */

@media (prefers-reduced-motion: reduce) {
  .stat-card {
    transition: none;
    
    &:hover {
      transform: none;
    }
  }

  .card-fade-enter-active,
  .trend-slide-enter-active,
  .trend-slide-leave-active {
    animation: none !important;
    transition: opacity 0.01ms !important;
  }

  .animated-value.counting {
    animation: none !important;
    -webkit-text-fill-color: #4fc3ff;
  }

  .card-icon {
    animation: none;
  }
}

/* ========================================
   Responsive Adjustments
   ======================================== */

@media (max-width: 768px) {
  .stat-card {
    padding: 12px;
  }

  .animated-value {
    font-size: 24px;
  }

  .card-title {
    font-size: 11px;
  }
}
</style>
