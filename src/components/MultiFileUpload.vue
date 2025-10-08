<template>
  <div class="multi-file-upload" @paste="handlePaste" tabindex="0">
    <!-- 文件队列显示 -->
    <div v-if="fileQueue.length > 0" class="file-queue mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">📂 待处理文件 ({{ fileQueue.length }})</h3>

      <!-- 处理完成后的轮播视图 -->
      <div v-if="allProcessed && hasCompletedFiles" class="carousel-container">
        <div class="flex items-center justify-between mb-4">
          <div class="text-sm text-gray-600">
            第 {{ currentImageIndex + 1 }} / {{ completedFiles.length }} 张图片
          </div>
          <div class="flex space-x-2">
            <el-button size="small" @click="previousImage" :disabled="completedFiles.length <= 1">
              <el-icon>
                <ArrowLeft />
              </el-icon>
            </el-button>
            <el-button size="small" @click="nextImage" :disabled="completedFiles.length <= 1">
              <el-icon>
                <ArrowRight />
              </el-icon>
            </el-button>
          </div>
        </div>

        <!-- 当前图片的详细视图 -->
        <div v-if="currentFile" class="current-file-view bg-white rounded-lg shadow-lg p-6">
          <div class="flex flex-col lg:flex-row gap-6">
            <!-- 图片预览 -->
            <div class="flex-shrink-0">
              <img :src="currentFile.previewUrl" :alt="currentFile.file.name"
                class="w-full lg:w-80 h-64 object-cover rounded-lg shadow-md" />
              <div class="mt-2 text-center text-sm text-gray-600">
                {{ currentFile.file.name }} ({{ formatFileSize(currentFile.file.size) }})
              </div>
            </div>

            <!-- OCR编辑区域 -->
            <div class="flex-1">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-lg font-semibold text-green-600">✍️ OCR识别结果</h4>
                <el-button v-if="!currentFile.editingOcr" size="small" type="primary"
                  @click="startEditOcr(currentFile)">
                  <el-icon class="mr-1">
                    <Edit />
                  </el-icon>
                  编辑
                </el-button>
              </div>

              <!-- 显示模式 -->
              <div v-if="!currentFile.editingOcr" class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div v-if="currentFile.ocrResult" class="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {{ currentFile.ocrResult }}
                </div>
                <div v-else class="text-gray-400 italic">
                  点击编辑按钮添加OCR内容
                </div>
              </div>

              <!-- 编辑模式 -->
              <div v-else class="space-y-4">
                <el-input v-model="currentFile.editingOcrText" type="textarea" :rows="6" placeholder="输入OCR识别文字..."
                  class="w-full" />
                <div class="flex justify-end space-x-2">
                  <el-button @click="cancelEditOcr(currentFile)">
                    取消
                  </el-button>
                  <el-button type="primary" @click="saveOcrEdit(currentFile)">
                    保存
                  </el-button>
                </div>
              </div>

              <!-- AI分析结果 -->
              <div v-if="currentFile.aiResult" class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 class="text-sm font-semibold text-blue-700 mb-2">🤖 AI分析结果</h5>
                <div class="text-gray-700 text-sm leading-relaxed">{{ currentFile.aiResult }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 处理中或待处理的网格视图 -->
      <div v-else :class="gridClass">
        <div v-for="(fileItem, index) in fileQueue" :key="index"
          class="file-card bg-white rounded-xl shadow-sm border transition-all duration-300 hover:shadow-md" :class="{
            'border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100': fileItem.status === 'processing',
            'border-green-300 bg-gradient-to-br from-green-50 to-green-100': fileItem.status === 'completed',
            'border-red-300 bg-gradient-to-br from-red-50 to-red-100': fileItem.status === 'error',
            'border-gray-200 hover:border-gray-300': fileItem.status === 'pending'
          }">
          <!-- 图片预览区域 -->
          <div class="relative">
            <img :src="fileItem.previewUrl" :alt="fileItem.file.name" class="w-full h-32 object-cover rounded-t-xl" />
            <!-- 删除按钮 -->
            <el-button v-if="fileItem.status !== 'processing'" size="small" type="danger" :icon="Delete" circle
              class="absolute top-2 right-2 shadow-lg" @click="removeFile(index)" />
            <!-- 状态徽章 -->
            <div class="absolute bottom-2 left-2">
              <div v-if="fileItem.status === 'pending'"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                <el-icon class="mr-1 text-xs">
                  <Clock />
                </el-icon>
                等待处理
              </div>
              <div v-else-if="fileItem.status === 'processing'"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                处理中...
              </div>
              <div v-else-if="fileItem.status === 'completed'"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                <el-icon class="mr-1 text-xs">
                  <Check />
                </el-icon>
                已完成
              </div>
              <div v-else-if="fileItem.status === 'error'"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                <el-icon class="mr-1 text-xs">
                  <Close />
                </el-icon>
                错误
              </div>
            </div>
          </div>

          <!-- 文件信息区域 -->
          <div class="p-3">
            <div class="text-sm font-medium text-gray-900 truncate mb-1">
              {{ fileItem.file.name }}
            </div>
            <div class="text-xs text-gray-500 mb-2">
              {{ formatFileSize(fileItem.file.size) }}
            </div>

            <!-- 处理进度 -->
            <div v-if="fileItem.status === 'processing'" class="mt-2">
              <el-progress :percentage="fileItem.progress" :show-text="false" size="small" />
              <div class="text-xs text-blue-600 mt-1">{{ fileItem.processingMessage }}</div>
            </div>

            <!-- 错误信息 -->
            <div v-else-if="fileItem.status === 'error'" class="mt-2 text-xs text-red-600">
              {{ fileItem.error }}
            </div>
          </div>
        </div>
      </div>

      <!-- 批量操作按钮 -->
      <div class="flex justify-center mt-6 space-x-4">
        <el-button @click="clearQueue" :disabled="isProcessing">清空队列</el-button>
        <el-button v-if="!allProcessed" type="primary" @click="startBatchProcessing" :loading="isProcessing"
          :disabled="fileQueue.length === 0">
          {{ isProcessing ? '处理中...' : '开始批量处理' }}
        </el-button>

        <!-- 处理完成后显示确认保存按钮 -->
        <div v-if="allProcessed" class="flex space-x-4">
          <el-button type="success" size="large" @click="confirmSaveAll" :disabled="!hasCompletedFiles">
            <el-icon class="mr-2">
              <Check />
            </el-icon>
            全部确认保存 ({{fileQueue.filter(item => item.status === 'completed').length}})
          </el-button>
          <el-button @click="continueUploading">继续添加文件</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, Check, Close, Delete, Edit, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ImageProcessor } from '@/utils/image'
import { UploadService, type ProcessingProgress } from '@/utils/uploadService'
import { useMemeStore } from '@/stores/meme'
import type { MemeData, CategoryType } from '@/types'

interface FileItem {
  file: File
  previewUrl: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  processingMessage: string
  ocrResult: string
  aiResult: string
  error?: string
  editingOcr?: boolean
  editingOcrText?: string
  memeData?: MemeData // 临时存储处理结果，等待确认保存
}

interface Props {
  selectedCategory: CategoryType
}

const props = defineProps<Props>()
const emit = defineEmits<{
  allCompleted: []
}>()

const memeStore = useMemeStore()
const fileQueue = ref<FileItem[]>([])
const isProcessing = ref(false)
const currentImageIndex = ref(0)

const allProcessed = computed(() => fileQueue.value.length > 0 && fileQueue.value.every(item => item.status === 'completed' || item.status === 'error'))
const hasCompletedFiles = computed(() => fileQueue.value.some(item => item.status === 'completed'))
const completedFiles = computed(() => fileQueue.value.filter(item => item.status === 'completed'))
const currentFile = computed(() => completedFiles.value[currentImageIndex.value] || null)

// 根据文件数量动态调整网格布局
const gridClass = computed(() => {
  const count = fileQueue.value.length
  if (count === 1) return 'grid grid-cols-1 gap-4'
  if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-4'
  if (count <= 4) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4'
  if (count <= 6) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
})

const addFiles = (files: File[]) => {
  files.forEach(file => {
    const previewUrl = ImageProcessor.createPreviewUrl(file)
    fileQueue.value.push({
      file,
      previewUrl,
      status: 'pending',
      progress: 0,
      processingMessage: '',
      ocrResult: '',
      aiResult: ''
    })
  })
}

const removeFile = (index: number) => {
  const fileItem = fileQueue.value[index]
  if (fileItem.previewUrl) {
    ImageProcessor.cleanupUrls([fileItem.previewUrl])
  }
  fileQueue.value.splice(index, 1)
}

const clearQueue = () => {
  fileQueue.value.forEach(item => {
    if (item.previewUrl) {
      ImageProcessor.cleanupUrls([item.previewUrl])
    }
  })
  fileQueue.value = []
}

const formatFileSize = (bytes: number): string => {
  return ImageProcessor.formatFileSize(bytes)
}

// 轮播切换功能
const nextImage = () => {
  if (completedFiles.value.length > 1) {
    currentImageIndex.value = (currentImageIndex.value + 1) % completedFiles.value.length
  }
}

const previousImage = () => {
  if (completedFiles.value.length > 1) {
    currentImageIndex.value = currentImageIndex.value === 0
      ? completedFiles.value.length - 1
      : currentImageIndex.value - 1
  }
}

// OCR编辑相关方法
const startEditOcr = (fileItem: FileItem) => {
  fileItem.editingOcr = true
  fileItem.editingOcrText = fileItem.ocrResult || ''
}

const cancelEditOcr = (fileItem: FileItem) => {
  fileItem.editingOcr = false
  fileItem.editingOcrText = ''
}

const saveOcrEdit = async (fileItem: FileItem) => {
  if (!fileItem.editingOcrText) {
    fileItem.editingOcrText = ''
  }

  // 更新当前文件项的OCR结果
  fileItem.ocrResult = fileItem.editingOcrText.trim()
  fileItem.editingOcr = false
  fileItem.editingOcrText = ''

  // 只更新本地的OCR结果，不立即保存到store
  // 等待用户确认保存时才会批量更新到store
  ElMessage.success('OCR内容已更新，请点击"全部确认保存"来保存所有文件')
}

const processFile = async (fileItem: FileItem): Promise<void> => {
  fileItem.status = 'processing'
  fileItem.progress = 0

  try {
    // 检查是否可以使用真实服务
    const canUseReal = UploadService.canUseRealServices().overall

    const result = await UploadService.processFile(
      fileItem.file,
      props.selectedCategory,
      (progress: ProcessingProgress) => {
        fileItem.progress = progress.progress
        fileItem.processingMessage = progress.message

        // 更新LLM分析结果（如果有的话）
        if (progress.stage === 'analyzing' && progress.progress >= 90) {
          // LLM分析完成时的逻辑可以在这里处理
        }
      },
      canUseReal // 根据配置决定是否使用真实服务
    )

    if (result.success && result.memeData) {
      // 更新文件项的结果显示
      fileItem.ocrResult = result.memeData.ocrText
      fileItem.aiResult = result.memeData.aiDescription

      // 如果使用了Cloudinary，更新图片URL
      if (result.memeData.cloudinaryId) {
        // 清理旧的预览URL
        ImageProcessor.cleanupUrls([fileItem.previewUrl])
        fileItem.previewUrl = result.memeData.imageUrl
      }

      // 如果用户已经编辑了OCR结果，优先使用用户的编辑
      if (fileItem.ocrResult && fileItem.ocrResult !== result.memeData.ocrText) {
        result.memeData.ocrText = fileItem.ocrResult
      }

      // 临时保存处理结果，等待用户确认
      fileItem.memeData = result.memeData

      fileItem.status = 'completed'
      fileItem.processingMessage = '处理完成'
    } else {
      throw new Error(result.error || '处理失败')
    }

  } catch (error) {
    fileItem.status = 'error'
    fileItem.error = error instanceof Error ? error.message : '处理失败'
    console.error('文件处理失败:', error)
  }
}

const startBatchProcessing = async () => {
  isProcessing.value = true

  const pendingFiles = fileQueue.value.filter(item => item.status === 'pending')

  try {
    // 并行处理多个文件，但限制并发数量
    const batchSize = 2
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize)
      await Promise.all(batch.map(processFile))
    }

    ElMessage.success(`成功处理 ${pendingFiles.length} 个文件！`)
    // 不再自动触发 allCompleted 事件，等待用户确认保存

  } catch (error) {
    ElMessage.error('批量处理过程中出现错误')
  } finally {
    isProcessing.value = false
  }
}

// 确认保存所有处理完成的文件
const confirmSaveAll = async () => {
  const completedFiles = fileQueue.value.filter(item => item.status === 'completed' && item.memeData)

  if (completedFiles.length === 0) {
    ElMessage.warning('没有需要保存的文件')
    return
  }

  try {
    // 批量保存到store
    completedFiles.forEach(fileItem => {
      if (fileItem.memeData) {
        // 如果用户修改了OCR结果，更新memeData中的OCR文本
        if (fileItem.ocrResult !== fileItem.memeData.ocrText) {
          fileItem.memeData.ocrText = fileItem.ocrResult
        }
        memeStore.addMeme(fileItem.memeData)
      }
    })

    ElMessage.success(`成功保存 ${completedFiles.length} 个文件！`)

    // 触发完成事件，通知父组件
    emit('allCompleted')

  } catch (error) {
    console.error('批量保存失败:', error)
    ElMessage.error('保存失败，请重试')
  }
}

// 继续上传更多文件
const continueUploading = () => {
  // 清除已完成的文件
  const completedIndices: number[] = []
  fileQueue.value.forEach((item, index) => {
    if (item.status === 'completed') {
      completedIndices.push(index)
    }
  })

  // 从后往前删除，避免索引变化问题
  for (let i = completedIndices.length - 1; i >= 0; i--) {
    removeFile(completedIndices[i])
  }

  // 重置轮播索引
  currentImageIndex.value = 0

  ElMessage.info('已清理完成的文件，可以继续添加新文件')
}

const handlePaste = async (event: ClipboardEvent) => {
  if (!event.clipboardData) return

  const items = Array.from(event.clipboardData.items)
  const imageItems = items.filter(item => item.type.startsWith('image/'))

  if (imageItems.length === 0) {
    return
  }

  event.preventDefault()

  try {
    const files: File[] = []

    for (const item of imageItems) {
      const file = item.getAsFile()
      if (file) {
        const validation = ImageProcessor.validateImage(file)
        if (!validation.valid) {
          ElMessage.error(`粘贴的图片无效: ${validation.error}`)
          continue
        }
        files.push(file)
      }
    }

    if (files.length === 0) {
      ElMessage.error('没有有效的图片可以粘贴到队列')
      return
    }

    addFiles(files)
    ElMessage.success(`成功粘贴 ${files.length} 张图片到处理队列！`)

  } catch (error) {
    console.error('粘贴图片失败:', error)
    ElMessage.error('粘贴图片失败，请重试')
  }
}

// 暴露方法给父组件
defineExpose({
  addFiles,
  clearQueue
})
</script>

<style scoped>
.file-card {
  transition: all 0.3s ease;
  overflow: hidden;
}

.file-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.current-file-view {
  transition: all 0.3s ease;
}

.carousel-container {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.multi-file-upload:focus {
  outline: none;
}

/* 网格布局优化 */
.grid {
  gap: 1rem;
}

@media (min-width: 768px) {
  .grid {
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .grid {
    gap: 2rem;
  }
}

/* 响应式文字大小调整 */
@media (max-width: 640px) {
  .file-card .text-sm {
    font-size: 0.875rem;
  }

  .file-card .text-xs {
    font-size: 0.75rem;
  }
}
</style>