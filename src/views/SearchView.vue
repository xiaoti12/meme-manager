<template>
  <div class="container mx-auto px-4 py-8">
    <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow mb-8">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">🔍 高级搜索</h2>
        <p class="text-gray-600">使用模糊搜索功能，快速找到你需要的表情包</p>
      </div>

      <!-- 搜索表单 -->
      <div class="max-w-2xl mx-auto">
        <div class="space-y-6">
          <!-- 关键词搜索 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">🔤 关键词搜索</label>
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索文件名、OCR文字、AI描述或标签..."
              size="large"
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <!-- 分类筛选 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">📂 分类筛选</label>
            <el-select v-model="searchForm.category" placeholder="选择分类" class="w-full" size="large" @change="handleSearch">
              <el-option label="全部分类" value="all" />
              <el-option label="表情包" value="emoji" />
              <el-option label="动漫" value="anime" />
              <el-option label="其他" value="other" />
            </el-select>
          </div>

          <!-- 排序方式 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">📊 排序方式</label>
            <el-select v-model="searchForm.sortBy" placeholder="选择排序方式" class="w-full" size="large" @change="handleSort">
              <el-option label="上传时间（最新）" value="date-desc" />
              <el-option label="上传时间（最早）" value="date-asc" />
              <el-option label="文件名（A-Z）" value="name-asc" />
              <el-option label="文件名（Z-A）" value="name-desc" />
              <el-option label="文件大小（从大到小）" value="size-desc" />
              <el-option label="文件大小（从小到大）" value="size-asc" />
            </el-select>
          </div>
        </div>

        <!-- 搜索统计 -->
        <div class="mt-6 p-4 bg-gray-50 rounded-lg">
          <div class="text-sm text-gray-600 text-center">
            找到 <span class="font-semibold text-primary-600">{{ searchResults.length }}</span> 个结果
            <span v-if="searchForm.keyword || searchForm.category !== 'all'">
              / 共 {{ memeStore.memes.length }} 个表情包
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchResults.length > 0">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow">
        <h3 class="text-xl font-semibold text-gray-800 mb-6">📋 搜索结果</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <MemeCard
            v-for="meme in searchResults"
            :key="meme.id"
            :meme="meme"
            @download="handleDownload"
            @copy="handleCopy"
            @delete="handleDelete"
          />
        </div>
      </div>
    </div>

    <!-- 无结果状态 -->
    <div v-else-if="hasSearched" class="text-center py-16">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-12 card-shadow max-w-md mx-auto">
        <div class="text-6xl mb-6">🔍</div>
        <h3 class="text-xl font-semibold text-gray-700 mb-4">没有找到匹配的结果</h3>
        <p class="text-gray-500 mb-8">尝试使用不同的关键词或调整筛选条件</p>
        <el-button @click="clearSearch">清除搜索条件</el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-16">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-12 card-shadow max-w-md mx-auto">
        <div class="text-6xl mb-6">🎯</div>
        <h3 class="text-xl font-semibold text-gray-700 mb-4">开始搜索表情包</h3>
        <p class="text-gray-500">输入关键词或选择分类来查找表情包</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useMemeStore } from '@/stores/meme'
import MemeCard from '@/components/MemeCard.vue'
import type { MemeData, CategoryType } from '@/types'

const memeStore = useMemeStore()

interface SearchForm {
  keyword: string
  category: CategoryType
  sortBy: string
}

const searchForm = ref<SearchForm>({
  keyword: '',
  category: 'all',
  sortBy: 'date-desc'
})

const hasSearched = ref(false)

// 搜索结果
const searchResults = computed(() => {
  let results = memeStore.memes

  // 分类筛选
  if (searchForm.value.category !== 'all') {
    results = results.filter(meme => meme.category === searchForm.value.category)
  }

  // 关键词搜索
  if (searchForm.value.keyword.trim()) {
    const keyword = searchForm.value.keyword.toLowerCase()
    results = results.filter(meme =>
      meme.filename.toLowerCase().includes(keyword) ||
      meme.ocrText.toLowerCase().includes(keyword) ||
      meme.aiDescription.toLowerCase().includes(keyword) ||
      meme.tags.some(tag => tag.toLowerCase().includes(keyword))
    )
  }

  // 排序
  results = [...results].sort((a, b) => {
    switch (searchForm.value.sortBy) {
      case 'date-desc':
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      case 'date-asc':
        return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
      case 'name-asc':
        return a.filename.localeCompare(b.filename)
      case 'name-desc':
        return b.filename.localeCompare(a.filename)
      case 'size-desc':
        return b.fileSize - a.fileSize
      case 'size-asc':
        return a.fileSize - b.fileSize
      default:
        return 0
    }
  })

  return results
})

const handleSearch = () => {
  hasSearched.value = true
}

const handleSort = () => {
  hasSearched.value = true
}

const clearSearch = () => {
  searchForm.value = {
    keyword: '',
    category: 'all',
    sortBy: 'date-desc'
  }
  hasSearched.value = false
}

const handleDownload = (meme: MemeData) => {
  ElMessage.success(`开始下载: ${meme.filename}`)
}

const handleCopy = (meme: MemeData) => {
  ElMessage.success(`${meme.filename} 已复制到剪贴板`)
}

const handleDelete = (meme: MemeData) => {
  ElMessage.info(`删除功能开发中...`)
}

// 监听表单变化，自动搜索
watch(
  () => searchForm.value,
  () => {
    if (searchForm.value.keyword.trim() || searchForm.value.category !== 'all') {
      handleSearch()
    }
  },
  { deep: true }
)
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>