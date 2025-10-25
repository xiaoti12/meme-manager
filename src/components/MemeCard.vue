<template>
  <div
    class="bg-white rounded-2xl overflow-hidden card-shadow hover-lift transition-all duration-300 group cursor-pointer meme-card"
    :class="{
      'selected': isSelected,
      'selection-mode': selectionMode,
      'long-pressing': isLongPressing
    }"
    @click="handleCardClick"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
  >
    <!-- 选择指示器 -->
    <div v-if="selectionMode" class="selection-indicator" :class="{ 'selected': isSelected }">
      <el-icon v-if="isSelected" class="check-icon"><Check /></el-icon>
      <div v-else class="selection-circle"></div>
    </div>

    <!-- 图片区域 -->
    <div class="relative aspect-square bg-gray-100 overflow-hidden">
      <img
        v-if="meme.imageUrl && !imageError"
        :src="displayUrl"
        :alt="meme.filename"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        @error="handleImageError"
        @load="imageLoaded = true"
      />

      <!-- 加载状态 -->
      <div v-if="meme.imageUrl && !imageLoaded && !imageError"
           class="w-full h-full flex items-center justify-center bg-gray-100">
        <el-icon class="animate-spin text-gray-400" size="24">
          <Loading />
        </el-icon>
      </div>

      <!-- 错误状态 -->
      <div v-if="!meme.imageUrl || imageError"
           class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
        <el-icon size="48"><Picture /></el-icon>
      </div>

      <!-- 悬停操作按钮 (非选择模式下显示) -->
      <div
        v-if="!selectionMode"
        class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100"
      >
        <el-button
          type="primary"
          size="small"
          circle
          @click.stop="$emit('download', meme)"
          title="下载"
        >
          <el-icon><Download /></el-icon>
        </el-button>
        <el-button
          type="success"
          size="small"
          circle
          @click.stop="$emit('copy', meme)"
          title="复制"
        >
          <el-icon><CopyDocument /></el-icon>
        </el-button>
        <el-button
          type="danger"
          size="small"
          circle
          @click.stop="handleDelete"
          title="删除"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>

      <!-- 分类标签 -->
      <div class="absolute top-2 right-2">
        <el-tag :type="categoryTagType" size="small" round>
          {{ getCategoryName(meme.category) }}
        </el-tag>
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="p-4">
      <!-- OCR文字 -->
      <div v-if="meme.ocrText" class="mb-3">
        <div class="text-xs font-semibold text-green-600 uppercase mb-1">OCR识别</div>
        <div class="bg-green-50 border-l-3 border-green-400 p-2 rounded-r-lg text-sm text-gray-700">
          {{ meme.ocrText || '无文字内容' }}
        </div>
      </div>

      <!-- AI描述 -->
      <div v-if="meme.aiDescription" class="mb-3">
        <div class="text-xs font-semibold text-blue-600 uppercase mb-1">AI分析</div>
        <div class="bg-blue-50 border-l-3 border-blue-400 p-2 rounded-r-lg text-sm text-gray-700 leading-relaxed">
          <div class="line-clamp-2">{{ meme.aiDescription || '无描述' }}</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MemeData } from '@/types'
import { Picture, Download, CopyDocument, Delete, Loading, Check } from '@element-plus/icons-vue'
import { CategoryManager } from '@/utils/categoryManager'
import { ElMessageBox, ElMessage } from 'element-plus'

interface Props {
  meme: MemeData
  selectionMode?: boolean
  isSelected?: boolean
  isMultiSelectMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectionMode: false,
  isSelected: false,
  isMultiSelectMode: false
})

const emit = defineEmits<{
  download: [meme: MemeData]
  copy: [meme: MemeData]
  delete: [meme: MemeData]
  gallery: []
  'toggle-selection': [memeId: string]
  'long-press-select': [memeId: string]
}>()

// 长按相关状态
const isLongPressing = ref(false)
const longPressTimer = ref<number | null>(null)
const isClickSuppressed = ref(false)

// 处理卡片点击
const handleCardClick = () => {
  // 如果是长按触发的点击，忽略
  if (isClickSuppressed.value) {
    isClickSuppressed.value = false
    return
  }

  if (props.selectionMode) {
    emit('toggle-selection', props.meme.id)
  } else {
    emit('gallery')
  }
}

// 清理长按计时器
const clearLongPressTimer = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  isLongPressing.value = false
}

// 触发长按选择
const triggerLongPressSelect = () => {
  isClickSuppressed.value = true
  emit('long-press-select', props.meme.id)
  clearLongPressTimer()
}

// 鼠标事件处理
const handleMouseDown = (event: MouseEvent) => {
  // 只响应左键
  if (event.button !== 0) return

  isLongPressing.value = true
  longPressTimer.value = window.setTimeout(() => {
    triggerLongPressSelect()
  }, 500)
}

const handleMouseUp = () => {
  clearLongPressTimer()
}

const handleMouseLeave = () => {
  clearLongPressTimer()
}

// 触摸事件处理
const handleTouchStart = () => {
  // 不阻止默认行为,允许页面滚动
  isLongPressing.value = true
  longPressTimer.value = window.setTimeout(() => {
    triggerLongPressSelect()
  }, 500)
}

const handleTouchMove = () => {
  // 用户在滚动,取消长按
  clearLongPressTimer()
}

const handleTouchEnd = () => {
  clearLongPressTimer()
}

const handleTouchCancel = () => {
  clearLongPressTimer()
}

const imageError = ref(false)
const imageLoaded = ref(false)

// 显示 URL：优先使用 optimizedUrl，否则使用原始 imageUrl
const displayUrl = computed(() => {
  return props.meme.optimizedUrl || props.meme.imageUrl
})

const categoryTagType = computed(() => {
  switch (props.meme.category) {
    case 'default': return 'primary'
    default: return 'primary'
  }
})

const getCategoryName = (category: string) => {
  const categoryData = CategoryManager.getCategoryById(category)
  return categoryData ? categoryData.name : category
}

const handleImageError = () => {
  imageError.value = true
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

// 处理删除操作
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${props.meme.filename}" 吗？\n\n删除的图片将被移到回收站，可以随时恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        draggable: true,
      }
    )

    // 用户确认删除，触发删除事件
    emit('delete', props.meme)
    ElMessage.success('图片已移至回收站')
  } catch (error) {
    // 用户取消删除
    if (error !== 'cancel') {
      console.error('删除确认对话框出错:', error)
    }
  }
}
</script>

<style scoped>
/* 选择状态样式 */
.meme-card {
  transition: all 0.2s ease;
  position: relative;
}

/* 文本截断样式 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meme-card.selection-mode {
  cursor: pointer;
}

.meme-card.selected {
  border: 2px solid #409eff;
  transform: scale(0.98);
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.1);
}

/* 长按状态样式 */
.meme-card.long-pressing {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(64, 158, 255, 0.5);
}

.selection-indicator {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

.selection-indicator.selected {
  background: #409eff;
  color: white;
  transform: scale(1.1);
}

.selection-circle {
  width: 18px;
  height: 18px;
  border: 2px solid #409eff;
  border-radius: 50%;
  background: transparent;
}

.check-icon {
  font-size: 16px;
  font-weight: bold;
}

/* 选择模式下的悬停效果 */
.meme-card.selection-mode:hover:not(.selected) {
  border: 2px solid rgba(64, 158, 255, 0.3);
  transform: scale(0.99);
}

.meme-card.selection-mode:hover .selection-indicator:not(.selected) {
  background: #409eff;
}

.meme-card.selection-mode:hover .selection-circle {
  background: white;
  border-color: white;
}
</style>