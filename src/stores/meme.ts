import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import Fuse from 'fuse.js'
import type { MemeData, SearchFilters, CategoryType } from '@/types'
import { ImportMode } from '@/types'
import { CategoryManager } from '@/utils/categoryManager'
import { generateOptimizedUrlForMeme } from '@/utils/cloudinaryUrl'
import {
  getD1Config,
  getOrCreateGroup,
  addRemoteMeme,
  updateRemoteMeme,
  deleteRemoteMeme,
} from '@/utils/d1Service'

export const useMemeStore = defineStore('meme', () => {
  const memes = ref<MemeData[]>([])
  const searchFilters = ref<SearchFilters>({
    category: 'all',
    keyword: ''
  })
  const loading = ref(false)
  const sortBy = ref<string>('date-desc')
  const viewMode = ref<'grid' | 'list' | 'compact'>('grid')
  const lastUploadCategory = ref<CategoryType>('default')

  // Fuse.js 搜索实例
  let fuseInstance: Fuse<MemeData> | null = null

  // Fuse.js 配置
  const fuseOptions = {
    keys: [
      { name: 'filename', weight: 0.3 },
      { name: 'ocrText', weight: 0.4 },
      { name: 'aiDescription', weight: 0.3 }
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2
  }

  // 初始化或更新Fuse实例
  const updateFuseInstance = () => {
    if (memes.value.length > 0) {
      fuseInstance = new Fuse(memes.value, fuseOptions)
    }
  }

  // 模拟初始数据
  const initMockData = () => {
    const mockMemes: MemeData[] = [
      {
        id: '1',
        filename: '开心表情.png',
        imageUrl: 'https://via.placeholder.com/300x300/FFE4B5/FF6B6B?text=😊',
        category: 'default',
        ocrText: '哈哈哈',
        aiDescription: '一个开心的表情',
        uploadDate: new Date(Date.now() - 86400000), // 1天前
        fileSize: 1024,
        isDeleted: false
      },
      {
        id: '2',
        filename: '动漫少女.png',
        imageUrl: 'https://via.placeholder.com/300x300/E6E6FA/9370DB?text=🎀',
        category: 'default',
        ocrText: '呀~',
        aiDescription: '可爱的动漫少女角色',
        uploadDate: new Date(Date.now() - 172800000), // 2天前
        fileSize: 2048,
        isDeleted: false
      },
      {
        id: '3',
        filename: '惊讶表情.jpg',
        imageUrl: 'https://via.placeholder.com/300x300/F0F8FF/4682B4?text=😲',
        category: 'default',
        ocrText: '什么?!',
        aiDescription: '表示惊讶的面部表情',
        uploadDate: new Date(Date.now() - 259200000), // 3天前
        fileSize: 1536,
        isDeleted: false
      },
      {
        id: '4',
        filename: '猫耳萝莉.png',
        imageUrl: 'https://via.placeholder.com/300x300/FFF8DC/FF69B4?text=😸',
        category: 'default',
        ocrText: '喵~',
        aiDescription: '戴着猫耳的可爱女孩',
        uploadDate: new Date(Date.now() - 345600000), // 4天前
        fileSize: 3072,
        isDeleted: false
      },
      {
        id: '5',
        filename: '哭泣表情.gif',
        imageUrl: 'https://via.placeholder.com/300x300/E0E0E0/696969?text=😢',
        category: 'default',
        ocrText: '呜呜呜',
        aiDescription: '伤心哭泣的表情',
        uploadDate: new Date(Date.now() - 432000000), // 5天前
        fileSize: 2560,
        isDeleted: false
      },
      {
        id: '6',
        filename: '已删除的图片.png',
        imageUrl: 'https://via.placeholder.com/300x300/FF0000/FFFFFF?text=❌',
        category: 'default',
        ocrText: '这个图片已被删除',
        aiDescription: '这是一个测试软删除功能的图片',
        uploadDate: new Date(Date.now() - 500000000), // 6天前
        fileSize: 1024,
        isDeleted: true,
        deletedAt: new Date(Date.now() - 100000) // 100秒前删除的
      }
    ]
    memes.value = mockMemes
    updateFuseInstance()
  }

  // 过滤后的表情包列表（支持模糊搜索）
  const filteredMemes = computed(() => {
    let result = memes.value.filter(meme => !meme.isDeleted)

    // 分类筛选
    if (searchFilters.value.category !== 'all') {
      result = result.filter(meme => meme.category === searchFilters.value.category)
    }

    // 关键词搜索
    if (searchFilters.value.keyword.trim()) {
      const keyword = searchFilters.value.keyword.trim()

      // 使用 Fuse.js 进行模糊搜索
      if (fuseInstance && keyword.length >= 2) {
        const searchResults = fuseInstance.search(keyword)
        const fuzzyResults = searchResults.map(result => result.item)

        // 如果有模糊搜索结果，使用模糊搜索；否则使用精确搜索
        if (fuzzyResults.length > 0) {
          result = result.filter(meme => fuzzyResults.some(fuzzyMeme => fuzzyMeme.id === meme.id))
        } else {
          // 降级到精确搜索
          const keywordLower = keyword.toLowerCase()
          result = result.filter(meme =>
            meme.filename.toLowerCase().includes(keywordLower) ||
            meme.ocrText.toLowerCase().includes(keywordLower) ||
            meme.aiDescription.toLowerCase().includes(keywordLower)
          )
        }
      } else {
        // 关键词太短，使用精确搜索
        const keywordLower = keyword.toLowerCase()
        result = result.filter(meme =>
          meme.filename.toLowerCase().includes(keywordLower) ||
          meme.ocrText.toLowerCase().includes(keywordLower) ||
          meme.aiDescription.toLowerCase().includes(keywordLower)
        )
      }
    }

    // 排序
    return sortMemes(result, sortBy.value)
  })

  // 按分类分组的表情包
  const memesByCategory = computed(() => {
    const categories = CategoryManager.getCategories()
    const grouped: Record<string, MemeData[]> = {}

    // 初始化所有分类
    categories.forEach(cat => {
      grouped[cat.id] = []
    })

    // 将表情包分配到对应分类
    filteredMemes.value.forEach(meme => {
      if (meme.category in grouped) {
        grouped[meme.category].push(meme)
      } else {
        // 如果分类不存在，放到默认分类
        if (!grouped.default) {
          grouped.default = []
        }
        grouped.default.push(meme)
      }
    })

    return grouped
  })

  // 排序功能
  const sortMemes = (memeList: MemeData[], sortType: string) => {
    const sorted = [...memeList]

    switch (sortType) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime())
      case 'name-asc':
        return sorted.sort((a, b) => a.filename.localeCompare(b.filename))
      case 'name-desc':
        return sorted.sort((a, b) => b.filename.localeCompare(a.filename))
      case 'size-desc':
        return sorted.sort((a, b) => b.fileSize - a.fileSize)
      case 'size-asc':
        return sorted.sort((a, b) => a.fileSize - b.fileSize)
      default:
        return sorted
    }
  }

  // ─── D1 远程同步（fire-and-forget，失败不阻塞本地操作）────────────────────

  const ensureD1GroupId = async (): Promise<string | null> => {
    const config = getD1Config()
    if (!config.enabled || !config.username) return null
    if (config.groupId) return config.groupId
    try {
      return await getOrCreateGroup(config.username)
    } catch (e) {
      console.warn('[D1] 获取 group_id 失败:', e)
      return null
    }
  }

  const syncAddToD1 = (meme: MemeData) => {
    ensureD1GroupId().then(groupId => {
      if (!groupId) return
      addRemoteMeme(groupId, meme).catch(e => console.warn('[D1] addRemoteMeme 失败:', e))
    })
  }

  const syncSoftDeleteToD1 = (meme: MemeData) => {
    ensureD1GroupId().then(groupId => {
      if (!groupId) return
      updateRemoteMeme(meme.id, { isDeleted: true, deletedAt: meme.deletedAt }).catch(
        e => console.warn('[D1] updateRemoteMeme 失败:', e)
      )
    })
  }

  const syncRestoreToD1 = (meme: MemeData) => {
    ensureD1GroupId().then(groupId => {
      if (!groupId) return
      updateRemoteMeme(meme.id, { isDeleted: false, deletedAt: null }).catch(
        e => console.warn('[D1] updateRemoteMeme (restore) 失败:', e)
      )
    })
  }

  const syncHardDeleteToD1 = (id: string) => {
    ensureD1GroupId().then(groupId => {
      if (!groupId) return
      deleteRemoteMeme(id).catch(e => console.warn('[D1] deleteRemoteMeme 失败:', e))
    })
  }

  // ─────────────────────────────────────────────────────────────────────────

  // 添加表情包
  const addMeme = (meme: MemeData) => {
    memes.value.push(meme)
    updateFuseInstance()
    saveToStorage()
    syncAddToD1(meme)
  }

  // 删除表情包（软删除）
  const removeMeme = (id: string) => {
    const meme = memes.value.find(meme => meme.id === id)
    if (meme) {
      meme.isDeleted = true
      meme.deletedAt = new Date()
      updateFuseInstance()
      saveToStorage()
      syncSoftDeleteToD1(meme)
      return true
    }
    return false
  }

  // 批量删除表情包（软删除）
  const removeMemes = (ids: string[]) => {
    let deletedCount = 0
    memes.value.forEach(meme => {
      if (ids.includes(meme.id) && !meme.isDeleted) {
        meme.isDeleted = true
        meme.deletedAt = new Date()
        deletedCount++
      }
    })
    if (deletedCount > 0) {
      updateFuseInstance()
      saveToStorage()
    }
    return deletedCount
  }

  // 更新表情包
  const updateMeme = (id: string, updates: Partial<MemeData>) => {
    const index = memes.value.findIndex(meme => meme.id === id)
    if (index > -1) {
      memes.value[index] = { ...memes.value[index], ...updates }
      updateFuseInstance()
      saveToStorage()
      return true
    }
    return false
  }

  // 批量更新表情包分类（用于分类删除时的数据迁移）
  const updateMemesCategory = (fromCategory: string, toCategory: string) => {
    let updateCount = 0
    memes.value.forEach(meme => {
      if (meme.category === fromCategory) {
        meme.category = toCategory
        updateCount++
      }
    })
    if (updateCount > 0) {
      updateFuseInstance()
      saveToStorage()
    }
    return updateCount
  }

  // 批量更新指定表情包的分类（用于用户主动迁移）
  const batchUpdateCategory = (ids: string[], targetCategory: string) => {
    // 验证目标分类是否存在
    const categories = CategoryManager.getCategories()
    const categoryExists = categories.some(cat => cat.id === targetCategory)
    if (!categoryExists) {
      console.error('目标分类不存在:', targetCategory)
      return 0
    }

    let updateCount = 0
    memes.value.forEach(meme => {
      if (ids.includes(meme.id) && meme.category !== targetCategory && !meme.isDeleted) {
        meme.category = targetCategory
        updateCount++
      }
    })

    if (updateCount > 0) {
      updateFuseInstance()
      saveToStorage()
    }

    return updateCount
  }

  // 恢复删除的表情包
  const restoreMeme = (id: string) => {
    const meme = memes.value.find(meme => meme.id === id)
    if (meme && meme.isDeleted) {
      meme.isDeleted = false
      meme.deletedAt = null
      updateFuseInstance()
      saveToStorage()
      syncRestoreToD1(meme)
      return true
    }
    return false
  }

  // 批量恢复删除的表情包
  const restoreMemes = (ids: string[]) => {
    let restoredCount = 0
    memes.value.forEach(meme => {
      if (ids.includes(meme.id) && meme.isDeleted) {
        meme.isDeleted = false
        meme.deletedAt = null
        restoredCount++
      }
    })
    if (restoredCount > 0) {
      updateFuseInstance()
      saveToStorage()
    }
    return restoredCount
  }

  // 获取已删除的表情包
  const deletedMemes = computed(() => {
    return memes.value.filter(meme => meme.isDeleted)
  })

  // 永久删除表情包
  const permanentDeleteMeme = (id: string) => {
    const index = memes.value.findIndex(meme => meme.id === id)
    if (index > -1) {
      memes.value.splice(index, 1)
      updateFuseInstance()
      saveToStorage()
      syncHardDeleteToD1(id)
      return true
    }
    return false
  }

  // 批量永久删除表情包
  const permanentDeleteMemes = (ids: string[]) => {
    const initialLength = memes.value.length
    memes.value = memes.value.filter(meme => !ids.includes(meme.id))
    const deletedCount = initialLength - memes.value.length
    if (deletedCount > 0) {
      updateFuseInstance()
      saveToStorage()
    }
    return deletedCount
  }

  // 设置搜索过滤器
  const setSearchFilters = (filters: SearchFilters) => {
    searchFilters.value = { ...filters }
  }

  // 设置排序方式
  const setSortBy = (sort: string) => {
    sortBy.value = sort
  }

  // 设置视图模式
  const setViewMode = (mode: 'grid' | 'list' | 'compact') => {
    viewMode.value = mode
  }

  // 设置上次上传的分类
  const setLastUploadCategory = (category: CategoryType) => {
    lastUploadCategory.value = category
    saveSettings()
  }

  // 清除搜索条件
  const clearSearch = () => {
    searchFilters.value = {
      category: 'all',
      keyword: ''
    }
    sortBy.value = 'date-desc'
  }

  // 获取表情包详情
  const getMemeById = (id: string) => {
    return memes.value.find(meme => meme.id === id)
  }


  // 保存到本地存储（带错误处理）
  const saveToStorage = () => {
    try {
      localStorage.setItem('memes', JSON.stringify(memes.value))
      return true
    } catch (error) {
      console.error('保存数据失败:', error)
      return false
    }
  }

  // 从本地存储加载
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('memes')
      const settings = localStorage.getItem('meme-settings')

      if (stored) {
        const parsedData = JSON.parse(stored)
        // 数据验证和迁移
        let needsSave = false

        memes.value = parsedData
          .filter((meme: any) => meme && meme.id)
          .map((meme: any) => {
            const migratedMeme = {
              ...meme,
              uploadDate: new Date(meme.uploadDate),
              // 数据迁移：为旧数据添加软删除字段
              isDeleted: meme.isDeleted || false,
              deletedAt: meme.deletedAt ? new Date(meme.deletedAt) : null
            }

            // 数据迁移：为 Cloudinary 图片生成 optimizedUrl
            if (migratedMeme.imageUrl && !migratedMeme.optimizedUrl) {
              const optimizedUrl = generateOptimizedUrlForMeme(migratedMeme.imageUrl)
              // 只有当优化 URL 与原始 URL 不同时才保存
              if (optimizedUrl !== migratedMeme.imageUrl) {
                migratedMeme.optimizedUrl = optimizedUrl
                needsSave = true // 标记需要保存
              }
            }

            return migratedMeme
          })

        // 如果有数据迁移，保存到 localStorage
        if (needsSave) {
          console.log('检测到 Cloudinary 图片，已自动生成优化 URL')
          saveToStorage()
        }
      }

      if (settings) {
        const parsedSettings = JSON.parse(settings)
        sortBy.value = parsedSettings.sortBy || 'date-desc'
        viewMode.value = parsedSettings.viewMode || 'grid'
        lastUploadCategory.value = parsedSettings.lastUploadCategory || 'default'
      }

      updateFuseInstance()
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  // 保存设置到本地存储
  const saveSettings = () => {
    const settings = {
      sortBy: sortBy.value,
      viewMode: viewMode.value,
      lastUploadCategory: lastUploadCategory.value
    }
    localStorage.setItem('meme-settings', JSON.stringify(settings))
  }

  // 导出数据
  const exportData = () => {
    return {
      memes: memes.value,
      categories: CategoryManager.getCategories(),
      exportDate: new Date(),
      version: '1.1'
    }
  }

  // WebDAV 同步相关方法
  const syncToWebDAV = async () => {
    const { createWebDAVService, getLLMConfigs } = await import('@/utils/webdavService')
    const service = createWebDAVService()

    if (!service) {
      throw new Error('WebDAV 服务未配置或未启用')
    }

    try {
      const llmConfigs = getLLMConfigs()
      await service.uploadData(memes.value, CategoryManager.getCategories(), llmConfigs || undefined)

      const configInfo = llmConfigs ? `，包含 LLM 配置` : ''
      return {
        success: true,
        message: `数据已成功上传到云端${configInfo}`,
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`WebDAV 上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const syncFromWebDAV = async (mode: ImportMode = ImportMode.OVERWRITE) => {
    const { createWebDAVService, saveLLMConfigs } = await import('@/utils/webdavService')
    const service = createWebDAVService()

    if (!service) {
      throw new Error('WebDAV 服务未配置或未启用')
    }

    try {
      const syncData = await service.downloadData()

      // 构造兼容的导入数据格式
      const importDataFormatted = {
        memes: syncData.memes,
        categories: syncData.categories,
        exportDate: new Date(syncData.exportDate),
        version: syncData.version
      }

      const success = importDataWithMode(importDataFormatted, mode)
      if (!success) {
        throw new Error('数据导入失败')
      }

      // LLM 配置始终覆盖，无论什么模式
      let llmConfigInfo = ''
      if (syncData.llmConfigs) {
        try {
          saveLLMConfigs(syncData.llmConfigs)
          const configCount = (syncData.llmConfigs.openai ? 1 : 0) + (syncData.llmConfigs.gemini ? 1 : 0)
          llmConfigInfo = `，${configCount} 个 LLM 配置`
        } catch (error) {
          console.warn('LLM 配置导入失败:', error)
          llmConfigInfo = '，LLM 配置导入失败'
        }
      }

      const modeText = mode === ImportMode.MERGE ? '合并' : '覆盖'
      return {
        success: true,
        message: `已从云端${modeText}下载 ${syncData.memes.length} 个表情包和 ${syncData.categories.length} 个分类${llmConfigInfo}`,
        timestamp: new Date(),
        data: {
          memeCount: syncData.memes.length,
          categoryCount: syncData.categories.length,
          llmConfigCount: syncData.llmConfigs ? (syncData.llmConfigs.openai ? 1 : 0) + (syncData.llmConfigs.gemini ? 1 : 0) : 0
        }
      }
    } catch (error) {
      throw new Error(`WebDAV 下载失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const checkWebDAVSync = async () => {
    const { createWebDAVService } = await import('@/utils/webdavService')
    const service = createWebDAVService()

    if (!service) {
      return {
        configured: false,
        fileExists: false,
        message: 'WebDAV 未配置'
      }
    }

    try {
      const fileExists = await service.checkFileExists()
      return {
        configured: true,
        fileExists,
        message: fileExists ? '云端同步文件存在' : '云端同步文件不存在'
      }
    } catch (error) {
      return {
        configured: true,
        fileExists: false,
        message: `检查失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 导入数据（支持覆盖和合并模式）
  const importDataWithMode = (data: any, mode: ImportMode = ImportMode.OVERWRITE) => {
    if (mode === ImportMode.OVERWRITE) {
      return importData(data)
    } else {
      return importDataWithMerge(data)
    }
  }

  // 导入数据（原覆盖模式）
  const importData = (data: any) => {
    try {
      // 验证基本数据结构
      if (!data || typeof data !== 'object') {
        console.error('导入数据格式错误：数据不是对象')
        return false
      }

      // 验证表情包数据
      if (!data.memes || !Array.isArray(data.memes)) {
        console.error('导入数据格式错误：缺少有效的表情包数据')
        return false
      }

      // 导入分类数据（新版本支持）
      if (data.categories && Array.isArray(data.categories)) {
        // 验证分类数据格式
        const validCategories = data.categories.filter((cat: any) =>
          cat && cat.id && cat.name && typeof cat.id === 'string' && typeof cat.name === 'string'
        )

        if (validCategories.length > 0) {
          CategoryManager.importCategories(validCategories)
        }
      }

      // 导入表情包数据
      const validMemes = data.memes.filter((meme: any) => {
        return meme && meme.id && meme.filename && meme.imageUrl && meme.category
      })

      if (validMemes.length === 0) {
        console.error('导入数据格式错误：没有有效的表情包数据')
        return false
      }

      // 处理表情包数据（覆盖模式）
      memes.value = validMemes.map((meme: any) => {
        const processedMeme = {
          ...meme,
          uploadDate: meme.uploadDate ? new Date(meme.uploadDate) : new Date(),
          // 数据迁移：为旧数据添加软删除字段
          isDeleted: meme.isDeleted || false,
          deletedAt: meme.deletedAt ? new Date(meme.deletedAt) : null
        }

        // 验证分类是否存在，如果不存在则设置为默认分类
        const categories = CategoryManager.getCategories()
        if (!categories.some(cat => cat.id === processedMeme.category)) {
          console.warn(`表情包 "${meme.filename}" 的分类 "${meme.category}" 不存在，已设置为默认分类`)
          processedMeme.category = 'default'
        }

        // 数据迁移：为 Cloudinary 图片生成 optimizedUrl
        if (processedMeme.imageUrl && !processedMeme.optimizedUrl) {
          const optimizedUrl = generateOptimizedUrlForMeme(processedMeme.imageUrl)
          if (optimizedUrl !== processedMeme.imageUrl) {
            processedMeme.optimizedUrl = optimizedUrl
          }
        }

        return processedMeme
      })

      updateFuseInstance()
      saveToStorage()
      return true
    } catch (error) {
      console.error('导入数据失败:', error)
      return false
    }
  }

  // 导入数据（合并模式）
  const importDataWithMerge = (data: any) => {
    try {
      // 验证基本数据结构
      if (!data || typeof data !== 'object') {
        console.error('导入数据格式错误：数据不是对象')
        return false
      }

      // 验证表情包数据
      if (!data.memes || !Array.isArray(data.memes)) {
        console.error('导入数据格式错误：缺少有效的表情包数据')
        return false
      }

      // 导入分类数据（合并模式 - CategoryManager.importCategories 已支持合并）
      if (data.categories && Array.isArray(data.categories)) {
        const validCategories = data.categories.filter((cat: any) =>
          cat && cat.id && cat.name && typeof cat.id === 'string' && typeof cat.name === 'string'
        )

        if (validCategories.length > 0) {
          CategoryManager.importCategories(validCategories)
        }
      }

      // 准备表情包合并
      const validImportMemes = data.memes.filter((meme: any) => {
        return meme && meme.id && meme.filename && meme.imageUrl && meme.category
      })

      if (validImportMemes.length === 0) {
        console.error('导入数据格式错误：没有有效的表情包数据')
        return false
      }

      // 获取当前表情包数据
      const currentMemes = [...memes.value]
      const mergedMemes = [...currentMemes]

      // 合并表情包数据
      validImportMemes.forEach((importMeme: any) => {
        const processedImportMeme = {
          ...importMeme,
          uploadDate: importMeme.uploadDate ? new Date(importMeme.uploadDate) : new Date(),
          isDeleted: importMeme.isDeleted || false,
          deletedAt: importMeme.deletedAt ? new Date(importMeme.deletedAt) : null
        }

        // 验证分类是否存在，如果不存在则设置为默认分类
        const categories = CategoryManager.getCategories()
        if (!categories.some(cat => cat.id === processedImportMeme.category)) {
          console.warn(`表情包 "${importMeme.filename}" 的分类 "${importMeme.category}" 不存在，已设置为默认分类`)
          processedImportMeme.category = 'default'
        }

        // 数据迁移：为 Cloudinary 图片生成 optimizedUrl
        if (processedImportMeme.imageUrl && !processedImportMeme.optimizedUrl) {
          const optimizedUrl = generateOptimizedUrlForMeme(processedImportMeme.imageUrl)
          if (optimizedUrl !== processedImportMeme.imageUrl) {
            processedImportMeme.optimizedUrl = optimizedUrl
          }
        }

        // 查找是否已存在相同ID的表情包
        const existingIndex = mergedMemes.findIndex(meme => meme.id === processedImportMeme.id)

        if (existingIndex > -1) {
          // 表情包已存在，更新信息（保留原创建时间，但更新其他字段）
          mergedMemes[existingIndex] = {
            ...processedImportMeme,
            // 如果导入数据没有uploadDate，保留原来的uploadDate
            uploadDate: processedImportMeme.uploadDate || mergedMemes[existingIndex].uploadDate
          }
        } else {
          // 表情包不存在，添加新表情包
          mergedMemes.push(processedImportMeme)
        }
      })

      // 更新表情包数据
      memes.value = mergedMemes

      updateFuseInstance()
      saveToStorage()
      return true
    } catch (error) {
      console.error('合并导入数据失败:', error)
      return false
    }
  }

  // 获取统计信息
  const getStatistics = computed(() => {
    const categories = CategoryManager.getCategories()
    const activeMemes = memes.value.filter(meme => !meme.isDeleted)
    const deletedMemesList = memes.value.filter(meme => meme.isDeleted)

    const stats = {
      total: activeMemes.length,
      deleted: deletedMemesList.length,
      byCategory: {} as Record<string, number>,
      totalSize: 0,
      averageSize: 0,
      mostRecentUpload: null as Date | null,
      oldestUpload: null as Date | null
    }

    // 初始化各分类计数
    categories.forEach(cat => {
      stats.byCategory[cat.id] = 0
    })

    activeMemes.forEach(meme => {
      // 按分类统计
      if (meme.category in stats.byCategory) {
        stats.byCategory[meme.category]++
      } else {
        // 如果分类不存在，计入默认分类
        if (!stats.byCategory.default) stats.byCategory.default = 0
        stats.byCategory.default++
      }

      // 大小统计
      stats.totalSize += meme.fileSize

      // 日期统计
      const uploadDate = new Date(meme.uploadDate)
      if (!stats.mostRecentUpload || uploadDate > stats.mostRecentUpload) {
        stats.mostRecentUpload = uploadDate
      }
      if (!stats.oldestUpload || uploadDate < stats.oldestUpload) {
        stats.oldestUpload = uploadDate
      }
    })

    stats.averageSize = stats.total > 0 ? Math.round(stats.totalSize / stats.total) : 0

    return stats
  })

  // 监听数据变化，自动保存设置
  watch([sortBy, viewMode], () => {
    saveSettings()
  })

  // 初始化时加载数据
  loadFromStorage()

  return {
    // 状态
    memes,
    searchFilters,
    loading,
    sortBy,
    viewMode,
    lastUploadCategory,

    // 计算属性
    filteredMemes,
    memesByCategory,
    getStatistics,
    deletedMemes,

    // 数据操作方法
    addMeme,
    removeMeme,
    removeMemes,
    updateMeme,
    updateMemesCategory,
    batchUpdateCategory,
    getMemeById,

    // 软删除相关方法
    restoreMeme,
    restoreMemes,
    permanentDeleteMeme,
    permanentDeleteMemes,

    // 搜索和筛选方法
    setSearchFilters,
    setSortBy,
    setViewMode,
    setLastUploadCategory,
    clearSearch,

    // 存储方法
    saveToStorage,
    loadFromStorage,
    saveSettings,
    exportData,
    importData,
    importDataWithMode,
    importDataWithMerge,

    // WebDAV 同步方法
    syncToWebDAV,
    syncFromWebDAV,
    checkWebDAVSync,

    // 工具方法
    initMockData,
    updateFuseInstance
  }
})