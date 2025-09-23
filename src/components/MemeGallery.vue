<template>
  <el-dialog
    :model-value="visible"
    fullscreen
    :show-close="false"
    class="meme-gallery"
    @update:model-value="handleDialogClose"
  >
    <div class="h-full flex flex-col bg-black">
      <!-- 顶部工具栏 -->
      <div class="flex items-center justify-between p-4 bg-black bg-opacity-80 text-white">
        <div class="flex items-center gap-4">
          <h3 class="text-lg font-semibold">
            {{ currentMeme?.filename || '图片浏览' }}
          </h3>
          <span class="text-sm text-gray-300">
            {{ currentIndex + 1 }} / {{ memes.length }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <el-button
            type="primary"
            size="small"
            circle
            @click="$emit('download', currentMeme)"
            title="下载"
          >
            <el-icon><Download /></el-icon>
          </el-button>
          <el-button
            type="success"
            size="small"
            circle
            @click="$emit('copy', currentMeme)"
            title="复制"
          >
            <el-icon><CopyDocument /></el-icon>
          </el-button>
          <el-button
            size="small"
            circle
            @click="$emit('close')"
            title="关闭"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="flex-1 flex items-center justify-center relative">
        <!-- 上一张按钮 -->
        <button
          v-if="memes.length > 1"
          @click="previousImage"
          class="absolute left-4 z-10 w-12 h-12 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 text-white flex items-center justify-center transition-all"
          :disabled="currentIndex === 0"
        >
          <el-icon size="20"><ArrowLeft /></el-icon>
        </button>

        <!-- 图片显示 -->
        <div class="max-w-full max-h-full p-8">
          <img
            v-if="currentMeme?.imageUrl"
            :src="currentMeme.imageUrl"
            :alt="currentMeme.filename"
            class="max-w-full max-h-full object-contain"
            @click="toggleInfo"
          />
          <div v-else class="text-white text-center">
            <el-icon size="64"><Picture /></el-icon>
            <p class="mt-4">图片加载失败</p>
          </div>
        </div>

        <!-- 下一张按钮 -->
        <button
          v-if="memes.length > 1"
          @click="nextImage"
          class="absolute right-4 z-10 w-12 h-12 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 text-white flex items-center justify-center transition-all"
          :disabled="currentIndex === memes.length - 1"
        >
          <el-icon size="20"><ArrowRight /></el-icon>
        </button>

        <!-- 信息面板 -->
        <div
          v-if="showInfo && currentMeme"
          class="absolute right-4 top-4 w-80 bg-white rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto"
        >
          <div class="space-y-4">
            <div>
              <h4 class="text-sm font-semibold text-gray-600 mb-2">文件信息</h4>
              <div class="bg-gray-50 p-3 rounded text-xs space-y-1">
                <div><strong>文件名:</strong> {{ currentMeme.filename }}</div>
                <div><strong>分类:</strong> {{ getCategoryName(currentMeme.category) }}</div>
                <div v-if="currentMeme.size"><strong>大小:</strong> {{ formatFileSize(currentMeme.size) }}</div>
                <div v-if="currentMeme.uploadTime"><strong>上传时间:</strong> {{ formatDate(currentMeme.uploadTime) }}</div>
              </div>
            </div>

            <div v-if="currentMeme.ocrText">
              <h4 class="text-sm font-semibold text-green-600 mb-2">OCR识别</h4>
              <div class="bg-green-50 border-l-4 border-green-400 p-3 text-xs">
                {{ currentMeme.ocrText }}
              </div>
            </div>

            <div v-if="currentMeme.aiDescription">
              <h4 class="text-sm font-semibold text-blue-600 mb-2">AI分析</h4>
              <div class="bg-blue-50 border-l-4 border-blue-400 p-3 text-xs leading-relaxed">
                {{ currentMeme.aiDescription }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部缩略图 -->
      <div v-if="memes.length > 1" class="p-4 bg-black bg-opacity-80">
        <div class="flex gap-2 overflow-x-auto justify-center">
          <div
            v-for="(meme, index) in memes"
            :key="meme.id"
            @click="currentIndex = index"
            class="flex-shrink-0 w-16 h-16 rounded overflow-hidden cursor-pointer transition-all border-2"
            :class="index === currentIndex ? 'border-blue-500' : 'border-transparent hover:border-gray-400'"
          >
            <img
              v-if="meme.imageUrl"
              :src="meme.imageUrl"
              :alt="meme.filename"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full bg-gray-600 flex items-center justify-center">
              <el-icon class="text-gray-400" size="16"><Picture /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { MemeData } from '@/types'
import {
  Close,
  Download,
  CopyDocument,
  ArrowLeft,
  ArrowRight,
  Picture
} from '@element-plus/icons-vue'

interface Props {
  visible: boolean
  memes: MemeData[]
  initialIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0
})

const emit = defineEmits<{
  close: []
  download: [meme: MemeData]
  copy: [meme: MemeData]
}>()

const currentIndex = ref(props.initialIndex)
const showInfo = ref(false)

const handleDialogClose = (value: boolean) => {
  if (!value) {
    emit('close')
  }
}

const currentMeme = computed(() => props.memes[currentIndex.value])

watch(() => props.initialIndex, (newIndex) => {
  currentIndex.value = newIndex
})

watch(() => props.visible, (visible) => {
  if (visible) {
    currentIndex.value = props.initialIndex
  }
})

const previousImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const nextImage = () => {
  if (currentIndex.value < props.memes.length - 1) {
    currentIndex.value++
  }
}

const toggleInfo = () => {
  showInfo.value = !showInfo.value
}

const getCategoryName = (category: string) => {
  const categoryMap: Record<string, string> = {
    default: '默认'
  }
  return categoryMap[category] || category
}

const formatFileSize = (size: number) => {
  if (!size) return '未知'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.visible) return

  switch (event.key) {
    case 'ArrowLeft':
      previousImage()
      break
    case 'ArrowRight':
      nextImage()
      break
    case 'Escape':
      emit('close')
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.meme-gallery :deep(.el-dialog__body) {
  padding: 0;
}

.meme-gallery :deep(.el-dialog) {
  margin: 0;
}
</style>