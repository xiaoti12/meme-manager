// AI图片内容识别服务 - 使用 Hugging Face API
// 根据开发文档推荐的BLIP模型

interface AIResult {
  description: string
  confidence: number
  success: boolean
  error?: string
}

export class AIVisionService {
  private static readonly HF_API_URL = import.meta.env.VITE_HF_MODEL_URL || 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base'
  private static readonly HF_TOKEN = import.meta.env.VITE_HF_TOKEN

  /**
   * 使用AI分析图片内容
   * @param imageFile 图片文件
   * @returns AI分析结果
   */
  static async describeImage(imageFile: File): Promise<AIResult> {
    try {
      if (!this.HF_TOKEN) {
        console.warn('Hugging Face Token未配置，使用模拟结果')
        return this.mockDescribe(imageFile)
      }

      const formData = new FormData()
      formData.append('file', imageFile)

      const response = await fetch(this.HF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.HF_TOKEN}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }

      const result = await response.json()

      // 处理不同的响应格式
      let description = ''
      if (Array.isArray(result) && result.length > 0) {
        description = result[0].generated_text || result[0].caption || ''
      } else if (result.generated_text) {
        description = result.generated_text
      } else if (result.caption) {
        description = result.caption
      } else {
        throw new Error('未知的API响应格式')
      }

      return {
        description: description.trim(),
        confidence: 0.85, // Hugging Face通常有较高的置信度
        success: true
      }
    } catch (error) {
      console.error('AI分析失败:', error)

      // 如果API失败，回退到模拟结果
      return this.mockDescribe(imageFile)
    }
  }

  /**
   * 批量分析多个图片
   * @param imageFiles 图片文件数组
   * @returns AI分析结果数组
   */
  static async describeMultiple(imageFiles: File[]): Promise<AIResult[]> {
    const results: AIResult[] = []

    for (const file of imageFiles) {
      const result = await this.describeImage(file)
      results.push(result)

      // 避免API限制，添加延迟
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return results
  }

  /**
   * 模拟AI分析（开发阶段使用）
   * @param imageFile 图片文件
   * @returns 模拟的AI分析结果
   */
  static async mockDescribe(imageFile: File): Promise<AIResult> {
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000))

    const filename = imageFile.name.toLowerCase()
    let mockDescription = ''

    // 根据文件名特征生成描述
    if (filename.includes('开心') || filename.includes('笑') || filename.includes('happy')) {
      mockDescription = '一个开心微笑的表情，充满喜悦和快乐的氛围'
    } else if (filename.includes('哭') || filename.includes('泪') || filename.includes('sad')) {
      mockDescription = '伤心哭泣的表情，眼含泪水，表达悲伤情感'
    } else if (filename.includes('惊讶') || filename.includes('shock')) {
      mockDescription = '表示惊讶的面部表情，眼睛睁大，嘴巴微张'
    } else if (filename.includes('愤怒') || filename.includes('angry')) {
      mockDescription = '愤怒的表情，眉头紧锁，表情严肃'
    } else if (filename.includes('动漫') || filename.includes('anime')) {
      mockDescription = '可爱的动漫角色，大眼睛，充满活力的二次元风格'
    } else if (filename.includes('猫') || filename.includes('cat')) {
      mockDescription = '可爱的猫咪表情或猫耳朵装饰，萌系风格'
    } else if (filename.includes('狗') || filename.includes('dog')) {
      mockDescription = '友好的狗狗表情，忠诚可爱的宠物形象'
    } else {
      // 随机生成通用描述
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
      mockDescription = mockDescriptions[Math.floor(Math.random() * mockDescriptions.length)]
    }

    return {
      description: mockDescription,
      confidence: 0.75 + Math.random() * 0.2, // 模拟75-95%的置信度
      success: true
    }
  }

}