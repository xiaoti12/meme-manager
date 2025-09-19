import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MemeData, SearchFilters, CategoryType } from '@/types'

export const useMemeStore = defineStore('meme', () => {
  const memes = ref<MemeData[]>([])
  const searchFilters = ref<SearchFilters>({
    category: 'all',
    keyword: ''
  })
  const loading = ref(false)

  // 模拟初始数据
  const initMockData = () => {
    const mockMemes: MemeData[] = [
      {
        id: '1',
        filename: '开心表情.png',
        imageUrl: '/ai_docs/demo-index.html',
        category: 'emoji',
        ocrText: '哈哈哈',
        aiDescription: '一个开心的表情',
        tags: ['开心', '笑脸'],
        uploadDate: new Date(),
        fileSize: 1024
      },
      {
        id: '2',
        filename: '动漫少女.png',
        imageUrl: '/ai_docs/demo-index.html',
        category: 'anime',
        ocrText: '呀~',
        aiDescription: '可爱的动漫少女角色',
        tags: ['动漫', '少女', '可爱'],
        uploadDate: new Date(),
        fileSize: 2048
      }
    ]
    memes.value = mockMemes
  }

  // 过滤后的表情包列表
  const filteredMemes = computed(() => {
    let result = memes.value

    if (searchFilters.value.category !== 'all') {
      result = result.filter(meme => meme.category === searchFilters.value.category)
    }

    if (searchFilters.value.keyword.trim()) {
      const keyword = searchFilters.value.keyword.toLowerCase()
      result = result.filter(meme =>
        meme.filename.toLowerCase().includes(keyword) ||
        meme.ocrText.toLowerCase().includes(keyword) ||
        meme.aiDescription.toLowerCase().includes(keyword) ||
        meme.tags.some(tag => tag.toLowerCase().includes(keyword))
      )
    }

    return result
  })

  // 按分类分组的表情包
  const memesByCategory = computed(() => {
    const grouped = {
      emoji: [] as MemeData[],
      anime: [] as MemeData[],
      other: [] as MemeData[]
    }

    filteredMemes.value.forEach(meme => {
      if (meme.category in grouped) {
        grouped[meme.category as keyof typeof grouped].push(meme)
      } else {
        grouped.other.push(meme)
      }
    })

    return grouped
  })

  // 添加表情包
  const addMeme = (meme: MemeData) => {
    memes.value.push(meme)
  }

  // 删除表情包
  const removeMeme = (id: string) => {
    const index = memes.value.findIndex(meme => meme.id === id)
    if (index > -1) {
      memes.value.splice(index, 1)
    }
  }

  // 设置搜索过滤器
  const setSearchFilters = (filters: SearchFilters) => {
    searchFilters.value = { ...filters }
  }

  // 获取表情包详情
  const getMemeById = (id: string) => {
    return memes.value.find(meme => meme.id === id)
  }

  // 保存到本地存储
  const saveToStorage = () => {
    localStorage.setItem('memes', JSON.stringify(memes.value))
  }

  // 从本地存储加载
  const loadFromStorage = () => {
    const stored = localStorage.getItem('memes')
    if (stored) {
      memes.value = JSON.parse(stored)
    } else {
      initMockData()
    }
  }

  // 初始化时加载数据
  loadFromStorage()

  return {
    memes,
    searchFilters,
    loading,
    filteredMemes,
    memesByCategory,
    addMeme,
    removeMeme,
    setSearchFilters,
    getMemeById,
    saveToStorage,
    loadFromStorage,
    initMockData
  }
})