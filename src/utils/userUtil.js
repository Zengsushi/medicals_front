import {
  getToken,
  getRefreshToken,
  getUserId,
  isLoggedIn as checkLoggedIn,
  clearAuth,
  decodeToken,
  getRoleFromToken
} from './storageUtil';

// 临时存储用户信息（用于 token role 为 null 的情况）
let tempUserInfo = null;

export const isLoggedIn = () => {
  return checkLoggedIn();
};

export const isAdmin = () => {
  const role = getRoleFromToken();
  if (role) {
    return role === 'superadmin' || role === 'admin';
  }
  // 如果 token 中没有 role，从临时存储中获取
  return tempUserInfo?.role === 'superadmin' || tempUserInfo?.role === 'admin';
};

export const setTempUserInfo = (userInfo) => {
  tempUserInfo = userInfo;
};

export const clearTempUserInfo = () => {
  tempUserInfo = null;
};

export const getUserInfo = () => {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = decodeToken(token);
    if (!payload) return null;
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role
    };
  } catch (error) {
    console.error('解析用户信息失败:', error);
    return null;
  }
};

export const getUserType = () => {
  return getRoleFromToken() || 'guest';
};

export const getLoginMode = () => {
  return getUserType();
};

export const getTokenLocal = () => {
  return getToken();
};

export const getPermissions = () => {
  return [];
};

export const getMenus = () => {
  return [];
};

export const hasPermission = (permissionCode) => {
  if (!permissionCode) return true;
  const role = getRoleFromToken();
  if (role === 'superadmin' || role === 'admin') return true;
  return false;
};

export const canAccess = (permissionCode) => {
  return hasPermission(permissionCode);
};

export const verifyUserLoginStatus = () => {
  return checkLoggedIn();
};

export const logout = () => {
  clearAuth();
};

export { clearAuth, getRoleFromToken };

export default {
  isLoggedIn,
  isAdmin,
  getUserInfo,
  getUserType,
  getLoginMode,
  getToken: getTokenLocal,
  getPermissions,
  getMenus,
  hasPermission,
  canAccess,
  verifyUserLoginStatus,
  logout,
  clearAuth,
  getRoleFromToken
};
