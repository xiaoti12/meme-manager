/**
 * 分类管理工具类
 * 负责管理用户自定义的表情包分类
 */

export interface Category {
  id: string
  name: string
  createdAt: Date
  color?: string
  icon?: string
}

const STORAGE_KEY = 'meme-categories'
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'default',
    name: '默认',
    createdAt: new Date(),
    color: '#64748b',
    icon: '📂'
  }
]

export class CategoryManager {
  private static categories: Category[] = []
  private static listeners: Array<() => void> = []

  /**
   * 初始化分类数据
   */
  static init(): void {
    this.loadFromStorage()
  }

  /**
   * 获取所有分类
   */
  static getCategories(): Category[] {
    if (this.categories.length === 0) {
      this.loadFromStorage()
    }
    return [...this.categories]
  }

  /**
   * 添加新分类
   */
  static addCategory(name: string, color?: string, icon?: string): Category {
    const newCategory: Category = {
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      createdAt: new Date(),
      color: color || this.getRandomColor(),
      icon: icon || '📁'
    }

    this.categories.push(newCategory)
    this.saveToStorage()
    this.notifyListeners()
    return newCategory
  }

  /**
   * 删除分类
   */
  static removeCategory(id: string): boolean {
    if (id === 'default') {
      return false // 不能删除默认分类
    }

    const index = this.categories.findIndex(cat => cat.id === id)
    if (index > -1) {
      this.categories.splice(index, 1)
      this.saveToStorage()
      this.notifyListeners()
      return true
    }
    return false
  }

  /**
   * 更新分类
   */
  static updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): boolean {
    const index = this.categories.findIndex(cat => cat.id === id)
    if (index > -1) {
      this.categories[index] = {
        ...this.categories[index],
        ...updates,
        name: updates.name?.trim() || this.categories[index].name
      }
      this.saveToStorage()
      this.notifyListeners()
      return true
    }
    return false
  }

  /**
   * 根据ID获取分类
   */
  static getCategoryById(id: string): Category | undefined {
    return this.categories.find(cat => cat.id === id)
  }

  /**
   * 检查分类名是否已存在
   */
  static isNameExists(name: string, excludeId?: string): boolean {
    const trimmedName = name.trim().toLowerCase()
    return this.categories.some(cat =>
      cat.name.toLowerCase() === trimmedName && cat.id !== excludeId
    )
  }

  /**
   * 获取分类选项（用于选择器）
   */
  static getCategoryOptions(): Array<{ label: string; value: string; color?: string; icon?: string }> {
    return this.categories.map(cat => ({
      label: cat.name,
      value: cat.id,
      color: cat.color,
      icon: cat.icon
    }))
  }

  /**
   * 保存到localStorage
   */
  private static saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.categories))
    } catch (error) {
      console.error('保存分类数据失败:', error)
    }
  }

  /**
   * 从localStorage加载
   */
  private static loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)

        // 验证并过滤有效的分类数据
        const validCategories = parsed
          .filter((cat: any) => cat && cat.id && cat.name && typeof cat.id === 'string' && typeof cat.name === 'string')
          .map((cat: any) => ({
            ...cat,
            createdAt: new Date(cat.createdAt),
            color: cat.color || '#64748b',
            icon: cat.icon || '📂'
          }))

        this.categories = validCategories

        // 确保默认分类存在
        if (!this.categories.some(cat => cat.id === 'default')) {
          this.categories.unshift(DEFAULT_CATEGORIES[0])
        }
      } else {
        this.categories = [...DEFAULT_CATEGORIES]
        this.saveToStorage()
      }
    } catch (error) {
      console.error('加载分类数据失败:', error)
      this.categories = [...DEFAULT_CATEGORIES]
      this.saveToStorage()
    }
  }

  /**
   * 获取随机颜色
   */
  private static getRandomColor(): string {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
      '#f43f5e', '#64748b', '#6b7280', '#71717a'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  /**
   * 重置为默认分类
   */
  static reset(): void {
    this.categories = [...DEFAULT_CATEGORIES]
    this.saveToStorage()
  }

  /**
   * 导出分类数据
   */
  static exportCategories(): Category[] {
    return [...this.categories]
  }

  /**
   * 导入分类数据
   */
  static importCategories(categories: Category[]): boolean {
    try {
      // 验证数据格式
      if (!Array.isArray(categories)) {
        return false
      }

      // 确保包含默认分类
      const hasDefault = categories.some(cat => cat.id === 'default')
      if (!hasDefault) {
        categories.unshift(DEFAULT_CATEGORIES[0])
      }

      this.categories = categories.map(cat => ({
        ...cat,
        createdAt: new Date(cat.createdAt)
      }))

      this.saveToStorage()
      this.notifyListeners()
      return true
    } catch (error) {
      console.error('导入分类数据失败:', error)
      return false
    }
  }

  /**
   * 添加变化监听器
   */
  static addListener(callback: () => void): () => void {
    this.listeners.push(callback)
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * 通知所有监听器
   */
  private static notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('分类变化监听器执行失败:', error)
      }
    })
  }
}

// 初始化
CategoryManager.init()