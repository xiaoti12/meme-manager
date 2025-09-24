<template>
  <div class="container mx-auto px-4 py-8" @click="handleContainerClick">
    <!-- 页面标题 -->
    <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow mb-8">
      <div class="text-center mb-6">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">🗑️ 回收站</h2>
        <p class="text-gray-600">管理已删除的图片，可以恢复或永久删除</p>
      </div>

      <!-- 操作栏 -->
      <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">
            共 {{ memeStore.deletedMemes.length }} 个已删除的图片
          </span>
        </div>

        <div class="flex items-center gap-2">
          <el-button
            v-if="selectedIds.length > 0"
            type="success"
            size="small"
            @click="handleBatchRestore"
          >
            恢复选中 ({{ selectedIds.length }})
          </el-button>
          <el-button
            v-if="selectedIds.length > 0"
            type="danger"
            size="small"
            @click="handleBatchPermanentDelete"
          >
            永久删除选中 ({{ selectedIds.length }})
          </el-button>
          <el-button
            v-if="memeStore.deletedMemes.length > 0"
            type="warning"
            size="small"
            @click="handleEmptyTrash"
          >
            清空回收站
          </el-button>
        </div>
      </div>

      <!-- 选择模式切换 -->
      <div class="flex items-center justify-between mb-4">
        <el-checkbox
          v-model="selectAll"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        >
          全选
        </el-checkbox>
        <el-button
          v-if="selectionMode"
          type="text"
          size="small"
          @click="clearSelection"
        >
          取消选择
        </el-button>
      </div>
    </div>

    <!-- 已删除图片列表 -->
    <div v-if="memeStore.deletedMemes.length > 0" class="space-y-6">
      <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6"
        @click.stop
      >
        <div
          v-for="meme in memeStore.deletedMemes"
          :key="meme.id"
          class="bg-white rounded-2xl overflow-hidden card-shadow hover-lift transition-all duration-300 group cursor-pointer relative trash-item"
          :class="{ 'selected': selectedIds.includes(meme.id) }"
          @click="toggleSelection(meme.id)"
        >
          <!-- 选择指示器 -->
          <div v-if="selectionMode || selectedIds.length > 0" class="selection-indicator" :class="{ 'selected': selectedIds.includes(meme.id) }">
            <el-icon v-if="selectedIds.includes(meme.id)" class="check-icon"><Check /></el-icon>
            <div v-else class="selection-circle"></div>
          </div>

          <!-- 图片区域 -->
          <div class="relative aspect-square bg-gray-100 overflow-hidden">
            <img
              v-if="meme.imageUrl && !imageErrors[meme.id]"
              :src="meme.imageUrl"
              :alt="meme.filename"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-60"
              loading="lazy"
              @error="handleImageError(meme.id)"
            />

            <!-- 错误状态 -->
            <div v-if="!meme.imageUrl || imageErrors[meme.id]"
                 class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
              <el-icon size="48"><Picture /></el-icon>
            </div>

            <!-- 删除时间标记 -->
            <div class="absolute top-2 left-2">
              <el-tag type="warning" size="small" round>
                已删除
              </el-tag>
            </div>

            <!-- 悬停操作按钮 -->
            <div
              class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100"
              @click.stop
            >
              <el-button
                type="success"
                size="small"
                circle
                @click.stop="handleRestore(meme)"
                title="恢复"
              >
                <el-icon><RefreshLeft /></el-icon>
              </el-button>
              <el-button
                type="danger"
                size="small"
                circle
                @click.stop="handlePermanentDelete(meme)"
                title="永久删除"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>

          <!-- 信息区域 -->
          <div class="p-4">
            <h3 class="font-semibold text-gray-800 mb-2 truncate" :title="meme.filename">
              {{ meme.filename }}
            </h3>
            <div class="text-xs text-gray-500">
              <p>删除时间: {{ formatDate(meme.deletedAt) }}</p>
              <p>原分类: {{ getCategoryName(meme.category) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-16">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-12 card-shadow max-w-md mx-auto">
        <div class="text-6xl mb-6">🗑️</div>
        <h3 class="text-xl font-semibold text-gray-700 mb-4">回收站为空</h3>
        <p class="text-gray-500 mb-8">没有已删除的图片</p>
        <router-link to="/">
          <el-button type="primary" size="large" round class="px-8">
            🏠 返回首页
          </el-button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMemeStore } from '@/stores/meme'
import type { MemeData } from '@/types'
import { Picture, RefreshLeft, Delete, Check } from '@element-plus/icons-vue'
import { CategoryManager } from '@/utils/categoryManager'

const memeStore = useMemeStore()

// 选择状态
const selectedIds = ref<string[]>([])
const imageErrors = ref<Record<string, boolean>>({})

// 选择模式（当有选择时自动激活）
const selectionMode = computed(() => selectedIds.value.length > 0)

// 全选状态
const selectAll = computed({
  get: () => {
    return memeStore.deletedMemes.length > 0 && selectedIds.value.length === memeStore.deletedMemes.length
  },
  set: (value: boolean) => {
    if (value) {
      selectedIds.value = memeStore.deletedMemes.map(meme => meme.id)
    } else {
      selectedIds.value = []
    }
  }
})

// 半选状态
const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < memeStore.deletedMemes.length
})

// 切换选择状态
const toggleSelection = (memeId: string) => {
  const index = selectedIds.value.indexOf(memeId)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(memeId)
  }
}

// 全选/取消全选
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedIds.value = memeStore.deletedMemes.map(meme => meme.id)
  } else {
    selectedIds.value = []
  }
}

// 清除选择
const clearSelection = () => {
  selectedIds.value = []
}

// 图片加载错误处理
const handleImageError = (memeId: string) => {
  imageErrors.value[memeId] = true
}

// 获取分类名称
const getCategoryName = (category: string) => {
  const categoryData = CategoryManager.getCategoryById(category)
  return categoryData ? categoryData.name : category
}

// 格式化日期
const formatDate = (date: Date | null | undefined) => {
  if (!date) return '未知时间'
  return new Date(date).toLocaleString('zh-CN')
}

// 恢复单个图片
const handleRestore = async (meme: MemeData) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复 "${meme.filename}" 吗？`,
      '确认恢复',
      {
        confirmButtonText: '恢复',
        cancelButtonText: '取消',
        type: 'success',
        draggable: true,
      }
    )

    const success = memeStore.restoreMeme(meme.id)
    if (success) {
      ElMessage.success(`"${meme.filename}" 已恢复`)
      // 从选择列表中移除
      const index = selectedIds.value.indexOf(meme.id)
      if (index > -1) {
        selectedIds.value.splice(index, 1)
      }
    } else {
      ElMessage.error('恢复失败，请重试')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复确认对话框出错:', error)
    }
  }
}

// 永久删除单个图片
const handlePermanentDelete = async (meme: MemeData) => {
  try {
    await ElMessageBox.confirm(
      `确定要永久删除 "${meme.filename}" 吗？\n\n此操作不可撤销！`,
      '确认永久删除',
      {
        confirmButtonText: '永久删除',
        cancelButtonText: '取消',
        type: 'error',
        draggable: true,
        inputPattern: new RegExp(`^${meme.filename}$`),
        inputPlaceholder: `请输入 "${meme.filename}" 确认删除`,
        inputValidator: (value: string) => {
          if (value !== meme.filename) {
            return '输入的文件名不匹配'
          }
          return true
        },
        showInput: true,
        showClose: false,
      }
    )

    const success = memeStore.permanentDeleteMeme(meme.id)
    if (success) {
      ElMessage.success(`"${meme.filename}" 已永久删除`)
      // 从选择列表中移除
      const index = selectedIds.value.indexOf(meme.id)
      if (index > -1) {
        selectedIds.value.splice(index, 1)
      }
    } else {
      ElMessage.error('永久删除失败，请重试')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('永久删除确认对话框出错:', error)
    }
  }
}

// 批量恢复
const handleBatchRestore = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复选中的 ${selectedIds.value.length} 个图片吗？`,
      '确认批量恢复',
      {
        confirmButtonText: '恢复',
        cancelButtonText: '取消',
        type: 'success',
        draggable: true,
      }
    )

    const restoredCount = memeStore.restoreMemes(selectedIds.value)
    if (restoredCount > 0) {
      ElMessage.success(`已恢复 ${restoredCount} 个图片`)
      selectedIds.value = []
    } else {
      ElMessage.error('恢复失败，请重试')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量恢复确认对话框出错:', error)
    }
  }
}

// 批量永久删除
const handleBatchPermanentDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要永久删除选中的 ${selectedIds.value.length} 个图片吗？\n\n此操作不可撤销！`,
      '确认批量永久删除',
      {
        confirmButtonText: '永久删除',
        cancelButtonText: '取消',
        type: 'error',
        draggable: true,
      }
    )

    const deletedCount = memeStore.permanentDeleteMemes(selectedIds.value)
    if (deletedCount > 0) {
      ElMessage.success(`已永久删除 ${deletedCount} 个图片`)
      selectedIds.value = []
    } else {
      ElMessage.error('永久删除失败，请重试')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量永久删除确认对话框出错:', error)
    }
  }
}

// 清空回收站
const handleEmptyTrash = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要清空回收站吗？\n\n这将永久删除所有 ${memeStore.deletedMemes.length} 个图片，此操作不可撤销！`,
      '确认清空回收站',
      {
        confirmButtonText: '清空回收站',
        cancelButtonText: '取消',
        type: 'error',
        draggable: true,
        inputPattern: new RegExp('^清空回收站$'),
        inputPlaceholder: '请输入"清空回收站"确认',
        inputValidator: (value: string) => {
          if (value !== '清空回收站') {
            return '请输入正确的确认文字'
          }
          return true
        },
        showInput: true,
        showClose: false,
      }
    )

    const allDeletedIds = memeStore.deletedMemes.map(meme => meme.id)
    const deletedCount = memeStore.permanentDeleteMemes(allDeletedIds)
    if (deletedCount > 0) {
      ElMessage.success(`已清空回收站，永久删除 ${deletedCount} 个图片`)
      selectedIds.value = []
    } else {
      ElMessage.error('清空回收站失败，请重试')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空回收站确认对话框出错:', error)
    }
  }
}

// 点击容器空白区域清除选择
const handleContainerClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget && selectionMode.value) {
    clearSelection()
  }
}
</script>

<style scoped>
.trash-item {
  transition: all 0.2s ease;
  position: relative;
}

.trash-item.selected {
  border: 2px solid #409eff;
  transform: scale(0.98);
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.1);
}

.selection-indicator {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

.selection-indicator.selected {
  background: #409eff;
  color: white;
  transform: scale(1.1);
}

.selection-circle {
  width: 18px;
  height: 18px;
  border: 2px solid #409eff;
  border-radius: 50%;
  background: transparent;
}

.check-icon {
  font-size: 16px;
  font-weight: bold;
}

.trash-item:hover:not(.selected) {
  border: 2px solid rgba(64, 158, 255, 0.3);
  transform: scale(0.99);
}

.trash-item:hover .selection-indicator:not(.selected) {
  background: #409eff;
}

.trash-item:hover .selection-circle {
  background: white;
  border-color: white;
}

.container {
  max-width: 1200px;
}
</style>