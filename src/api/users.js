import { configConsumerProps } from 'ant-design-vue/es/config-provider';
import axios from 'axios';
import { errorMessages } from 'vue/compiler-sfc';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// 拦截器响应
// api.interceptors.response.use(
//     response => {
//         return response;
//     },
//     error => {
//         // 统一错误处理
//         console.log("响应错误:", error);

//         if (error.response?.status === 401){
//             setTimeout( () => {
//                 window.location.href = "/#/login"
//             },1000)
//         }
//         return Promise.reject(error)
//     }
// )

export const userAPI = {
  /**
   * 用户登录
   * @param {object} loginData - 登录表单数据
   * @param {string} loginData.username
   * @param {string} loginData.password
   * @returns {promise}
   */
  async login(loginData) {
    const res = await api.post('/login', loginData);
    return res.data;
  },

  /**
   * @param {string} token - 用户token
   * @returns {promise}
   * 用户退出登录
   */
  async logouts(token) {
    const res = await api.post('/logout');
    return res;
  },

  /**
   * 用户信息获取 (主动-获取当前登录用户详细信息)
   */
  async detail(token) {
    const res = await api.get('/user/info');
    return res.data;
  },

  /** 当前登录用户详情（与 /user/info 一致） */
  async getCurrentUser() {
    const res = await api.get('/user/info');
    return res.data;
  },

  /** 管理员更新指定用户 */
  async adminUpdateUser(id, form_data) {
    const res = await api.put(`/admin/user/${id}`, form_data);
    return res.data;
  },

  async avatar_upload(formData) {
    const res = await api.patch('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  async avatar_download(filename) {
    // TODO : 待优化
    const res = await api.get('/user/avatar/download', {
      auth: localStorage.getItem('token'),
      filename: filename
    });
  },

  /**
   *
   * @param { search , page , page_size } data
   * @returns
   */
  async get_user_list(data) {
    const res = await api.get('/user/list', { params: data });
    return res.data;
  },

  async create_user(form_data) {
    const res = await api.post('/user/register', form_data);
    return res.data;
  },

  async update_user(id, form_data) {
    const res = await api.post('/user/modification', { id, ...form_data });
    return res.data;
  },

  async delete_user(id) {
    const res = await api.patch('/user/delete/' + id);
    return res.data;
  },

  async update_user_status(id, is_active) {
    const res = await api.patch('/user/status/' + id, { is_active });
    return res.data;
  },

  async force_logout(id) {
    const res = await api.post('/user/force_logout/' + id);
    return res.data;
  },

  async update_user_permissions(id, payload) {
    const res = await api.patch('/user/permissions/' + id, payload);
    return res.data;
  },

  // 重置为默认密码 123456
  async reset_password(id) {
    const res = await api.post('/user/resetpasswd/' + id);
    return res.data;
  },

  async force_change_password(id, new_password) {
    const res = await api.post('/user/force-change-password/' + id, { new_password });
    return res.data;
  }
};

export { api as axiosInstence };
