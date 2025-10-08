/**
 * 检查浏览器是否支持图片复制功能
 */
export function checkImageCopySupport(): { supported: boolean; reason?: string } {
  if (!navigator.clipboard) {
    return { supported: false, reason: '浏览器不支持剪贴板API' }
  }

  if (!window.ClipboardItem) {
    return { supported: false, reason: '浏览器不支持ClipboardItem' }
  }

  // 检查是否支持PNG格式（这是最广泛支持的格式）
  try {
    // 创建一个小的测试blob来检查支持情况
    const testBlob = new Blob(['test'], { type: 'image/png' })
    new ClipboardItem({ 'image/png': testBlob })
    return { supported: true }
  } catch (error) {
    return { supported: false, reason: '浏览器不支持图片复制到剪贴板' }
  }
}

/**
 * 获取更友好的错误信息
 */
function getFriendlyErrorMessage(error: any): string {
  if (error.name === 'NotAllowedError') {
    return '浏览器禁止访问剪贴板，请检查网站权限设置'
  }

  if (error.name === 'NetworkError' || error.message.includes('fetch')) {
    return '图片加载失败，请检查网络连接'
  }

  if (error.message.includes('无法获取图片')) {
    return '图片地址无效或图片不存在'
  }

  if (error.message.includes('图片格式转换')) {
    return '图片格式转换失败，请重试'
  }

  if (error.message.includes('Canvas')) {
    return '浏览器不支持图片处理功能'
  }

  return error.message || '复制失败，请重试'
}

/**
 * 将图片复制到剪贴板
 * @param imageUrl 图片URL
 * @param filename 文件名
 * @returns Promise<boolean> 复制是否成功
 */
export async function copyImageToClipboard(imageUrl: string, filename: string): Promise<boolean> {
  try {
    // 检查浏览器支持情况
    const support = checkImageCopySupport()
    if (!support.supported) {
      throw new Error(support.reason || '浏览器不支持图片复制功能')
    }

    // 获取图片blob
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit'
    })

    if (!response.ok) {
      throw new Error(`无法获取图片 (${response.status})`)
    }

    const blob = await response.blob()

    // 检查是否为图片类型
    if (!blob.type.startsWith('image/')) {
      throw new Error('文件不是图片格式')
    }

    // 如果是 JPEG 格式，转换为 PNG 格式以获得更好的兼容性
    let finalBlob = blob
    let finalType = blob.type

    if (blob.type === 'image/jpeg' || blob.type === 'image/jpg') {
      try {
        finalBlob = await convertJpegToPng(blob)
        finalType = 'image/png'
      } catch (conversionError) {
        console.warn('JPEG转PNG失败，尝试使用原始格式:', conversionError)
        // 如果转换失败，尝试使用原始格式
        finalType = blob.type
      }
    }

    // 创建 ClipboardItem 并写入剪贴板
    const clipboardItem = new ClipboardItem({
      [finalType]: finalBlob
    })

    await navigator.clipboard.write([clipboardItem])
    return true
  } catch (error) {
    console.error('复制图片失败:', error)
    // 重新抛出带有友好信息的错误
    const friendlyError = new Error(getFriendlyErrorMessage(error))
    friendlyError.name = error.name
    friendlyError.stack = error.stack
    throw friendlyError
  }
}

/**
 * 将 JPEG 图片转换为 PNG 格式
 * @param jpegBlob JPEG 格式的 Blob
 * @returns Promise<Blob> PNG 格式的 Blob
 */
async function convertJpegToPng(jpegBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // 设置 canvas 尺寸与图片相同
      canvas.width = img.width
      canvas.height = img.height

      // 绘制图片到 canvas
      if (ctx) {
        ctx.drawImage(img, 0, 0)

        // 转换为 PNG 格式
        canvas.toBlob(
          (pngBlob) => {
            if (pngBlob) {
              resolve(pngBlob)
            } else {
              reject(new Error('图片格式转换失败'))
            }
          },
          'image/png',
          1.0 // 最高质量
        )
      } else {
        reject(new Error('无法创建 Canvas 上下文'))
      }

      // 清理对象 URL
      URL.revokeObjectURL(url)
    }

    img.onerror = () => {
      reject(new Error('图片加载失败'))
    }

    // 创建对象 URL 并设置图片源
    const url = URL.createObjectURL(jpegBlob)
    img.src = url
  })
}