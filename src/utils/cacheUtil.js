// 缓存工具函数

/**
 * 缓存类
 */
class Cache {
  constructor() {
    this.cache = new Map();
    this.defaultExpiration = 5 * 60 * 1000; // 默认缓存过期时间：5分钟
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} expiration - 过期时间（毫秒）
   */
  set(key, value, expiration = this.defaultExpiration) {
    const item = {
      value,
      expiry: Date.now() + expiration,
    };
    this.cache.set(key, item);
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值或null
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 生成缓存键
   * @param {string} url - 请求URL
   * @param {object} params - 请求参数
   * @returns {string} 缓存键
   */
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${url}?${sortedParams}`;
  }
}

// 导出单例实例
const cache = new Cache();
export default cache;

// 缓存装饰器，用于API请求
/**
 * 缓存装饰器
 * @param {number} expiration - 过期时间（毫秒）
 * @returns {Function} 装饰器函数
 */
export function withCache(expiration) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args) {
      // 生成缓存键
      const url = args[0];
      const params = args[1] || {};
      const cacheKey = cache.generateKey(url, params);

      // 尝试从缓存获取
      const cachedValue = cache.get(cacheKey);
      if (cachedValue) {
        return cachedValue;
      }

      // 调用原始方法
      const result = await originalMethod.apply(this, args);

      // 缓存结果
      cache.set(cacheKey, result, expiration);
      return result;
    };
  };
}
