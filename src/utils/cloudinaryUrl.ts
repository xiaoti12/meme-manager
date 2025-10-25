/**
 * Cloudinary URL 工具函数
 * 用于处理 Cloudinary 图片 URL 的转换和优化
 */

/**
 * Cloudinary URL 格式正则表达式
 * 匹配格式: https://res.cloudinary.com/<cloud_name>/<asset_type>/<delivery_type>/<transformations>/<version>/<public_id_full_path>.<extension>
 * 或简化格式: https://res.cloudinary.com/<cloud_name>/image/upload/<public_id>
 */
const CLOUDINARY_URL_PATTERN = /^https:\/\/res\.cloudinary\.com\/([^\/]+)\/(image|video|raw)\/([^\/]+)\/(.*)/

/**
 * 判断 URL 是否为 Cloudinary URL
 * @param url 图片 URL
 * @returns 是否为 Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  if (!url) return false
  return CLOUDINARY_URL_PATTERN.test(url)
}

/**
 * 在 Cloudinary URL 中添加转换参数
 * @param url 原始 Cloudinary URL
 * @param transform 转换参数（如 'q_auto:low', 'w_300,h_300'）
 * @returns 添加了转换参数的 URL
 */
export function addCloudinaryTransform(url: string, transform: string): string {
  if (!url || !transform) return url

  // 检查是否为 Cloudinary URL
  if (!isCloudinaryUrl(url)) {
    return url
  }

  const match = url.match(CLOUDINARY_URL_PATTERN)
  if (!match) return url

  const [, cloudName, assetType, deliveryType, rest] = match

  // 构建新的 URL
  // 格式: https://res.cloudinary.com/<cloud_name>/<asset_type>/<delivery_type>/<transform>/<rest>
  return `https://res.cloudinary.com/${cloudName}/${assetType}/${deliveryType}/${transform}/${rest}`
}

/**
 * 获取优化后的低质量 URL（用于列表展示）
 * 添加 q_auto:low 参数以减少流量和提升加载速度
 * @param url 原始图片 URL
 * @returns 优化后的 URL
 */
export function getOptimizedUrl(url: string): string {
  if (!url) return url

  // 只处理 Cloudinary URL
  if (!isCloudinaryUrl(url)) {
    return url
  }

  // 添加低质量压缩参数
  return addCloudinaryTransform(url, 'q_auto:low')
}

/**
 * 获取原始高质量 URL
 * 如果 URL 中已经包含转换参数，返回不做处理
 * @param url 图片 URL
 * @returns 原始 URL
 */
export function getOriginalUrl(url: string): string {
  // 直接返回原始 URL，不做任何处理
  return url
}

/**
 * 从 Cloudinary URL 中提取 public_id
 * @param url Cloudinary URL
 * @returns public_id 或 null
 */
export function extractPublicId(url: string): string | null {
  if (!isCloudinaryUrl(url)) {
    return null
  }

  const match = url.match(CLOUDINARY_URL_PATTERN)
  if (!match) return null

  const rest = match[4]

  // rest 可能包含 version 和 public_id
  // 格式可能是: v1234567890/path/to/image.jpg 或直接 path/to/image.jpg

  // 移除 version 前缀（如果存在）
  const withoutVersion = rest.replace(/^v\d+\//, '')

  // 移除文件扩展名
  const publicId = withoutVersion.replace(/\.[^.]+$/, '')

  return publicId
}

/**
 * 为 MemeData 生成优化 URL
 * 如果是 Cloudinary URL，生成优化版本；否则返回原始 URL
 * @param imageUrl 原始图片 URL
 * @returns 优化后的 URL
 */
export function generateOptimizedUrlForMeme(imageUrl: string): string {
  return getOptimizedUrl(imageUrl)
}
