import request from '../utils/requestUtil';

export const requestUtil = request;

export const request = {
  get: (url, params, config) => request({ url, method: 'get', params, ...config }),
  post: (url, data, config) => request({ url, method: 'post', data, ...config }),
  put: (url, data, config) => request({ url, method: 'put', data, ...config }),
  delete: (url, params, config) => request({ url, method: 'delete', params, ...config }),
  patch: (url, data, config) => request({ url, method: 'patch', data, ...config })
};

export { createDownloadRequest } from '../utils/requestUtil';
