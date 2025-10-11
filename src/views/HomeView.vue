<template>
  <div class="container mx-auto px-4 py-8" @click="handleContainerClick">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="text-center py-16">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-12 card-shadow max-w-md mx-auto">
        <div class="text-4xl mb-4">⏳</div>
        <h3 class="text-xl font-semibold text-gray-700">加载中...</h3>
      </div>
    </div>

    <!-- 表情包展示 -->
    <div v-else-if="!isLoading && memeStore.filteredMemes.length > 0" class="space-y-6">
      <!-- 顶部控制栏 -->
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-6 card-shadow">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <!-- 左侧：分类选择 -->
          <div class="flex items-center gap-3">
            <span class="text-gray-700 font-medium">分类:</span>
            <el-select
              v-model="selectedCategory"
              placeholder="选择分类"
              size="default"
              style="width: 180px"
            >
              <el-option label="全部分类" value="all" />
              <el-option
                v-for="cat in validCategories"
                :key="cat.id"
                :label="`${cat.name} (${getCategoryCount(cat.id)})`"
                :value="cat.id"
              />
            </el-select>
            <span class="text-gray-500 text-sm">共 {{ displayMemes.length }} 张</span>
          </div>

          <!-- 右侧：操作按钮 -->
          <div class="flex items-center gap-2">
            <!-- 视图模式切换 -->
            <el-button-group>
              <el-button
                :type="memeStore.viewMode === 'grid' ? 'primary' : 'default'"
                size="small"
                @click="memeStore.setViewMode('grid')"
                title="详细网格视图"
              >
                完整
              </el-button>
              <el-button
                :type="memeStore.viewMode === 'compact' ? 'primary' : 'default'"
                size="small"
                @click="memeStore.setViewMode('compact')"
                title="紧凑网格视图"
              >
                紧凑
              </el-button>
            </el-button-group>

            <el-button
              :type="isMultiSelectMode ? 'danger' : 'primary'"
              size="small"
              round
              @click="toggleMultiSelectMode"
            >
              <el-icon><Select /></el-icon>
              {{ isMultiSelectMode ? '取消选择' : '批量管理' }}
            </el-button>

            <el-button
              type="info"
              size="small"
              round
              @click="openGallery(0)"
            >
              <el-icon><FullScreen /></el-icon>
              全屏浏览
            </el-button>
          </div>
        </div>
      </div>

      <!-- 图片展示区 -->
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow">
        <!-- 详细网格视图 -->
        <div
          v-if="memeStore.viewMode === 'grid'"
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6"
          @click.stop
        >
          <MemeCard
            v-for="(meme, index) in displayMemes"
            :key="meme.id"
            :meme="meme"
            :selection-mode="selectionMode"
            :is-selected="selectedIds.includes(meme.id)"
            :is-multi-select-mode="isMultiSelectMode"
            @download="handleDownload"
            @copy="handleCopy"
            @delete="handleDelete"
            @gallery="openGallery(index)"
            @toggle-selection="toggleSelection"
            @long-press-select="handleLongPressSelect"
          />
        </div>

        <!-- 紧凑网格视图 -->
        <div
          v-else-if="memeStore.viewMode === 'compact'"
          class="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5 sm:gap-2 md:gap-3"
          @click.stop
        >
          <MemeCardCompact
            v-for="(meme, index) in displayMemes"
            :key="meme.id"
            :meme="meme"
            :selection-mode="selectionMode"
            :is-selected="selectedIds.includes(meme.id)"
            :is-multi-select-mode="isMultiSelectMode"
            @download="handleDownload"
            @copy="handleCopy"
            @delete="handleDelete"
            @gallery="openGallery(index)"
            @toggle-selection="toggleSelection"
            @long-press-select="handleLongPressSelect"
          />
        </div>
      </div>
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
          <router-link to="/data-sync">
            <el-button size="large" round class="hover-lift">
              📦 数据同步
            </el-button>
          </router-link>
        </div>
      </div>
    </div>

    <!-- 全屏图片浏览器 -->
    <MemeGallery
      :visible="showGallery"
      :memes="displayMemes"
      :initial-index="galleryIndex"
      @close="showGallery = false"
      @download="handleDownload"
      @copy="handleCopy"
    />

    <!-- 选择管理器 -->
    <SelectionManager v-model:selected-ids="selectedIds" @selection-cleared="clearSelection"
      @move-completed="handleMoveCompleted" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Select, FullScreen } from '@element-plus/icons-vue'
import { useMemeStore } from '@/stores/meme'
import MemeCard from '@/components/MemeCard.vue'
import MemeCardCompact from '@/components/MemeCardCompact.vue'
import MemeGallery from '@/components/MemeGallery.vue'
import SelectionManager from '@/components/SelectionManager.vue'
import { CategoryManager, type Category } from '@/utils/categoryManager'
import type { MemeData } from '@/types'
import { copyImageToClipboard } from '@/utils/clipboard'

const memeStore = useMemeStore()

// 初始化为空数组，避免undefined问题
const categoryList = ref<Category[]>([])
const isLoading = ref(true)

// 选择状态
const selectedIds = ref<string[]>([])
const isMultiSelectMode = ref(false)

// 分类筛选
const selectedCategory = ref<string>('all')

// 图库状态
const showGallery = ref(false)
const galleryIndex = ref(0)

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

// 根据选择的分类过滤显示的表情包
const displayMemes = computed(() => {
  if (selectedCategory.value === 'all') {
    return memeStore.filteredMemes
  }
  return memeStore.filteredMemes.filter(meme => meme.category === selectedCategory.value)
})

// 获取某个分类的表情包数量
const getCategoryCount = (categoryId: string) => {
  return memeStore.filteredMemes.filter(meme => meme.category === categoryId).length
}

// 打开图库
const openGallery = (index: number) => {
  galleryIndex.value = index
  showGallery.value = true
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

// 处理下载
const handleDownload = (meme: MemeData) => {
  ElMessage.success(`开始下载: ${meme.filename}`)
}

// 处理复制
const handleCopy = async (meme: MemeData) => {
  if (!meme.imageUrl) {
    ElMessage.error('图片地址无效，无法复制')
    return
  }

  try {
    const success = await copyImageToClipboard(meme.imageUrl, meme.filename)
    if (success) {
      ElMessage.success(`${meme.filename} 已复制到剪贴板`)
    } else {
      ElMessage.error('复制失败，请重试')
    }
  } catch (error) {
    console.error('复制图片失败:', error)
    ElMessage.error('复制失败，浏览器可能不支持此功能')
  }
}

// 处理删除
const handleDelete = (meme: MemeData) => {
  const success = memeStore.removeMeme(meme.id)
  if (success) {
    ElMessage.success(`${meme.filename} 已移至回收站`)
  } else {
    ElMessage.error('删除失败，请重试')
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