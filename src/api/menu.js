import request from '../utils/requestUtil';

export const menuAPI = {
  /**
   * 获取用户菜单树
   */
  async getUserMenus() {
    return await request.get('/menus');
  },

  /**
   * 获取完整菜单树(管理用)
   */
  async getFullMenuTree() {
    return await request.get('/menus/tree');
  },

  /**
   * 获取菜单详情
   */
  async getMenuDetail(menuId) {
    return await request.get(`/menus/${menuId}`);
  },

  /**
   * 创建菜单
   */
  async createMenu(menuData) {
    return await request.post('/menus', menuData);
  },

  /**
   * 更新菜单
   */
  async updateMenu(menuId, menuData) {
    return await request.patch(`/menus/${menuId}`, menuData);
  },

  /**
   * 删除菜单
   */
  async deleteMenu(menuId) {
    return await request.delete(`/menus/${menuId}`);
  },

  /**
   * 启用/禁用菜单
   */
  async toggleMenu(menuId) {
    return await request.patch(`/menus/${menuId}/toggle`);
  },

  /**
   * 获取所有权限列表
   */
  async getAllPermissions() {
    return await request.get('/menus/permissions/all');
  },

  /**
   * 创建权限
   */
  async createPermission(permissionData) {
    return await request.post('/menus/permissions', permissionData);
  },

  /**
   * 更新权限
   */
  async updatePermission(permissionId, permissionData) {
    return await request.patch(`/menus/permissions/${permissionId}`, permissionData);
  },

  /**
   * 删除权限
   */
  async deletePermission(permissionId) {
    return await request.delete(`/menus/permissions/${permissionId}`);
  },

  /**
   * 批量更新菜单
   */
  async batchUpdateMenus(menuIds, menuData) {
    // 构建批量更新请求数据
    const batchData = {
      menu_ids: menuIds
    };
    
    // 只添加非空的字段
    if (menuData.is_active !== null) {
      batchData.is_active = menuData.is_active;
    }
    if (menuData.position !== null) {
      batchData.position = menuData.position;
    }
    if (menuData.is_folder !== null) {
      batchData.is_folder = menuData.is_folder;
    }
    if (menuData.is_cached !== null) {
      batchData.is_cached = menuData.is_cached;
    }
    if (menuData.permission_code !== null) {
      batchData.permission_code = menuData.permission_code;
    }
    // 确保即使 parent_id 为 null 也会包含在请求中，这样才能将菜单设置为顶级菜单
    if (menuData.parent_id !== undefined) {
      batchData.parent_id = menuData.parent_id;
    }
    
    return await request.patch('/menus/batch', batchData);
  }
};

export default menuAPI;
