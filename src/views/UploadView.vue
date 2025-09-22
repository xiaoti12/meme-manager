<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold text-gray-800 mb-4">📤 上传表情包</h2>
          <p class="text-gray-600">支持拖拽上传，自动OCR识别文字，AI分析图片内容</p>
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
        >
          <div class="upload-area">
            <el-icon class="text-6xl text-gray-400 mb-4"><UploadFilled /></el-icon>
            <div class="text-lg text-gray-600 mb-2">将图片拖拽到此处，或点击上传</div>
            <div class="text-sm text-gray-400">支持 JPG、PNG、GIF 格式，单个文件不超过 10MB</div>
          </div>
        </el-upload>

        <!-- 预览区域 -->
        <div v-if="previewFile" class="mt-8">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">📷 图片预览</h3>
          <div class="bg-gray-50 rounded-xl p-4 mb-6">
            <img
              :src="previewUrl"
              :alt="previewFile.name"
              class="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
            />
          </div>

          <!-- 分类选择 -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">📂 选择分类</label>
            <el-select v-model="selectedCategory" placeholder="请选择分类" class="w-full">
              <el-option label="表情包" value="emoji" />
              <el-option label="动漫" value="anime" />
              <el-option label="其他" value="other" />
            </el-select>
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
            <div v-if="ocrResult" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="text-sm font-semibold text-green-700 mb-2">✍️ OCR识别结果</div>
              <div class="text-gray-700">{{ ocrResult }}</div>
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Loading } from '@element-plus/icons-vue'
import { useMemeStore } from '@/stores/meme'
import { useRouter } from 'vue-router'
import { ImageProcessor } from '@/utils/image'
import { OCRService } from '@/utils/ocr'
import { AIVisionService } from '@/utils/ai'
import type { MemeData, CategoryType } from '@/types'

const memeStore = useMemeStore()
const router = useRouter()

const uploadRef = ref()
const previewFile = ref<File | null>(null)
const previewUrl = ref('')
const selectedCategory = ref<CategoryType>('emoji')
const processing = ref(false)
const processingMessage = ref('')
const processingProgress = ref(0)
const ocrResult = ref('')
const aiResult = ref('')

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error('请上传图片文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB!')
    return false
  }
  return true
}

const handleFileChange = (file: any) => {
  if (!beforeUpload(file.raw)) return

  previewFile.value = file.raw
  previewUrl.value = URL.createObjectURL(file.raw)

  // 自动开始OCR和AI处理
  processImage(file.raw)
}

const processImage = async (file: File) => {
  processing.value = true
  processingProgress.value = 0

  try {
    // 阶段1：图片预处理
    processingMessage.value = '正在处理图片...'
    processingProgress.value = 10

    const imageInfo = await ImageProcessor.getImageInfo(file)
    console.log('图片信息:', imageInfo)

    // 阶段2：OCR识别
    processingMessage.value = '正在进行OCR文字识别...'
    processingProgress.value = 30

    const ocrResultData = await OCRService.mockRecognize(file) // 使用模拟版本
    ocrResult.value = ocrResultData.success ? ocrResultData.text : '未能识别文字'

    // 阶段3：AI分析
    processingMessage.value = '正在进行AI图片内容分析...'
    processingProgress.value = 70

    const aiResultData = await AIVisionService.mockDescribe(file) // 使用模拟版本
    aiResult.value = aiResultData.success ? aiResultData.description : '未能生成描述'

    processingProgress.value = 100
    processingMessage.value = '处理完成!'

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

  try {
    processing.value = true
    processingMessage.value = '正在保存...'

    // 创建表情包数据
    const memeData: MemeData = {
      id: Date.now().toString(),
      filename: previewFile.value.name,
      imageUrl: previewUrl.value, // 在实际应用中，这里应该是上传到云存储后的URL
      category: selectedCategory.value,
      ocrText: ocrResult.value,
      aiDescription: aiResult.value,
      uploadDate: new Date(),
      fileSize: previewFile.value.size,
      format: previewFile.value.type.split('/')[1]
      // width 和 height 将在后续版本中添加
    }

    // 添加到store（addMeme方法已经包含了saveToStorage）
    memeStore.addMeme(memeData)

    ElMessage.success('上传成功！')

    // 跳转到首页
    router.push('/')

  } catch (error) {
    ElMessage.error('上传失败，请重试')
  } finally {
    processing.value = false
  }
}

const resetForm = () => {
  // 清理图片URL资源
  if (previewUrl.value) {
    ImageProcessor.cleanupUrls([previewUrl.value])
  }

  previewFile.value = null
  previewUrl.value = ''
  selectedCategory.value = 'emoji'
  ocrResult.value = ''
  aiResult.value = ''
  processing.value = false
  processingProgress.value = 0
  processingMessage.value = ''
  uploadRef.value?.clearFiles()
}
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
}

.upload-area:hover {
  border-color: #667eea;
  background-color: #f8faff;
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