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
      <div class="flex items-center justify-center gap-4 p-4 bg-black bg-opacity-80 text-white">
        <!-- 向左按钮 -->
        <el-button
          v-if="memes.length > 1"
          @click="previousImage"
          :disabled="currentIndex === 0"
          size="small"
          circle
          title="上一张"
        >
          <el-icon><ArrowLeft /></el-icon>
        </el-button>

        <!-- 当前数/总数 -->
        <span class="text-sm text-gray-300">
          {{ currentIndex + 1 }} / {{ memes.length }}
        </span>

        <!-- 下载按钮 -->
        <el-button
          type="primary"
          size="small"
          circle
          @click="handleDownload"
          title="下载"
        >
          <el-icon><Download /></el-icon>
        </el-button>

        <!-- 关闭按钮 -->
        <el-button
          size="small"
          circle
          @click="$emit('close')"
          title="关闭"
        >
          <el-icon><Close /></el-icon>
        </el-button>

        <!-- 向右按钮 -->
        <el-button
          v-if="memes.length > 1"
          @click="nextImage"
          :disabled="currentIndex === memes.length - 1"
          size="small"
          circle
          title="下一张"
        >
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>

      <!-- 主要内容区域 -->
      <div class="flex-1 flex gap-4 relative"
           :class="isMobile ? 'flex-col p-2' : 'flex-row p-4'">
        <!-- 左侧图片显示区域 -->
        <div class="flex items-center justify-center relative"
             :class="isMobile ? 'flex-1 min-h-0' : 'flex-1'">
          <!-- 图片显示 -->
          <div class="max-w-full max-h-full p-4">
            <img
              v-if="currentMeme?.imageUrl"
              :src="currentMeme.imageUrl"
              :alt="currentMeme.filename"
              class="max-w-full max-h-full object-contain"
            />
            <div v-else class="text-white text-center">
              <el-icon size="64"><Picture /></el-icon>
              <p class="mt-4">图片加载失败</p>
            </div>
          </div>
        </div>

        <!-- 右侧信息面板 -->
        <div
          v-if="currentMeme"
          class="bg-white rounded-lg shadow-lg overflow-y-auto flex-shrink-0"
          :class="isMobile ? 'w-full p-2' : 'w-80 p-4'"
        >
          <div :class="isMobile ? 'space-y-2' : 'space-y-4'">
            <!-- OCR识别 - 优先显示 -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-semibold text-green-600">OCR识别</h4>
                <el-button
                  v-if="!editingOcr"
                  size="small"
                  type="text"
                  @click="startEditOcr"
                  :title="currentMeme.ocrText ? '编辑OCR结果' : '添加OCR内容'"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
              </div>

              <!-- 显示模式 -->
              <div v-if="!editingOcr" class="bg-green-50 border-l-4 border-green-400 p-3 text-xs">
                <span v-if="currentMeme.ocrText">{{ currentMeme.ocrText }}</span>
                <span v-else class="text-gray-400 italic">点击编辑按钮添加OCR内容</span>
              </div>

              <!-- 编辑模式 -->
              <div v-else class="space-y-2">
                <el-input
                  v-model="editingOcrText"
                  type="textarea"
                  :rows="3"
                  placeholder="输入OCR识别文字..."
                  size="small"
                  @keydown.enter.ctrl="saveOcrEdit"
                  @keydown.esc="cancelOcrEdit"
                />
                <div class="flex justify-end space-x-2">
                  <el-button
                    size="small"
                    @click="cancelOcrEdit"
                  >
                    取消
                  </el-button>
                  <el-button
                    size="small"
                    type="primary"
                    @click="saveOcrEdit"
                  >
                    保存
                  </el-button>
                </div>
                <div class="text-xs text-gray-500">
                  提示：Ctrl+Enter 保存，Esc 取消
                </div>
              </div>
            </div>

            <!-- AI分析 - 第二优先 -->
            <div v-if="currentMeme.aiDescription">
              <h4 class="text-sm font-semibold text-blue-600 mb-2">AI分析</h4>
              <div class="bg-blue-50 border-l-4 border-blue-400 p-3 text-xs leading-relaxed">
                {{ currentMeme.aiDescription }}
              </div>
            </div>

            <!-- 文件信息 - 最后显示 -->
            <div>
              <h4 class="text-sm font-semibold text-gray-600 mb-2">文件信息</h4>
              <div class="bg-gray-50 p-3 rounded text-xs space-y-1">
                <div><strong>文件名:</strong> {{ currentMeme.filename }}</div>
                <div><strong>分类:</strong> {{ getCategoryName(currentMeme.category) }}</div>
                <div v-if="currentMeme.size"><strong>大小:</strong> {{ formatFileSize(currentMeme.size) }}</div>
                <div v-if="currentMeme.uploadTime"><strong>上传时间:</strong> {{ formatDate(currentMeme.uploadTime) }}</div>
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
import { ElMessage } from 'element-plus'
import type { MemeData } from '@/types'
import { useMemeStore } from '@/stores/meme'
import { CategoryManager } from '@/utils/categoryManager'
import { downloadImage } from '@/utils/download'
import {
  Close,
  Download,
  CopyDocument,
  ArrowLeft,
  ArrowRight,
  Picture,
  Edit
} from '@element-plus/icons-vue'

// 移动端检测
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 640
}

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
const showInfo = ref(true)

// OCR编辑相关状态
const editingOcr = ref(false)
const editingOcrText = ref('')

// Store实例
const memeStore = useMemeStore()

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
    // 打开时启用页面滚动
    enableBodyScroll()
    currentIndex.value = props.initialIndex
  } else {
    // 关闭时重置编辑状态
    cancelOcrEdit()
  }
})

// 监听图片切换时重置编辑状态
watch(currentIndex, () => {
  cancelOcrEdit()
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

// OCR编辑相关方法
const startEditOcr = () => {
  if (!currentMeme.value) return
  editingOcr.value = true
  editingOcrText.value = currentMeme.value.ocrText || ''
}

const cancelOcrEdit = () => {
  editingOcr.value = false
  editingOcrText.value = ''
}

const saveOcrEdit = async () => {
  if (!currentMeme.value) return

  try {
    const success = memeStore.updateMeme(currentMeme.value.id, {
      ocrText: editingOcrText.value.trim()
    })

    if (success) {
      ElMessage.success('OCR内容已保存')
      editingOcr.value = false
      editingOcrText.value = ''
    } else {
      ElMessage.error('保存失败，请重试')
    }
  } catch (error) {
    console.error('保存OCR编辑失败:', error)
    ElMessage.error('保存失败，请重试')
  }
}

const getCategoryName = (category: string) => {
  const categoryData = CategoryManager.getCategoryById(category)
  return categoryData ? categoryData.name : category
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

// 处理下载
const handleDownload = async () => {
  if (!currentMeme.value || !currentMeme.value.imageUrl) {
    ElMessage.error('图片地址无效，无法下载')
    return
  }

  try {
    await downloadImage(currentMeme.value.imageUrl, currentMeme.value.filename)
    ElMessage.success(`${currentMeme.value.filename} 下载成功`)
  } catch (error) {
    console.error('下载图片失败:', error)
    ElMessage.error('下载失败，请重试')
  }
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

// 启用 body 滚动
const enableBodyScroll = () => {
  document.body.style.overflow = 'auto'
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.height = ''
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  // 确保页面滚动可用
  if (props.visible) {
    enableBodyScroll()
  }
  // 移动端检测
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', checkMobile)
  // 恢复默认的 overflow 行为
  enableBodyScroll()
})
</script>

<style scoped>
.meme-gallery :deep(.el-dialog__body) {
  padding: 0;
}

.meme-gallery :deep(.el-dialog) {
  margin: 0;
}

/* 确保全屏对话框不会禁用页面滚动 */
.meme-gallery :deep(.el-overlay) {
  overflow: visible !important;
}

/* 确保对话框本身不会阻止滚动 */
.meme-gallery :deep(.el-dialog) {
  overflow: visible !important;
}
</style>