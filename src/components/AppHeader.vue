<template>
  <header class="header glass-effect backdrop-blur-custom sticky top-0 z-50 card-shadow">
    <div class="container mx-auto px-4 py-6">
      <div class="text-center mb-6">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
          🎭 表情包管理器
        </h1>
        <p class="text-lg text-gray-600">智能识别 · 分类管理 · 快速搜索</p>
      </div>

      <div class="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索表情包..."
          class="max-w-md"
          size="large"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="flex flex-wrap justify-center gap-3">
        <el-button
          v-for="category in categories"
          :key="category.value"
          :type="selectedCategory === category.value ? 'primary' : 'default'"
          :class="{ 'bg-primary-500 text-white': selectedCategory === category.value }"
          round
          @click="handleCategoryChange(category.value)"
        >
          {{ category.label }}
        </el-button>
      </div>

      <!-- 导航链接 -->
      <div class="flex justify-center gap-4 mt-4">
        <router-link
          to="/"
          class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'home' }"
        >
          首页
        </router-link>
        <router-link
          to="/upload"
          class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'upload' }"
        >
          上传
        </router-link>
        <router-link
          to="/search"
          class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'search' }"
        >
          搜索
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useMemeStore } from '@/stores/meme'
import type { CategoryType } from '@/types'

const memeStore = useMemeStore()

const searchKeyword = ref('')
const selectedCategory = ref<CategoryType>('all')

const categories = [
  { value: 'all' as CategoryType, label: '全部' },
  { value: 'emoji' as CategoryType, label: '表情包' },
  { value: 'anime' as CategoryType, label: '动漫' },
  { value: 'other' as CategoryType, label: '其他' }
]

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
</style>