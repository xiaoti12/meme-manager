import { createClient, type WebDAVClient } from 'webdav'
import type { WebDAVConfig, SyncData, MemeData, Category, LLMConfigs } from '@/types'

export class WebDAVService {
  private client: WebDAVClient | null = null
  private config: WebDAVConfig

  constructor(config: WebDAVConfig) {
    this.config = config
    this.initClient()
  }

  private initClient() {
    if (!this.config.url || !this.config.username || !this.config.password) {
      console.warn('WebDAV配置不完整')
      return
    }

    try {
      let webdavUrl = this.config.url

      // 如果开启代理模式，替换为代理URL
      if (this.config.useProxy) {
        // 使用代理服务，将WebDAV服务器URL作为参数传递
        webdavUrl = `/api/webdav-proxy?targetUrl=${encodeURIComponent(this.config.url)}`
      }

      this.client = createClient(webdavUrl, {
        username: this.config.username,
        password: this.config.password
      })

      console.log('WebDAV客户端初始化成功')
    } catch (error) {
      console.error('WebDAV客户端初始化失败:', error)
      throw new Error('WebDAV客户端初始化失败')
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化')
    }

    try {
      await this.client.getDirectoryContents('/')
      return true
    } catch (error) {
      console.error('WebDAV连接测试失败:', error)
      return false
    }
  }

  async uploadData(memes: MemeData[], categories: Category[], llmConfigs?: LLMConfigs): Promise<void> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化')
    }

    const syncData: SyncData = {
      memes,
      categories,
      llmConfigs,
      exportDate: new Date().toISOString(),
      version: '1.2'
    }

    const fileName = 'meme-manager-sync.json'
    const content = JSON.stringify(syncData, null, 2)

    try {
      await this.client.putFileContents(fileName, content, {
        overwrite: true,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      })
    } catch (error) {
      console.error('数据上传失败:', error)
      throw new Error(`数据上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async downloadData(): Promise<SyncData> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化')
    }

    const fileName = 'meme-manager-sync.json'

    try {
      const content = await this.client.getFileContents(fileName, { format: 'text' })

      // 直接反序列化JSON
      const syncData: SyncData = JSON.parse(content as string)

      if (!syncData.memes || !Array.isArray(syncData.memes)) {
        throw new Error('同步数据格式不正确：缺少memes数组')
      }

      if (!syncData.categories || !Array.isArray(syncData.categories)) {
        throw new Error('同步数据格式不正确：缺少categories数组')
      }

      // LLM配置是可选的，不强制验证
      if (syncData.llmConfigs && typeof syncData.llmConfigs !== 'object') {
        console.warn('同步数据中的LLM配置格式不正确，将忽略')
        delete syncData.llmConfigs
      }

      return syncData
    } catch (error) {
      console.error('数据下载失败:', error)
      if (error instanceof Error && error.message.includes('404')) {
        throw new Error('远程同步文件不存在，请先上传数据')
      }
      throw new Error(`数据下载失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async checkFileExists(): Promise<boolean> {
    if (!this.client) {
      throw new Error('WebDAV客户端未初始化')
    }

    const fileName = 'meme-manager-sync.json'

    try {
      await this.client.stat(fileName)
      return true
    } catch (error) {
      return false
    }
  }
}

export function getWebDAVConfig(): WebDAVConfig | null {
  try {
    const saved = localStorage.getItem('webdav_config')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('获取WebDAV配置失败:', error)
  }
  return null
}

export function saveWebDAVConfig(config: WebDAVConfig): void {
  try {
    localStorage.setItem('webdav_config', JSON.stringify(config))
  } catch (error) {
    console.error('保存WebDAV配置失败:', error)
    throw new Error('保存WebDAV配置失败')
  }
}

export function getLLMConfigs(): LLMConfigs | null {
  try {
    const allConfigs: LLMConfigs = {}

    // 获取所有LLM配置
    const saved = localStorage.getItem('llm-configs')
    if (saved) {
      const configs = JSON.parse(saved)
      if (configs.openai) allConfigs.openai = configs.openai
      if (configs.gemini) allConfigs.gemini = configs.gemini
      // 从 llm-configs 中读取 lastSelectedProvider
      if (configs.lastSelectedProvider && (configs.lastSelectedProvider === 'openai' || configs.lastSelectedProvider === 'gemini')) {
        allConfigs.lastSelectedProvider = configs.lastSelectedProvider
      }
    }

    // 向后兼容：如果 llm-configs 中没有 lastSelectedProvider，尝试从旧的单独存储中读取
    if (!allConfigs.lastSelectedProvider) {
      const lastProvider = localStorage.getItem('llm-last-provider')
      if (lastProvider && (lastProvider === 'openai' || lastProvider === 'gemini')) {
        allConfigs.lastSelectedProvider = lastProvider
      }
    }

    // 如果有任何配置，返回对象，否则返回null
    if (allConfigs.openai || allConfigs.gemini || allConfigs.lastSelectedProvider) {
      return allConfigs
    }

    return null
  } catch (error) {
    console.error('获取LLM配置失败:', error)
    return null
  }
}

export function saveLLMConfigs(llmConfigs: LLMConfigs): void {
  try {
    // 保存LLM配置，将 lastSelectedProvider 一起保存到 llm-configs 中
    const configs: Record<string, any> = {}
    if (llmConfigs.openai) configs.openai = llmConfigs.openai
    if (llmConfigs.gemini) configs.gemini = llmConfigs.gemini
    if (llmConfigs.lastSelectedProvider) configs.lastSelectedProvider = llmConfigs.lastSelectedProvider

    if (Object.keys(configs).length > 0) {
      localStorage.setItem('llm-configs', JSON.stringify(configs))
    }
  } catch (error) {
    console.error('保存LLM配置失败:', error)
    throw new Error('保存LLM配置失败')
  }
}

export function createWebDAVService(): WebDAVService | null {
  const config = getWebDAVConfig()
  if (!config || !config.enabled || !config.url || !config.username || !config.password) {
    return null
  }
  return new WebDAVService(config)
}