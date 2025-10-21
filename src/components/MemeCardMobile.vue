<template>
  <div
    class="bg-white rounded-xl overflow-hidden card-shadow hover-lift transition-all duration-300 cursor-pointer meme-card-mobile"
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
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
  >
    <!-- 选择指示器 -->
    <div v-if="selectionMode" class="selection-indicator" :class="{ 'selected': isSelected }">
      <el-icon v-if="isSelected" class="check-icon"><Check /></el-icon>
      <div v-else class="selection-circle"></div>
    </div>

    <!-- 横向布局：左侧图片 + 右侧信息 -->
    <div class="flex items-center gap-3 p-3">
      <!-- 左侧：表情包缩略图 -->
      <div class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative">
        <img
          v-if="meme.imageUrl && !imageError"
          :src="meme.imageUrl"
          :alt="meme.filename"
          class="w-full h-full object-cover"
          loading="lazy"
          @error="handleImageError"
          @load="imageLoaded = true"
        />

        <!-- 加载状态 -->
        <div v-if="meme.imageUrl && !imageLoaded && !imageError"
             class="w-full h-full flex items-center justify-center bg-gray-100">
          <el-icon class="animate-spin text-gray-400" size="20">
            <Loading />
          </el-icon>
        </div>

        <!-- 错误状态 -->
        <div v-if="!meme.imageUrl || imageError"
             class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
          <el-icon size="32"><Picture /></el-icon>
        </div>

        <!-- 分类标签 -->
        <div class="absolute bottom-1 right-1">
          <el-tag
            :type="categoryTagType"
            :style="{ backgroundColor: categoryColor, borderColor: categoryColor }"
            size="small"
            class="text-xs px-1.5 py-0.5 category-tag"
          >
            {{ getCategoryName(meme.category) }}
          </el-tag>
        </div>
      </div>

      <!-- 右侧：信息区域 -->
      <div class="flex-1 min-w-0 space-y-1.5">
        <!-- OCR 文本 -->
        <div v-if="meme.ocrText" class="flex items-center gap-1.5">
          <div class="flex-shrink-0 w-8 text-xs font-semibold text-green-600 uppercase">OCR</div>
          <div class="flex-1 min-w-0 bg-green-50 border-l-2 border-green-400 px-2 py-1 rounded-r text-xs text-gray-700 truncate">
            {{ meme.ocrText || '无文字内容' }}
          </div>
        </div>

        <!-- AI 分析 -->
        <div v-if="meme.aiDescription" class="flex items-center gap-1.5">
          <div class="flex-shrink-0 w-8 text-xs font-semibold text-blue-600 uppercase">AI</div>
          <div class="flex-1 min-w-0 bg-blue-50 border-l-2 border-blue-400 px-2 py-1 rounded-r text-xs text-gray-700 truncate">
            {{ meme.aiDescription || '无描述' }}
          </div>
        </div>

        <!-- 如果既没有 OCR 也没有 AI 描述，显示文件名 -->
        <div v-if="!meme.ocrText && !meme.aiDescription" class="text-sm text-gray-600 truncate">
          {{ meme.filename }}
        </div>
      </div>

      <!-- 右侧：操作按钮（仅在非选择模式显示） -->
      <div v-if="!selectionMode" class="flex-shrink-0 flex flex-col gap-1.5 justify-center items-end">
        <el-button
          type="primary"
          size="small"
          circle
          @click.stop="$emit('download', meme)"
          title="下载"
        >
          <el-icon size="14"><Download /></el-icon>
        </el-button>
        <el-button
          type="danger"
          size="small"
          circle
          @click.stop="handleDelete"
          title="删除"
        >
          <el-icon size="14"><Delete /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MemeData } from '@/types'
import { Picture, Download, Delete, Loading, Check } from '@element-plus/icons-vue'
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
  // 如果是长按触发的点击,忽略
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
const handleTouchStart = (event: TouchEvent) => {
  // 防止默认的触摸行为
  event.preventDefault()

  isLongPressing.value = true
  longPressTimer.value = window.setTimeout(() => {
    triggerLongPressSelect()
  }, 500)
}

const handleTouchEnd = () => {
  // 如果定时器还存在，说明是短按（<500ms）
  const wasShortTap = longPressTimer.value !== null
  clearLongPressTimer()

  // 短按时手动触发点击事件
  if (wasShortTap && !isClickSuppressed.value) {
    handleCardClick()
  }
}

const handleTouchCancel = () => {
  clearLongPressTimer()
}

const imageError = ref(false)
const imageLoaded = ref(false)

const categoryTagType = computed(() => {
  switch (props.meme.category) {
    case 'default': return 'primary'
    default: return 'primary'
  }
})

// 获取分类颜色
const categoryColor = computed(() => {
  const categoryData = CategoryManager.getCategoryById(props.meme.category)
  return categoryData?.color || '#409eff'
})

const getCategoryName = (category: string) => {
  const categoryData = CategoryManager.getCategoryById(category)
  return categoryData ? categoryData.name : category
}

const handleImageError = () => {
  imageError.value = true
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
/* 移动端卡片样式 */
.meme-card-mobile {
  transition: all 0.2s ease;
  position: relative;
}

.meme-card-mobile.selection-mode {
  cursor: pointer;
}

.meme-card-mobile.selected {
  border: 2px solid #409eff;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.1);
}

/* 长按状态样式 */
.meme-card-mobile.long-pressing {
  transform: scale(0.98);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(64, 158, 255, 0.5);
}

.selection-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selection-indicator.selected {
  background: #409eff;
  color: white;
  transform: scale(1.1);
}

.selection-circle {
  width: 14px;
  height: 14px;
  border: 2px solid #409eff;
  border-radius: 50%;
  background: transparent;
}

.check-icon {
  font-size: 14px;
  font-weight: bold;
}

/* 选择模式下的悬停效果 */
.meme-card-mobile.selection-mode:hover:not(.selected) {
  border: 2px solid rgba(64, 158, 255, 0.3);
}

.meme-card-mobile.selection-mode:hover .selection-indicator:not(.selected) {
  background: #409eff;
}

.meme-card-mobile.selection-mode:hover .selection-circle {
  background: white;
  border-color: white;
}

/* 分类标签样式 */
.category-tag {
  font-size: 9px;
  padding: 1px 4px;
  min-height: 14px;
  line-height: 12px;
  border: none;
  color: white;
  font-weight: 500;
}

/* 文本截断 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 按钮尺寸调整 */
:deep(.el-button.is-circle) {
  padding: 6px;
  width: 28px;
  height: 28px;
}
</style>
