<template>
  <div class="multi-file-upload" @paste="handlePaste" tabindex="0">
    <!-- 文件队列显示 -->
    <div v-if="fileQueue.length > 0" class="file-queue mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">📂 待处理文件 ({{ fileQueue.length }})</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(fileItem, index) in fileQueue"
          :key="index"
          class="file-item p-4 border rounded-lg"
          :class="{
            'border-blue-300 bg-blue-50': fileItem.status === 'processing',
            'border-green-300 bg-green-50': fileItem.status === 'completed',
            'border-red-300 bg-red-50': fileItem.status === 'error',
            'border-gray-200': fileItem.status === 'pending'
          }"
        >
          <div class="flex items-start space-x-3">
            <img
              :src="fileItem.previewUrl"
              :alt="fileItem.file.name"
              class="w-16 h-16 object-cover rounded"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ fileItem.file.name }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatFileSize(fileItem.file.size) }}
              </p>

              <!-- 状态显示 -->
              <div class="mt-2">
                <div v-if="fileItem.status === 'pending'" class="flex items-center text-gray-500">
                  <el-icon class="mr-1"><Clock /></el-icon>
                  <span class="text-xs">等待处理</span>
                </div>
                <div v-else-if="fileItem.status === 'processing'" class="text-blue-600">
                  <el-progress :percentage="fileItem.progress" :show-text="false" size="small" />
                  <span class="text-xs">{{ fileItem.processingMessage }}</span>
                </div>
                <div v-else-if="fileItem.status === 'completed'" class="flex items-center text-green-600">
                  <el-icon class="mr-1"><Check /></el-icon>
                  <span class="text-xs">处理完成</span>
                </div>
                <div v-else-if="fileItem.status === 'error'" class="flex items-center text-red-600">
                  <el-icon class="mr-1"><Close /></el-icon>
                  <span class="text-xs">{{ fileItem.error }}</span>
                </div>
              </div>
            </div>

            <!-- 删除按钮 -->
            <el-button
              v-if="fileItem.status !== 'processing'"
              size="small"
              type="danger"
              :icon="Delete"
              circle
              @click="removeFile(index)"
            />
          </div>
        </div>
      </div>

      <!-- 批量操作按钮 -->
      <div class="flex justify-center mt-6 space-x-4">
        <el-button @click="clearQueue" :disabled="isProcessing">清空队列</el-button>
        <el-button
          type="primary"
          @click="startBatchProcessing"
          :loading="isProcessing"
          :disabled="fileQueue.length === 0"
        >
          {{ isProcessing ? '处理中...' : '开始批量处理' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, Check, Close, Delete } from '@element-plus/icons-vue'
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

      // 保存到store
      memeStore.addMeme(result.memeData)

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
    emit('allCompleted')

  } catch (error) {
    ElMessage.error('批量处理过程中出现错误')
  } finally {
    isProcessing.value = false
  }
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
.file-item {
  transition: all 0.3s ease;
}

.file-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.multi-file-upload:focus {
  outline: none;
}
</style>