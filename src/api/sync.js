import request from '../utils/requestUtil';

export const syncAPI = {
  async createTask(data) {
    const res = await request.post('/sync/tasks', data);
    return res;
  },

  async updateTask(taskId, data) {
    const res = await request.patch(`/sync/tasks/${taskId}`, data);
    return res;
  },

  async deleteTask(taskId) {
    const res = await request.delete(`/sync/tasks/${taskId}`);
    return res;
  },

  async executeTask(taskId) {
    const res = await request.post(`/sync/tasks/${taskId}/execute`);
    return res;
  },

  /**
   * 获取数据源的数据库列表
   * @param {number|string} sourceId - 数据源ID
   * @returns {Promise}
   */
  async getDatabases(sourceId) {
    try {
      const res = await request.get(`/sync/sources/${sourceId}/databases`);
      if (res?.success) return res;
    } catch (_) {
      // fall through to datasource metadata api
    }
    // 回退到 datasource 正式接口，避免 sync 兼容路由异常导致页面不可用
    return request.get(`/datasources/${sourceId}/databases`);
  },

  /**
   * 获取数据库的表列表
   * @param {number|string} sourceId - 数据源ID
   * @param {string} database - 数据库名称
   * @returns {Promise}
   */
  async getTables(sourceId, database) {
    const db = encodeURIComponent(database || '');
    try {
      const res = await request.get(`/sync/sources/${sourceId}/databases/${db}/tables`);
      if (res?.success) return res;
    } catch (_) {
      // fall through to datasource metadata api
    }
    return request.get(`/datasources/${sourceId}/tables`, {
      params: { database }
    });
  },

  /**
   * 获取表的列信息
   * @param {number|string} sourceId - 数据源ID
   * @param {string} database - 数据库名称
   * @param {string} table - 表名
   * @returns {Promise}
   */
  async getTableColumns(sourceId, database, table) {
    const db = encodeURIComponent(database || '');
    const tb = encodeURIComponent(table || '');
    try {
      const res = await request.get(`/sync/sources/${sourceId}/databases/${db}/tables/${tb}/columns`);
      if (res?.success) return res;
    } catch (_) {
      // fall through to datasource metadata api
    }
    return request.get(`/datasources/${sourceId}/table-structure`, {
      params: { database, table }
    });
  },

  /**
   * 预览同步数据
   * @param {Object} params - 同步参数
   * @param {number|string} params.sourceId - 源数据源ID
   * @param {string} params.sourceDatabase - 源数据库
   * @param {string} params.sourceTable - 源表
   * @param {number|string} params.targetId - 目标数据源ID
   * @param {string} params.targetDatabase - 目标数据库
   * @param {string} params.targetTable - 目标表
   * @returns {Promise}
   */
  async previewSync(params) {
    const res = await request.post('/sync/preview', params);
    return res;
  },

  /**
   * 执行数据同步
   * @param {Object} params - 同步参数
   * @param {number|string} params.sourceId - 源数据源ID
   * @param {string} params.sourceDatabase - 源数据库
   * @param {string} params.sourceTable - 源表
   * @param {number|string} params.targetId - 目标数据源ID
   * @param {string} params.targetDatabase - 目标数据库
   * @param {string} params.targetTable - 目标表
   * @param {Object} params.columnMapping - 列映射关系
   * @param {string} params.syncMode - 同步模式 (full/incremental)
   * @returns {Promise}
   */
  async executeSync(params) {
    const res = await request.post('/sync/execute', params);
    return res;
  },

  /**
   * 获取同步任务列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise}
   */
  async getSyncTasks(params = {}) {
    const res = await request.get('/sync/tasks', { params });
    return res;
  },

  /**
   * 获取同步任务详情
   * @param {number|string} taskId - 任务ID
   * @returns {Promise}
   */
  async getSyncTaskDetail(taskId) {
    const res = await request.get(`/sync/tasks/${taskId}`);
    return res;
  },

  /**
   * 取消同步任务
   * @param {number|string} taskId - 任务ID
   * @returns {Promise}
   */
  async cancelSyncTask(taskId) {
    const res = await request.post(`/sync/tasks/${taskId}/cancel`);
    return res;
  },

  /**
   * 重试同步任务
   * @param {number|string} taskId - 任务ID
   * @returns {Promise}
   */
  async retrySyncTask(taskId) {
    const res = await request.post(`/sync/tasks/${taskId}/retry`);
    return res;
  }
};

export default syncAPI;
