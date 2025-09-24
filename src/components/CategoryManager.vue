<template>
  <div class="category-manager">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold text-gray-800">📂 分类管理</h3>
      <el-button type="primary" size="small" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        添加分类
      </el-button>
    </div>

    <!-- 分类列表 -->
    <div class="space-y-3">
      <div
        v-for="category in categories"
        :key="category.id"
        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div class="flex items-center space-x-3">
          <div>
            <div class="font-medium text-gray-800">{{ category.name }}</div>
            <div class="text-xs text-gray-500">
              创建于 {{ formatDate(category.createdAt) }}
            </div>
          </div>
          <el-tag
            v-if="category.color"
            :color="category.color"
            class="border-0 text-white text-xs"
            style="color: white !important"
          >
            {{ category.name }}
          </el-tag>
        </div>
        <div class="flex space-x-2">
          <el-button
            v-if="category.id !== 'default'"
            size="small"
            type="primary"
            plain
            @click="editCategory(category)"
          >
            编辑
          </el-button>
          <el-button
            v-if="category.id !== 'default'"
            size="small"
            type="danger"
            plain
            @click="deleteCategory(category.id, category.name)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 添加分类对话框 -->
    <el-dialog v-model="showAddDialog" title="添加分类" width="400px" destroy-on-close>
      <el-form :model="newCategory" :rules="categoryRules" ref="addFormRef" label-width="80px">
        <el-form-item label="分类名称" prop="name">
          <el-input
            v-model="newCategory.name"
            placeholder="请输入分类名称"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addCategory">确认</el-button>
      </template>
    </el-dialog>

    <!-- 编辑分类对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑分类" width="400px" destroy-on-close>
      <el-form :model="editingCategory" :rules="categoryRules" ref="editFormRef" label-width="80px">
        <el-form-item label="分类名称" prop="name">
          <el-input
            v-model="editingCategory.name"
            placeholder="请输入分类名称"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="editingCategory.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="updateCategory">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { CategoryManager, type Category } from '@/utils/categoryManager'
import { useMemeStore } from '@/stores/meme'

// 响应式数据
const categories = ref<Category[]>([])
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const addFormRef = ref()
const editFormRef = ref()
const memeStore = useMemeStore()

// 新增分类表单
const newCategory = reactive({
  name: ''
})

// 编辑分类表单
const editingCategory = reactive({
  id: '',
  name: '',
  color: ''
})

// 表单验证规则
const categoryRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 1, max: 20, message: '分类名称长度应在 1 到 20 个字符', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        const trimmedValue = value.trim()
        if (!trimmedValue) {
          callback(new Error('分类名称不能为空'))
          return
        }

        const excludeId = showEditDialog.value ? editingCategory.id : undefined
        if (CategoryManager.isNameExists(trimmedValue, excludeId)) {
          callback(new Error('分类名称已存在'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

// 加载分类列表
const loadCategories = () => {
  categories.value = CategoryManager.getCategories()
}

// 添加分类
const addCategory = async () => {
  if (!addFormRef.value) return

  try {
    await addFormRef.value.validate()

    const category = CategoryManager.addCategory(newCategory.name)

    loadCategories()
    showAddDialog.value = false

    // 重置表单
    newCategory.name = ''

    ElMessage.success(`分类 "${category.name}" 添加成功！`)

    // 通知父组件分类已更新
    emit('categories-updated')
  } catch (error) {
    console.error('添加分类失败:', error)
  }
}

// 编辑分类
const editCategory = (category: Category) => {
  Object.assign(editingCategory, {
    id: category.id,
    name: category.name,
    color: category.color || '#64748b'
  })
  showEditDialog.value = true
}

// 更新分类
const updateCategory = async () => {
  if (!editFormRef.value) return

  try {
    await editFormRef.value.validate()

    const success = CategoryManager.updateCategory(editingCategory.id, {
      name: editingCategory.name,
      color: editingCategory.color
    })

    if (success) {
      loadCategories()
      showEditDialog.value = false
      ElMessage.success('分类更新成功！')

      // 通知父组件分类已更新
      emit('categories-updated')
    } else {
      ElMessage.error('分类更新失败')
    }
  } catch (error) {
    console.error('更新分类失败:', error)
  }
}

// 删除分类
const deleteCategory = async (id: string, name: string) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类 "${name}" 吗？删除后该分类下的所有表情包将移动到默认分类。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const success = CategoryManager.removeCategory(id)
    if (success) {
      // 将该分类下的所有表情包迁移到默认分类
      const migratedCount = memeStore.updateMemesCategory(id, 'default')

      loadCategories()

      if (migratedCount > 0) {
        ElMessage.success(`分类删除成功！已将 ${migratedCount} 个表情包迁移到默认分类。`)
      } else {
        ElMessage.success('分类删除成功！')
      }

      // 通知父组件分类已更新
      emit('categories-updated', { deletedCategoryId: id })
    } else {
      ElMessage.error('分类删除失败')
    }
  } catch (error) {
    // 用户取消删除
  }
}

// 格式化日期
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// 定义事件
const emit = defineEmits<{
  'categories-updated': [payload?: { deletedCategoryId?: string }]
}>()

// 组件挂载时加载数据
onMounted(() => {
  loadCategories()
})

// 暴露方法给父组件
defineExpose({
  loadCategories
})
</script>

<style scoped>
.category-manager {
  @apply max-w-2xl mx-auto;
}

:deep(.el-color-picker__trigger) {
  width: 40px;
  height: 32px;
}
</style>