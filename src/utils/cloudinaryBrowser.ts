/**
 * 浏览器端安全的Cloudinary服务
 * 结合官方SDK的URL生成功能和unsigned上传
 */
import axios from 'axios'

export interface CloudinaryUploadResult {
  success: boolean
  url?: string
  publicId?: string
  thumbnailUrl?: string
  error?: string
}

export interface CloudinaryConfig {
  cloudName: string
  uploadPreset: string
  apiKey?: string // 仅用于URL生成，不会暴露
}

export class CloudinaryBrowserService {
  private static config: CloudinaryConfig = {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
    apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY
  }

  /**
   * 验证Cloudinary配置是否完整
   */
  static validateConfig(): boolean {
    return !!(this.config.cloudName && this.config.uploadPreset)
  }

  /**
   * 获取Cloudinary上传URL
   */
  private static getUploadUrl(): string {
    return `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`
  }

  /**
   * 上传图片到Cloudinary（使用unsigned preset，安全）
   * @param file 要上传的图片文件
   * @param onProgress 上传进度回调函数
   */
  static async uploadImage(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<CloudinaryUploadResult> {
    console.log('🔵 [Cloudinary] 开始上传图片:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    try {
      // 验证配置
      if (!this.validateConfig()) {
        console.log('❌ [Cloudinary] 配置验证失败')
        return {
          success: false,
          error: 'Cloudinary配置不完整，请检查环境变量'
        }
      }

      console.log('✅ [Cloudinary] 配置验证通过:', {
        cloudName: this.config.cloudName,
        uploadPreset: this.config.uploadPreset
      })

      // 创建FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', this.config.uploadPreset)

      // 可选参数
      formData.append('folder', 'meme-manager')
      formData.append('quality', 'auto')
      formData.append('fetch_format', 'auto')

      console.log('📤 [Cloudinary] 发送上传请求到:', this.getUploadUrl())

      // 发送上传请求
      const response = await axios.post(this.getUploadUrl(), formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            console.log(`📊 [Cloudinary] 上传进度: ${progress}%`)
            onProgress(progress)
          }
        },
        timeout: 30000
      })

      console.log('✅ [Cloudinary] 上传成功:', {
        publicId: response.data.public_id,
        secureUrl: response.data.secure_url,
        format: response.data.format,
        bytes: response.data.bytes
      })

      // 生成缩略图URL
      const thumbnailUrl = this.generateThumbnailUrl(response.data.public_id)
      console.log('🖼️ [Cloudinary] 生成缩略图URL:', thumbnailUrl)

      return {
        success: true,
        url: response.data.secure_url,
        publicId: response.data.public_id,
        thumbnailUrl
      }

    } catch (error: any) {
      console.error('Cloudinary上传失败:', error)

      let errorMessage = '上传失败'

      if (error.response) {
        errorMessage = error.response.data?.error?.message ||
                      `上传失败: ${error.response.status}`
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '上传超时，请检查网络连接'
      } else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 批量上传图片
   */
  static async uploadImages(
    files: File[],
    onProgress?: (completed: number, total: number) => void,
    onSingleProgress?: (fileIndex: number, progress: number) => void
  ): Promise<CloudinaryUploadResult[]> {
    const results: CloudinaryUploadResult[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      const result = await this.uploadImage(file, (progress) => {
        onSingleProgress?.(i, progress)
      })

      results.push(result)
      onProgress?.(i + 1, files.length)
    }

    return results
  }

  /**
   * 生成图片变换URL
   * @param publicId 图片的public_id
   * @param transformations 变换参数字符串
   */
  static generateTransformUrl(publicId: string, transformations: string = ''): string {
    const baseUrl = `https://res.cloudinary.com/${this.config.cloudName}/image/upload`

    if (transformations) {
      return `${baseUrl}/${transformations}/${publicId}`
    }

    return `${baseUrl}/${publicId}`
  }

  /**
   * 生成缩略图URL
   */
  static generateThumbnailUrl(publicId: string, width: number = 200, height: number = 200): string {
    return this.generateTransformUrl(publicId, `w_${width},h_${height},c_fill,q_auto,f_auto`)
  }

  /**
   * 生成不同尺寸的响应式图片URL
   */
  static generateResponsiveUrls(publicId: string): { [key: string]: string } {
    return {
      thumbnail: this.generateThumbnailUrl(publicId, 150, 150),
      small: this.generateTransformUrl(publicId, 'w_300,q_auto,f_auto'),
      medium: this.generateTransformUrl(publicId, 'w_600,q_auto,f_auto'),
      large: this.generateTransformUrl(publicId, 'w_1200,q_auto,f_auto'),
      original: this.generateTransformUrl(publicId, 'q_auto,f_auto')
    }
  }

  /**
   * 删除图片（注意：需要signed API调用，通常在后端实现）
   */
  static async deleteImage(publicId: string): Promise<boolean> {
    console.warn('删除操作需要在后端实现，当前仅为前端预留接口', publicId)
    return false
  }
}