<template>
  <div class="llm-config">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>🤖 LLM大模型配置</span>
          <el-tag :type="isConfigured ? 'success' : 'warning'" size="small">
            {{ isConfigured ? '已配置' : '未配置' }}
          </el-tag>
        </div>
      </template>

      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="API端点" prop="baseUrl" required>
          <el-input
            v-model="formData.baseUrl"
            placeholder="例如: https://api.openai.com/v1"
            clearable
          />
          <div class="form-tip">
            支持OpenAI兼容的API端点，如OpenAI、Claude、本地模型等
          </div>
        </el-form-item>

        <el-form-item label="模型名称" prop="model" required>
          <el-select
            v-model="formData.model"
            placeholder="选择或输入模型名称"
            filterable
            allow-create
            style="width: 100%"
          >
            <el-option
              v-for="model in popularModels"
              :key="model.value"
              :label="model.label"
              :value="model.value"
            >
              <span>{{ model.label }}</span>
              <span class="model-desc">{{ model.desc }}</span>
            </el-option>
          </el-select>
          <div class="form-tip">
            必须选择支持视觉功能的模型
          </div>
        </el-form-item>

        <el-form-item label="API密钥" prop="token" required>
          <el-input
            v-model="formData.token"
            type="password"
            placeholder="输入您的API密钥"
            show-password
            clearable
          />
          <div class="form-tip">
            密钥将保存在本地浏览器中，不会上传到服务器
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="testConnection" :loading="testing">
            测试连接
          </el-button>
          <el-button @click="saveConfig" :disabled="!isFormValid">
            保存配置
          </el-button>
          <el-button @click="clearConfig" type="danger" plain>
            清除配置
          </el-button>
        </el-form-item>
      </el-form>

      <el-divider />

      <div class="test-section">
        <h4>连接测试</h4>
        <div v-if="testResult" class="test-result">
          <el-alert
            :title="testResult.success ? '连接成功' : '连接失败'"
            :type="testResult.success ? 'success' : 'error'"
            :description="testResult.message"
            show-icon
            :closable="false"
          />
        </div>
        <div v-if="!testResult" class="test-placeholder">
          <el-text type="info">配置完成后点击"测试连接"来验证设置</el-text>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { LLMVisionService } from '@/utils/ocr'
import type { FormInstance } from 'element-plus'

interface LLMFormData {
  baseUrl: string
  model: string
  token: string
}

interface TestResult {
  success: boolean
  message: string
}

const formRef = ref<FormInstance>()
const testing = ref(false)
const testResult = ref<TestResult | null>(null)

const formData = reactive<LLMFormData>({
  baseUrl: '',
  model: '',
  token: ''
})

const popularModels = [
  {
    label: 'GPT-4 Vision Preview',
    value: 'gpt-4-vision-preview',
    desc: 'OpenAI最新视觉模型'
  },
  {
    label: 'GPT-4o',
    value: 'gpt-4o',
    desc: 'OpenAI多模态模型'
  },
  {
    label: 'Claude 3 Sonnet',
    value: 'claude-3-sonnet-20240229',
    desc: 'Anthropic视觉模型'
  },
  {
    label: 'Claude 3 Opus',
    value: 'claude-3-opus-20240229',
    desc: 'Anthropic最强视觉模型'
  },
  {
    label: 'Qwen-VL-Chat',
    value: 'qwen-vl-chat',
    desc: '阿里云千问视觉模型'
  }
]

const rules = {
  baseUrl: [
    { required: true, message: '请输入API端点', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '请输入有效的URL', trigger: 'blur' }
  ],
  model: [
    { required: true, message: '请选择模型', trigger: 'change' }
  ],
  token: [
    { required: true, message: '请输入API密钥', trigger: 'blur' },
    { min: 10, message: 'API密钥长度不能少于10位', trigger: 'blur' }
  ]
}

const isFormValid = computed(() => {
  return formData.baseUrl && formData.model && formData.token
})

const isConfigured = computed(() => {
  return !!LLMVisionService.getConfig()
})

const loadConfig = () => {
  // 使用 LLMVisionService 的统一配置加载方法
  const config = LLMVisionService.getConfig()
  if (config) {
    formData.baseUrl = config.baseUrl
    formData.model = config.model
    formData.token = config.token
  }
}

const emit = defineEmits<{
  configSaved: []
}>()

const saveConfig = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const config = {
      baseUrl: formData.baseUrl,
      model: formData.model,
      token: formData.token
    }

    // 保存到本地存储
    localStorage.setItem('llm-config', JSON.stringify(config))

    // 应用配置
    LLMVisionService.setConfig(config)

    ElMessage.success('配置保存成功！')
    testResult.value = null

    // 发出配置保存事件
    emit('configSaved')
  } catch (error) {
    ElMessage.error('配置验证失败，请检查输入')
  }
}

const clearConfig = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清除LLM配置吗？这将删除所有已保存的设置。',
      '确认清除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 清除本地存储
    localStorage.removeItem('llm-config')

    // 重置表单
    formData.baseUrl = ''
    formData.model = ''
    formData.token = ''

    // 清除服务配置
    LLMVisionService.setConfig({
      baseUrl: '',
      model: '',
      token: ''
    })

    testResult.value = null
    ElMessage.success('配置已清除')
  } catch (error) {
    // 用户取消操作
  }
}

const testConnection = async () => {
  if (!isFormValid.value) {
    ElMessage.warning('请先完成配置')
    return
  }

  testing.value = true
  testResult.value = null

  try {
    // 临时设置配置进行测试
    const testConfig = {
      baseUrl: formData.baseUrl,
      model: formData.model,
      token: formData.token
    }

    LLMVisionService.setConfig(testConfig)

    // 创建一个测试用的图片文件
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, 100, 100)
    ctx.fillStyle = '#333'
    ctx.font = '16px Arial'
    ctx.fillText('Test', 30, 50)

    // 转换为File对象
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png')
    })
    const testFile = new File([blob], 'test.png', { type: 'image/png' })

    // 测试API调用
    const result = await LLMVisionService.analyzeImage(testFile)

    if (result.success) {
      testResult.value = {
        success: true,
        message: `连接成功！模型响应正常，识别置信度: ${(result.confidence * 100).toFixed(1)}%`
      }
    } else {
      throw new Error(result.error || '未知错误')
    }

  } catch (error) {
    console.error('连接测试失败:', error)
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : '连接测试失败'
    }
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.llm-config {
  max-width: 600px;
  margin: 0 auto;
}

.config-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.model-desc {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.test-section {
  margin-top: 16px;
}

.test-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.test-result {
  margin-top: 12px;
}

.test-placeholder {
  padding: 16px;
  text-align: center;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px dashed #d9d9d9;
}

:deep(.el-input-group__prepend) {
  background-color: #f5f7fa;
  color: #909399;
  border-color: #dcdfe6;
}
</style>