/**
 * localStorage 迁移脚本
 *
 * 执行时机: 用户登录后 / 应用初始化时
 * 清理目标: 移除旧的冗余字段，只保留 token/refreshToken/userId
 *
 * 旧字段 (待清理):
 * - isLoggedIn (用 token 存在性判断)
 * - role (从 token 解码)
 * - userType (冗余，用 role 替代)
 * - loginMode (冗余)
 * - permissions (从 API 获取)
 * - menus (从 API 获取)
 * - userInfo (从 API 获取)
 */

const LEGACY_KEYS = [
  'isLoggedIn',
  'role',
  'userType',
  'loginMode',
  'permissions',
  'menus',
  'userInfo',
  'token',
  'refresh_token',
  'refreshToken',
  'userId',
];

export function migrateLocalStorage() {
  const removed = [];
  const kept = [];

  for (const key of LEGACY_KEYS) {
    if (localStorage.getItem(key) !== null) {
      if (['token', 'refresh_token', 'refreshToken', 'userId'].includes(key)) {
        kept.push(key);
      } else {
        removed.push(key);
        localStorage.removeItem(key);
      }
    }
  }

  if (removed.length > 0) {
    console.log('[Storage Migration] 已清理以下旧字段:', removed);
  }

  if (kept.length > 0) {
    console.log('[Storage Migration] 保留以下核心字段:', kept);
  }

  return { removed, kept };
}

export function migrateTokenFormat() {
  const oldRefreshToken = localStorage.getItem('refresh_token');
  const newRefreshToken = localStorage.getItem('refreshToken');

  if (oldRefreshToken && !newRefreshToken) {
    localStorage.setItem('refreshToken', oldRefreshToken);
    localStorage.removeItem('refresh_token');
    console.log('[Storage Migration] 已迁移 refresh_token -> refreshToken');
    return true;
  }

  return false;
}

export function isStorageModern() {
  const hasToken = !!localStorage.getItem('token');
  const hasRefreshToken = !!localStorage.getItem('refreshToken');
  const hasLegacyFields = LEGACY_KEYS.some(
    key => !['token', 'refreshToken', 'userId'].includes(key) && localStorage.getItem(key) !== null
  );

  return hasToken && hasRefreshToken && !hasLegacyFields;
}

export function forceCleanup() {
  LEGACY_KEYS.forEach(key => {
    localStorage.removeItem(key);
  });

  console.log('[Storage Migration] 已强制清理所有字段');
}

export function getStorageInfo() {
  const info = {
    keys: [],
    size: 0,
    hasToken: false,
    hasRefreshToken: false,
    hasUserId: false,
    legacyKeys: [],
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    info.keys.push(key);
    info.size += (key.length + value.length) * 2;

    if (key === 'token') info.hasToken = true;
    if (key === 'refreshToken') info.hasRefreshToken = true;
    if (key === 'userId') info.hasUserId = true;
    if (LEGACY_KEYS.includes(key) && !['token', 'refreshToken', 'userId'].includes(key)) {
      info.legacyKeys.push(key);
    }
  }

  info.sizeKB = (info.size / 1024).toFixed(2);

  return info;
}

export default {
  migrateLocalStorage,
  migrateTokenFormat,
  isStorageModern,
  forceCleanup,
  getStorageInfo,
};
