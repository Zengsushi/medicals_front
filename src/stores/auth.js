import { defineStore } from 'pinia';
import axios from 'axios';

const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER_ID: 'userId',
  USER_INFO: 'auth_user_info',
  LAST_ACTIVITY: 'last_activity'
};

// 配置参数
const TOKEN_EXPIRY_HOURS = 3; // 令牌过期时间（小时）
const ACTIVITY_EXTENSION_MINUTES = 30; // 活动续期时间（分钟）
const INACTIVITY_TIMEOUT_MINUTES = 30; // 无活动超时时间（分钟）
const AUTH_API_BASE = 'http://127.0.0.1:8000/api';

function parseJSON(value, defaultValue = null) {
  try {
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function decodeJWT(token) {
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

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem(STORAGE_KEYS.TOKEN) || null,
    refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null,
    userId: (() => {
      const value = localStorage.getItem(STORAGE_KEYS.USER_ID);
      if (value === null) return null;
      try { return parseInt(value, 10); } catch { return null; }
    })(),
    userInfo: parseJSON(localStorage.getItem(STORAGE_KEYS.USER_INFO), null),
    lastActivity: parseInt(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY) || '0', 10),
    _permissions: [],
    _roles: [],
    _refreshInFlight: null,
    _refreshDisabled: false,
    _lastRefreshAttemptAt: 0
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    
    currentUser: (state) => {
      if (state.userInfo) return state.userInfo;
      
      const payload = decodeJWT(state.accessToken);
      if (!payload) return null;
      
      return {
        id: state.userId,
        username: payload.username || null,
        roles: payload.roles || ['guest'],
        exp: payload.exp || null
      };
    },
    
    username: (state) => {
      if (state.userInfo?.username) return state.userInfo.username;
      const payload = decodeJWT(state.accessToken);
      return payload?.username || null;
    },
    
    roles: (state) => {
      if (state.userInfo?.roles) return state.userInfo.roles;
      if (state._roles.length > 0) return state._roles;
      const payload = decodeJWT(state.accessToken);
      if (payload?.roles) return payload.roles;
      return ['guest'];
    },
    
    isAdmin: (state) => {
      const userRoles = state.userInfo?.roles || state._roles;
      if (userRoles?.includes('superadmin') || userRoles?.includes('admin')) return true;
      const payload = decodeJWT(state.accessToken);
      if (payload?.roles?.includes('superadmin') || payload?.roles?.includes('admin')) return true;
      return false;
    },
    
    isSuperAdmin: (state) => {
      const userRoles = state.userInfo?.roles || state._roles;
      if (userRoles?.includes('superadmin')) return true;
      const payload = decodeJWT(state.accessToken);
      if (payload?.roles?.includes('superadmin')) return true;
      return false;
    },

    tokenPayload: (state) => {
      return decodeJWT(state.accessToken);
    },
    
    isTokenExpired: (state) => {
      const payload = decodeJWT(state.accessToken);
      if (!payload?.exp) {
        console.log('[AuthStore] 令牌没有过期时间，认为已过期');
        return true;
      }
      const expTime = payload.exp * 1000;
      const now = Date.now();
      const isExpired = now >= expTime;
      console.log('[AuthStore] 令牌过期检查:', {
        exp: payload.exp,
        expTime: new Date(expTime).toISOString(),
        now: new Date(now).toISOString(),
        isExpired
      });
      return isExpired;
    },
    
    isInactive: (state) => {
      if (!state.lastActivity) return false;
      const now = Date.now();
      const inactivityThreshold = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
      return now - state.lastActivity >= inactivityThreshold;
    },
    
    needsTokenExtension: (state) => {
      if (!state.lastActivity || !state.accessToken) return false;
      const payload = decodeJWT(state.accessToken);
      if (!payload?.exp) return false;
      
      const now = Date.now();
      const tokenExpiry = payload.exp * 1000;
      const extensionThreshold = ACTIVITY_EXTENSION_MINUTES * 60 * 1000;
      
      // 检查是否在3小时内有活动，并且令牌将在30分钟内过期
      const threeHoursAgo = now - (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      return state.lastActivity >= threeHoursAgo && (tokenExpiry - now) <= extensionThreshold;
    },
    
    permissions: (state) => state._permissions
  },

  actions: {
    setCredentials(credentials) {
      const { accessToken, refreshToken, userId, userInfo = null } = credentials;
      
      this.accessToken = accessToken || null;
      this.refreshToken = refreshToken || null;
      this.userId = userId || null;
      this.userInfo = userInfo;
      this.lastActivity = Date.now();

      if (accessToken) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }

      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      }

      if (userId !== null && userId !== undefined) {
        localStorage.setItem(STORAGE_KEYS.USER_ID, userId.toString());
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_ID);
      }

      if (userInfo) {
        localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_INFO);
      }

      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, this.lastActivity.toString());
    },

    recordActivity() {
      this.lastActivity = Date.now();
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, this.lastActivity.toString());
    },

    checkActivity() {
      if (this.isInactive) {
        console.warn('[AuthStore] 用户长时间无活动，令牌将过期');
        return false;
      }
      return true;
    },

    updateTokens(accessToken, refreshToken) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.lastActivity = Date.now();

      if (accessToken) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }

      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      }

      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, this.lastActivity.toString());
    },

    clearAuth() {
      this.accessToken = null;
      this.refreshToken = null;
      this.userId = null;
      this.userInfo = null;
      this.lastActivity = 0;
      this._permissions = [];
      this._roles = [];
      this._refreshInFlight = null;
      this._refreshDisabled = false;
      this._lastRefreshAttemptAt = 0;

      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    },

    setPermissions(permissions) {
      this._permissions = permissions || [];
    },

    setRoles(roles) {
      this._roles = roles || [];
    },

    /** 合并更新本地缓存的用户信息（如头像） */
    patchUserInfo(partial) {
      if (!partial || typeof partial !== 'object') return;
      this.userInfo = { ...(this.userInfo || {}), ...partial };
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(this.userInfo));
    },

    hasPermission(permissionCode) {
      if (!permissionCode) return true;
      if (!this.isAuthenticated) return false;
      if (this.isAdmin) return true;
      return this._permissions.includes(permissionCode);
    },

    hasAnyPermission(permissions) {
      if (!permissions || permissions.length === 0) return true;
      return permissions.some(p => this.hasPermission(p));
    },

    hasAllPermissions(permissions) {
      if (!permissions || permissions.length === 0) return true;
      return permissions.every(p => this.hasPermission(p));
    },

    hasRole(roleCode) {
      if (!roleCode) return true;
      const userRoles = this.roles;
      if (userRoles.includes(roleCode)) return true;
      if (this._roles.includes(roleCode)) return true;
      if (roleCode === 'admin' && (userRoles.includes('superadmin') || this._roles.includes('superadmin'))) return true;
      return false;
    },

    canAccess(path) {
      if (!this.isAuthenticated) return false;
      if (path === '/' || path === '/login') return true;
      return true;
    },

    getToken() {
      return this.accessToken;
    },

    restoreFromStorage() {
      console.log('[AuthStore] 开始恢复认证状态');
      this.accessToken = localStorage.getItem(STORAGE_KEYS.TOKEN) || null;
      this.refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null;
      
      const uid = localStorage.getItem(STORAGE_KEYS.USER_ID);
      this.userId = uid ? parseInt(uid, 10) : null;
      
      this.userInfo = parseJSON(localStorage.getItem(STORAGE_KEYS.USER_INFO), null);
      this.lastActivity = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY) || '0', 10);

      console.log('[AuthStore] 恢复后的状态:', {
        accessToken: this.accessToken ? '存在' : '不存在',
        refreshToken: this.refreshToken ? '存在' : '不存在',
        userId: this.userId,
        userInfo: this.userInfo ? '存在' : '不存在',
        lastActivity: this.lastActivity
      });

      // access token 是受保护路由准入的唯一凭据，只有 refresh token 不能算已登录
      if (!this.accessToken) {
        console.warn('[AuthStore] 本地无 access token，恢复失败');
        this.clearAuth();
        return false;
      }

      if (this.accessToken && this.isTokenExpired) {
        console.warn('[AuthStore] Token 已过期，需要重新登录');
        this.clearAuth();
        return false;
      }

      if (this.isInactive) {
        console.warn('[AuthStore] 用户长时间无活动，需要重新登录');
        this.clearAuth();
        return false;
      }

      console.log('[AuthStore] 认证状态恢复成功');
      return true;
    },

    login(loginData) {
      const { access_token, refresh_token, user } = loginData;
      
      const userInfo = user ? {
        id: user.id,
        username: user.username,
        roles: user.roles || ['guest'],
        avatar: user.avatar
      } : null;

      this.setCredentials({
        accessToken: access_token,
        refreshToken: refresh_token,
        userId: user?.id,
        userInfo
      });

      if (user?.roles) {
        this.setRoles(user.roles);
      }

      if (user?.permissions) {
        this.setPermissions(user.permissions);
      }
    },

    logout() {
      this.clearAuth();
      // 跳转到登录页
      window.location.href = '/login';
    },

    getToken() {
      return this.accessToken;
    },

    getRefreshToken() {
      return this.refreshToken;
    },

    async refreshAccessToken() {
      if (this._refreshDisabled) {
        throw new Error('刷新令牌已失效，请重新登录');
      }
      if (this._refreshInFlight) {
        return this._refreshInFlight;
      }
      try {
        if (!this.refreshToken) {
          throw new Error('缺少 refresh token，需要重新登录');
        }

        // 检查用户是否有活动
        if (!this.checkActivity()) {
          throw new Error('用户长时间无活动，需要重新登录');
        }

        const refreshPromise = axios.post(
          `${AUTH_API_BASE}/token/refresh`,
          { refresh_token: this.refreshToken },
          { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );
        this._refreshInFlight = refreshPromise;
        const response = await refreshPromise;

        const payload = response?.data || {};
        const success = payload?.success === true || payload?.code === 200;
        const data = payload?.data || {};
        const newAccessToken = data?.access_token || data?.token || null;
        const newRefreshToken = data?.refresh_token || this.refreshToken;

        if (!success || !newAccessToken) {
          throw new Error(payload?.message || '刷新令牌失败');
        }

        this.updateTokens(newAccessToken, newRefreshToken);
        this._refreshDisabled = false;
        return newAccessToken;
      } catch (error) {
        const message = error?.response?.data?.message || error?.message || '刷新令牌失败';
        // refresh token 失效后熔断，避免每个请求都重复刷新并刷屏
        if (/无效|过期|invalid|expired/i.test(message)) {
          this._refreshDisabled = true;
          this.clearAuth();
        }
        console.error('刷新令牌失败:', error);
        throw error;
      } finally {
        this._refreshInFlight = null;
      }
    },

    async checkAndExtendToken() {
      if (this._refreshDisabled || !this.refreshToken || this._refreshInFlight) {
        return;
      }
      const now = Date.now();
      if (now - this._lastRefreshAttemptAt < 15000) {
        return;
      }
      if (this.needsTokenExtension) {
        try {
          this._lastRefreshAttemptAt = now;
          await this.refreshAccessToken();
          console.log('[AuthStore] 令牌已自动续期');
        } catch (error) {
          console.error('[AuthStore] 令牌续期失败:', error);
        }
      }
    }
  }
});

export default useAuthStore;
