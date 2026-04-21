import { defineStore } from 'pinia';
import request from '../utils/requestUtil';

export const useMenuStore = defineStore('menu', {
  state: () => ({
    menuTree: [],
    currentPath: '/',
    selectedKeys: [],
    expandedKeys: [],
    loading: false,
    _filteredCache: null,
    _flatCache: null,
    _lastFetchTime: 0,
    _cacheValidDuration: 5 * 60 * 1000
  }),

  getters: {
    visibleMenus: (state) => {
      return state.menuTree;
    },

    currentMenu: (state) => {
      const findMenu = (menus, path) => {
        for (const menu of menus) {
          if (menu.path === path) return menu;
          if (menu.children && menu.children.length > 0) {
            const found = findMenu(menu.children, path);
            if (found) return found;
          }
        }
        return null;
      };
      return findMenu(state.menuTree, state.currentPath);
    },

    flattenedMenus: (state) => {
      if (state._flatCache) {
        return state._flatCache;
      }

      const result = [];
      const flatten = (menus) => {
        for (const menu of menus) {
          result.push(menu);
          if (menu.children && menu.children.length > 0) {
            flatten(menu.children);
          }
        }
      };
      flatten(state.menuTree);
      state._flatCache = result;
      return result;
    },

    isCacheValid: (state) => {
      if (!state.menuTree || state.menuTree.length === 0) {
        return false;
      }
      const now = Date.now();
      return (now - state._lastFetchTime) < state._cacheValidDuration;
    }
  },

  actions: {
    normalizeMenuTree(menus = []) {
      const normalizePath = (path) => {
        if (path === '/data/sync') return '/database/sync';
        return path;
      };

      const walk = (nodes) => (nodes || []).map((node) => {
        const normalized = {
          ...node,
          path: normalizePath(node.path),
          children: walk(node.children || [])
        };
        return normalized;
      });

      return walk(menus);
    },

    SET_MENU_TREE(menus) {
      // 不过滤任何菜单项，确保所有菜单都能显示
      this.menuTree = this.normalizeMenuTree(menus || []);
      this._flatCache = null;
      this._filteredCache = null;
      this._lastFetchTime = Date.now();
    },

    SELECT_MENU(path) {
      this.currentPath = path;
      const keys = [];
      const findMenuPath = (menus, targetPath, parentKeys = []) => {
        for (const menu of menus) {
          if (menu.path === targetPath) {
            keys.push(...parentKeys, menu.path);
            return true;
          }
          if (menu.children && menu.children.length > 0) {
            if (findMenuPath(menu.children, targetPath, [...parentKeys, menu.path])) {
              return true;
            }
          }
        }
        return false;
      };
      findMenuPath(this.menuTree, path);
      this.selectedKeys = keys;
    },

    SET_EXPANDED_KEYS(keys) {
      this.expandedKeys = keys;
    },

    TOGGLE_EXPANDED(key) {
      const index = this.expandedKeys.indexOf(key);
      if (index > -1) {
        this.expandedKeys.splice(index, 1);
      } else {
        this.expandedKeys.push(key);
      }
    },

    SET_LOADING(loading) {
      this.loading = loading;
    },

    INVALIDATE_CACHE() {
      this._flatCache = null;
      this._filteredCache = null;
    },

    async FETCH_MENUS(forceRefresh = false) {
      if (!forceRefresh && this.isCacheValid && this.menuTree.length > 0) {
        return this.menuTree;
      }

      this.loading = true;
      try {
        const res = await request.get('/menus');
        if (res.success && res.code === 200) {
          this.SET_MENU_TREE(res.data?.menus || []);
        } else if (res.code === 401) {
          console.warn('菜单接口认证失败，可能需要重新登录');
        }
        return res.data?.menus || [];
      } catch (error) {
        console.error('获取菜单失败:', error);
        return [];
      } finally {
        this.loading = false;
      }
    },

    async FETCH_ADMIN_MENUS(forceRefresh = false) {
      if (!forceRefresh && this.isCacheValid && this.menuTree.length > 0) {
        return this.menuTree;
      }

      this.loading = true;
      try {
        console.log('[menuStore] 使用普通菜单接口...');
        const res = await request.get('/menus');
        console.log('[menuStore] 接口响应:', res);
        if (res.success && res.code === 200) {
          const menus = res.data?.menus || [];
          console.log('[menuStore] 解析到菜单数量:', menus.length);
          if (menus.length > 0) {
            this.SET_MENU_TREE(menus);
          } else if (this.menuTree.length > 0) {
            console.warn('[menuStore] 接口返回空菜单，保留现有菜单数据');
          }
        } else if (res.code === 401) {
          console.warn('菜单接口认证失败，可能需要重新登录');
        } else {
          console.warn('菜单接口返回异常:', res);
        }
        return this.menuTree;
      } catch (error) {
        console.error('获取菜单失败:', error);
        return this.menuTree;
      } finally {
        this.loading = false;
      }
    },

    selectMenu(path) {
      this.SELECT_MENU(path);
    },

    toggleExpanded(key) {
      this.TOGGLE_EXPANDED(key);
    },

    setExpandedKeys(keys) {
      this.SET_EXPANDED_KEYS(keys);
    },

    rebuildMenu(menus) {
      this.SET_MENU_TREE(menus);
    },

    clearMenu() {
      this.SET_MENU_TREE([]);
      this.selectedKeys = [];
      this.expandedKeys = [];
    },

    invalidateCache() {
      this.INVALIDATE_CACHE();
    }
  }
});

export default useMenuStore;