import { ref, computed } from 'vue';

const globalLoading = ref(false);
const loadingText = ref('加载中...');
const requestCount = ref(0);
const loadingQueue = new Map();

export function useLoading() {
  const isLoading = computed(() => globalLoading.value || requestCount.value > 0);
  const currentText = computed(() => loadingText.value);

  function startLoading(text = '加载中...', key = null) {
    if (key) {
      loadingQueue.set(key, text);
    }

    requestCount.value++;
    globalLoading.value = true;
    loadingText.value = text;
  }

  function stopLoading(key = null) {
    if (key) {
      loadingQueue.delete(key);
    }

    requestCount.value = Math.max(0, requestCount.value - 1);

    if (requestCount.value === 0) {
      globalLoading.value = false;
      loadingText.value = '加载中...';
    } else if (loadingQueue.size > 0) {
      const lastKey = Array.from(loadingQueue.keys()).pop();
      loadingText.value = loadingQueue.get(lastKey);
    }
  }

  async function withLoading(asyncFn, options = {}) {
    const { text = '加载中...', key = null, showError = false } = options;

    try {
      startLoading(text, key);
      const result = await asyncFn();
      return { success: true, data: result };
    } catch (error) {
      if (showError) {
        console.error('[useLoading] 操作失败:', error);
      }
      return { success: false, error };
    } finally {
      stopLoading(key);
    }
  }

  function clearAll() {
    globalLoading.value = false;
    requestCount.value = 0;
    loadingQueue.clear();
    loadingText.value = '加载中...';
  }

  return {
    state: {
      isLoading,
      currentText,
      requestCount: computed(() => requestCount.value)
    },
    startLoading,
    stopLoading,
    withLoading,
    clearAll
  };
}

export default useLoading;
