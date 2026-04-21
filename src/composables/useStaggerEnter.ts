/**
 * 错开进入动画 Composable (Staggered Enter Animation)
 * 
 * 为列表项提供错开延迟的进入动画效果
 * 使用 IntersectionObserver 实现视口检测
 * 支持 prefers-reduced-motion 无障碍降级
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useStaggerEnter } from '../composables/useStaggerEnter'
 * 
 * const { containerRef, getDelay, isVisible } = useStaggerEnter({
 *   staggerDelay: 100,
 *   threshold: 0.1
 * })
 * 
 * const items = ['A', 'B', 'C', 'D']
 * </script>
 * 
 * <template>
 *   <div ref="containerRef" class="stagger-container">
 *     <TransitionGroup name="stagger">
 *       <div
 *         v-for="(item, index) in items"
 *         :key="item"
 *         :style="{ animationDelay: `${getDelay(index)}ms` }"
 *         class="stagger-item"
 *       >
 *         {{ item }}
 *       </div>
 *     </TransitionGroup>
 *   </div>
 * </template>
 * 
 * <style>
 * .stagger-item {
 *   opacity: 0;
 *   transform: translateY(20px);
 * }
 * 
 * .stagger-enter-active {
 *   animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
 *   animation-delay: var(--stagger-delay, 0ms);
 * }
 * 
 * @keyframes fadeInUp {
 *   from {
 *     opacity: 0;
 *     transform: translateY(20px);
 *   }
 *   to {
 *     opacity: 1;
 *     transform: translateY(0);
 *   }
 * }
 * </style>
 * ```
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

interface UseStaggerEnterOptions {
  /** 每个元素的错开延迟（毫秒），默认 100ms */
  staggerDelay?: number
  /** 基础延迟（毫秒），默认 0ms */
  baseDelay?: number
  /** IntersectionObserver 阈值，默认 0.1 (10%可见时触发) */
  threshold?: number
  /** 是否只触发一次，默认 true */
  once?: boolean
  /** 动画时长（毫秒），默认 600 */
  duration?: number
  /** 自定义缓动函数，默认 cubic-bezier(0.16, 1, 0.3, 1) */
  easing?: string
}

export function useStaggerEnter(options: UseStaggerEnterOptions = {}) {
  const {
    staggerDelay = 100,
    baseDelay = 0,
    threshold = 0.1,
    once = true,
    duration = 600,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)'
  } = options

  const containerRef = ref<HTMLElement | null>(null)
  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null

  /**
   * 获取指定索引的延迟时间
   * @param index 元素索引（从0开始）
   * @returns 延迟毫秒数
   */
  function getDelay(index: number): number {
    return baseDelay + (index * staggerDelay)
  }

  /**
   * 获取内联样式对象（用于绑定到元素）
   * @param index 元素索引
   * @returns CSS 样式对象
   */
  function getItemStyle(index: number): Record<string, string> {
    return {
      '--stagger-delay': `${getDelay(index)}ms`,
      '--animation-duration': `${duration}ms`,
      '--animation-easing': easing
    }
  }

  /**
   * 检查是否应该启用动画
   */
  function shouldAnimate(): boolean {
    if (typeof window === 'undefined') return false
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * 初始化 IntersectionObserver
   */
  function initObserver() {
    if (!containerRef.value || !shouldAnimate()) {
      isVisible.value = true
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true
            
            if (once && observer) {
              observer.unobserve(entry.target)
            }
          } else if (!once) {
            isVisible.value = false
          }
        })
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    observer.observe(containerRef.value)
  }

  /**
   * 手动触发动画（用于测试或特殊场景）
   */
  function triggerAnimation() {
    if (shouldAnimate()) {
      isVisible.value = false
      nextTick(() => {
        isVisible.value = true
      })
    } else {
      isVisible.value = true
    }
  }

  /**
   * 重置动画状态
   */
  function reset() {
    isVisible.value = false
    if (observer && containerRef.value) {
      observer.unobserve(containerRef.value)
    }
  }

  onMounted(() => {
    nextTick(() => {
      initObserver()
    })
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  return {
    containerRef,
    isVisible,
    getDelay,
    getItemStyle,
    shouldAnimate,
    triggerAnimation,
    reset
  }
}

export default useStaggerEnter
