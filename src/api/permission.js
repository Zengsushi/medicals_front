import request from '../utils/requestUtil';

export const permissionAPI = {
  /**
   * 获取所有权限列表
   */
  async getAllPermissions() {
    return await request.get('/permissions');
  },

  /**
   * 获取权限详情
   */
  async getPermissionDetail(permissionId) {
    return await request.get(`/permissions/${permissionId}`);
  },

  /**
   * 创建权限
   */
  async createPermission(permissionData) {
    return await request.post('/permissions', permissionData);
  },

  /**
   * 更新权限
   */
  async updatePermission(permissionId, permissionData) {
    return await request.patch(`/permissions/${permissionId}`, permissionData);
  },

  /**
   * 删除权限
   */
  async deletePermission(permissionId) {
    return await request.delete(`/permissions/${permissionId}`);
  },

  /**
   * 启用/禁用权限
   */
  async togglePermission(permissionId) {
    return await request.patch(`/permissions/${permissionId}/toggle`);
  },

  /**
   * 批量删除权限
   */
  async batchDeletePermissions(permissionIds) {
    return await request.delete('/permissions/batch', { data: { ids: permissionIds } });
  },

  /**
   * 按模块获取权限
   */
  async getPermissionsByModule(module) {
    return await request.get('/permissions/module', { params: { module } });
  },

  /**
   * 获取用户权限
   */
  async getUserPermissions(userId) {
    return await request.get(`/users/${userId}/permissions`);
  },

  /**
   * 分配用户权限
   */
  async assignUserPermissions(userId, permissions) {
    return await request.post(`/users/${userId}/permissions`, { permissions });
  },

  /**
   * 获取角色权限
   */
  async getRolePermissions(roleId) {
    return await request.get(`/roles/${roleId}/permissions`);
  },

  /**
   * 分配角色权限
   */
  async assignRolePermissions(roleId, permissions) {
    return await request.post(`/roles/${roleId}/permissions`, { permissions });
  },

  /**
   * 获取权限树
   */
  async getPermissionTree() {
    return await request.get('/permissions/tree');
  },

  /**
   * 权限搜索
   */
  async searchPermissions(keyword) {
    return await request.get('/permissions/search', { params: { keyword } });
  },

  /**
   * 导出权限
   */
  async exportPermissions() {
    return await request.get('/permissions/export', { responseType: 'blob' });
  },

  /**
   * 导入权限
   */
  async importPermissions(file) {
    const formData = new FormData();
    formData.append('file', file);
    return await request.post('/permissions/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export default permissionAPI;
