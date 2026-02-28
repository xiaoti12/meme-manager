<template>
  <div class="container mx-auto px-4 py-4 md:py-8">
    <div class="max-w-4xl mx-auto space-y-4 md:space-y-8">
      <!-- 页面标题 -->
      <div class="text-center">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2 md:mb-4">📦 数据导入导出</h1>
        <p class="text-sm md:text-base text-gray-600">管理你的表情包数据，支持本地文件和 WebDAV 云端同步</p>
      </div>


      <!-- WebDAV 配置 -->
      <WebDAVConfig ref="webdavConfigRef" @config-saved="handleWebDAVConfigSaved" />

      <!-- D1 云端存储配置 -->
      <D1SyncConfig @config-saved="handleD1ConfigSaved" />

      <!-- 数据操作 -->
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-4 md:p-8 card-shadow">
        <h2 class="text-lg md:text-xl font-semibold text-gray-700 mb-4 md:mb-6">🔄 数据操作</h2>

        <div class="grid gap-4 md:gap-8" :class="d1ShowSyncButtons && d1Enabled ? 'md:grid-cols-3' : 'md:grid-cols-2'">
          <!-- 本地操作 -->
          <div class="space-y-3 md:space-y-4">
            <h3 class="text-base md:text-lg font-medium text-gray-700 mb-3 md:mb-4">💻 本地文件操作</h3>

            <!-- 导出数据 -->
            <div class="p-3 md:p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0 mr-3">
                  <h4 class="font-medium text-gray-700">导出数据</h4>
                  <p class="text-xs md:text-sm text-gray-500">将所有数据导出为 JSON 文件</p>
                </div>
                <el-button
                  type="primary"
                  :size="isMobile ? 'small' : 'default'"
                  @click="exportData"
                  :loading="exporting"
                  class="flex-shrink-0 data-sync-btn"
                >
                  📤 导出
                </el-button>
              </div>
            </div>

            <!-- 导入数据 -->
            <div class="p-3 md:p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <div class="flex-1 min-w-0 mr-3">
                  <h4 class="font-medium text-gray-700">导入数据</h4>
                  <p class="text-xs md:text-sm text-gray-500">从 JSON 文件导入数据</p>
                </div>
                <el-button
                  type="success"
                  :size="isMobile ? 'small' : 'default'"
                  @click="importData"
                  :loading="importing"
                  class="flex-shrink-0 data-sync-btn"
                >
                  📥 导入
                </el-button>
              </div>
              <!-- 导入模式选择 -->
              <div class="mt-3 pt-3 border-t border-gray-100">
                <p class="text-xs text-gray-600 mb-2">导入模式：</p>
                <el-radio-group v-model="localImportMode" size="small">
                  <el-radio value="overwrite" class="mr-4">
                    <span class="text-sm">覆盖模式</span>
                  </el-radio>
                  <el-radio value="merge">
                    <span class="text-sm">合并模式</span>
                  </el-radio>
                </el-radio-group>
                <p class="text-xs text-gray-500 mt-1">
                  {{ localImportMode === 'overwrite' ? '完全替换现有数据' : '智能合并到现有数据中' }}
                </p>
              </div>
            </div>
          </div>

          <!-- 云端操作 -->
          <div class="space-y-3 md:space-y-4">
            <h3 class="text-base md:text-lg font-medium text-gray-700 mb-3 md:mb-4">☁️ WebDAV 云端同步</h3>

            <!-- 上传到云端 -->
            <div class="p-3 md:p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0 mr-3">
                  <h4 class="font-medium text-gray-700">上传到云端</h4>
                  <p class="text-xs md:text-sm text-gray-500">将本地数据同步到 WebDAV 服务器</p>
                </div>
                <el-button
                  type="primary"
                  :size="isMobile ? 'small' : 'default'"
                  @click="uploadToWebDAV"
                  :loading="uploading"
                  :disabled="!webdavEnabled"
                  class="flex-shrink-0 data-sync-btn"
                >
                  ☁️ 上传
                </el-button>
              </div>
            </div>

            <!-- 从云端下载 -->
            <div class="p-3 md:p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <div class="flex-1 min-w-0 mr-3">
                  <h4 class="font-medium text-gray-700">从云端下载</h4>
                  <p class="text-xs md:text-sm text-gray-500">从 WebDAV 服务器下载数据</p>
                </div>
                <el-button
                  type="success"
                  :size="isMobile ? 'small' : 'default'"
                  @click="downloadFromWebDAV"
                  :loading="downloading"
                  :disabled="!webdavEnabled"
                  class="flex-shrink-0 data-sync-btn"
                >
                  📥 下载
                </el-button>
              </div>
              <!-- 下载模式选择 -->
              <div class="mt-3 pt-3 border-t border-gray-100">
                <p class="text-xs text-gray-600 mb-2">下载模式：</p>
                <el-radio-group v-model="webdavImportMode" size="small">
                  <el-radio value="overwrite" class="mr-4">
                    <span class="text-sm">覆盖模式</span>
                  </el-radio>
                  <el-radio value="merge">
                    <span class="text-sm">合并模式</span>
                  </el-radio>
                </el-radio-group>
                <p class="text-xs text-gray-500 mt-1">
                  {{ webdavImportMode === 'overwrite' ? '完全替换现有数据' : '智能合并到现有数据中' }}
                </p>
              </div>
            </div>

          </div>

          <!-- D1 云端操作（仅 showSyncButtons 启用时显示） -->
          <div v-if="d1ShowSyncButtons && d1Enabled" class="space-y-3 md:space-y-4">
            <h3 class="text-base md:text-lg font-medium text-gray-700 mb-3 md:mb-4">🗄️ D1 数据库操作</h3>

            <!-- 同步到 D1 -->
            <div class="p-3 md:p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0 mr-3">
                  <h4 class="font-medium text-gray-700">同步到 D1</h4>
                  <p class="text-xs md:text-sm text-gray-500">将全部本地数据覆盖写入 D1 远程数据库</p>
                </div>
                <el-button
                  type="primary"
                  :size="isMobile ? 'small' : 'default'"
                  @click="syncToD1"
                  :loading="d1Syncing"
                  class="flex-shrink-0 data-sync-btn"
                >
                  ☁️ 同步
                </el-button>
              </div>
            </div>

            <!-- 删除 D1 远程数据 -->
            <div class="p-3 md:p-4 border border-red-100 rounded-lg">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0 mr-3">
                  <h4 class="font-medium text-red-600">删除 D1 远程数据</h4>
                  <p class="text-xs md:text-sm text-gray-500">清空 D1 中该用户的所有表情包数据（不影响本地）</p>
                </div>
                <el-button
                  type="danger"
                  :size="isMobile ? 'small' : 'default'"
                  @click="deleteD1Data"
                  :loading="d1Deleting"
                  class="flex-shrink-0 data-sync-btn"
                >
                  🗑️ 删除
                </el-button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 操作历史 -->
      <div v-if="operationHistory.length > 0" class="glass-effect backdrop-blur-custom rounded-3xl p-4 md:p-6 card-shadow">
        <h2 class="text-lg md:text-xl font-semibold text-gray-700 mb-3 md:mb-4">📋 操作历史</h2>
        <div class="space-y-2 max-h-48 md:max-h-64 overflow-y-auto">
          <div
            v-for="(record, index) in operationHistory"
            :key="index"
            class="flex flex-col md:flex-row md:items-center md:justify-between p-2 md:p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-2 md:gap-3">
              <span :class="{
                'text-green-600': record.success,
                'text-red-600': !record.success
              }">
                {{ record.success ? '✅' : '❌' }}
              </span>
              <div>
                <p class="text-sm md:text-base font-medium text-gray-700">{{ record.operation }}</p>
                <p class="text-xs md:text-sm text-gray-500">{{ formatTime(record.timestamp) }}</p>
              </div>
            </div>
            <div v-if="record.details" class="text-xs md:text-sm text-gray-500 mt-1 md:mt-0 md:ml-2">
              {{ record.details }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMemeStore } from '@/stores/meme'
import { getWebDAVConfig, createWebDAVService } from '@/utils/webdavService'
import { getD1Config, saveD1Config, getOrCreateGroup, syncAllToRemote, deleteAllRemoteData } from '@/utils/d1Service'
import WebDAVConfig from '@/components/WebDAVConfig.vue'
import D1SyncConfig from '@/components/D1SyncConfig.vue'
import { ImportMode } from '@/types'
import type { D1SyncConfig as D1SyncConfigType } from '@/types'

// Store
const memeStore = useMemeStore()

// 组件引用
const webdavConfigRef = ref()

// 操作状态
const exporting = ref(false)
const importing = ref(false)
const uploading = ref(false)
const downloading = ref(false)

// 导入模式状态
const localImportMode = ref<ImportMode>(ImportMode.OVERWRITE)
const webdavImportMode = ref<ImportMode>(ImportMode.OVERWRITE)

// 数据状态
const webdavEnabled = ref(false)

// D1 状态
const d1Enabled = ref(false)
const d1ShowSyncButtons = ref(true)
const d1Syncing = ref(false)
const d1Deleting = ref(false)

// 移动端检测
const isMobile = ref(false)

// 检测屏幕尺寸
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 监听窗口大小变化
let resizeHandler: (() => void) | null = null

// 操作历史
const operationHistory = ref<Array<{
  operation: string
  timestamp: Date
  success: boolean
  details?: string
}>>([])


// 刷新WebDAV状态
const refreshWebDAVStatus = () => {
  const config = getWebDAVConfig()
  webdavEnabled.value = config?.enabled || false
}

// 刷新 D1 状态
const refreshD1Status = () => {
  const config = getD1Config()
  d1Enabled.value = config.enabled && !!config.username
  d1ShowSyncButtons.value = config.showSyncButtons
}

// D1 配置保存事件处理
const handleD1ConfigSaved = (config: D1SyncConfigType) => {
  d1Enabled.value = config.enabled && !!config.username
  d1ShowSyncButtons.value = config.showSyncButtons
}

// 同步到 D1
const syncToD1 = async () => {
  const config = getD1Config()
  if (!config.enabled || !config.username) {
    ElMessage.error('请先启用并配置 D1 同步')
    return
  }

  d1Syncing.value = true
  try {
    let groupId = config.groupId
    if (!groupId) {
      groupId = await getOrCreateGroup(config.username)
    }

    const allMemes = memeStore.memes
    const result = await syncAllToRemote(groupId, allMemes)
    const msg = `同步成功，共写入 ${result.count} 条数据`
    ElMessage.success(msg)
    addOperationRecord('D1 全量同步', true, msg)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`D1 同步失败：${errMsg}`)
    addOperationRecord('D1 全量同步', false, errMsg)
  } finally {
    d1Syncing.value = false
  }
}

// 删除 D1 远程数据
const deleteD1Data = async () => {
  const config = getD1Config()
  if (!config.enabled || !config.username) {
    ElMessage.error('请先启用并配置 D1 同步')
    return
  }

  try {
    await ElMessageBox.confirm(
      '此操作将清空 D1 中该用户的所有表情包数据，本地数据不受影响，是否继续？',
      '确认删除远程数据',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  d1Deleting.value = true
  try {
    let groupId = config.groupId
    if (!groupId) {
      groupId = await getOrCreateGroup(config.username)
    }

    await deleteAllRemoteData(groupId)
    // 清除缓存的 groupId，让下次操作重新获取
    saveD1Config({ ...config, groupId: undefined })

    ElMessage.success('D1 远程数据已清空')
    addOperationRecord('D1 删除远程数据', true, '已清空远程所有表情包数据')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`D1 删除失败：${errMsg}`)
    addOperationRecord('D1 删除远程数据', false, errMsg)
  } finally {
    d1Deleting.value = false
  }
}

// 格式化时间
const formatTime = (date: Date): string => {
  return date.toLocaleString('zh-CN')
}

// 添加操作记录
const addOperationRecord = (operation: string, success: boolean, details?: string) => {
  operationHistory.value.unshift({
    operation,
    timestamp: new Date(),
    success,
    details
  })
  // 只保留最近 20 条记录
  if (operationHistory.value.length > 20) {
    operationHistory.value = operationHistory.value.slice(0, 20)
  }
}

// 导出数据
const exportData = () => {
  exporting.value = true

  try {
    const exportData = memeStore.exportData()
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `meme-manager-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    const details = `${exportData.memes.length}个表情包，${exportData.categories.length}个分类`
    ElMessage.success(`数据导出成功！${details}`)
    addOperationRecord('本地导出数据', true, details)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`导出失败：${errorMessage}`)
    addOperationRecord('本地导出数据', false, errorMessage)
  } finally {
    exporting.value = false
  }
}

// 导入数据
const importData = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      importing.value = true
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string)

          if (memeStore.importDataWithMode(data, localImportMode.value)) {
            const memeCount = data.memes?.length || 0
            const categoryCount = data.categories?.length || 0
            const details = `${memeCount}个表情包，${categoryCount}个分类`
            const modeText = localImportMode.value === 'overwrite' ? '覆盖' : '合并'
            ElMessage.success(`数据${modeText}导入成功！${details}`)
            addOperationRecord(`本地${modeText}导入数据`, true, details)
          } else {
            ElMessage.error('数据格式错误或导入失败')
            addOperationRecord('本地导入数据', false, '数据格式错误')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '文件解析失败'
          ElMessage.error(`导入失败：${errorMessage}`)
          addOperationRecord('本地导入数据', false, errorMessage)
        } finally {
          importing.value = false
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

// 上传到 WebDAV
const uploadToWebDAV = async () => {
  if (!webdavEnabled.value) {
    ElMessage.error('请先配置并启用 WebDAV')
    return
  }

  uploading.value = true

  try {
    const result = await memeStore.syncToWebDAV()

    ElMessage.success(result.message)
    addOperationRecord('WebDAV 上传数据', true, result.message)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`上传失败：${errorMessage}`)
    addOperationRecord('WebDAV 上传数据', false, errorMessage)
  } finally {
    uploading.value = false
  }
}

// 从 WebDAV 下载
const downloadFromWebDAV = async () => {
  if (!webdavEnabled.value) {
    ElMessage.error('请先配置并启用 WebDAV')
    return
  }

  // 确认操作
  try {
    const modeText = webdavImportMode.value === 'overwrite' ? '覆盖' : '合并到'
    const actionText = webdavImportMode.value === 'overwrite'
      ? '下载云端数据将会完全覆盖本地数据，包括表情包、分类和LLM配置'
      : '下载云端数据将会合并到本地数据中，相同ID的数据会被更新，LLM配置会被覆盖'

    await ElMessageBox.confirm(
      `${actionText}，是否继续？`,
      `确认${modeText}下载`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return // 用户取消
  }

  downloading.value = true

  try {
    const result = await memeStore.syncFromWebDAV(webdavImportMode.value)

    ElMessage.success(result.message)
    const modeText = webdavImportMode.value === 'overwrite' ? '覆盖' : '合并'
    addOperationRecord(`WebDAV ${modeText}下载数据`, true, result.message)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`下载失败：${errorMessage}`)
    addOperationRecord('WebDAV 下载数据', false, errorMessage)
  } finally {
    downloading.value = false
  }
}

// 处理WebDAV配置保存事件
const handleWebDAVConfigSaved = () => {
  refreshWebDAVStatus()
}

// 组件挂载时初始化WebDAV和D1状态
onMounted(() => {
  refreshWebDAVStatus()
  refreshD1Status()
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
.container {
  max-width: 1200px;
}

.card-shadow {
  box-shadow: 0 8px 32px rgba(31, 41, 55, 0.12);
}

.glass-effect {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.backdrop-blur-custom {
  backdrop-filter: blur(10px);
}

/* 移动端按钮样式优化 */
@media (max-width: 767px) {
  .data-sync-btn {
    min-width: 72px !important;
    height: 32px !important;
    padding: 0 12px !important;
    font-size: 13px !important;
    border-radius: 6px !important;
  }

  :deep(.data-sync-btn .el-button) {
    min-width: 72px !important;
    height: 32px !important;
    padding: 0 12px !important;
    font-size: 13px !important;
    line-height: 1 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  :deep(.data-sync-btn span) {
    font-size: 13px !important;
    line-height: 1 !important;
  }
}
</style>