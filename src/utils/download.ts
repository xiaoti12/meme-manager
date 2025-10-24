/**
 * 图片下载工具函数
 * 支持 Cloudinary、Base64 和普通 URL 的图片下载
 */

/**
 * 从 Base64 字符串提取 MIME 类型
 * @param base64String Base64 字符串
 * @returns MIME 类型和扩展名
 */
function extractBase64Info(base64String: string): { mimeType: string; extension: string } {
  const match = base64String.match(/^data:([^;]+);base64,/)

  if (match && match[1]) {
    const mimeType = match[1]
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg'
    }

    return {
      mimeType,
      extension: extensionMap[mimeType] || 'jpg'
    }
  }

  // 默认值
  return {
    mimeType: 'image/jpeg',
    extension: 'jpg'
  }
}

/**
 * 将 Base64 字符串转换为 Blob
 * @param base64String Base64 字符串
 * @returns Blob 对象
 */
function base64ToBlob(base64String: string): Blob {
  // 移除 data URI 前缀
  const base64Data = base64String.split(',')[1] || base64String

  // 解码 Base64
  const binaryString = atob(base64Data)
  const len = binaryString.length
  const bytes = new Uint8Array(len)

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // 提取 MIME 类型
  const { mimeType } = extractBase64Info(base64String)

  return new Blob([bytes], { type: mimeType })
}

/**
 * 确保文件名有正确的扩展名
 * @param filename 原始文件名
 * @param extension 期望的扩展名
 * @returns 带正确扩展名的文件名
 */
function ensureExtension(filename: string, extension: string): string {
  // 移除可能存在的扩展名
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')

  // 添加新扩展名
  return `${nameWithoutExt}.${extension}`
}

/**
 * 下载图片到本地
 * @param imageUrl 图片 URL (支持 Cloudinary、Base64 和普通 URL)
 * @param filename 保存的文件名
 * @returns Promise<boolean> 下载是否成功
 */
export async function downloadImage(imageUrl: string, filename: string): Promise<boolean> {
  try {
    let blob: Blob
    let finalFilename = filename

    // 判断是否为 Base64 图片
    if (imageUrl.startsWith('data:image/')) {
      console.log('检测到 Base64 图片,直接转换下载')
      blob = base64ToBlob(imageUrl)

      // 确保文件名有正确的扩展名
      const { extension } = extractBase64Info(imageUrl)
      finalFilename = ensureExtension(filename, extension)
    } else {
      // 普通 URL 或 Cloudinary URL
      console.log('通过 fetch 获取图片:', imageUrl)

      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit'
      })

      if (!response.ok) {
        throw new Error(`无法获取图片 (HTTP ${response.status})`)
      }

      blob = await response.blob()

      // 确保文件名有正确的扩展名
      const mimeType = blob.type
      if (mimeType && mimeType.startsWith('image/')) {
        const extension = mimeType.split('/')[1].replace('jpeg', 'jpg')
        finalFilename = ensureExtension(filename, extension)
      }
    }

    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = finalFilename

    // 触发下载
    // 在某些移动浏览器中,需要将链接添加到 DOM 才能触发下载
    document.body.appendChild(link)
    link.click()

    // 清理
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)

    console.log('下载成功:', finalFilename)
    return true
  } catch (error) {
    console.error('下载图片失败:', error)

    // 尝试备用方案:在新标签页打开图片
    if (!imageUrl.startsWith('data:image/')) {
      console.log('尝试备用方案:在新标签页打开图片')
      try {
        window.open(imageUrl, '_blank')
        return true
      } catch (openError) {
        console.error('备用方案也失败了:', openError)
      }
    }

    throw error
  }
}

/**
 * 批量下载图片
 * @param images 图片数组 { url, filename }
 * @param delay 每次下载之间的延迟(毫秒),默认 500ms
 * @returns Promise<{ success: number; failed: number }>
 */
export async function downloadMultipleImages(
  images: Array<{ url: string; filename: string }>,
  delay: number = 500
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (let i = 0; i < images.length; i++) {
    const image = images[i]

    try {
      await downloadImage(image.url, image.filename)
      success++

      // 添加延迟,避免同时触发太多下载
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    } catch (error) {
      console.error(`下载 ${image.filename} 失败:`, error)
      failed++
    }
  }

  return { success, failed }
}

/**
 * 检查浏览器是否支持下载功能
 * @returns 是否支持下载
 */
export function checkDownloadSupport(): boolean {
  // 检查是否支持创建 <a> 元素和 download 属性
  const a = document.createElement('a')
  return typeof a.download !== 'undefined'
}
