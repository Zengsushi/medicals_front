import axios from 'axios'
import { useAuthStore } from '../stores/auth.js'

// 跳过权限检查的路径
const SKIP_PERMISSION_CHECK = [
  '/api/login',
  '/api/menu',
  '/api/analysis',
  '/api/collection',
  '/api/dashboard'
];

// 检查是否需要跳过权限检查
function shouldSkipPermissionCheck(url) {
  return SKIP_PERMISSION_CHECK.some(prefix => url.startsWith(prefix));
}

// 统一走 Vite 代理，避免浏览器直接跨域预检
const API_BASE_URL = '/api'
const API_TIMEOUT = 15000

console.log('API_BASE_URL:', API_BASE_URL)
console.log('API_TIMEOUT:', API_TIMEOUT)

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

const redirectToLogin = () => {
  const authStore = useAuthStore();
  authStore.clearAuth();
  
  const error = new Error('登录已过期，正在跳转...');
  error.code = 'AUTH_EXPIRED';
  throw error;
};

function normalizeResponse(response) {
  const resData = response.data;

  if (resData && typeof resData.success === 'boolean') {
    return resData;
  }

  return {
    success: true,
    code: response.status,
    message: '操作成功',
    data: resData,
    error: null
  };
}

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    const token = authStore.getToken();
    const requestUrl = String(config.url || '');

    // 记录用户活动
    authStore.recordActivity();

    // 关闭“请求前主动续期”，避免与 401 续期并发导致 refresh 接口风暴
    // 仅在响应拦截器捕获 401 时触发 refresh，更稳定

    // 跳过权限检查的路径
    if (!shouldSkipPermissionCheck(requestUrl)) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    try {
      const normalized = normalizeResponse(response);

      // 兼容后端业务错误: HTTP 200 + { success: false, code: 401 }
      if (normalized?.success === false && Number(normalized?.code) === 401) {
        redirectToLogin();
      }

      return normalized;
    } catch (error) {
      console.error('响应处理异常:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    // 处理 401 错误
    if (error.response && error.response.status === 401) {
      redirectToLogin();
    }

    // 处理 403 错误
    if (error.response && error.response.status === 403) {
      const errorMessage = error.response.data?.message || '没有操作权限';
      console.error('403 Forbidden:', errorMessage);
      return Promise.reject(error);
    }

    // 处理其他错误
    const errorMessage = error.response?.data?.message || error.message || '网络请求失败';
    console.error('请求错误:', errorMessage);
    return Promise.reject(error);
  }
);

export default request;
