// 图片处理工具类

export interface ImageInfo {
  width: number
  height: number
  format: string
  size: number
  aspectRatio: number
}

export interface ProcessedImage {
  originalFile: File
  thumbnailUrl: string
  previewUrl: string
  info: ImageInfo
}

export class ImageProcessor {
  /**
   * 获取图片基本信息
   * @param file 图片文件
   * @returns 图片信息
   */
  static async getImageInfo(file: File): Promise<ImageInfo> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        const info: ImageInfo = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: file.type.split('/')[1],
          size: file.size,
          aspectRatio: img.naturalWidth / img.naturalHeight
        }
        URL.revokeObjectURL(url)
        resolve(info)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('无法加载图片'))
      }

      img.src = url
    })
  }

  /**
   * 创建图片预览URL
   * @param file 图片文件
   * @returns 预览URL
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file)
  }

  /**
   * 生成缩略图
   * @param file 图片文件
   * @param maxWidth 最大宽度
   * @param maxHeight 最大高度
   * @param quality 压缩质量 (0-1)
   * @returns 缩略图Blob URL
   */
  static async generateThumbnail(
    file: File,
    maxWidth: number = 200,
    maxHeight: number = 200,
    quality: number = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'))
        return
      }

      img.onload = () => {
        // 计算缩略图尺寸
        let { width, height } = this.calculateThumbnailSize(
          img.naturalWidth,
          img.naturalHeight,
          maxWidth,
          maxHeight
        )

        canvas.width = width
        canvas.height = height

        // 绘制缩略图
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob)
              resolve(thumbnailUrl)
            } else {
              reject(new Error('缩略图生成失败'))
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * 计算缩略图尺寸（保持宽高比）
   * @param originalWidth 原始宽度
   * @param originalHeight 原始高度
   * @param maxWidth 最大宽度
   * @param maxHeight 最大高度
   * @returns 缩略图尺寸
   */
  private static calculateThumbnailSize(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight

    let width = maxWidth
    let height = maxHeight

    if (aspectRatio > 1) {
      // 横向图片
      height = width / aspectRatio
      if (height > maxHeight) {
        height = maxHeight
        width = height * aspectRatio
      }
    } else {
      // 纵向图片
      width = height * aspectRatio
      if (width > maxWidth) {
        width = maxWidth
        height = width / aspectRatio
      }
    }

    return { width, height }
  }

  /**
   * 验证图片文件
   * @param file 文件
   * @param maxSize 最大文件大小（字节）
   * @param allowedTypes 允许的文件类型
   * @returns 验证结果
   */
  static validateImage(
    file: File,
    maxSize: number = 10 * 1024 * 1024, // 默认10MB
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  ): { valid: boolean; error?: string } {
    // 检查文件类型
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的文件类型: ${file.type}。支持的类型: ${allowedTypes.join(', ')}`
      }
    }

    // 检查文件大小
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024)
      return {
        valid: false,
        error: `文件过大: ${(file.size / (1024 * 1024)).toFixed(1)}MB。最大允许: ${maxSizeMB}MB`
      }
    }

    return { valid: true }
  }

  /**
   * 处理图片文件（获取信息、生成缩略图等）
   * @param file 图片文件
   * @returns 处理后的图片数据
   */
  static async processImage(file: File): Promise<ProcessedImage> {
    try {
      // 验证文件
      const validation = this.validateImage(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // 获取图片信息
      const info = await this.getImageInfo(file)

      // 生成预览URL
      const previewUrl = this.createPreviewUrl(file)

      // 生成缩略图
      const thumbnailUrl = await this.generateThumbnail(file)

      return {
        originalFile: file,
        thumbnailUrl,
        previewUrl,
        info
      }
    } catch (error) {
      throw new Error(`图片处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 批量处理图片
   * @param files 图片文件数组
   * @returns 处理结果数组
   */
  static async processMultiple(files: File[]): Promise<ProcessedImage[]> {
    const results: ProcessedImage[] = []

    for (const file of files) {
      try {
        const processed = await this.processImage(file)
        results.push(processed)
      } catch (error) {
        console.error(`处理图片 ${file.name} 失败:`, error)
        // 继续处理其他文件
      }
    }

    return results
  }

  /**
   * 清理URL资源
   * @param urls URL数组
   */
  static cleanupUrls(urls: string[]): void {
    urls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    })
  }

  /**
   * 格式化文件大小
   * @param bytes 字节数
   * @returns 格式化的文件大小字符串
   */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * 判断是否为支持的图片格式
   * @param filename 文件名
   * @returns 是否为图片
   */
  static isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    return imageExtensions.includes(extension)
  }
}