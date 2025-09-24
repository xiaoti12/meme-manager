<template>
  <div class="container mx-auto px-4 py-8" @paste="handlePaste">
    <div class="max-w-2xl mx-auto">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow">
        <div class="text-center mb-8">
          <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
              <h2 class="text-3xl font-bold text-gray-800 mb-4">📤 上传表情包</h2>
            </div>
            <div class="flex items-center space-x-2">
              <ServiceStatus />
              <el-button
                type="info"
                plain
                size="small"
                @click="showConfigDialog = true"
              >
                ⚙️ LLM配置
              </el-button>
              <!-- 开发模式调试按钮 -->
              <div v-if="isDev" class="flex space-x-1">
                <el-button size="small" type="info" @click="debugUpload">
                  调试
                </el-button>
                <el-button size="small" type="danger" @click="clearData">
                  清空数据
                </el-button>
              </div>
            </div>
          </div>
          <p class="text-gray-600">支持拖拽上传、粘贴上传，自动OCR识别文字，AI分析图片内容</p>
          <div class="text-sm text-blue-600 mt-2">
            💡 提示：按 Ctrl+V (或 Cmd+V) 可直接粘贴剪贴板中的图片
          </div>
        </div>

        <!-- 文件上传区域 -->
        <el-upload
          ref="uploadRef"
          class="upload-demo"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :before-upload="beforeUpload"
          accept="image/*"
          :show-file-list="false"
          multiple
          :limit="20"
          :on-exceed="handleExceed"
        >
          <div class="upload-area" :class="{ 'drag-over': isDragOver }">
            <el-icon class="text-6xl text-gray-400 mb-4"><UploadFilled /></el-icon>
            <div class="text-lg text-gray-600 mb-2">将图片拖拽到此处，或点击上传</div>
            <div class="text-sm text-gray-400">支持 JPG、PNG、GIF、WebP 格式，单个文件不超过 10MB</div>
            <div class="text-xs text-gray-400 mt-2">一次最多上传 20 个文件</div>
          </div>
        </el-upload>

        <!-- 分类选择 -->
        <div class="mt-8 mb-6">
          <label class="text-sm font-medium text-gray-700 mb-2 block">📂 选择分类</label>
          <el-select
            v-model="selectedCategory"
            placeholder="请选择分类"
            class="w-full"
            clearable
          >
            <el-option
              v-for="option in categoryOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            >
              <span>{{ option.label }}</span>
            </el-option>
          </el-select>
        </div>

        <!-- 多文件上传组件 -->
        <MultiFileUpload
          ref="multiFileUploadRef"
          :selected-category="selectedCategory"
          @all-completed="handleAllCompleted"
        />

        <!-- 单文件预览区域（保留兼容性） -->
        <div v-if="previewFile && !hasMultipleFiles" class="mt-8">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">📷 图片预览</h3>
          <div class="bg-gray-50 rounded-xl p-4 mb-6">
            <img
              :src="previewUrl"
              :alt="previewFile.name"
              class="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
            />
          </div>

          <!-- 处理状态 -->
          <div v-if="processing" class="mb-6">
            <div class="text-center py-8">
              <el-icon class="text-4xl text-primary-500 animate-spin mb-4"><Loading /></el-icon>
              <div class="text-lg text-gray-700 mb-2">正在处理图片...</div>
              <div class="text-sm text-gray-500">{{ processingMessage }}</div>
              <el-progress :percentage="processingProgress" class="mt-4" />
            </div>
          </div>

          <!-- 处理结果 -->
          <div v-if="ocrResult || aiResult" class="mb-6 space-y-4">
            <div v-if="ocrResult || editingOcr" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-semibold text-green-700">✍️ OCR识别结果</div>
                <el-button
                  v-if="!editingOcr"
                  size="small"
                  type="text"
                  @click="startEditOcr"
                  :title="ocrResult ? '编辑OCR结果' : '添加OCR内容'"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
              </div>

              <!-- 显示模式 -->
              <div v-if="!editingOcr" class="text-gray-700">
                {{ ocrResult || '点击编辑按钮添加OCR内容' }}
              </div>

              <!-- 编辑模式 -->
              <div v-else class="space-y-3">
                <el-input
                  v-model="editingOcrText"
                  type="textarea"
                  :rows="3"
                  placeholder="输入OCR识别文字..."
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
            <div v-if="aiResult" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="text-sm font-semibold text-blue-700 mb-2">🤖 AI分析结果</div>
              <div class="text-gray-700">{{ aiResult }}</div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-4 justify-center">
            <el-button size="large" @click="resetForm">重新选择</el-button>
            <el-button
              type="primary"
              size="large"
              :loading="processing"
              :disabled="!selectedCategory"
              @click="handleUpload"
            >
              {{ processing ? '处理中...' : '确认上传' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- LLM配置对话框 -->
    <el-dialog v-model="showConfigDialog" title="LLM大模型配置" width="700px" destroy-on-close>
      <LLMConfig @config-saved="handleConfigSaved" />
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Loading, Edit } from '@element-plus/icons-vue'
import { useMemeStore } from '@/stores/meme'
import { useRouter } from 'vue-router'
import { ImageProcessor } from '@/utils/image'
import { UploadService, type ProcessingProgress } from '@/utils/uploadService'
import { DebugUpload } from '@/utils/debugUpload'
import MultiFileUpload from '@/components/MultiFileUpload.vue'
import ServiceStatus from '@/components/ServiceStatus.vue'
import LLMConfig from '@/components/LLMConfig.vue'
import type { MemeData, CategoryType } from '@/types'
import { CategoryManager as CM } from '@/utils/categoryManager'

const memeStore = useMemeStore()
const router = useRouter()

const uploadRef = ref()
const multiFileUploadRef = ref()
const previewFile = ref<File | null>(null)
const previewUrl = ref('')
const selectedCategory = ref<CategoryType>('default')
const processing = ref(false)
const processingMessage = ref('')
const processingProgress = ref(0)
const ocrResult = ref('')
const aiResult = ref('')
const editingOcr = ref(false)
const editingOcrText = ref('')
const isDragOver = ref(false)
const uploadedFiles = ref<File[]>([])
const showConfigDialog = ref(false)
const categoryOptions = ref<Array<{ label: string; value: string; icon?: string }>>([])

const hasMultipleFiles = computed(() => uploadedFiles.value.length > 1)
const isDev = computed(() => import.meta.env.DEV)

const beforeUpload = (file: File) => {
  const validation = ImageProcessor.validateImage(file)
  if (!validation.valid) {
    ElMessage.error(validation.error!)
    return false
  }
  return true
}

const handleExceed = () => {
  ElMessage.warning('最多只能上传 20 个文件!')
}

const handleDragOver = () => {
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleFileChange = (file: any, fileList: any[]) => {
  if (!beforeUpload(file.raw)) return

  // 获取所有文件
  const files = fileList.map(item => item.raw).filter(Boolean)
  uploadedFiles.value = files

  if (files.length === 1) {
    // 单文件模式
    previewFile.value = files[0]
    previewUrl.value = URL.createObjectURL(files[0])
    processImage(files[0])
  } else if (files.length > 1) {
    // 多文件模式
    previewFile.value = null
    previewUrl.value = ''
    // 添加文件到多文件上传组件
    if (multiFileUploadRef.value) {
      multiFileUploadRef.value.addFiles(files)
    }
  }
}

const processImage = async (file: File) => {
  processing.value = true
  processingProgress.value = 0

  try {
    // 检查是否可以使用真实服务
    const canUseReal = UploadService.canUseRealServices().overall

    // 显示服务状态
    const serviceStatus = UploadService.getServiceStatus()
    console.log('服务状态:', serviceStatus)

    const result = await UploadService.processFile(
      file,
      selectedCategory.value,
      (progress: ProcessingProgress) => {
        processingProgress.value = progress.progress
        processingMessage.value = progress.message

        // 如果是单文件模式，实时更新OCR和AI结果
        if (progress.stage === 'ocr' && progress.progress >= 70) {
          // 这里可以获取中间结果，但UploadService没有直接提供
          // 所以我们等待完成后再更新
        }
      },
      canUseReal
    )

    if (result.success && result.memeData) {
      // 更新OCR和AI结果显示
      ocrResult.value = result.memeData.ocrText
      aiResult.value = result.memeData.aiDescription

      // 如果使用了Cloudinary，更新图片URL
      if (result.memeData.cloudinaryId && previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = result.memeData.imageUrl
      }

      processingMessage.value = '处理完成!'
    } else {
      throw new Error(result.error || '处理失败')
    }

  } catch (error) {
    console.error('图片处理错误:', error)
    ElMessage.error('图片处理失败，请重试')
  } finally {
    processing.value = false
  }
}

const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))


const handleUpload = async () => {
  if (!previewFile.value || !selectedCategory.value) {
    ElMessage.error('请选择文件和分类')
    return
  }

  // 如果已经处理过了（有OCR和AI结果），直接保存
  if (ocrResult.value || aiResult.value) {
    try {
      processing.value = true
      processingMessage.value = '正在保存...'

      // 创建表情包数据
      const memeData: MemeData = {
        id: Date.now().toString(),
        filename: previewFile.value.name,
        imageUrl: previewUrl.value,
        category: selectedCategory.value,
        ocrText: ocrResult.value,
        aiDescription: aiResult.value,
        uploadDate: new Date(),
        fileSize: previewFile.value.size,
        format: previewFile.value.type.split('/')[1]
      }

      // 添加到store
      memeStore.addMeme(memeData)

      ElMessage.success('上传成功！')

      // 跳转到首页
      router.push('/')

    } catch (error) {
      ElMessage.error('上传失败，请重试')
    } finally {
      processing.value = false
    }
  } else {
    // 如果还没有处理，先处理再保存
    await processImage(previewFile.value)
    if (ocrResult.value || aiResult.value) {
      // 处理完成后，再次调用保存逻辑
      await handleUpload()
    }
  }
}

const handleAllCompleted = () => {
  ElMessage.success('所有文件处理完成！')
  // 等待一段时间后自动跳转到首页
  setTimeout(() => {
    router.push('/')
  }, 2000)
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
      ElMessage.error('没有有效的图片可以粘贴')
      return
    }

    uploadedFiles.value = [...uploadedFiles.value, ...files]

    if (files.length === 1 && uploadedFiles.value.length === 1) {
      previewFile.value = files[0]
      previewUrl.value = URL.createObjectURL(files[0])
      processImage(files[0])
      ElMessage.success('图片粘贴成功！')
    } else {
      previewFile.value = null
      previewUrl.value = ''
      if (multiFileUploadRef.value) {
        multiFileUploadRef.value.addFiles(files)
      }
      ElMessage.success(`成功粘贴 ${files.length} 张图片！`)
    }
  } catch (error) {
    console.error('粘贴图片失败:', error)
    ElMessage.error('粘贴图片失败，请重试')
  }
}

const resetForm = () => {
  // 清理图片URL资源
  if (previewUrl.value) {
    ImageProcessor.cleanupUrls([previewUrl.value])
  }

  previewFile.value = null
  previewUrl.value = ''
  selectedCategory.value = 'default'
  ocrResult.value = ''
  aiResult.value = ''
  editingOcr.value = false
  editingOcrText.value = ''
  processing.value = false
  processingProgress.value = 0
  processingMessage.value = ''
  uploadedFiles.value = []
  uploadRef.value?.clearFiles()

  // 清理多文件上传组件
  if (multiFileUploadRef.value) {
    multiFileUploadRef.value.clearQueue()
  }
}

// OCR编辑相关方法
const startEditOcr = () => {
  editingOcr.value = true
  editingOcrText.value = ocrResult.value || ''
}

const cancelOcrEdit = () => {
  editingOcr.value = false
  editingOcrText.value = ''
}

const saveOcrEdit = async () => {
  try {
    ocrResult.value = editingOcrText.value.trim()
    editingOcr.value = false
    editingOcrText.value = ''

    ElMessage.success('OCR内容已保存')
  } catch (error) {
    console.error('保存OCR编辑失败:', error)
    ElMessage.error('保存失败，请重试')
  }
}

// 开发模式调试功能
const debugUpload = () => {
  DebugUpload.checkServiceStatus()
}

const clearData = () => {
  DebugUpload.clearStorageData()
  // 重新加载页面或清空store数据
  memeStore.loadFromStorage()
  ElMessage.success('数据已清空！')
}

const handleConfigSaved = () => {
  showConfigDialog.value = false
  ElMessage.success('配置已保存！')
}

// 加载分类选项
const loadCategoryOptions = () => {
  categoryOptions.value = CM.getCategoryOptions()

  // 如果当前选中的分类不存在了，重置为默认分类
  if (selectedCategory.value && selectedCategory.value !== 'default') {
    const exists = categoryOptions.value.some(opt => opt.value === selectedCategory.value)
    if (!exists) {
      selectedCategory.value = 'default'
    }
  }
}


// 组件挂载时加载分类选项
onMounted(() => {
  loadCategoryOptions()
})
</script>

<style scoped>
.container {
  max-w: 1200px;
}

.upload-area {
  padding: 40px 20px;
  text-align: center;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
}

.upload-area:hover {
  border-color: #667eea;
  background: linear-gradient(145deg, #f8faff, #eff6ff);
  transform: translateY(-2px);
}

.upload-area.drag-over {
  border-color: #10b981;
  background: linear-gradient(145deg, #f0fdf4, #ecfdf5);
  border-width: 3px;
}

:deep(.el-upload-dragger) {
  border: none;
  background: transparent;
  padding: 0;
}

:deep(.el-upload-dragger:hover) {
  border-color: transparent;
}
</style>