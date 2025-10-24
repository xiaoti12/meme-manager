<template>
  <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <h2 class="text-2xl font-bold text-gray-800">
          {{ title }} ({{ memes.length }}张)
        </h2>
      </div>

      <div v-if="memes.length > 0" class="flex items-center gap-2">
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
          @click="handleToggleMultiSelect"
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

    <!-- 详细网格视图 -->
    <div
      v-if="memeStore.viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6"
      @click.stop
    >
      <MemeCard
        v-for="(meme, index) in memes"
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
        v-for="(meme, index) in memes"
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

    <!-- 全屏图片浏览器 -->
    <MemeGallery
      :visible="showGallery"
      :memes="memes"
      :initial-index="galleryIndex"
      @close="showGallery = false"
      @download="handleDownload"
      @copy="handleCopy"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { MemeData, CategoryType } from '@/types'
import MemeCard from './MemeCard.vue'
import MemeCardCompact from './MemeCardCompact.vue'
import MemeGallery from './MemeGallery.vue'
import { ElMessage } from 'element-plus'
import { FullScreen, Select, Grid, List } from '@element-plus/icons-vue'
import { copyImageToClipboard } from '@/utils/clipboard'
import { downloadImage } from '@/utils/download'
import { useMemeStore } from '@/stores/meme'

interface Props {
  title: string
  memes: MemeData[]
  category: CategoryType
  selectionMode?: boolean
  selectedIds?: string[]
  isMultiSelectMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectionMode: false,
  selectedIds: () => [],
  isMultiSelectMode: false
})

const memeStore = useMemeStore()

const emit = defineEmits<{
  'toggle-selection': [memeId: string]
  'long-press-select': [memeId: string]
  'toggle-multi-select': []
}>()

const toggleSelection = (memeId: string) => {
  emit('toggle-selection', memeId)
}

const handleLongPressSelect = (memeId: string) => {
  emit('long-press-select', memeId)
}

const handleToggleMultiSelect = () => {
  emit('toggle-multi-select')
}

const showGallery = ref(false)
const galleryIndex = ref(0)

const categoryStyles = {
  default: 'bg-gradient-to-r from-blue-200 to-indigo-200',
  all: 'bg-gradient-to-r from-gray-200 to-gray-300'
}

const openGallery = (index: number) => {
  galleryIndex.value = index
  showGallery.value = true
}

const handleDownload = async (meme: MemeData) => {
  if (!meme.imageUrl) {
    ElMessage.error('图片地址无效，无法下载')
    return
  }

  try {
    await downloadImage(meme.imageUrl, meme.filename)
    ElMessage.success(`${meme.filename} 下载成功`)
  } catch (error) {
    console.error('下载图片失败:', error)
    ElMessage.error('下载失败，请重试')
  }
}

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

const handleDelete = (meme: MemeData) => {
  const success = memeStore.removeMeme(meme.id)
  if (success) {
    ElMessage.success(`${meme.filename} 已移至回收站`)
  } else {
    ElMessage.error('删除失败，请重试')
  }
}
</script>