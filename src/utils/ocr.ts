// OCR服务 - 使用 Tesseract.js
// 根据开发文档的推荐配置

interface OCRResult {
  text: string
  confidence: number
  success: boolean
  error?: string
}

export class OCRService {
  private static worker: any = null

  /**
   * 初始化OCR工作器
   */
  private static async initWorker() {
    if (this.worker) return this.worker

    try {
      // 动态导入Tesseract.js以避免SSR问题
      const Tesseract = await import('tesseract.js')

      this.worker = await Tesseract.createWorker('chi_sim+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR进度: ${(m.progress * 100).toFixed(1)}%`)
          }
        }
      })

      return this.worker
    } catch (error) {
      console.error('OCR初始化失败:', error)
      throw new Error('OCR服务初始化失败')
    }
  }

  /**
   * 识别图片中的文字
   * @param imageFile 图片文件
   * @returns OCR识别结果
   */
  static async recognizeText(imageFile: File): Promise<OCRResult> {
    try {
      const worker = await this.initWorker()

      const { data } = await worker.recognize(imageFile, {
        rectangle: undefined, // 识别整个图片
      })

      return {
        text: data.text.trim(),
        confidence: data.confidence,
        success: true
      }
    } catch (error) {
      console.error('OCR识别失败:', error)
      return {
        text: '',
        confidence: 0,
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 批量识别多个图片
   * @param imageFiles 图片文件数组
   * @returns OCR识别结果数组
   */
  static async recognizeMultiple(imageFiles: File[]): Promise<OCRResult[]> {
    const results: OCRResult[] = []

    for (const file of imageFiles) {
      const result = await this.recognizeText(file)
      results.push(result)
    }

    return results
  }

  /**
   * 清理OCR工作器资源
   */
  static async cleanup() {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }

  /**
   * 模拟OCR识别（开发阶段使用）
   * @param imageFile 图片文件
   * @returns 模拟的OCR结果
   */
  static async mockRecognize(imageFile: File): Promise<OCRResult> {
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // 根据文件名生成模拟结果
    const filename = imageFile.name.toLowerCase()
    let mockText = ''

    if (filename.includes('开心') || filename.includes('笑')) {
      mockText = '哈哈哈'
    } else if (filename.includes('哭') || filename.includes('泪')) {
      mockText = '呜呜呜'
    } else if (filename.includes('惊讶')) {
      mockText = '什么?!'
    } else if (filename.includes('动漫') || filename.includes('anime')) {
      mockText = '呀~'
    } else {
      // 随机生成一些常见的表情包文字
      const mockTexts = [
        '哈哈哈', '呜呜呜', '什么？', '太好了！', '不可能！',
        '我去！', '牛逼！', '真的吗', '厉害了', '666',
        '救命', '完了', '绝了', '太难了', '不行了'
      ]
      mockText = mockTexts[Math.floor(Math.random() * mockTexts.length)]
    }

    return {
      text: mockText,
      confidence: 0.8 + Math.random() * 0.15, // 模拟80-95%的置信度
      success: true
    }
  }
}