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
              <el-option
                v-for="option in categoryOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              >
                <span>{{ option.icon || '📁' }} {{ option.label }}</span>
              </el-option>
            </el-select>
          </div>

          <!-- 排序方式 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">📊 排序方式</label>
            <el-select v-model="memeStore.sortBy" placeholder="选择排序方式" class="w-full" size="large">
              <el-option label="上传时间（最新）" value="date-desc" />
              <el-option label="上传时间（最早）" value="date-asc" />
              <el-option label="文件名（A-Z）" value="name-asc" />
              <el-option label="文件名（Z-A）" value="name-desc" />
              <el-option label="文件大小（从大到小）" value="size-desc" />
              <el-option label="文件大小（从小到大）" value="size-asc" />
            </el-select>
          </div>

          <!-- 视图模式 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">🔍 视图模式</label>
            <el-radio-group v-model="memeStore.viewMode" size="large">
              <el-radio-button label="grid">网格模式</el-radio-button>
              <el-radio-button label="list">列表模式</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 搜索统计 和 操作按钮 -->
        <div class="mt-6 space-y-4">
          <!-- 统计信息 -->
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="text-sm text-gray-600 text-center">
              找到 <span class="font-semibold text-primary-600">{{ searchResults.length }}</span> 个结果
              <span v-if="searchForm.keyword || searchForm.category !== 'all'">
                / 共 {{ memeStore.memes.length }} 个表情包
              </span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-center gap-3">
            <el-button @click="clearSearch">清除搜索</el-button>
            <el-button type="primary" @click="exportSearchResults">导出结果</el-button>
            <el-button type="info" @click="showStatistics">查看统计</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchResults.length > 0">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold text-gray-800">📋 搜索结果</h3>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">共 {{ searchResults.length }} 个结果</span>
            <el-switch
              v-model="enableBatchMode"
              active-text="批量操作"
              inactive-text="普通模式"
            />
          </div>
        </div>

        <!-- 批量操作栏 -->
        <div v-if="enableBatchMode" class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <el-checkbox
                v-model="selectAll"
                :indeterminate="selectedIds.length > 0 && selectedIds.length < searchResults.length"
                @change="handleSelectAll"
              >
                全选 ({{ selectedIds.length }}/{{ searchResults.length }})
              </el-checkbox>
            </div>
            <div class="flex gap-2">
              <el-button
                v-if="selectedIds.length > 0"
                type="danger"
                size="small"
                @click="handleBatchDelete"
              >
                删除选中 ({{ selectedIds.length }})
              </el-button>
              <el-button
                v-if="selectedIds.length > 0"
                type="primary"
                size="small"
                @click="handleBatchExport"
              >
                导出选中 ({{ selectedIds.length }})
              </el-button>
            </div>
          </div>
        </div>

        <!-- 网格模式 -->
        <div v-if="memeStore.viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <div v-for="meme in searchResults" :key="meme.id" class="relative">
            <el-checkbox
              v-if="enableBatchMode"
              v-model="selectedIds"
              :label="meme.id"
              class="absolute top-2 left-2 z-10 bg-white rounded"
            />
            <MemeCard
              :meme="meme"
              @download="handleDownload"
              @copy="handleCopy"
              @delete="handleDelete"
            />
          </div>
        </div>

        <!-- 列表模式 -->
        <div v-else class="space-y-4">
          <div
            v-for="meme in searchResults"
            :key="meme.id"
            class="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border"
          >
            <el-checkbox
              v-if="enableBatchMode"
              v-model="selectedIds"
              :label="meme.id"
            />
            <img
              :src="meme.imageUrl"
              :alt="meme.filename"
              class="w-16 h-16 object-cover rounded-lg"
              @error="(e: any) => e.target.style.display = 'none'"
            />
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-gray-900 truncate">{{ meme.filename }}</h4>
              <p class="text-sm text-gray-500 truncate">{{ meme.aiDescription }}</p>
              <div class="flex items-center gap-2 mt-1">
                <el-tag size="small" :type="getCategoryType(meme.category)">{{ getCategoryLabel(meme.category) }}</el-tag>
                <span class="text-xs text-gray-400">{{ formatFileSize(meme.fileSize) }}</span>
                <span class="text-xs text-gray-400">{{ formatDate(meme.uploadDate) }}</span>
              </div>
            </div>
            <div class="flex gap-2">
              <el-button size="small" @click="handleDownload(meme)">下载</el-button>
              <el-button size="small" type="success" @click="handleCopy(meme)">复制</el-button>
              <el-button size="small" type="danger" @click="handleDelete(meme)">删除</el-button>
            </div>
          </div>
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
import { ref, computed, watch, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMemeStore } from '@/stores/meme'
import MemeCard from '@/components/MemeCard.vue'
import type { MemeData, CategoryType } from '@/types'
import { CategoryManager } from '@/utils/categoryManager'
import { useRoute } from 'vue-router'

const memeStore = useMemeStore()

interface SearchForm {
  keyword: string
  category: CategoryType
}

const searchForm = ref<SearchForm>({
  keyword: '',
  category: 'all'
})

const hasSearched = ref(false)
const categoryOptions = ref<Array<{ label: string; value: string; icon?: string }>>([])

// 批量操作状态
const enableBatchMode = ref(false)
const selectedIds = ref<string[]>([])
const selectAll = ref(false)

// 搜索结果
const searchResults = computed(() => {
  // 使用store的filteredMemes，它已经包含了排序和过滤逻辑
  memeStore.setSearchFilters({
    keyword: searchForm.value.keyword,
    category: searchForm.value.category
  })
  return memeStore.filteredMemes
})

const handleSearch = () => {
  hasSearched.value = true
}

const clearSearch = () => {
  memeStore.clearSearch()
  searchForm.value = {
    keyword: '',
    category: 'all'
  }
  hasSearched.value = false
}

// 全选/取消全选
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedIds.value = searchResults.value.map(meme => meme.id)
  } else {
    selectedIds.value = []
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个表情包吗？`,
      '批量删除',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )

    const deleteCount = selectedIds.value.length
    memeStore.removeMemes(selectedIds.value)
    selectedIds.value = []
    ElMessage.success(`已成功删除 ${deleteCount} 个表情包`)
  } catch {
    // 用户取消操作
  }
}

// 批量导出
const handleBatchExport = () => {
  const selectedMemes = searchResults.value.filter(meme => selectedIds.value.includes(meme.id))
  const exportData = {
    memes: selectedMemes,
    exportDate: new Date(),
    version: '1.0'
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `memes-export-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage.success(`已导出 ${selectedMemes.length} 个表情包`)
}

// 导出搜索结果
const exportSearchResults = () => {
  if (searchResults.value.length === 0) {
    ElMessage.warning('没有搜索结果可导出')
    return
  }

  const exportData = {
    memes: searchResults.value,
    searchFilters: searchForm.value,
    exportDate: new Date(),
    version: '1.0'
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `search-results-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage.success(`已导出 ${searchResults.value.length} 个搜索结果`)
}

// 显示统计信息
const showStatistics = () => {
  const stats = memeStore.getStatistics
  ElMessageBox.alert(
    `
    总数量: ${stats.total} 个表情包
    默认: ${stats.byCategory.default} 个
    总大小: ${formatFileSize(stats.totalSize)}
    平均大小: ${formatFileSize(stats.averageSize)}
    `,
    '数据统计',
    { confirmButtonText: '知道了' }
  )
}

const handleDownload = (meme: MemeData) => {
  ElMessage.success(`开始下载: ${meme.filename}`)
}

const handleCopy = (meme: MemeData) => {
  ElMessage.success(`${meme.filename} 已复制到剪贴板`)
}

const handleDelete = async (meme: MemeData) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除表情包 "${meme.filename}" 吗？`,
      '删除表情包',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )

    if (memeStore.removeMeme(meme.id)) {
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除失败')
    }
  } catch {
    // 用户取消操作
  }
}

// 工具函数
const getCategoryType = (category: CategoryType) => {
  const typeMap = {
    default: 'primary',
    all: 'info'
  }
  return typeMap[category] || 'info'
}

const getCategoryLabel = (category: CategoryType) => {
  const labelMap = {
    default: '默认',
    all: '全部'
  }
  return labelMap[category] || '未知'
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

// 监听选中状态
watch(selectedIds, (newIds) => {
  selectAll.value = newIds.length === searchResults.value.length && searchResults.value.length > 0
})

// 监听搜索结果变化，清空选中
watch(searchResults, () => {
  selectedIds.value = []
  selectAll.value = false
})

// 加载分类选项
const loadCategoryOptions = () => {
  categoryOptions.value = CategoryManager.getCategoryOptions()
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

// 组件挂载时加载分类选项
onMounted(() => {
  loadCategoryOptions()

  // 检查URL查询参数，如果有category参数则设置为默认选中
  const route = useRoute()
  if (route.query.category && typeof route.query.category === 'string') {
    searchForm.value.category = route.query.category
    handleSearch()
  }
})

</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>