import { message } from 'ant-design-vue';

const ErrorSeverity = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

const ErrorCategory = {
  NETWORK: 'network',
  AUTH: 'auth',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  BUSINESS: 'business',
  SYSTEM: 'system'
};

const ERROR_TEMPLATES = {
  [ErrorCategory.NETWORK]: {
    title: '网络异常',
    messages: {
      timeout: '请求超时，请检查网络连接',
      offline: '网络已断开，请检查网络设置',
      failed: '网络请求失败，请稍后重试',
      default: '网络连接失败，请检查网络'
    }
  },
  [ErrorCategory.AUTH]: {
    title: '认证失败',
    messages: {
      expired: '登录已过期，请重新登录',
      invalid: '身份验证失败，请重新登录',
      token_missing: '缺少认证令牌',
      session_invalid: '会话已失效，请重新登录',
      default: '身份认证已过期，请重新登录'
    }
  },
  [ErrorCategory.PERMISSION]: {
    title: '权限不足',
    messages: {
      denied: '您没有权限执行此操作',
      role_required: '需要更高权限才能访问',
      resource_denied: '没有权限访问该资源',
      default: '没有权限执行此操作'
    }
  },
  [ErrorCategory.VALIDATION]: {
    title: '数据校验错误',
    messages: {
      required: '请填写必填项',
      format: '数据格式不正确',
      length: '数据长度超出限制',
      unique: '数据已存在，不能重复',
      default: '数据验证失败'
    }
  },
  [ErrorCategory.BUSINESS]: {
    title: '操作失败',
    messages: {
      create: '创建失败，请重试',
      update: '更新失败，请重试',
      delete: '删除失败，可能有关联数据',
      not_found: '数据不存在或已被删除',
      conflict: '操作冲突，请刷新后重试',
      default: '操作失败，请稍后重试'
    }
  },
  [ErrorCategory.SYSTEM]: {
    title: '系统错误',
    messages: {
      server_error: '服务器繁忙，请稍后重试',
      internal: '系统内部错误',
      unavailable: '服务暂时不可用',
      maintenance: '系统维护中，请稍后访问',
      default: '服务器内部错误'
    }
  }
};

class AppError extends Error {
  constructor(options) {
    super(options.message || '未知错误');
    
    this.name = 'AppError';
    this.code = options.code || 500;
    this.category = options.category || ErrorCategory.SYSTEM;
    this.severity = options.severity || ErrorSeverity.ERROR;
    this.userMessage = options.userMessage || this.message;
    this.detail = options.detail || null;
    this.originalError = options.originalError || null;
    this.context = options.context || {};
    this.timestamp = Date.now();
    this.handled = false;
  }

  static fromResponse(response, originalError = null) {
    const code = response?.code || 500;
    
    let category = ErrorCategory.SYSTEM;
    if (code === 401 || response?.error?.type === 'unauthorized') {
      category = ErrorCategory.AUTH;
    } else if (code === 403 || response?.error?.type === 'forbidden') {
      category = ErrorCategory.PERMISSION;
    } else if (code === 422 || response?.error?.type === 'validation_error') {
      category = ErrorCategory.VALIDATION;
    } else if (response?.error?.type === 'network_error') {
      category = ErrorCategory.NETWORK;
    }

    return new AppError({
      code,
      category,
      message: response?.message || getTemplateMessage(category),
      userMessage: response?.message || getTemplateMessage(category),
      detail: response?.error || null,
      originalError
    });
  }

  static networkError(error) {
    return new AppError({
      code: 0,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.ERROR,
      message: error?.message || 'Network Error',
      userMessage: getTemplateMessage(ErrorCategory.NETWORK),
      originalError: error
    });
  }

  static authError(message = null) {
    return new AppError({
      code: 401,
      category: ErrorCategory.AUTH,
      severity: ErrorSeverity.WARNING,
      message: message || 'Authentication failed',
      userMessage: message || getTemplateMessage(ErrorCategory.AUTH)
    });
  }

  static permissionError(message = null) {
    return new AppError({
      code: 403,
      category: ErrorCategory.PERMISSION,
      severity: ErrorSeverity.WARNING,
      message: message || 'Permission denied',
      userMessage: message || getTemplateMessage(ErrorCategory.PERMISSION)
    });
  }

  static validationError(message = null, fields = null) {
    return new AppError({
      code: 422,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.WARNING,
      message: message || 'Validation failed',
      userMessage: message || getTemplateMessage(ErrorCategory.VALIDATION),
      detail: fields ? { fields } : null
    });
  }

  static businessError(code, message = null) {
    return new AppError({
      code: code || 400,
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.ERROR,
      message: message || 'Operation failed',
      userMessage: message || getTemplateMessage(ErrorCategory.BUSINESS)
    });
  }

  markAsHandled() {
    this.handled = true;
    return this;
  }

  toJSON() {
    const isDev = import.meta.env.DEV;
    
    const base = {
      code: this.code,
      category: this.category,
      severity: this.severity,
      message: this.userMessage,
      timestamp: this.timestamp
    };

    if (isDev) {
      base.originalMessage = this.message;
      base.detail = this.detail;
      base.stack = this.stack;
      if (this.originalError) {
        base.originalError = {
          message: this.originalError.message,
          stack: this.originalError.stack
        };
      }
    }

    return base;
  }

  toString() {
    return `[${this.category.toUpperCase()}] ${this.code}: ${this.userMessage}`;
  }
}

function getTemplateMessage(category, key = 'default') {
  return ERROR_TEMPLATES[category]?.messages[key] || ERROR_TEMPLATES[category]?.messages['default'] || '未知错误';
}

function createErrorFactory(defaultOptions = {}) {
  return {
    fromResponse: (response, originalError) => 
      AppError.fromResponse(response, originalError),
    
    network: (error) => 
      AppError.networkError(error),
    networkError: (error) => 
      AppError.networkError(error),
    
    auth: (message) => 
      AppError.authError(message),
    authError: (message) => 
      AppError.authError(message),
    
    permission: (message, context) => {
      const err = AppError.permissionError(message);
      if (context) err.context = { ...err.context, ...context };
      return err;
    },
    permissionError: (message, context) => {
      const err = AppError.permissionError(message);
      if (context) err.context = { ...err.context, ...context };
      return err;
    },
    
    validation: (message, fields) => 
      AppError.validationError(message, fields),
    validationError: (message, fields) => 
      AppError.validationError(message, fields),
    
    business: (code, message) => 
      AppError.businessError(code, message),
    businessError: (code, message) => 
      AppError.businessError(code, message),

    custom: (options) => 
      new AppError({ ...defaultOptions, ...options }),

    wrap: (error, context = {}) => {
      if (error instanceof AppError) {
        error.context = { ...error.context, ...context };
        return error;
      }
      
      return new AppError({
        ...defaultOptions,
        message: error?.message || 'Unknown error',
        originalError: error,
        context
      });
    },

    isAppError: (error) => error instanceof AppError,

    getCategory: () => ErrorCategory,
    getSeverity: () => ErrorSeverity,
    getTemplates: () => ERROR_TEMPLATES
  };
}

export {
  ErrorSeverity,
  ErrorCategory,
  ERROR_TEMPLATES,
  AppError,
  createErrorFactory,
  getTemplateMessage
};

export default createErrorFactory();
