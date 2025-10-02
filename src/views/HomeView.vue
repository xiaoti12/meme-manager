<template>
  <div class="container mx-auto px-4 py-8" @click="handleContainerClick">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="text-center py-16">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-12 card-shadow max-w-md mx-auto">
        <div class="text-4xl mb-4">⏳</div>
        <h3 class="text-xl font-semibold text-gray-700">加载中...</h3>
      </div>
    </div>

    <!-- 表情包分类展示 -->
    <div v-else-if="!isLoading && memeStore.filteredMemes.length > 0 && validCategories.length > 0" class="space-y-12">
      <!-- 动态分类 -->
      <CategorySection v-for="categoryItem in categoriesToDisplay" :key="categoryItem.id" :title="categoryItem.name"
        :memes="memeStore.memesByCategory[categoryItem.id]" :category="categoryItem.id" :selection-mode="selectionMode"
        :selected-ids="selectedIds" :is-multi-select-mode="isMultiSelectMode" @toggle-selection="toggleSelection"
        @long-press-select="handleLongPressSelect" @toggle-multi-select="toggleMultiSelectMode" />
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-16">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-12 card-shadow max-w-md mx-auto">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">还没有表情包</h3>
        <p class="text-gray-500 mb-8">开始上传你的第一个表情包吧！</p>
        <router-link to="/upload">
          <el-button type="primary" size="large" round class="px-8">
            📤 开始上传
          </el-button>
        </router-link>
      </div>
    </div>


    <!-- 上传提示 -->
    <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow mt-12">
      <div class="text-center">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">✨ 添加更多表情包</h3>
        <p class="text-gray-600 mb-6">支持拖拽上传，自动OCR识别文字，AI分析图片内容</p>
        <div class="flex justify-center gap-4">
          <router-link to="/upload">
            <el-button type="primary" size="large" round class="px-8 hover-lift">
              📤 上传图片
            </el-button>
          </router-link>
          <el-button size="large" round @click="exportAllData">
            📦 导出数据
          </el-button>
          <el-button size="large" round @click="importData">
            📥 导入数据
          </el-button>
        </div>
      </div>
    </div>

    <!-- 选择管理器 -->
    <SelectionManager v-model:selected-ids="selectedIds" @selection-cleared="clearSelection"
      @move-completed="handleMoveCompleted" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Select } from '@element-plus/icons-vue'
import { useMemeStore } from '@/stores/meme'
import CategorySection from '@/components/CategorySection.vue'
import SelectionManager from '@/components/SelectionManager.vue'
import { CategoryManager, type Category } from '@/utils/categoryManager'

const memeStore = useMemeStore()

// 初始化为空数组，避免undefined问题
const categoryList = ref<Category[]>([])
const isLoading = ref(true)

// 选择状态
const selectedIds = ref<string[]>([])
const isMultiSelectMode = ref(false)

// 选择模式（多选按钮激活或有选中项时自动激活）
const selectionMode = computed(() => isMultiSelectMode.value || selectedIds.value.length > 0)

// 立即加载分类列表
const loadCategories = async () => {
  try {
    const categories = CategoryManager.getCategories()
    categoryList.value = categories.filter(cat =>
      cat &&
      cat.id &&
      cat.name &&
      typeof cat.id === 'string' &&
      typeof cat.name === 'string'
    )
  } catch (error) {
    console.error('加载分类失败:', error)
    categoryList.value = [{
      id: 'default',
      name: '默认',
      createdAt: new Date(),
      color: '#64748b'
    }]
  } finally {
    isLoading.value = false
  }
}

// 在定义时立即执行
loadCategories()

// 过滤有效的分类项（现在categoryList已经过滤过了，但保留作为双重保险）
const validCategories = computed(() => {
  if (isLoading.value || !Array.isArray(categoryList.value)) {
    return []
  }
  return categoryList.value.filter(item =>
    item &&
    item.id &&
    item.name &&
    typeof item.id === 'string' &&
    typeof item.name === 'string'
  )
})

// 创建一个计算属性，预先过滤出需要显示的分类
const categoriesToDisplay = computed(() => {
  return validCategories.value.filter(
    category => memeStore.memesByCategory[category.id]?.length > 0
  )
})


// 导出所有数据
const exportAllData = () => {
  const exportData = memeStore.exportData()
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `memes-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${exportData.memes.length} 个表情包`)
}

// 导入数据
const importData = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string)
          if (memeStore.importData(data)) {
            ElMessage.success('数据导入成功')
          } else {
            ElMessage.error('数据格式错误')
          }
        } catch (error) {
          ElMessage.error('文件解析失败')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

// 切换选择状态
const toggleSelection = (memeId: string) => {
  const index = selectedIds.value.indexOf(memeId)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(memeId)
  }
}

// 清除选择
const clearSelection = () => {
  selectedIds.value = []
  isMultiSelectMode.value = false
}

// 切换多选模式
const toggleMultiSelectMode = () => {
  if (isMultiSelectMode.value) {
    // 退出多选模式
    isMultiSelectMode.value = false
    selectedIds.value = []
    ElMessage.info('已退出批量管理模式')
  } else {
    // 进入多选模式
    isMultiSelectMode.value = true
    ElMessage.info('已进入批量管理模式，点击图片进行选择')
  }
}

// 长按选择处理
const handleLongPressSelect = (memeId: string) => {
  if (!isMultiSelectMode.value) {
    isMultiSelectMode.value = true
    ElMessage.info('已进入批量管理模式')
  }
  // 确保该图片被选中
  if (!selectedIds.value.includes(memeId)) {
    selectedIds.value.push(memeId)
  }
}

// 处理移动完成
const handleMoveCompleted = (movedCount: number, targetCategoryName: string) => {
  // 重新加载分类数据，确保数据同步
  loadCategories()
  ElMessage.success(`成功移动 ${movedCount} 张图片到「${targetCategoryName}」分类`)
}

// 点击容器空白区域清除选择
const handleContainerClick = (event: MouseEvent) => {
  // 只有在点击目标是容器本身时才清除选择
  if (event.target === event.currentTarget && selectionMode.value) {
    clearSelection()
  }
}

// 组件挂载时再次确保分类已加载（防止异步问题）
onMounted(async () => {
  if (categoryList.value.length === 0 || isLoading.value) {
    await loadCategories()
  }
})
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>