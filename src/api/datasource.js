import request from '../utils/requestUtil';

export const datasourceAPI = {
  /**
   * 获取数据源列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise}
   */
  async getDataSourceList(params = {}) {
    const res = await request.get('/datasources', { params });
    return res;
  },

  /**
   * 获取数据源统计信息
   * @returns {Promise}
   */
  async getDataSourceStats() {
    const res = await request.get('/datasources/stats');
    return res;
  },

  /**
   * 获取数据源详情
   * @param {string|number} id - 数据源ID
   * @returns {Promise}
   */
  async getDataSourceDetail(id) {
    const res = await request.get(`/datasources/${id}`);
    return res;
  },

  /**
   * 创建数据源
   * @param {Object} data - 数据源数据
   * @param {string} data.name - 数据源名称
   * @param {string} data.dbType - 数据库类型
   * @param {string} data.host - 主机地址
   * @param {number} data.port - 端口
   * @param {string} data.database - 数据库名称
   * @param {string} data.username - 用户名
   * @param {string} data.password - 密码
   * @param {string} data.params - 连接参数
   * @param {boolean} data.isDefault - 是否默认
   * @returns {Promise}
   */
  async createDataSource(data) {
    const res = await request.post('/datasources', data);
    return res;
  },

  /**
   * 更新数据源
   * @param {string|number} id - 数据源ID
   * @param {Object} data - 数据源数据
   * @returns {Promise}
   */
  async updateDataSource(id, data) {
    const res = await request.patch(`/datasources/${id}`, data);
    return res;
  },

  /**
   * 删除数据源
   * @param {string|number} id - 数据源ID
   * @returns {Promise}
   */
  async deleteDataSource(id) {
    const res = await request.delete(`/datasources/${id}`);
    return res;
  },

  /**
   * 测试数据源连接
   * @param {Object} data - 数据源连接信息
   * @returns {Promise}
   */
  async testConnection(data) {
    const res = await request.post('/datasources/test-connection', data);
    return res;
  },

  /**
   * Hive 新增数据源时直接获取库列表
   * @param {Object} data - 连接参数（当前后端可忽略）
   * @returns {Promise}
   */
  async getHiveDatabases(data = {}) {
    const res = await request.post('/datasources/hive/databases', data);
    return res;
  },

  /**
   * 设为默认数据源
   * @param {string|number} id - 数据源ID
   * @returns {Promise}
   */
  async setDefault(id) {
    const res = await request.patch(`/datasources/${id}/set-default`);
    return res;
  },

  /**
   * 获取默认数据源
   * @returns {Promise}
   */
  async getDefaultDataSource() {
    const res = await request.get('/datasources/default');
    return res;
  },

  /**
   * 获取数据源的数据库列表
   * @param {string|number} sourceId - 数据源ID
   * @returns {Promise}
   */
  async getDatabases(sourceId) {
    const res = await request.get(`/datasources/${sourceId}/databases`);
    return res;
  },

  /**
   * 获取数据源指定数据库的表列表
   * @param {string|number} sourceId - 数据源ID
   * @param {string} database - 数据库名称（可选）
   * @returns {Promise}
   */
  async getTables(sourceId, database = null) {
    let url = `/datasources/${sourceId}/tables`;
    if (database) {
      url += `?database=${encodeURIComponent(database)}`;
    }
    const res = await request.get(url);
    return res;
  },

  /**
   * 获取表的结构信息（列定义）
   * @param {string|number} sourceId - 数据源ID
   * @param {Object} params - 查询参数
   * @param {string} params.database - 数据库名称
   * @param {string} params.table - 表名称
   * @returns {Promise}
   */
  async getTableStructure(sourceId, params) {
    const res = await request.get(`/datasources/${sourceId}/table-structure`, { params });
    return res;
  }
};

export default datasourceAPI;
