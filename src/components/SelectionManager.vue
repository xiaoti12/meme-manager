<template>
  <!-- 浮动操作栏 -->
  <Teleport to="body">
    <div v-if="isSelectionMode" class="selection-toolbar">
      <div class="selection-info">
        <el-icon class="selection-icon"><Select /></el-icon>
        已选择 {{ selectedIds.length }} 张图片
      </div>

      <div class="selection-actions">
        <el-select
          v-model="targetCategory"
          placeholder="选择目标分类"
          class="category-selector"
          size="default"
          clearable
        >
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
            :disabled="category.id === 'current'"
          >
            <span>{{ category.icon || '📁' }} {{ category.name }}</span>
          </el-option>
        </el-select>

        <el-button
          type="primary"
          :disabled="!targetCategory || isMoving"
          :loading="isMoving"
          @click="handleBatchMove"
        >
          {{ isMoving ? '移动中...' : '确认移动' }}
        </el-button>

        <el-button @click="clearSelection">取消</el-button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Select } from '@element-plus/icons-vue'
import { CategoryManager } from '@/utils/categoryManager'
import { useMemeStore } from '@/stores/meme'

// Props
interface Props {
  selectedIds: string[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:selectedIds': [ids: string[]]
  'selection-cleared': []
  'move-completed': [movedCount: number, targetCategoryName: string]
}>()

// Store
const memeStore = useMemeStore()

// 响应式数据
const targetCategory = ref<string>('')
const isMoving = ref(false)

// 计算属性
const isSelectionMode = computed(() => props.selectedIds.length > 0)
const categories = computed(() => CategoryManager.getCategories())

// 清除选择
const clearSelection = () => {
  emit('update:selectedIds', [])
  targetCategory.value = ''
  emit('selection-cleared')
}

// 批量移动
const handleBatchMove = async () => {
  if (!targetCategory.value || props.selectedIds.length === 0) return

  const targetCategoryName = categories.value.find(cat => cat.id === targetCategory.value)?.name || '未知分类'

  try {
    await ElMessageBox.confirm(
      `确定要将选中的 ${props.selectedIds.length} 张图片移动到「${targetCategoryName}」分类吗？`,
      '确认移动',
      {
        confirmButtonText: '确认移动',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    isMoving.value = true
    const movedCount = memeStore.batchUpdateCategory(props.selectedIds, targetCategory.value)

    if (movedCount > 0) {
      ElMessage.success(`成功移动 ${movedCount} 张图片到「${targetCategoryName}」`)
      emit('move-completed', movedCount, targetCategoryName)
      clearSelection()
    } else {
      ElMessage.warning('没有图片被移动，可能目标分类相同或发生错误')
    }
  } catch (error) {
    // 用户取消操作
  } finally {
    isMoving.value = false
  }
}

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isSelectionMode.value) {
    clearSelection()
  }
  // Ctrl+A 全选（这个功能需要父组件支持）
  if (event.ctrlKey && event.key === 'a' && isSelectionMode.value) {
    event.preventDefault()
    // 这里可以发出全选事件，但需要父组件配合
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.selection-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 16px 24px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 1000;
  border: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10px);
  max-width: calc(100vw - 32px);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #409eff;
  white-space: nowrap;
}

.selection-icon {
  font-size: 18px;
}

.selection-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-selector {
  min-width: 160px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .selection-toolbar {
    bottom: 16px;
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
    border-radius: 12px;
  }

  .selection-info {
    width: 100%;
    justify-content: center;
  }

  .selection-actions {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .category-selector {
    min-width: 140px;
    flex: 1;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .selection-toolbar {
    background: #1f1f1f;
    border-color: rgba(255, 255, 255, 0.1);
    color: white;
  }
}
</style>