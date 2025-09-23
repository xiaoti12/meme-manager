/**
 * 将图片复制到剪贴板
 * @param imageUrl 图片URL
 * @param filename 文件名
 * @returns Promise<boolean> 复制是否成功
 */
export async function copyImageToClipboard(imageUrl: string, filename: string): Promise<boolean> {
  try {
    // 检查浏览器是否支持 Clipboard API
    if (!navigator.clipboard || !window.ClipboardItem) {
      throw new Error('浏览器不支持 Clipboard API')
    }

    // 获取图片blob
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error('无法获取图片')
    }

    const blob = await response.blob()

    // 检查是否为图片类型
    if (!blob.type.startsWith('image/')) {
      throw new Error('文件不是图片格式')
    }

    // 创建 ClipboardItem 并写入剪贴板
    const clipboardItem = new ClipboardItem({
      [blob.type]: blob
    })

    await navigator.clipboard.write([clipboardItem])
    return true
  } catch (error) {
    console.error('复制图片失败:', error)
    return false
  }
}