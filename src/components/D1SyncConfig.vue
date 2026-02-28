<template>
  <div class="glass-effect backdrop-blur-custom rounded-3xl p-4 md:p-8 card-shadow">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
      <div class="mb-3 md:mb-0">
        <h3 class="text-lg md:text-xl font-semibold text-gray-700 mb-1 md:mb-2">☁️ D1 云端存储</h3>
        <p class="text-gray-500 text-xs md:text-sm">通过 Cloudflare D1 存储表情包元数据，支持多设备同步</p>
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
      <!-- 用户名 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
        <el-input
          v-model="localConfig.username"
          placeholder="设置一个唯一的用户名作为数据隔离标识"
          :size="isMobile ? 'default' : 'large'"
          :prefix-icon="User"
        />
        <p class="text-xs text-gray-400 mt-1">用于区分不同用户的表情包数据，无需密码</p>
      </div>

      <!-- 显示 group_id（只读，测试成功后显示）-->
      <div v-if="localConfig.groupId" class="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p class="text-xs text-gray-500 mb-1">数据组 ID（自动生成，用于数据标识）</p>
        <p class="text-xs font-mono text-gray-600 break-all">{{ localConfig.groupId }}</p>
      </div>

      <!-- 显示/隐藏同步按钮开关 -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 bg-blue-50 rounded-lg">
        <div class="mb-2 md:mb-0">
          <p class="font-medium text-gray-700">显示同步操作按钮</p>
          <p class="text-xs md:text-sm text-gray-500">开启后可在数据操作区使用「同步到 D1」和「删除远程数据」</p>
        </div>
        <el-switch v-model="localConfig.showSyncButtons" :size="isMobile ? 'default' : 'large'" />
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-col md:flex-row gap-3 pt-4">
        <el-button
          type="success"
          :size="isMobile ? 'default' : 'large'"
          @click="testConnection"
          :loading="testing"
          :disabled="!localConfig.username.trim()"
          class="w-full md:w-auto"
        >
          <span v-if="!testing">🔗 测试连接</span>
          <span v-else>连接中...</span>
        </el-button>

        <el-button
          type="primary"
          :size="isMobile ? 'default' : 'large'"
          @click="saveConfig"
          :disabled="!localConfig.username.trim()"
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
      <div
        v-if="connectionStatus"
        class="mt-4 p-4 rounded-lg"
        :class="{
          'bg-green-50 border border-green-200': connectionStatus.success,
          'bg-red-50 border border-red-200': !connectionStatus.success
        }"
      >
        <div class="flex items-center gap-2">
          <span v-if="connectionStatus.success" class="text-green-600">✅</span>
          <span v-else class="text-red-600">❌</span>
          <span
            :class="{
              'text-green-700': connectionStatus.success,
              'text-red-700': !connectionStatus.success
            }"
          >
            {{ connectionStatus.message }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import type { D1SyncConfig } from '@/types'
import { getD1Config, saveD1Config, getOrCreateGroup } from '@/utils/d1Service'

const emit = defineEmits<{
  'config-saved': [config: D1SyncConfig]
}>()

const localConfig = ref<D1SyncConfig>({
  enabled: false,
  username: '',
  groupId: undefined,
  showSyncButtons: true,
})

const testing = ref(false)
const connectionStatus = ref<{ success: boolean; message: string } | null>(null)

const isMobile = ref(false)
const checkMobile = () => { isMobile.value = window.innerWidth < 768 }
let resizeHandler: (() => void) | null = null

const loadConfig = () => {
  localConfig.value = { ...getD1Config() }
}

const handleEnabledChange = () => {
  connectionStatus.value = null
  ElMessage.info(localConfig.value.enabled ? '已启用 D1 同步，请配置用户名' : '已禁用 D1 同步')
  saveD1Config(localConfig.value)
  emit('config-saved', localConfig.value)
}

const testConnection = async () => {
  if (!localConfig.value.username.trim()) {
    ElMessage.error('请先输入用户名')
    return
  }

  testing.value = true
  connectionStatus.value = null

  try {
    const groupId = await getOrCreateGroup(localConfig.value.username.trim())
    localConfig.value.groupId = groupId
    connectionStatus.value = {
      success: true,
      message: `连接成功！数据组 ID：${groupId}`,
    }
    ElMessage.success('D1 连接测试成功')
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误'
    connectionStatus.value = { success: false, message: `连接失败：${msg}` }
    ElMessage.error(`D1 连接测试失败：${msg}`)
  } finally {
    testing.value = false
  }
}

const saveConfig = () => {
  if (!localConfig.value.username.trim()) {
    ElMessage.error('请先输入用户名')
    return
  }

  saveD1Config(localConfig.value)
  ElMessage.success('D1 配置已保存')
  connectionStatus.value = null
  emit('config-saved', localConfig.value)
}

const resetConfig = () => {
  localConfig.value = {
    enabled: false,
    username: '',
    groupId: undefined,
    showSyncButtons: true,
  }
  connectionStatus.value = null
  saveD1Config(localConfig.value)
  ElMessage.info('D1 配置已重置')
  emit('config-saved', localConfig.value)
}

onMounted(() => {
  loadConfig()
  checkMobile()
  resizeHandler = checkMobile
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
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

@media (max-width: 767px) {
  :deep(.el-button) {
    height: 44px !important;
    min-height: 44px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 16px !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    line-height: 1 !important;
    border-radius: 8px !important;
  }
}
</style>
