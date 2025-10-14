<template>
  <header class="header glass-effect backdrop-blur-custom card-shadow">
    <div class="container mx-auto px-4 py-6">
      <div class="text-center mb-6">
        <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2 md:gap-3">
          <img :src="iconUrl" alt="MemeHub图标" class="w-8 h-8 md:w-12 md:h-12" />
          MemeHub
        </h1>
        <p class="text-base md:text-lg text-gray-600">智能识别 · 快速搜索 · 分类管理</p>
      </div>

      <div class="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
        <el-input v-model="searchKeyword" placeholder="搜索表情包..." class="max-w-md w-full md:w-auto" size="large" clearable
          @input="handleSearch">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
      </div>

      <div class="mb-6">
        <!-- 桌面端分类按钮 -->
        <div class="md:flex md:flex-wrap md:justify-center md:gap-3 hidden">
          <el-button v-for="category in categories" :key="category.value"
            :type="selectedCategory === category.value ? 'primary' : 'default'"
            :class="{ 'bg-primary-500 text-white': selectedCategory === category.value }" round
            @click="handleCategoryChange(category.value)">
            {{ category.label }}
          </el-button>
        </div>
        <!-- 移动端横向滚动分类 -->
        <div class="md:hidden overflow-x-auto scrollbar-hide">
          <div class="flex gap-3 pb-2 px-1" style="width: max-content;">
            <el-button v-for="category in categories" :key="category.value"
              :type="selectedCategory === category.value ? 'primary' : 'default'"
              :class="{ 'bg-primary-500 text-white': selectedCategory === category.value }"
              size="small" round
              @click="handleCategoryChange(category.value)">
              {{ category.label }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 统计信息 - 简化移动端显示 -->
      <div class="text-center mt-4 text-sm text-gray-600">
        <!-- 移动端简化显示 -->
        <div class="md:hidden">
          <span>共 {{ memeStore.getStatistics.total }} 个表情包</span>
          <span v-if="memeStore.getStatistics.deleted > 0" class="ml-4 text-orange-600">
            回收站: {{ memeStore.getStatistics.deleted }}
          </span>
        </div>
        <!-- 桌面端完整显示 -->
        <div class="hidden md:flex justify-center items-center gap-6">
          <span>共 {{ memeStore.getStatistics.total }} 个表情包</span>
          <span v-for="cat in topCategories" :key="cat.id">
            {{ cat.name }}: {{ memeStore.getStatistics.byCategory[cat.id] || 0 }}
          </span>
          <span v-if="memeStore.getStatistics.deleted > 0" class="text-orange-600">
            回收站: {{ memeStore.getStatistics.deleted }}
          </span>
        </div>
      </div>

      <!-- 桌面端导航 -->
      <div class="hidden md:flex justify-center gap-4 mt-4">
        <router-link to="/" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'home' }">
          🏠 首页
        </router-link>
        <router-link to="/upload" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'upload' }">
          📤 上传
        </router-link>
        <router-link to="/search" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'search' }">
          🔍 搜索
        </router-link>
        <router-link to="/categories" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'categories' }">
          📁 分类
        </router-link>
        <router-link to="/trash" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-orange-500 text-white': $route.name === 'trash' }">
          🗑️ 回收站
        </router-link>
        <router-link to="/data-sync" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-blue-500 text-white': $route.name === 'data-sync' }">
          📦 数据同步
        </router-link>
      </div>

    </div>
  </header>

  <!-- 移动端底部固定导航栏 -->
  <nav class="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm border-t border-gray-200 safe-area-inset-bottom z-50">
    <div class="grid grid-cols-6 h-16">
      <router-link
        v-for="nav in navigationItems"
        :key="nav.name"
        :to="nav.path"
        class="flex flex-col items-center justify-center text-xs transition-colors"
        :class="$route.name === nav.name ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'"
        active-class="text-primary-600 bg-primary-50">
        <div class="text-lg mb-1">{{ nav.icon }}</div>
        <span class="text-xs leading-none">{{ nav.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useMemeStore } from '@/stores/meme'
import type { CategoryType } from '@/types'
import { CategoryManager } from '@/utils/categoryManager'

// 图标URL
const iconUrl = computed(() => {
  if (typeof window !== 'undefined' && (window as any).APP_ICON_DATA) {
    return (window as any).APP_ICON_DATA
  }
  // 回退到默认图标
  return 'BASE64_IMAGE_DATA_PLACEHOLDER'
})

const memeStore = useMemeStore()

const searchKeyword = ref('')
const selectedCategory = ref<CategoryType>('all')
const categoriesVersion = ref(0) // 用于强制更新计算属性

// 移动端底部导航配置
const navigationItems = [
  { name: 'home', path: '/', icon: '🏠', label: '首页' },
  { name: 'upload', path: '/upload', icon: '📤', label: '上传' },
  { name: 'search', path: '/search', icon: '🔍', label: '搜索' },
  { name: 'categories', path: '/categories', icon: '📁', label: '分类' },
  { name: 'trash', path: '/trash', icon: '🗑️', label: '回收站' },
  { name: 'data-sync', path: '/data-sync', icon: '📦', label: '数据同步' }
]

// 动态分类列表
const categories = computed(() => {
  // 通过读取 categoriesVersion 来确保计算属性会在分类变化时重新计算
  categoriesVersion.value // 这行代码确保依赖

  const staticCategories = [
    { value: 'all' as CategoryType, label: '全部' }
  ]

  const dynamicCategories = CategoryManager.getCategories().map(cat => ({
    value: cat.id as CategoryType,
    label: cat.name
  }))

  return [...staticCategories, ...dynamicCategories]
})

// 监听分类变化
let unsubscribe: (() => void) | null = null

onMounted(() => {
  // 监听分类变化
  unsubscribe = CategoryManager.addListener(() => {
    categoriesVersion.value++
  })
})

onUnmounted(() => {
  // 清理监听器
  if (unsubscribe) {
    unsubscribe()
  }
})

// 显示前3个有内容的分类
const topCategories = computed(() => {
  const stats = memeStore.getStatistics
  return CategoryManager.getCategories()
    .filter(cat => (stats.byCategory[cat.id] || 0) > 0)
    .sort((a, b) => (stats.byCategory[b.id] || 0) - (stats.byCategory[a.id] || 0))
    .slice(0, 3)
})

const handleSearch = () => {
  memeStore.setSearchFilters({
    keyword: searchKeyword.value,
    category: selectedCategory.value
  })
}

const handleCategoryChange = (category: CategoryType) => {
  selectedCategory.value = category
  memeStore.setSearchFilters({
    keyword: searchKeyword.value,
    category: category
  })
}


watch([searchKeyword, selectedCategory], () => {
  handleSearch()
})
</script>

<style scoped>
.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.container {
  max-width: 1200px;
}

/* 移动端底部导航样式 */
.mobile-bottom-nav {
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

/* 隐藏移动端横向滚动条 */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;  /* Chrome, Safari, Opera */
}

/* iOS 安全区域适配 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .safe-area-inset-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>