<template>
  <div class="glass-effect backdrop-blur-custom rounded-3xl p-4 md:p-8 card-shadow">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
      <div class="mb-3 md:mb-0">
        <h3 class="text-lg md:text-xl font-semibold text-gray-700 mb-1 md:mb-2">🌐 WebDAV 云端同步</h3>
        <p class="text-gray-500 text-xs md:text-sm">配置 WebDAV 服务器来实现数据云端同步</p>
      </div>
      <el-switch
        v-model="localConfig.enabled"
        :size="isMobile ? 'default' : 'large'"
        active-text="启用"
        inactive-text="禁用"
        @change="handleEnabledChange"
      />
    </div>

    <div v-if="localConfig.enabled" class="space-y-4">
      <!-- 服务器地址 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">服务器地址</label>
        <el-input
          v-model="localConfig.url"
          placeholder="https://app.koofr.net/dav/Koofr"
          :size="isMobile ? 'default' : 'large'"
          :prefix-icon="Link"
          @blur="validateUrl"
        />
        <p class="text-xs text-gray-500 mt-1">支持的协议：http://、https://</p>
      </div>

      <!-- 用户名 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
        <el-input
          v-model="localConfig.username"
          placeholder="xiaoti@linux.do"
          :size="isMobile ? 'default' : 'large'"
          :prefix-icon="User"
        />
      </div>

      <!-- 密码 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
        <el-input
          v-model="localConfig.password"
          type="password"
          placeholder="••••••••••••••"
          :size="isMobile ? 'default' : 'large'"
          :prefix-icon="Lock"
          show-password
        />
      </div>

      <!-- 代理模式 -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 bg-blue-50 rounded-lg">
        <div class="mb-2 md:mb-0">
          <p class="font-medium text-gray-700">代理模式</p>
          <p class="text-xs md:text-sm text-gray-500">通过本地代理访问，避免 CORS 跨域问题</p>
        </div>
        <el-switch
          v-model="localConfig.useProxy"
          :size="isMobile ? 'default' : 'large'"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-col md:flex-row gap-3 pt-4">
        <el-button
          type="success"
          :size="isMobile ? 'default' : 'large'"
          @click="testConnection"
          :loading="testing"
          :disabled="!isConfigValid"
          class="w-full md:w-auto"
        >
          <span v-if="!testing">🔗 测试连接</span>
          <span v-else>连接中...</span>
        </el-button>

        <el-button
          type="primary"
          :size="isMobile ? 'default' : 'large'"
          @click="saveConfig"
          :disabled="!isConfigValid"
          class="w-full md:w-auto"
        >
          💾 保存配置
        </el-button>

        <el-button
          :size="isMobile ? 'default' : 'large'"
          @click="resetConfig"
          class="w-full md:w-auto"
        >
          🔄 重置
        </el-button>
      </div>

      <!-- 连接状态 -->
      <div v-if="connectionStatus" class="mt-4 p-4 rounded-lg" :class="{
        'bg-green-50 border border-green-200': connectionStatus.success,
        'bg-red-50 border border-red-200': !connectionStatus.success
      }">
        <div class="flex items-center gap-2">
          <span v-if="connectionStatus.success" class="text-green-600">✅</span>
          <span v-else class="text-red-600">❌</span>
          <span :class="{
            'text-green-700': connectionStatus.success,
            'text-red-700': !connectionStatus.success
          }">
            {{ connectionStatus.message }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Link, User, Lock } from '@element-plus/icons-vue'
import type { WebDAVConfig } from '@/types'
import { getWebDAVConfig, saveWebDAVConfig, WebDAVService } from '@/utils/webdavService'

// 定义事件
const emit = defineEmits<{
  'config-saved': []
}>()

// 本地配置状态
const localConfig = ref<WebDAVConfig>({
  enabled: false,
  url: '',
  username: '',
  password: '',
  useProxy: false
})

// 测试状态
const testing = ref(false)
const connectionStatus = ref<{
  success: boolean
  message: string
} | null>(null)

// 移动端检测
const isMobile = ref(false)

// 检测屏幕尺寸
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 监听窗口大小变化
let resizeHandler: (() => void) | null = null

// 配置是否有效
const isConfigValid = computed(() => {
  return localConfig.value.url.trim() !== '' &&
         localConfig.value.username.trim() !== '' &&
         localConfig.value.password.trim() !== ''
})

// 加载配置
const loadConfig = () => {
  const config = getWebDAVConfig()
  if (config) {
    localConfig.value = { ...config }
  }
}

// 启用状态改变时清除连接状态
const handleEnabledChange = () => {
  connectionStatus.value = null
  if (localConfig.value.enabled) {
    ElMessage.info('已启用 WebDAV 同步，请配置服务器信息')
  } else {
    ElMessage.info('已禁用 WebDAV 同步')
  }

  // 自动保存启用状态的变化并通知父组件
  try {
    saveWebDAVConfig(localConfig.value)
    emit('config-saved')
  } catch (error) {
    console.error('自动保存配置失败:', error)
  }
}

// 验证URL格式
const validateUrl = () => {
  const url = localConfig.value.url.trim()
  if (url && !url.match(/^https?:\/\/.+/)) {
    ElMessage.warning('请输入有效的URL地址，需要包含 http:// 或 https://')
  }
}

// 测试连接
const testConnection = async () => {
  if (!isConfigValid.value) {
    ElMessage.error('请先完善配置信息')
    return
  }

  testing.value = true
  connectionStatus.value = null

  try {
    const service = new WebDAVService(localConfig.value)
    const result = await service.testConnection()

    if (result) {
      connectionStatus.value = {
        success: true,
        message: '连接成功！WebDAV 服务器可正常访问'
      }
      ElMessage.success('WebDAV 连接测试成功')
    } else {
      connectionStatus.value = {
        success: false,
        message: '连接失败，请检查服务器地址、用户名和密码'
      }
      ElMessage.error('WebDAV 连接测试失败')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    connectionStatus.value = {
      success: false,
      message: `连接错误：${errorMessage}`
    }
    ElMessage.error(`连接测试失败：${errorMessage}`)
  } finally {
    testing.value = false
  }
}

// 保存配置
const saveConfig = () => {
  if (!isConfigValid.value) {
    ElMessage.error('请先完善配置信息')
    return
  }

  try {
    saveWebDAVConfig(localConfig.value)
    ElMessage.success('WebDAV 配置已保存')
    connectionStatus.value = null // 清除之前的连接状态

    // 发送配置保存事件通知父组件
    emit('config-saved')
  } catch (error) {
    ElMessage.error('保存配置失败')
  }
}

// 重置配置
const resetConfig = () => {
  localConfig.value = {
    enabled: false,
    url: '',
    username: '',
    password: '',
    useProxy: false
  }
  connectionStatus.value = null
  ElMessage.info('配置已重置')
}

// 组件挂载时加载配置
onMounted(() => {
  loadConfig()
  checkMobile()
  resizeHandler = checkMobile
  window.addEventListener('resize', resizeHandler)
})

// 组件卸载时清理事件监听
onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
})
</script>

<style scoped>
.card-shadow {
  box-shadow: 0 8px 32px rgba(31, 41, 55, 0.12);
}

.glass-effect {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.backdrop-blur-custom {
  backdrop-filter: blur(10px);
}
</style>