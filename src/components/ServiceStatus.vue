<template>
  <div class="service-status">
    <el-tooltip content="点击查看服务配置详情" placement="top">
      <el-button
        :type="isAllConfigured ? 'success' : 'warning'"
        :icon="isAllConfigured ? SuccessFilled : WarningFilled"
        size="small"
        @click="showDialog = true"
      >
        {{ statusText }}
      </el-button>
    </el-tooltip>

    <el-dialog v-model="showDialog" title="服务配置状态" width="500px">
      <div class="space-y-4">
        <div class="service-item">
          <div class="flex items-center justify-between">
            <span class="font-medium">图片存储 (Cloudinary)</span>
            <el-tag :type="serviceStatus.cloudinary === '已配置' ? 'success' : 'warning'">
              {{ serviceStatus.cloudinary }}
            </el-tag>
          </div>
          <p class="text-sm text-gray-600 mt-1">
            {{ serviceStatus.cloudinary === '已配置' ?
                '图片将上传到Cloudinary云存储' :
                '图片将使用本地预览，刷新后会丢失' }}
          </p>
        </div>

        <div class="service-item">
          <div class="flex items-center justify-between">
            <span class="font-medium">AI图片分析 (Hugging Face)</span>
            <el-tag :type="serviceStatus.huggingFace === '已配置' ? 'success' : 'warning'">
              {{ serviceStatus.huggingFace }}
            </el-tag>
          </div>
          <p class="text-sm text-gray-600 mt-1">
            {{ serviceStatus.huggingFace === '已配置' ?
                '将使用真实的AI模型分析图片' :
                '将使用模拟的AI分析结果' }}
          </p>
        </div>

        <div class="service-item">
          <div class="flex items-center justify-between">
            <span class="font-medium">OCR文字识别 (Tesseract.js)</span>
            <el-tag type="success">{{ serviceStatus.ocr }}</el-tag>
          </div>
          <p class="text-sm text-gray-600 mt-1">
            本地OCR服务，无需配置，支持中英文识别
          </p>
        </div>

        <el-divider />

        <div class="config-guide">
          <h4 class="font-medium mb-2">配置指南</h4>
          <p class="text-sm text-gray-600 mb-2">
            要启用完整功能，请创建 <code>.env.local</code> 文件并配置以下环境变量：
          </p>
          <el-input
            :model-value="configExample"
            :rows="6"
            type="textarea"
            readonly
            class="config-text"
          />
          <p class="text-xs text-gray-500 mt-2">
            参考 <code>.env.example</code> 文件了解详细配置
          </p>
        </div>
      </div>

      <template #footer>
        <el-button @click="showDialog = false">关闭</el-button>
        <el-button type="primary" @click="refreshStatus">刷新状态</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { SuccessFilled, WarningFilled } from '@element-plus/icons-vue'
import { UploadService } from '@/utils/uploadService'

const showDialog = ref(false)
const serviceStatus = ref({
  cloudinary: '检查中...',
  huggingFace: '检查中...',
  ocr: '检查中...'
})

const configExample = `# Cloudinary配置（图片存储）
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Hugging Face配置（AI图片分析）
VITE_HF_TOKEN=your_hugging_face_token
VITE_HF_MODEL_URL=https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base

# 注意：使用unsigned upload preset确保安全性`

const isAllConfigured = computed(() => {
  return serviceStatus.value.cloudinary === '已配置' &&
         serviceStatus.value.huggingFace === '已配置'
})

const statusText = computed(() => {
  if (isAllConfigured.value) {
    return '完整模式'
  } else {
    return '演示模式'
  }
})

const refreshStatus = () => {
  serviceStatus.value = UploadService.getServiceStatus()
}

onMounted(() => {
  refreshStatus()
})
</script>

<style scoped>
.service-status {
  display: inline-block;
}

.service-item {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background-color: #fafafa;
}

.config-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

code {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}
</style>