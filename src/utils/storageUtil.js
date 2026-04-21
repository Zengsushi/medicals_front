/**
 * 本地存储工具函数 (精简版)
 *
 * 只保留 3 个核心字段:
 * - token: JWT access_token
 * - refreshToken: JWT refresh_token
 * - userId: 用户ID
 *
 * 其他数据按需从 API 获取:
 * - 权限: /api/user/permissions
 * - 菜单: /api/menus
 * - 用户信息: 解码 token 获取
 */

const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER_ID: 'userId',
};

function parseJSON(value, defaultValue = null) {
  try {
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function getToken() {
  return localStorage.getItem(STORAGE_KEYS.TOKEN) || null;
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null;
}

export function setRefreshToken(refreshToken) {
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  } else {
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
}

export function getUserId() {
  const value = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (value === null) return null;
  try {
    return parseInt(value, 10);
  } catch {
    return null;
  }
}

export function setUserId(userId) {
  if (userId !== null && userId !== undefined) {
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId.toString());
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
  }
}

export function isLoggedIn() {
  return !!getToken();
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_ID);
}

export function setAuth(token, refreshToken, userId) {
  setToken(token);
  setRefreshToken(refreshToken);
  setUserId(userId);
}

export function decodeToken(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function getUsernameFromToken() {
  const payload = decodeToken(getToken());
  return payload?.username || null;
}

export function getRoleFromToken() {
  const payload = decodeToken(getToken());
  return payload?.role || null;
}

export default {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  getUserId,
  setUserId,
  isLoggedIn,
  clearAuth,
  setAuth,
  decodeToken,
  getUsernameFromToken,
  getRoleFromToken,
  STORAGE_KEYS,
};
