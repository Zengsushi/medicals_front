/**
 * ECharts 实例管理 Composable（组合式函数）
 * 
 * 功能：
 * 1. 统一管理 ECharts 实例生命周期
 * 2. 使用 ResizeObserver 监听容器变化
 * 3. 自动 debounce 防抖处理
 * 4. 防止内存泄漏
 * 5. 支持 loading 状态管理
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useECharts } from '@/composables/useECharts'
 * 
 * const chartRef = ref(null)
 * const { chartInstance, isLoading, resize, setOption } = useECharts(chartRef)
 * </script>
 * ```
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts/core'

// 默认配置
const DEFAULT_DEBOUNCE_MS = 300
const DEFAULT_LOADING_OPTIONS = {
  text: '加载中...',
  color: '#4fc3ff',
  textColor: '#fff',
  maskColor: 'rgba(0, 0, 0, 0.3)',
  zlevel: 0,
  fontSize: 14
}

export function useECharts(
  containerRef,
  options = {
    debounceMs: DEFAULT_DEBOUNCE_MS,
    loadingOptions: DEFAULT_LOADING_OPTIONS,
    autoInit: true,
    theme: null,
    locale: null
  }
) {
  // 响应式状态
  const chartInstance = ref(null)
  const isLoading = ref(false)
  const containerSize = ref({ width: 0, height: 0 })
  const isReady = ref(false)

  // 内部变量
  let resizeObserver = null
  let debounceTimer = null
  let _container = null

  /**
   * 初始化 ECharts 实例
   */
  function init() {
    if (!containerRef.value) {
      console.warn('[useECharts] Container element not found')
      return
    }

    _container = containerRef.value

    // 销毁旧实例（如果存在）
    if (chartInstance.value) {
      dispose()
    }

    // 创建新实例
    try {
      chartInstance.value = echarts.init(
        _container,
        options.theme,
        {
          renderer: 'canvas',
          devicePixelRatio: window.devicePixelRatio || 1,
          locale: options.locale
        }
      )

      isReady.value = true

      // 设置 ResizeObserver 监听
      setupResizeObserver()

      console.log(`[useECharts] Instance initialized`, {
        container: _container,
        size: getSize()
      })
    } catch (error) {
      console.error('[useECharts] Failed to initialize:', error)
      isReady.value = false
    }
  }

  /**
   * 设置图表选项
   */
  function setOption(option, notMerge = false, lazyUpdate = false) {
    if (!chartInstance.value || !isReady.value) {
      console.warn('[useECharts] Cannot setOption: instance not ready')
      return
    }

    try {
      chartInstance.value.setOption(option, {
        notMerge: notMerge,
        lazyUpdate: lazyUpdate
      })
    } catch (error) {
      console.error('[useECharts] setOption error:', error)
    }
  }

  /**
   * 手动调整大小（带防抖）
   */
  function resize(debounceMs = options.debounceMs) {
    if (!chartInstance.value || !_container) return

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      try {
        const size = getSize()
        
        if (size.width > 0 && size.height > 0) {
          chartInstance.value.resize({
            width: size.width,
            height: size.height,
            silent: false
          })

          containerSize.value = size

          // 触发自定义事件（可用于父组件监听）
          _container.dispatchEvent(new CustomEvent('chart:resized', {
            detail: { size, instance: chartInstance.value }
          }))
        }
      } catch (error) {
        console.error('[useECharts] resize error:', error)
      }
    }, debounceMs)
  }

  /**
   * 显示 Loading 状态
   */
  function showLoading(loadingOptions = {}) {
    if (!chartInstance.value) return

    isLoading.value = true
    
    const mergedOptions = {
      ...DEFAULT_LOADING_OPTIONS,
      ...options.loadingOptions,
      ...loadingOptions
    }

    try {
      chartInstance.value.showLoading('default', mergedOptions)
    } catch (error) {
      console.error('[useECharts] showLoading error:', error)
    }
  }

  /**
   * 隐藏 Loading 状态
   */
  function hideLoading() {
    if (!chartInstance.value) return

    isLoading.value = false

    try {
      chartInstance.value.hideLoading()
    } catch (error) {
      console.error('[useECharts] hideLoading error:', error)
    }
  }

  /**
   * 获取容器尺寸
   */
  function getSize() {
    if (!_container) return { width: 0, height: 0 }

    const rect = _container.getBoundingClientRect()
    
    return {
      width: Math.floor(rect.width),
      height: Math.floor(rect.height),
      clientWidth: _container.clientWidth,
      clientHeight: _container.clientHeight
    }
  }

  /**
   * 设置 ResizeObserver 监听容器尺寸变化
   */
  function setupResizeObserver() {
    if (!_container) return

    // 清除旧的 observer
    disposeResizeObserver()

    try {
      resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect

          // 只在有有效尺寸时才触发 resize
          if (width > 0 && height > 0) {
            resize(options.debounceMs)
          }
        }
      })

      resizeObserver.observe(_container)

      console.log('[useECharts] ResizeObserver attached')
    } catch (error) {
      console.warn('[useECharts] ResizeObserver not supported, fallback to window.resize', error)
      
      // Fallback: 使用 window.resize 事件
      setupWindowResizeListener()
    }
  }

  /**
   * Fallback: Window Resize 监听器
   */
  let windowResizeHandler = null
  
  function setupWindowResizeListener() {
    if (windowResizeHandler) {
      window.removeEventListener('resize', windowResizeHandler)
    }

    windowResizeHandler = () => {
      resize(options.debounceMs)
    }

    window.addEventListener('resize', windowResizeHandler, { passive: true })
  }

  /**
   * 移除 ResizeObserver
   */
  function disposeResizeObserver() {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  /**
   * 移除 Window Resize 监听器
   */
  function disposeWindowResizeListener() {
    if (windowResizeHandler) {
      window.removeEventListener('resize', windowResizeHandler)
      windowResizeHandler = null
    }
  }

  /**
   * 销毁实例并清理资源
   */
  function dispose() {
    console.log('[useECharts] Disposing instance')

    // 清理定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // 移除 ResizeObserver
    disposeResizeObserver()

    // 移除 Window Resize 监听器
    disposeWindowResizeListener()

    // 销毁 ECharts 实例
    if (chartInstance.value) {
      try {
        chartInstance.value.dispose()
      } catch (error) {
        console.error('[useECharts] Dispose error:', error)
      } finally {
        chartInstance.value = null
        isReady.value = false
        isLoading.value = false
      }
    }

    _container = null
  }

  // ============================
  // 生命周期钩子
  // ============================

  onMounted(() => {
    if (options.autoInit !== false) {
      init()
    }
  })

  onUnmounted(() => {
    dispose()
  })

  // 监听容器 ref 变化（如果动态切换）
  watch(containerRef, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      init()
    } else if (!newVal) {
      dispose()
    }
  })

  // 返回公共 API
  return {
    // 状态
    chartInstance,
    isLoading,
    isReady,
    containerSize,

    // 方法
    setOption,
    resize,
    showLoading,
    hideLoading,
    getSize,
    init,
    dispose
  }
}

/**
 * 防抖函数工具
 */
export function debounce(fn, delay = 300) {
  let timer = null
  
  return function(...args) {
    if (timer) clearTimeout(timer)
    
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 节流函数工具
 */
export function throttle(fn, interval = 300) {
  let lastTime = 0
  
  return function(...args) {
    const now = Date.now()
    
    if (now - lastTime >= interval) {
      fn.apply(this, args)
      lastTime = now
    }
  }
}
