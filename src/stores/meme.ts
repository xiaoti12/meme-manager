import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import Fuse from 'fuse.js'
import type { MemeData, SearchFilters, CategoryType } from '@/types'

export const useMemeStore = defineStore('meme', () => {
  const memes = ref<MemeData[]>([])
  const searchFilters = ref<SearchFilters>({
    category: 'all',
    keyword: ''
  })
  const loading = ref(false)
  const sortBy = ref<string>('date-desc')
  const viewMode = ref<'grid' | 'list'>('grid')

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
        fileSize: 1024
      },
      {
        id: '2',
        filename: '动漫少女.png',
        imageUrl: 'https://via.placeholder.com/300x300/E6E6FA/9370DB?text=🎀',
        category: 'default',
        ocrText: '呀~',
        aiDescription: '可爱的动漫少女角色',
        uploadDate: new Date(Date.now() - 172800000), // 2天前
        fileSize: 2048
      },
      {
        id: '3',
        filename: '惊讶表情.jpg',
        imageUrl: 'https://via.placeholder.com/300x300/F0F8FF/4682B4?text=😲',
        category: 'default',
        ocrText: '什么?!',
        aiDescription: '表示惊讶的面部表情',
        uploadDate: new Date(Date.now() - 259200000), // 3天前
        fileSize: 1536
      },
      {
        id: '4',
        filename: '猫耳萝莉.png',
        imageUrl: 'https://via.placeholder.com/300x300/FFF8DC/FF69B4?text=😸',
        category: 'default',
        ocrText: '喵~',
        aiDescription: '戴着猫耳的可爱女孩',
        uploadDate: new Date(Date.now() - 345600000), // 4天前
        fileSize: 3072
      },
      {
        id: '5',
        filename: '哭泣表情.gif',
        imageUrl: 'https://via.placeholder.com/300x300/E0E0E0/696969?text=😢',
        category: 'default',
        ocrText: '呜呜呜',
        aiDescription: '伤心哭泣的表情',
        uploadDate: new Date(Date.now() - 432000000), // 5天前
        fileSize: 2560
      }
    ]
    memes.value = mockMemes
    updateFuseInstance()
  }

  // 过滤后的表情包列表（支持模糊搜索）
  const filteredMemes = computed(() => {
    let result = memes.value

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
    const grouped = {
      default: [] as MemeData[]
    }

    filteredMemes.value.forEach(meme => {
      if (meme.category in grouped) {
        grouped[meme.category as keyof typeof grouped].push(meme)
      } else {
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

  // 添加表情包
  const addMeme = (meme: MemeData) => {
    memes.value.push(meme)
    updateFuseInstance()
    saveToStorage()
  }

  // 删除表情包
  const removeMeme = (id: string) => {
    const index = memes.value.findIndex(meme => meme.id === id)
    if (index > -1) {
      memes.value.splice(index, 1)
      updateFuseInstance()
      saveToStorage()
      return true
    }
    return false
  }

  // 批量删除表情包
  const removeMemes = (ids: string[]) => {
    memes.value = memes.value.filter(meme => !ids.includes(meme.id))
    updateFuseInstance()
    saveToStorage()
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

  // 设置搜索过滤器
  const setSearchFilters = (filters: SearchFilters) => {
    searchFilters.value = { ...filters }
  }

  // 设置排序方式
  const setSortBy = (sort: string) => {
    sortBy.value = sort
  }

  // 设置视图模式
  const setViewMode = (mode: 'grid' | 'list') => {
    viewMode.value = mode
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
        memes.value = parsedData.map((meme: any) => ({
          ...meme,
          uploadDate: new Date(meme.uploadDate)
        }))
      } else {
        initMockData()
      }

      if (settings) {
        const parsedSettings = JSON.parse(settings)
        sortBy.value = parsedSettings.sortBy || 'date-desc'
        viewMode.value = parsedSettings.viewMode || 'grid'
      }

      updateFuseInstance()
    } catch (error) {
      console.error('加载数据失败:', error)
      initMockData()
    }
  }

  // 保存设置到本地存储
  const saveSettings = () => {
    const settings = {
      sortBy: sortBy.value,
      viewMode: viewMode.value
    }
    localStorage.setItem('meme-settings', JSON.stringify(settings))
  }

  // 导出数据
  const exportData = () => {
    return {
      memes: memes.value,
      exportDate: new Date(),
      version: '1.0'
    }
  }

  // 导入数据
  const importData = (data: any) => {
    try {
      if (data.memes && Array.isArray(data.memes)) {
        memes.value = data.memes.map((meme: any) => ({
          ...meme,
          uploadDate: new Date(meme.uploadDate)
        }))
        updateFuseInstance()
        saveToStorage()
        return true
      }
      return false
    } catch (error) {
      console.error('导入数据失败:', error)
      return false
    }
  }

  // 获取统计信息
  const getStatistics = computed(() => {
    const stats = {
      total: memes.value.length,
      byCategory: {
        default: 0
      },
      totalSize: 0,
      averageSize: 0,
      mostRecentUpload: null as Date | null,
      oldestUpload: null as Date | null
    }

    memes.value.forEach(meme => {
      // 按分类统计
      if (meme.category in stats.byCategory) {
        stats.byCategory[meme.category as keyof typeof stats.byCategory]++
      } else {
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

    // 计算属性
    filteredMemes,
    memesByCategory,
    getStatistics,

    // 数据操作方法
    addMeme,
    removeMeme,
    removeMemes,
    updateMeme,
    getMemeById,

    // 搜索和筛选方法
    setSearchFilters,
    setSortBy,
    setViewMode,
    clearSearch,

    // 存储方法
    saveToStorage,
    loadFromStorage,
    saveSettings,
    exportData,
    importData,

    // 工具方法
    initMockData,
    updateFuseInstance
  }
})