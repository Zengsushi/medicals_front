/**
 * 日期格式化工具
 */

/**
 * 格式化日期为标准格式（YYYY-MM-DD）
 * @param {string|Date|number} date - 日期值
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      return '';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('[dateUtil] 日期格式化失败:', error);
    return '';
  }
}

/**
 * 格式化日期时间为标准格式（YYYY-MM-DD HH:mm:ss）
 * @param {string|Date|number} date - 日期值
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDateTime(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      return '';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.warn('[dateUtil] 日期时间格式化失败:', error);
    return '';
  }
}

/**
 * 格式化日期为相对时间（如：今天、昨天、3天前）
 * @param {string|Date|number} date - 日期值
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    const now = new Date();
    
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      return '';
    }
    
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `${weeks}周前`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months}个月前`;
    } else {
      const years = Math.floor(days / 365);
      return `${years}年前`;
    }
  } catch (error) {
    console.warn('[dateUtil] 相对时间格式化失败:', error);
    return '';
  }
}

export default {
  formatDate,
  formatDateTime,
  formatRelativeTime
};
