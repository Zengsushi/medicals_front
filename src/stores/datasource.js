import { defineStore } from 'pinia';
import datasourceAPI from '../api/datasource';

let dataSourceCache = null;
let cacheTime = 0;
const CACHE_DURATION = 30000;

export const useDataSourceStore = defineStore('datasource', {
  state: () => ({
    dataSources: [],
    loading: false,
    error: null,
    lastUpdated: null
  }),

  getters: {
    hiveSources: (state) => {
      return state.dataSources.filter(ds =>
        ds.db_type === 'hive' ||
        ds.dbType === 'hive' ||
        ds.type === 'hive' ||
        (ds.type || '').toLowerCase() === 'hive' ||
        (ds.db_type || '').toLowerCase().includes('hive') ||
        (ds.category || '').toLowerCase().includes('warehouse') ||
        ds.category === 'data_warehouse'
      );
    },

    mysqlSources: (state) => {
      return state.dataSources.filter(ds =>
        ds.db_type === 'mysql' ||
        ds.dbType === 'mysql' ||
        ds.type === 'mysql' ||
        (ds.type || '').toLowerCase() === 'mysql' ||
        (ds.db_type || '').toLowerCase().includes('mysql') ||
        ds.category === 'relational'
      );
    },

    allSources: (state) => {
      return state.dataSources;
    },

    getSourceById: (state) => (id) => {
      return state.dataSources.find(ds =>
        ds.id == id ||
        ds.id === id ||
        String(ds.id) === String(id)
      );
    },

    hasSources: (state) => {
      return state.dataSources.length > 0;
    }
  },

  actions: {
    async fetchDataSources(forceRefresh = false) {
      const now = Date.now();

      if (!forceRefresh && dataSourceCache && (now - cacheTime) < CACHE_DURATION) {
        if (this.dataSources.length > 0) {
          return this.dataSources;
        }
      }

      this.loading = true;
      this.error = null;

      try {
        console.log('[DataSourceStore] 开始加载数据源...');
        const res = await datasourceAPI.getDataSourceList({ pageSize: 1000 });

        if (!res) {
          console.warn('[DataSourceStore] API返回为空');
          return this.dataSources;
        }

        if (res.success && res.data) {
          let data = [];
          if (Array.isArray(res.data)) {
            data = res.data;
          } else if (Array.isArray(res.data.list)) {
            data = res.data.list;
          } else if (Array.isArray(res.data.items)) {
            data = res.data.items;
          } else if (Array.isArray(res.data.datasources)) {
            data = res.data.datasources;
          }

          this.dataSources = data.map((item, idx) => {
            console.log('[DataSourceStore] 处理数据项:', item)
            return {
              ...item,
              id: item.id || idx + 1,
              type: item.type || item.dbType || item.db_type || 'unknown',
              connected: item.connected ?? item.is_connected ?? true,
              latency: item.latency ?? null,
              created_at: item.created_at || item.createdAt || new Date().toISOString(),
              updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
              is_default: item.is_default || item.isDefault || false,
              is_active: item.is_active !== false
            }
          });

          dataSourceCache = this.dataSources;
          cacheTime = now;
          this.lastUpdated = now;

          console.log('[DataSourceStore] 加载成功，共', this.dataSources.length, '个数据源');
          return this.dataSources;
        } else if (res.success === false) {
          console.warn('[DataSourceStore] API返回success=false:', res.message);
          this.error = res.message || '数据加载失败';
          return this.dataSources;
        } else {
          console.warn('[DataSourceStore] API返回数据格式异常:', res);
          this.error = '数据格式异常';
          return this.dataSources;
        }
      } catch (error) {
        const errorMsg = error?.message || '';
        const errorCode = error?.code || error?.response?.status;

        if (errorCode === 401 || errorMsg.includes('401') || errorMsg.includes('unauthorized') || errorMsg.includes('登录')) {
          console.warn('[DataSourceStore] 用户未登录，跳过数据源加载');
          this.error = '未登录';
          return this.dataSources;
        }

        if (errorCode === 403 || errorMsg.includes('权限') || errorMsg.includes('permission')) {
          console.warn('[DataSourceStore] 权限不足，跳过数据源加载');
          this.error = '权限不足';
          return this.dataSources;
        }

        console.warn('[DataSourceStore] 加载失败:', errorMsg || error);
        this.error = errorMsg || '加载失败';
        return this.dataSources;
      } finally {
        this.loading = false;
      }
    },

    async refreshDataSources() {
      return this.fetchDataSources(true);
    },

    clearCache() {
      dataSourceCache = null;
      cacheTime = 0;
    },

    setDataSources(sources) {
      this.dataSources = sources || [];
      dataSourceCache = this.dataSources;
      cacheTime = Date.now();
    },

    addDataSource(source) {
      this.dataSources.push(source);
    },

    updateDataSource(id, updates) {
      const index = this.dataSources.findIndex(ds => ds.id === id);
      if (index !== -1) {
        this.dataSources[index] = { ...this.dataSources[index], ...updates };
      }
    },

    removeDataSource(id) {
      this.dataSources = this.dataSources.filter(ds => ds.id !== id);
    }
  }
});

export default useDataSourceStore;
