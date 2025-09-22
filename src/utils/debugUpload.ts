/**
 * 上传功能调试工具
 */
import { CloudinaryBrowserService } from './cloudinaryBrowser'
import { UploadService } from './uploadService'

export class DebugUpload {
  /**
   * 检查所有服务状态
   */
  static checkServiceStatus() {
    console.log('=== 服务状态检查 ===')

    // 检查环境变量
    console.log('环境变量:')
    console.log('  CLOUDINARY_CLOUD_NAME:', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '未配置')
    console.log('  CLOUDINARY_UPLOAD_PRESET:', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '未配置')
    console.log('  HF_TOKEN:', import.meta.env.VITE_HF_TOKEN ? '已配置' : '未配置')

    // 检查服务配置
    const serviceStatus = UploadService.getServiceStatus()
    console.log('\n服务状态:')
    console.log('  Cloudinary:', serviceStatus.cloudinary)
    console.log('  Hugging Face:', serviceStatus.huggingFace)
    console.log('  OCR:', serviceStatus.ocr)

    // 检查是否可以使用真实服务
    const canUseReal = UploadService.canUseRealServices()
    console.log('\n真实服务可用性:')
    console.log('  Cloudinary:', canUseReal.cloudinary)
    console.log('  Hugging Face:', canUseReal.huggingFace)
    console.log('  整体:', canUseReal.overall)

    return {
      serviceStatus,
      canUseReal
    }
  }

  /**
   * 清空localStorage数据
   */
  static clearStorageData() {
    localStorage.removeItem('memes')
    localStorage.removeItem('meme-settings')
    console.log('已清空localStorage数据')
  }

  /**
   * 测试图片上传流程
   */
  static async testUpload(file: File) {
    console.log('=== 测试上传流程 ===')
    console.log('文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    const status = this.checkServiceStatus()

    try {
      console.log('\n开始处理文件...')
      const result = await UploadService.processFile(
        file,
        'other',
        (progress) => {
          console.log(`进度: ${progress.stage} - ${progress.progress}% - ${progress.message}`)
        },
        status.canUseReal.overall
      )

      console.log('\n处理结果:', result)
      return result

    } catch (error) {
      console.error('上传测试失败:', error)
      throw error
    }
  }

  /**
   * 生成测试用的图片文件
   */
  static generateTestImageFile(): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200

      const ctx = canvas.getContext('2d')!

      // 绘制一个简单的测试图片
      ctx.fillStyle = '#FF6B6B'
      ctx.fillRect(0, 0, 200, 200)

      ctx.fillStyle = '#FFFFFF'
      ctx.font = '30px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('测试', 100, 100)
      ctx.fillText('图片', 100, 140)

      canvas.toBlob((blob) => {
        const file = new File([blob!], 'test-image.png', { type: 'image/png' })
        resolve(file)
      })
    })
  }
}

// 在开发环境下暴露到全局
if (import.meta.env.DEV) {
  ;(window as any).DebugUpload = DebugUpload
}