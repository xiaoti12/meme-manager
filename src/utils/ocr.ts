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
  provider: 'openai' | 'gemini'
}

interface LLMProvider {
  buildRequest(imageBase64: string, prompt: string, config: LLMConfig): RequestInit
  parseResponse(response: any): { text: string; description: string }
  getEndpoint(config: LLMConfig): string
}

class OpenAIProvider implements LLMProvider {
  buildRequest(imageBase64: string, prompt: string, config: LLMConfig): RequestInit {
    const requestBody = {
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    }

    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`
      },
      body: JSON.stringify(requestBody)
    }
  }

  parseResponse(response: any): { text: string; description: string } {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('API返回结果为空')
    }

    const content = response.choices[0].message?.content
    if (!content) {
      throw new Error('API返回内容为空')
    }

    // 尝试解析JSON格式的响应
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return JSON.parse(cleanContent)
    } catch (parseError) {
      // 如果解析失败，尝试从文本中提取信息
      return this.extractFromText(content)
    }
  }

  getEndpoint(config: LLMConfig): string {
    return `${config.baseUrl}/chat/completions`
  }

  private extractFromText(text: string): { text: string; description: string } {
    const textMatch = text.match(/(?:文字|文本|text)[：:]?\s*["']?([^"'\n]+)["']?/i)
    const descMatch = text.match(/(?:描述|description)[：:]?\s*["']?([^"'\n]+)["']?/i)

    return {
      text: textMatch?.[1]?.trim() || '',
      description: descMatch?.[1]?.trim() || text.trim()
    }
  }
}

class GeminiProvider implements LLMProvider {
  buildRequest(imageBase64: string, prompt: string, config: LLMConfig): RequestInit {
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }]
    }

    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.token
      },
      body: JSON.stringify(requestBody)
    }
  }

  parseResponse(response: any): { text: string; description: string } {
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('API返回结果为空')
    }

    const content = response.candidates[0].content?.parts[0]?.text
    if (!content) {
      throw new Error('API返回内容为空')
    }

    // 尝试解析JSON格式的响应
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return JSON.parse(cleanContent)
    } catch (parseError) {
      // 如果解析失败，尝试从文本中提取信息
      return this.extractFromText(content)
    }
  }

  getEndpoint(config: LLMConfig): string {
    return `${config.baseUrl}/v1beta/models/${config.model}:generateContent`
  }

  private extractFromText(text: string): { text: string; description: string } {
    const textMatch = text.match(/(?:文字|文本|text)[：:]?\s*["']?([^"'\n]+)["']?/i)
    const descMatch = text.match(/(?:描述|description)[：:]?\s*["']?([^"'\n]+)["']?/i)

    return {
      text: textMatch?.[1]?.trim() || '',
      description: descMatch?.[1]?.trim() || text.trim()
    }
  }
}

class LLMProviderFactory {
  static createProvider(provider: 'openai' | 'gemini'): LLMProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider()
      case 'gemini':
        return new GeminiProvider()
      default:
        throw new Error(`不支持的服务商: ${provider}`)
    }
  }
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
   * 获取指定提供商的配置
   */
  static getProviderConfig(provider: 'openai' | 'gemini'): LLMConfig | null {
    const allConfigs = this.getAllConfigs()
    return allConfigs[provider] || null
  }

  /**
   * 保存指定提供商的配置
   */
  static saveProviderConfig(config: LLMConfig) {
    const allConfigs = this.getAllConfigs()
    allConfigs[config.provider] = config
    localStorage.setItem('llm-configs', JSON.stringify(allConfigs))
  }

  /**
   * 删除指定提供商的配置
   */
  static deleteProviderConfig(provider: 'openai' | 'gemini') {
    const allConfigs = this.getAllConfigs()
    delete allConfigs[provider]
    localStorage.setItem('llm-configs', JSON.stringify(allConfigs))
  }

  /**
   * 保存最后选择的服务商
   */
  static saveLastSelectedProvider(provider: 'openai' | 'gemini') {
    try {
      // 读取现有配置
      const allConfigs = this.getAllConfigs()
      // 更新 lastSelectedProvider
      allConfigs.lastSelectedProvider = provider
      // 保存回 llm-configs
      const configs: Record<string, any> = {}
      if (allConfigs.openai) configs.openai = allConfigs.openai
      if (allConfigs.gemini) configs.gemini = allConfigs.gemini
      configs.lastSelectedProvider = provider
      localStorage.setItem('llm-configs', JSON.stringify(configs))
    } catch (error) {
      console.error('保存最后选择的服务商失败:', error)
      throw error
    }
  }

  /**
   * 获取最后选择的服务商
   */
  static getLastSelectedProvider(): 'openai' | 'gemini' {
    try {
      // 优先从 llm-configs 中读取
      const allConfigs = this.getAllConfigs()
      if (allConfigs.lastSelectedProvider && (allConfigs.lastSelectedProvider === 'openai' || allConfigs.lastSelectedProvider === 'gemini')) {
        return allConfigs.lastSelectedProvider
      }

      // 向后兼容：如果 llm-configs 中没有，尝试从旧的单独存储中读取
      const saved = localStorage.getItem('llm-last-provider')
      if (saved && (saved === 'openai' || saved === 'gemini')) {
        return saved as 'openai' | 'gemini'
      }
    } catch (error) {
      console.error('获取最后选择的服务商失败:', error)
    }
    // 默认返回openai
    return 'openai'
  }

  /**
   * 获取所有配置
   */
  private static getAllConfigs(): Record<string, LLMConfig> {
    try {
      const saved = localStorage.getItem('llm-configs')
      if (saved) {
        return JSON.parse(saved)
      }

      // 如果新的配置存储不存在，尝试迁移旧的配置
      const oldSaved = localStorage.getItem('llm-config')
      if (oldSaved) {
        const oldConfig = JSON.parse(oldSaved)
        if (oldConfig.baseUrl && oldConfig.model && oldConfig.token) {
          // 向后兼容：如果没有provider字段，默认为openai
          if (!oldConfig.provider) {
            oldConfig.provider = 'openai'
          }
          const migratedConfigs = {
            [oldConfig.provider]: oldConfig
          }
          localStorage.setItem('llm-configs', JSON.stringify(migratedConfigs))
          // 清除旧配置
          localStorage.removeItem('llm-config')
          return migratedConfigs
        }
      }
    } catch (error) {
      console.error('加载LLM配置失败:', error)
    }
    return {}
  }

  /**
   * 从localStorage加载配置
   */
  private static loadConfigFromStorage(): LLMConfig | null {
    try {
      const allConfigs = this.getAllConfigs()
      // 获取第一个可用的配置
      const firstProvider = Object.keys(allConfigs)[0] as 'openai' | 'gemini' | undefined
      if (firstProvider && allConfigs[firstProvider]) {
        const config = allConfigs[firstProvider]
        this.config = config
        return config
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

      // 创建Provider实例
      const provider = LLMProviderFactory.createProvider(this.config.provider)

      // 构建请求提示
      const prompt = '请分析这张图片，用中文简体返回结果。提取所有文字内容，并用简洁的语言描述图片内容。描述格式为：[角色类型]正在[做什么事情]，表情/神态：[表情神态描述]。返回格式为JSON：{"text": "图片中的所有文字内容", "description": "角色类型、行为和表情神态的简洁描述"}'

      // 构建请求配置
      const requestConfig = provider.buildRequest(base64Image, prompt, this.config)
      const endpoint = provider.getEndpoint(this.config)

      const response = await fetch(endpoint, requestConfig)

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      // 使用Provider解析响应
      const parsedResult = provider.parseResponse(result)

      return {
        text: parsedResult.text || '',
        description: parsedResult.description,
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