import request from '../utils/requestUtil';

export function login(data) {
  return request({
    url: '/login',
    method: 'post',
    data
  });
}

export function logout() {
  return request({
    url: '/logout',
    method: 'post'
  });
}

export function getUserInfo() {
  return request({
    url: '/user/info',
    method: 'get'
  });
}

export function getUserPermissions() {
  return request({
    url: '/user/permissions',
    method: 'get'
  });
}

export function getUserMenus() {
  return request({
    url: '/user/menus',
    method: 'get'
  });
}

export function refreshPermissions() {
  return request({
    url: '/user/refresh',
    method: 'get'
  });
}

export function getRoles() {
  return request({
    url: '/roles',
    method: 'get'
  });
}

export function getRoleDetail(roleId) {
  return request({
    url: `/roles/${roleId}`,
    method: 'get'
  });
}

export function getPermissions() {
  return request({
    url: '/permissions',
    method: 'get'
  });
}

export function getMenus() {
  return request({
    url: '/menus',
    method: 'get'
  });
}

export function getMenuTree() {
  return request({
    url: '/menus/tree',
    method: 'get'
  });
}

export function getMenuDetail(menuId) {
  return request({
    url: `/menus/${menuId}`,
    method: 'get'
  });
}

export function createMenu(data) {
  return request({
    url: '/menus',
    method: 'post',
    data
  });
}

export function updateMenu(menuId, data) {
  return request({
    url: `/menus/${menuId}`,
    method: 'patch',
    data
  });
}

export function deleteMenu(menuId) {
  return request({
    url: `/menus/${menuId}`,
    method: 'delete'
  });
}
