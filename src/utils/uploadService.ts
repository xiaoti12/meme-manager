import { CloudinaryBrowserService } from './cloudinaryBrowser'
import { OCRService } from './ocr'
import { AIVisionService } from './ai'
import type { MemeData, CategoryType } from '@/types'

export interface ProcessingProgress {
  stage: 'uploading' | 'ocr' | 'ai' | 'saving' | 'completed' | 'error'
  progress: number
  message: string
}

export interface UploadResult {
  success: boolean
  memeData?: MemeData
  error?: string
}

type ProgressCallback = (progress: ProcessingProgress) => void

/**
 * 完整的上传服务类
 * 集成图片上传、OCR识别、AI分析等功能
 */
export class UploadService {

  /**
   * 完整处理单个文件的上传流程
   * @param file 图片文件
   * @param category 分类
   * @param onProgress 进度回调
   * @param useRealServices 是否使用真实的外部服务（默认false使用模拟）
   */
  static async processFile(
    file: File,
    category: CategoryType,
    onProgress?: ProgressCallback,
    useRealServices: boolean = false
  ): Promise<UploadResult> {
    try {
      // 阶段1: 上传图片到Cloudinary
      onProgress?.({
        stage: 'uploading',
        progress: 10,
        message: '正在上传图片到云端...'
      })

      let imageUrl = ''
      let cloudinaryId = ''

      if (useRealServices && CloudinaryBrowserService.validateConfig()) {
        // 使用真实的Cloudinary服务
        const uploadResult = await CloudinaryBrowserService.uploadImage(file, (progress) => {
          onProgress?.({
            stage: 'uploading',
            progress: 10 + (progress * 0.3), // 上传占10-40%进度
            message: `上传进度: ${progress}%`
          })
        })

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || '图片上传失败')
        }

        imageUrl = uploadResult.url!
        cloudinaryId = uploadResult.publicId!
      } else {
        // 使用本地预览（开发模式）
        imageUrl = URL.createObjectURL(file)
        // 模拟上传延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      onProgress?.({
        stage: 'uploading',
        progress: 40,
        message: '图片上传完成'
      })

      // 阶段2: OCR文字识别
      onProgress?.({
        stage: 'ocr',
        progress: 50,
        message: '正在识别图片中的文字...'
      })

      const ocrResult = useRealServices ?
        await OCRService.recognizeText(file) :
        await OCRService.mockRecognize(file)

      onProgress?.({
        stage: 'ocr',
        progress: 70,
        message: 'OCR识别完成'
      })

      // 阶段3: AI内容分析
      onProgress?.({
        stage: 'ai',
        progress: 80,
        message: '正在进行AI图片内容分析...'
      })

      const aiResult = useRealServices ?
        await AIVisionService.describeImage(file) :
        await AIVisionService.mockDescribe(file)

      onProgress?.({
        stage: 'ai',
        progress: 90,
        message: 'AI分析完成'
      })

      // 阶段4: 保存数据
      onProgress?.({
        stage: 'saving',
        progress: 95,
        message: '正在保存数据...'
      })

      const memeData: MemeData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        filename: file.name,
        imageUrl,
        category,
        ocrText: ocrResult.text,
        aiDescription: aiResult.description,
        uploadDate: new Date(),
        fileSize: file.size,
        format: file.type.split('/')[1],
        cloudinaryId: cloudinaryId || undefined
      }

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: '处理完成！'
      })

      return {
        success: true,
        memeData
      }

    } catch (error) {
      console.error('文件处理失败:', error)

      onProgress?.({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : '处理失败'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 批量处理多个文件
   * @param files 文件数组
   * @param category 分类
   * @param onOverallProgress 整体进度回调
   * @param onFileProgress 单个文件进度回调
   * @param useRealServices 是否使用真实的外部服务
   */
  static async processFiles(
    files: File[],
    category: CategoryType,
    onOverallProgress?: (completed: number, total: number) => void,
    onFileProgress?: (fileIndex: number, progress: ProcessingProgress) => void,
    useRealServices: boolean = false
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      const result = await this.processFile(
        file,
        category,
        (progress) => {
          onFileProgress?.(i, progress)
        },
        useRealServices
      )

      results.push(result)
      onOverallProgress?.(i + 1, files.length)
    }

    return results
  }

  /**
   * 检查是否可以使用真实服务
   */
  static canUseRealServices(): {
    cloudinary: boolean
    huggingFace: boolean
    overall: boolean
  } {
    const cloudinary = CloudinaryBrowserService.validateConfig()
    const huggingFace = !!(import.meta.env.VITE_HF_TOKEN)

    return {
      cloudinary,
      huggingFace,
      overall: cloudinary && huggingFace
    }
  }

  /**
   * 获取服务状态信息
   */
  static getServiceStatus(): {
    cloudinary: string
    huggingFace: string
    ocr: string
  } {
    const status = this.canUseRealServices()

    return {
      cloudinary: status.cloudinary ? '已配置' : '未配置（将使用本地预览）',
      huggingFace: status.huggingFace ? '已配置' : '未配置（将使用模拟分析）',
      ocr: 'Tesseract.js 已就绪'
    }
  }
}