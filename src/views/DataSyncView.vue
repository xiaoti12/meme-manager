<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto space-y-8">
      <!-- 页面标题 -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-800 mb-4">📦 数据导入导出</h1>
        <p class="text-gray-600">管理你的表情包数据，支持本地文件和 WebDAV 云端同步</p>
      </div>


      <!-- WebDAV 配置 -->
      <WebDAVConfig ref="webdavConfigRef" />

      <!-- 数据操作 -->
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow">
        <h2 class="text-xl font-semibold text-gray-700 mb-6">🔄 数据操作</h2>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- 本地操作 -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-700 mb-4">💻 本地文件操作</h3>

            <!-- 导出数据 -->
            <div class="p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h4 class="font-medium text-gray-700">导出数据</h4>
                  <p class="text-sm text-gray-500">将所有数据导出为 JSON 文件</p>
                </div>
                <el-button
                  type="primary"
                  @click="exportData"
                  :loading="exporting"
                >
                  📤 导出
                </el-button>
              </div>
            </div>

            <!-- 导入数据 -->
            <div class="p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h4 class="font-medium text-gray-700">导入数据</h4>
                  <p class="text-sm text-gray-500">从 JSON 文件导入数据</p>
                </div>
                <el-button
                  type="success"
                  @click="importData"
                  :loading="importing"
                >
                  📥 导入
                </el-button>
              </div>
            </div>
          </div>

          <!-- 云端操作 -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-700 mb-4">☁️ WebDAV 云端同步</h3>

            <!-- 上传到云端 -->
            <div class="p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h4 class="font-medium text-gray-700">上传到云端</h4>
                  <p class="text-sm text-gray-500">将本地数据同步到 WebDAV 服务器</p>
                </div>
                <el-button
                  type="primary"
                  @click="uploadToWebDAV"
                  :loading="uploading"
                  :disabled="!webdavEnabled"
                >
                  ☁️ 上传
                </el-button>
              </div>
            </div>

            <!-- 从云端下载 -->
            <div class="p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h4 class="font-medium text-gray-700">从云端下载</h4>
                  <p class="text-sm text-gray-500">从 WebDAV 服务器下载数据</p>
                </div>
                <el-button
                  type="success"
                  @click="downloadFromWebDAV"
                  :loading="downloading"
                  :disabled="!webdavEnabled"
                >
                  📥 下载
                </el-button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- 操作历史 -->
      <div v-if="operationHistory.length > 0" class="glass-effect backdrop-blur-custom rounded-3xl p-6 card-shadow">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">📋 操作历史</h2>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="(record, index) in operationHistory"
            :key="index"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <span :class="{
                'text-green-600': record.success,
                'text-red-600': !record.success
              }">
                {{ record.success ? '✅' : '❌' }}
              </span>
              <div>
                <p class="font-medium text-gray-700">{{ record.operation }}</p>
                <p class="text-sm text-gray-500">{{ formatTime(record.timestamp) }}</p>
              </div>
            </div>
            <div v-if="record.details" class="text-sm text-gray-500">
              {{ record.details }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMemeStore } from '@/stores/meme'
import { getWebDAVConfig, createWebDAVService } from '@/utils/webdavService'
import WebDAVConfig from '@/components/WebDAVConfig.vue'

// Store
const memeStore = useMemeStore()

// 组件引用
const webdavConfigRef = ref()

// 操作状态
const exporting = ref(false)
const importing = ref(false)
const uploading = ref(false)
const downloading = ref(false)

// 数据状态
const webdavEnabled = computed(() => {
  const config = getWebDAVConfig()
  return config?.enabled || false
})


// 操作历史
const operationHistory = ref<Array<{
  operation: string
  timestamp: Date
  success: boolean
  details?: string
}>>([])


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

          if (memeStore.importData(data)) {
            const memeCount = data.memes?.length || 0
            const categoryCount = data.categories?.length || 0
            const details = `${memeCount}个表情包，${categoryCount}个分类`
            ElMessage.success(`数据导入成功！${details}`)
            addOperationRecord('本地导入数据', true, details)
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
    await ElMessageBox.confirm(
      '下载云端数据将会覆盖本地数据，包括表情包、分类和LLM配置，是否继续？',
      '确认下载',
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
    const result = await memeStore.syncFromWebDAV()

    ElMessage.success(result.message)
    addOperationRecord('WebDAV 下载数据', true, result.message)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`下载失败：${errorMessage}`)
    addOperationRecord('WebDAV 下载数据', false, errorMessage)
  } finally {
    downloading.value = false
  }
}


</script>

<style scoped>
.container {
  max-width: 1200px;
}

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