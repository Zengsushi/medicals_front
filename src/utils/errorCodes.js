/**
 * 前后端共享错误码枚举
 *
 * 错误响应格式:
 * {
 *   success: true/false,
 *   code: 200 | 401 | 403 | 404 | 422 | 500,
 *   message: string,
 *   data: any | null,
 *   error: { type: string, ... } | null
 * }
 */

export const ErrorCodes = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
};

export const ErrorTypes = {
  HTTP_ERROR: 'http_error',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  VALIDATION_ERROR: 'validation_error',
  VALUE_ERROR: 'value_error',
  INTERNAL_ERROR: 'internal_error',
};

export const ErrorMessages = {
  [ErrorCodes.SUCCESS]: '操作成功',
  [ErrorCodes.BAD_REQUEST]: '请求参数错误',
  [ErrorCodes.UNAUTHORIZED]: '身份认证已过期，请重新登录',
  [ErrorCodes.FORBIDDEN]: '没有权限访问',
  [ErrorCodes.NOT_FOUND]: '资源不存在',
  [ErrorCodes.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCodes.INTERNAL_ERROR]: '服务器内部错误',

  // 自定义错误消息
  LOGIN_FAILED: '用户名或密码错误',
  TOKEN_EXPIRED: '令牌已过期，请重新登录',
  PERMISSION_DENIED: '没有权限执行此操作',
  SESSION_EXPIRED: '登录已失效，请重新登录',
  NETWORK_ERROR: '网络连接失败，请检查网络',
  SERVER_ERROR: '服务器繁忙，请稍后重试',
};

export function isSuccessResponse(response) {
  return response && response.success === true && response.code >= 200 && response.code < 300;
}

export function isErrorResponse(response) {
  return response && response.success === false;
}

export function getErrorMessage(response) {
  if (!response) return ErrorMessages[ErrorCodes.INTERNAL_ERROR];
  return response.message || ErrorMessages[response.code] || '未知错误';
}

export function getErrorType(response) {
  if (!response || !response.error) return null;
  return response.error.type || null;
}

export function isAuthError(response) {
  if (!response) return false;
  return response.code === ErrorCodes.UNAUTHORIZED ||
         response.error?.type === ErrorTypes.UNAUTHORIZED;
}

export function isPermissionError(response) {
  if (!response) return false;
  return response.code === ErrorCodes.FORBIDDEN ||
         response.error?.type === ErrorTypes.FORBIDDEN;
}

export function isValidationError(response) {
  if (!response) return false;
  return response.code === ErrorCodes.VALIDATION_ERROR ||
         response.error?.type === ErrorTypes.VALIDATION_ERROR;
}

export function isNetworkError(error) {
  return !error.response && error.message?.includes('Network Error');
}

export default {
  ErrorCodes,
  ErrorTypes,
  ErrorMessages,
  isSuccessResponse,
  isErrorResponse,
  getErrorMessage,
  getErrorType,
  isAuthError,
  isPermissionError,
  isValidationError,
  isNetworkError,
};
