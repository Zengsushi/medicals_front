/**
 * 数字滚动计数动画 Composable
 * 
 * 使用 requestAnimationFrame 实现高性能数字滚动效果
 * 支持 prefers-reduced-motion 无障碍降级
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useAnimatedCount } from '../composables/useAnimatedCount'
 * 
 * const { count, isAnimating } = useAnimatedCount({
 *   start: 0,
 *   end: 286,
 *   duration: 1500,
 *   decimals: 0
 * })
 * </script>
 * 
 * <template>
 *   <span class="value">{{ count }}</span>
 * </template>
 * ```
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface UseAnimatedCountOptions {
  /** 起始值，默认 0 */
  start?: number
  /** 目标值（必填） */
  end: number | string
  /** 动画时长（毫秒），默认 1500 */
  duration?: number
  /** 小数位数，默认 0 */
  decimals?: number
  /** 是否自动启动，默认 true */
  autoStart?: boolean
  /** 缓动函数，默认 easeOutExpo */
  easing?: (t: number) => number
}

export function useAnimatedCount(options: UseAnimatedCountOptions) {
  const {
    start = 0,
    end,
    duration = 1500,
    decimals = 0,
    autoStart = true,
    easing = easeOutExpo
  } = options

  const count = ref(start)
  const isAnimating = ref(false)
  let animationFrameId: number | null = null
  let startTime: number | null = null

  const targetValue = typeof end === 'string' ? parseFloat(end.replace(/[^0-9.-]/g, '')) : end

  /**
   * 缓动函数 - 指数减速 (easeOutExpo)
   * 适合数字滚动场景：快速启动 → 平滑结束
   */
  function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
  }

  /**
   * 缓动函数 - 弹性效果 (easeOutElastic)
   * 适合需要轻微回弹的场景
   */
  function easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 :
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  }

  /**
   * 执行动画帧更新
   */
  function animate(timestamp: number) {
    if (!startTime) startTime = timestamp
    
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    const easedProgress = easing(progress)
    const currentValue = start + (targetValue - start) * easedProgress
    
    count.value = decimals > 0 
      ? currentValue.toFixed(decimals) 
      : Math.round(currentValue)

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      isAnimating.value = false
      count.value = typeof end === 'string' ? end : targetValue
    }
  }

  /**
   * 启动动画
   */
  function startAnimation() {
    if (typeof window === 'undefined') return
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    if (prefersReducedMotion) {
      count.value = end
      isAnimating.value = false
      return
    }

    stopAnimation()
    isAnimating.value = true
    startTime = null
    animationFrameId = requestAnimationFrame(animate)
  }

  /**
   * 停止动画
   */
  function stopAnimation() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    isAnimating.value = false
  }

  /**
   * 重置到初始状态
   */
  function reset() {
    stopAnimation()
    count.value = start
    startTime = null
  }

  watch(() => options.end, (newEnd) => {
    if (newEnd !== undefined && newEnd !== end) {
      startAnimation()
    }
  })

  onMounted(() => {
    if (autoStart) {
      startAnimation()
    }
  })

  onUnmounted(() => {
    stopAnimation()
  })

  return {
    count,
    isAnimating,
    startAnimation,
    stopAnimation,
    reset
  }
}

export default useAnimatedCount
