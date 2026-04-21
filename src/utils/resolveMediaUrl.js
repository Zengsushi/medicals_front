/**
 * 将后端返回的头像/静态资源路径转为浏览器可请求的 URL。
 * - 已是 data:/http(s): 则原样返回
 * - 以 /static 开头：走同源（开发环境由 Vite 代理到后端）
 */
export function resolveMediaUrl(src) {
  if (src == null || src === '') return ''
  let s = String(src).trim().replace(/\\/g, '/')
  if (!s) return ''
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s
  // 兼容 Windows 路径或写成 static/... 的存库形式
  if (s.startsWith('/')) return s
  if (s.startsWith('static/')) return `/${s}`
  if (s.startsWith('user_data/avatar/')) return `/static/${s}`
  return s
}
