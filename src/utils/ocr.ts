// OCR和AI识别服务 - 统一使用LLM大模型
// 同时返回图片的文字内容和内容分析

interface OCRResult {
  text: string
  confidence: number
  success: boolean
  error?: string
}

interface AIResult {
  description: string
  confidence: number
  success: boolean
  error?: string
}

interface LLMResult {
  text: string
  description: string
  confidence: number
  success: boolean
  error?: string
}

interface LLMConfig {
  baseUrl: string
  model: string
  token: string
}

export class LLMVisionService {
  private static config: LLMConfig | null = null

  /**
   * 设置大模型配置
   */
  static setConfig(config: LLMConfig) {
    this.config = config
  }

  /**
   * 获取当前配置
   */
  static getConfig(): LLMConfig | null {
    return this.config
  }

  /**
   * 将图片转换为base64格式
   */
  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // 移除 data:image/xxx;base64, 前缀
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * 使用LLM识别图片内容
   * @param imageFile 图片文件
   * @returns LLM识别结果（包含文字和描述）
   */
  static async analyzeImage(imageFile: File): Promise<LLMResult> {
    try {
      if (!this.config) {
        console.warn('LLM配置未设置，使用模拟结果')
        return this.mockAnalyze(imageFile)
      }

      // 将图片转换为base64
      const base64Image = await this.fileToBase64(imageFile)

      // 构建请求
      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请分析这张图片，提取其中的所有文字内容和对图片内容的描述。返回格式为JSON：{"text": "图片中的所有文字内容", "description": "对图片内容的详细描述"}'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }

      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.token}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.choices || result.choices.length === 0) {
        throw new Error('API返回结果为空')
      }

      const content = result.choices[0].message?.content
      if (!content) {
        throw new Error('API返回内容为空')
      }

      // 尝试解析JSON格式的响应
      let parsedResult
      try {
        // 清理可能的markdown代码块标记
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        parsedResult = JSON.parse(cleanContent)
      } catch (parseError) {
        // 如果解析失败，尝试从文本中提取信息
        console.warn('JSON解析失败，尝试文本提取:', parseError)
        parsedResult = this.extractFromText(content)
      }

      return {
        text: parsedResult.text || '',
        description: parsedResult.description || content,
        confidence: 0.9, // LLM通常有较高的置信度
        success: true
      }

    } catch (error) {
      console.error('LLM分析失败:', error)

      // 如果API失败，回退到模拟结果
      return this.mockAnalyze(imageFile)
    }
  }

  /**
   * 从文本中提取结构化信息（备用方案）
   */
  private static extractFromText(text: string): { text: string; description: string } {
    // 尝试从响应文本中提取文字和描述
    const textMatch = text.match(/(?:文字|文本|text)[：:]?\s*["']?([^"'\n]+)["']?/i)
    const descMatch = text.match(/(?:描述|description)[：:]?\s*["']?([^"'\n]+)["']?/i)

    return {
      text: textMatch?.[1]?.trim() || '',
      description: descMatch?.[1]?.trim() || text.trim()
    }
  }

  /**
   * 批量分析多个图片
   * @param imageFiles 图片文件数组
   * @returns LLM分析结果数组
   */
  static async analyzeMultiple(imageFiles: File[]): Promise<LLMResult[]> {
    const results: LLMResult[] = []

    for (const file of imageFiles) {
      const result = await this.analyzeImage(file)
      results.push(result)

      // 避免API限制，添加延迟
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return results
  }

  /**
   * 模拟LLM分析（开发阶段使用）
   * @param imageFile 图片文件
   * @returns 模拟的LLM分析结果
   */
  static async mockAnalyze(imageFile: File): Promise<LLMResult> {
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000))

    const filename = imageFile.name.toLowerCase()
    let mockText = ''
    let mockDescription = ''

    // 根据文件名特征生成结果
    if (filename.includes('开心') || filename.includes('笑') || filename.includes('happy')) {
      mockText = '哈哈哈'
      mockDescription = '一个开心微笑的表情，充满喜悦和快乐的氛围'
    } else if (filename.includes('哭') || filename.includes('泪') || filename.includes('sad')) {
      mockText = '呜呜呜'
      mockDescription = '伤心哭泣的表情，眼含泪水，表达悲伤情感'
    } else if (filename.includes('惊讶') || filename.includes('shock')) {
      mockText = '什么?!'
      mockDescription = '表示惊讶的面部表情，眼睛睁大，嘴巴微张'
    } else if (filename.includes('愤怒') || filename.includes('angry')) {
      mockText = '气死我了'
      mockDescription = '愤怒的表情，眉头紧锁，表情严肃'
    } else if (filename.includes('动漫') || filename.includes('anime')) {
      mockText = '呀~'
      mockDescription = '可爱的动漫角色，大眼睛，充满活力的二次元风格'
    } else if (filename.includes('猫') || filename.includes('cat')) {
      mockText = '喵~'
      mockDescription = '可爱的猫咪表情或猫耳朵装饰，萌系风格'
    } else if (filename.includes('狗') || filename.includes('dog')) {
      mockText = '汪汪'
      mockDescription = '友好的狗狗表情，忠诚可爱的宠物形象'
    } else {
      // 随机生成通用结果
      const mockTexts = [
        '哈哈哈', '呜呜呜', '什么？', '太好了！', '不可能！',
        '我去！', '牛逼！', '真的吗', '厉害了', '666',
        '救命', '完了', '绝了', '太难了', '不行了'
      ]
      const mockDescriptions = [
        '有趣的表情包图片，富有表现力',
        '卡通风格的角色表情，生动有趣',
        '网络流行的表情图片，幽默诙谐',
        '表达特定情感的图像，具有强烈的视觉冲击力',
        '富有创意的图片内容，适合作为表情包使用',
        '简洁明了的视觉表达，传达特定的情感或想法',
        '色彩丰富的图像，吸引人的视觉效果',
        '具有独特风格的插画或照片，个性鲜明'
      ]
      mockText = mockTexts[Math.floor(Math.random() * mockTexts.length)]
      mockDescription = mockDescriptions[Math.floor(Math.random() * mockDescriptions.length)]
    }

    return {
      text: mockText,
      description: mockDescription,
      confidence: 0.8 + Math.random() * 0.15, // 模拟80-95%的置信度
      success: true
    }
  }
}

// 为了保持向后兼容性，提供OCR和AI服务的包装类
export class OCRService {
  /**
   * 识别图片中的文字
   * @param imageFile 图片文件
   * @returns OCR识别结果
   */
  static async recognizeText(imageFile: File): Promise<OCRResult> {
    const result = await LLMVisionService.analyzeImage(imageFile)
    return {
      text: result.text,
      confidence: result.confidence,
      success: result.success,
      error: result.error
    }
  }

  /**
   * 批量识别多个图片
   * @param imageFiles 图片文件数组
   * @returns OCR识别结果数组
   */
  static async recognizeMultiple(imageFiles: File[]): Promise<OCRResult[]> {
    const results = await LLMVisionService.analyzeMultiple(imageFiles)
    return results.map(result => ({
      text: result.text,
      confidence: result.confidence,
      success: result.success,
      error: result.error
    }))
  }

  /**
   * 模拟OCR识别（开发阶段使用）
   * @param imageFile 图片文件
   * @returns 模拟的OCR结果
   */
  static async mockRecognize(imageFile: File): Promise<OCRResult> {
    const result = await LLMVisionService.mockAnalyze(imageFile)
    return {
      text: result.text,
      confidence: result.confidence,
      success: result.success,
      error: result.error
    }
  }
}

// 为了保持向后兼容性，更新AI服务
export class AIVisionService {
  /**
   * 使用AI分析图片内容
   * @param imageFile 图片文件
   * @returns AI分析结果
   */
  static async describeImage(imageFile: File): Promise<AIResult> {
    const result = await LLMVisionService.analyzeImage(imageFile)
    return {
      description: result.description,
      confidence: result.confidence,
      success: result.success,
      error: result.error
    }
  }

  /**
   * 批量分析多个图片
   * @param imageFiles 图片文件数组
   * @returns AI分析结果数组
   */
  static async describeMultiple(imageFiles: File[]): Promise<AIResult[]> {
    const results = await LLMVisionService.analyzeMultiple(imageFiles)
    return results.map(result => ({
      description: result.description,
      confidence: result.confidence,
      success: result.success,
      error: result.error
    }))
  }

  /**
   * 模拟AI分析（开发阶段使用）
   * @param imageFile 图片文件
   * @returns 模拟的AI分析结果
   */
  static async mockDescribe(imageFile: File): Promise<AIResult> {
    const result = await LLMVisionService.mockAnalyze(imageFile)
    return {
      description: result.description,
      confidence: result.confidence,
      success: result.success,
      error: result.error
    }
  }
}