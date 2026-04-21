import { ref, computed } from 'vue';
import { message, notification, Modal } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  AppError,
  ErrorSeverity,
  ErrorCategory,
  createErrorFactory
} from '../utils/errorFactory';

const errorFactory = createErrorFactory();

const globalErrorQueue = ref([]);
const isShowingModal = ref(false);
const errorStats = ref({
  total: 0,
  byCategory: {},
  bySeverity: {}
});

let globalErrorHandler = null;
let errorLogger = null;

export function useErrorHandler(options = {}) {
  const router = useRouter();
  const authStore = useAuthStore();

  const config = {
    showNotification: options.showNotification ?? true,
    showModal: options.showModal ?? false,
    autoRedirect: options.autoRedirect ?? true,
    redirectToLogin: options.redirectToLogin ?? '/login',
    groupErrors: options.groupErrors ?? true,
    groupInterval: options.groupInterval || 1000,
    maxQueueSize: options.maxQueueSize || 10,
    devMode: options.devMode ?? import.meta.env.DEV,
    ...options
  };

  const lastError = ref(null);
  const errorHistory = ref([]);

  const recentErrors = computed(() => 
    errorHistory.value.slice(-10)
  );

  const hasRecentErrors = computed(() => 
    errorHistory.value.length > 0
  );

  function normalizeError(error) {
    if (error instanceof AppError) {
      return error;
    }

    if (error?.success === false || (error?.code && error?.message)) {
      return errorFactory.fromResponse(error);
    }

    if (!error?.response && (error?.message?.includes('Network') || error?.message?.includes('timeout'))) {
      return errorFactory.network(error);
    }

    return errorFactory.wrap(error);
  }

  function getNotificationConfig(error) {
    const configs = {
      [ErrorCategory.NETWORK]: {
        type: 'warning',
        duration: 4,
        icon: '⚠️'
      },
      [ErrorCategory.AUTH]: {
        type: 'warning',
        duration: 3,
        icon: '🔒'
      },
      [ErrorCategory.PERMISSION]: {
        type: 'warning',
        duration: 3,
        icon: '🚫'
      },
      [ErrorCategory.VALIDATION]: {
        type: 'warning',
        duration: 4,
        icon: '✏️'
      },
      [ErrorCategory.BUSINESS]: {
        type: 'error',
        duration: 3,
        icon: '❌'
      },
      [ErrorCategory.SYSTEM]: {
        type: 'error',
        duration: 5,
        icon: '💥'
      }
    };

    return configs[error.category] || configs[ErrorCategory.SYSTEM];
  }

  function showErrorNotification(error) {
    if (!config.showNotification) return;

    const notifyConfig = getNotificationConfig(error);

    switch (notifyConfig.type) {
      case 'error':
        message.error(error.userMessage, notifyConfig.duration);
        break;
      case 'warning':
        message.warning(error.userMessage, notifyConfig.duration);
        break;
      default:
        message.info(error.userMessage, notifyConfig.duration);
    }
  }

  function showErrorModal(error) {
    if (!config.showModal || isShowingModal.value) return;

    isShowingModal.value = true;

    const isDev = config.devMode;
    
    let content = `<p style="margin-bottom: 12px;"><strong>${error.userMessage}</strong></p>`;
    
    if (isDev && error.originalError) {
      content += `
        <details style="margin-top: 8px;">
          <summary style="cursor: pointer; color: #999;">技术详情</summary>
          <pre style="margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; overflow: auto; max-height: 200px;">${error.stack || error.message}</pre>
        </details>
      `;
    }

    Modal.error({
      title: ERROR_TEMPLATES[error.category]?.title || '错误',
      content: content,
      okText: '确定',
      onOk() {
        isShowingModal.value = false;
        handlePostErrorActions(error);
      },
      onCancel() {
        isShowingModal.value = false;
        handlePostErrorActions(error);
      }
    });
  }

  function handlePostErrorActions(error) {
    if (!config.autoRedirect) return;

    if (error.category === ErrorCategory.AUTH) {
      authStore.clearAuth();
      router.push(config.redirectToLogin);
      return;
    }

    if (error.code === 403 && !authStore.isAdmin) {
      router.push({ name: 'home' });
      return;
    }
  }

  function logError(error) {
    errorHistory.value.push({
      ...error.toJSON(),
      id: Date.now() + Math.random()
    });

    if (errorHistory.value.length > 50) {
      errorHistory.value = errorHistory.value.slice(-30);
    }

    lastError.value = error;

    errorStats.value.total++;
    errorStats.value.byCategory[error.category] = 
      (errorStats.value.byCategory[error.category] || 0) + 1;
    errorStats.value.bySeverity[error.severity] = 
      (errorStats.value.bySeverity[error.severity] || 0) + 1;

    if (config.devMode) {
      console.group(`[${error.category.toUpperCase()}] ${error.code}`);
      console.error('Message:', error.userMessage);
      console.error('Detail:', error.detail);
      console.error('Original:', error.originalError);
      console.trace('Stack trace');
      console.groupEnd();
    }

    if (typeof errorLogger === 'function') {
      try {
        errorLogger(error.toJSON());
      } catch (loggerError) {
        console.warn('Error logger failed:', loggerError);
      }
    }
  }

  function handleError(error, customHandler = null) {
    const normalizedError = normalizeError(error);

    if (normalizedError.handled) {
      return normalizedError;
    }

    if (customHandler) {
      try {
        const result = customHandler(normalizedError);
        if (result === false) {
          normalizedError.markAsHandled();
          return normalizedError;
        }
      } catch (handlerError) {
        console.warn('Custom error handler failed:', handlerError);
      }
    }

    if (globalErrorHandler) {
      try {
        const shouldContinue = globalErrorHandler(normalizedError);
        if (shouldContinue === false) {
          normalizedError.markAsHandled();
          return normalizedError;
        }
      } catch (handlerError) {
        console.warn('Global error handler failed:', handlerError);
      }
    }

    logError(normalizedError);

    if (config.showModal) {
      showErrorModal(normalizedError);
    } else {
      showErrorNotification(normalizedError);
      setTimeout(() => handlePostErrorActions(normalizedError), 100);
    }

    normalizedError.markAsHandled();
    return normalizedError;
  }

  async function handleAsync(asyncFn, options = {}) {
    const {
      successMessage = null,
      errorMessage = null,
      showSuccess = true,
      showError = true,
      onError = null
    } = options;

    try {
      const result = await asyncFn();
      
      if (showSuccess && successMessage) {
        message.success(successMessage);
      }
      
      return { success: true, data: result };
    } catch (error) {
      const normalizedError = normalizeError(error);
      
      if (showError) {
        const displayMessage = errorMessage || normalizedError.userMessage;
        
        if (options.useModal) {
          showErrorModal(normalizedError);
        } else {
          message.error(displayMessage);
        }
      }

      if (onError) {
        onError(normalizedError);
      }

      logError(normalizedError);
      
      return { success: false, error: normalizedError };
    }
  }

  function clearErrors() {
    errorHistory.value = [];
    lastError.value = null;
    errorStats.value = {
      total: 0,
      byCategory: {},
      bySeverity: {}
    };
  }

  function clearLastError() {
    lastError.value = null;
  }

  return {
    state: {
      lastError,
      errorHistory,
      recentErrors,
      hasRecentErrors,
      errorStats
    },

    handleError,
    handleAsync,
    clearErrors,
    clearLastError,

    normalizeError,

    factory: errorFactory,

    AppError,
    ErrorSeverity,
    ErrorCategory
  };
}

export function setGlobalErrorHandler(handler) {
  globalErrorHandler = handler;
}

export function setErrorLogger(logger) {
  errorLogger = logger;
}

export function getErrorStats() {
  return errorStats.value;
}

export default useErrorHandler;
