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
    if (this.config) {
      return this.config
    }

    // 如果配置为空，尝试从localStorage加载
    return this.loadConfigFromStorage()
  }

  /**
   * 从localStorage加载配置
   */
  private static loadConfigFromStorage(): LLMConfig | null {
    try {
      const saved = localStorage.getItem('llm-config')
      if (saved) {
        const config = JSON.parse(saved)
        // 如果找到了有效配置，设置到当前实例
        if (config.baseUrl && config.model && config.token) {
          this.config = config
          return config
        }
      }
    } catch (error) {
      console.error('从localStorage加载LLM配置失败:', error)
    }
    return null
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
        return {
          text: '',
          description: '',
          confidence: 0,
          success: false,
          error: 'LLM未配置，请先在设置中配置大模型API'
        }
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
                text: '请分析这张图片，用中文简体返回结果。提取所有文字内容，并用简洁的语言描述图片内容。描述格式为：[角色类型]正在[做什么事情]，表情/神态：[表情神态描述]。返回格式为JSON：{"text": "图片中的所有文字内容", "description": "角色类型、行为和表情神态的简洁描述"}'
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

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
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

      return {
        text: '',
        description: '',
        confidence: 0,
        success: false,
        error: error instanceof Error ? error.message : 'LLM分析失败'
      }
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
}