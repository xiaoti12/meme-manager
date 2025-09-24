<template>
  <div class="container mx-auto px-4 py-8">
    <!-- 页面标题 -->
    <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow mb-8">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">📂 分类管理</h2>
        <p class="text-gray-600">管理表情包分类，查看每个分类的详细统计信息</p>
      </div>

      <!-- 添加分类按钮 -->
      <div class="flex justify-center mb-6">
        <el-button
          type="primary"
          size="large"
          @click="showAddDialog = true"
        >
          <el-icon><Plus /></el-icon>
          添加新分类
        </el-button>
      </div>

      <!-- 分类统计概览 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="text-center p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
          <div class="text-3xl font-bold text-blue-600">{{ categories.length }}</div>
          <div class="text-sm text-blue-700 mt-1">总分类数</div>
        </div>
        <div class="text-center p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
          <div class="text-3xl font-bold text-green-600">{{ totalMemes }}</div>
          <div class="text-sm text-green-700 mt-1">总表情包数</div>
        </div>
        <div class="text-center p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
          <div class="text-3xl font-bold text-purple-600">{{ activeCategoriesCount }}</div>
          <div class="text-sm text-purple-700 mt-1">有内容的分类</div>
        </div>
      </div>
    </div>

    <!-- 分类列表 -->
    <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow">
      <h3 class="text-xl font-semibold text-gray-800 mb-6">📋 分类列表</h3>

      <!-- 空状态 -->
      <div v-if="categories.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">📁</div>
        <h3 class="text-lg font-semibold text-gray-700 mb-2">暂无分类</h3>
        <p class="text-gray-500 mb-6">创建你的第一个分类吧！</p>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加分类
        </el-button>
      </div>

      <!-- 分类卡片 -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="category in categories"
          :key="category.id"
          class="category-card relative p-6 border rounded-xl transition-all duration-300 hover:shadow-lg cursor-pointer"
          :class="{
            'border-blue-300 bg-blue-50': category.id === selectedCategoryId,
            'border-gray-200 bg-white hover:bg-gray-50': category.id !== selectedCategoryId
          }"
          @click="selectCategory(category)"
        >
          <!-- 分类头部 -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-3">
              <span class="text-2xl">{{ category.icon || '📁' }}</span>
              <div>
                <h4 class="font-semibold text-gray-800">{{ category.name }}</h4>
                <p class="text-xs text-gray-500">
                  创建于 {{ formatDate(category.createdAt) }}
                </p>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex space-x-1">
              <el-button
                v-if="category.id !== 'default'"
                size="small"
                type="primary"
                plain
                circle
                @click.stop="editCategory(category)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button
                v-if="category.id !== 'default'"
                size="small"
                type="danger"
                plain
                circle
                @click.stop="deleteCategory(category.id, category.name)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>

          <!-- 分类标签 -->
          <el-tag
            v-if="category.color"
            :color="category.color"
            class="mb-3 border-0 text-white text-xs"
            style="color: white !important"
          >
            {{ category.name }}
          </el-tag>

          <!-- 统计信息 -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">图片数量</span>
              <span class="font-semibold text-gray-800">
                {{ stats.byCategory[category.id] || 0 }} 张
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">存储大小</span>
              <span class="font-semibold text-gray-800">
                {{ formatFileSize(getCategorySize(category.id)) }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">最近更新</span>
              <span class="text-xs text-gray-500">
                {{ getLastUpdateTime(category.id) }}
              </span>
            </div>
          </div>

          <!-- 进度条 -->
          <div class="mt-4">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs text-gray-500">占比</span>
              <span class="text-xs text-gray-500">
                {{ getCategoryPercentage(category.id) }}%
              </span>
            </div>
            <el-progress
              :percentage="getCategoryPercentage(category.id)"
              :show-text="false"
              :stroke-width="4"
              :color="category.color || '#64748b'"
            />
          </div>

          <!-- 快速操作 -->
          <div class="mt-4 flex space-x-2">
            <el-button
              size="small"
              type="info"
              plain
              @click.stop="viewCategoryMemes(category.id)"
            >
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button
              v-if="stats.byCategory[category.id] > 0"
              size="small"
              type="success"
              plain
              @click.stop="exportCategory(category.id)"
            >
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
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
    <el-dialog v-model="showEditDialog" title="编辑分类" width="500px" destroy-on-close>
      <el-form :model="editingCategory" :rules="categoryRules" ref="editFormRef" label-width="80px">
        <el-form-item label="分类名称" prop="name">
          <el-input
            v-model="editingCategory.name"
            placeholder="请输入分类名称"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="图标">
          <div class="flex items-center space-x-3">
            <el-input
              v-model="editingCategory.icon"
              placeholder="选择一个表情符号"
              maxlength="2"
              style="width: 100px"
            />
            <div class="text-sm text-gray-500">
              常用: 📁 📂 🎭 😀 🎪 💝 🌟 ⭐ 🔥 💯 🎨 🎬 🎮 🏆 💎
            </div>
          </div>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, View, Download } from '@element-plus/icons-vue'
import { CategoryManager, type Category } from '@/utils/categoryManager'
import { useMemeStore } from '@/stores/meme'
import { useRouter } from 'vue-router'

const memeStore = useMemeStore()
const router = useRouter()

// 响应式数据
const categories = ref<Category[]>([])
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const selectedCategoryId = ref<string>('')
const addFormRef = ref()
const editFormRef = ref()

// 新增分类表单
const newCategory = reactive({
  name: ''
})

// 编辑分类表单
const editingCategory = reactive({
  id: '',
  name: '',
  icon: '',
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

// 计算属性
const stats = computed(() => memeStore.getStatistics)

const totalMemes = computed(() => stats.value.total)

const activeCategoriesCount = computed(() => {
  return categories.value.filter(cat => (stats.value.byCategory[cat.id] || 0) > 0).length
})

// 加载分类列表
const loadCategories = () => {
  categories.value = CategoryManager.getCategories()
}

// 选择分类
const selectCategory = (category: Category) => {
  selectedCategoryId.value = selectedCategoryId.value === category.id ? '' : category.id
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
  } catch (error) {
    console.error('添加分类失败:', error)
  }
}

// 编辑分类
const editCategory = (category: Category) => {
  Object.assign(editingCategory, {
    id: category.id,
    name: category.name,
    icon: category.icon || '📁',
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
      icon: editingCategory.icon,
      color: editingCategory.color
    })

    if (success) {
      loadCategories()
      showEditDialog.value = false
      ElMessage.success('分类更新成功！')
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
    } else {
      ElMessage.error('分类删除失败')
    }
  } catch (error) {
    // 用户取消删除
  }
}

// 查看分类下的表情包
const viewCategoryMemes = (categoryId: string) => {
  router.push({
    path: '/search',
    query: { category: categoryId }
  })
}

// 导出分类
const exportCategory = (categoryId: string) => {
  const categoryMemes = memeStore.memes.filter(meme => meme.category === categoryId)
  if (categoryMemes.length === 0) {
    ElMessage.warning('该分类没有表情包可导出')
    return
  }

  const category = categories.value.find(cat => cat.id === categoryId)
  const exportData = {
    category: category,
    memes: categoryMemes,
    exportDate: new Date(),
    version: '1.0'
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `category-${category?.name || categoryId}-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage.success(`已导出分类 "${category?.name}" 的 ${categoryMemes.length} 个表情包`)
}

// 获取分类存储大小
const getCategorySize = (categoryId: string): number => {
  return memeStore.memes
    .filter(meme => meme.category === categoryId)
    .reduce((total, meme) => total + meme.fileSize, 0)
}

// 获取分类百分比
const getCategoryPercentage = (categoryId: string): number => {
  const count = stats.value.byCategory[categoryId] || 0
  if (stats.value.total === 0) return 0
  return Math.round((count / stats.value.total) * 100)
}

// 获取分类最后更新时间
const getLastUpdateTime = (categoryId: string): string => {
  const categoryMemes = memeStore.memes.filter(meme => meme.category === categoryId)
  if (categoryMemes.length === 0) return '无数据'

  const latestMeme = categoryMemes.reduce((latest, meme) =>
    new Date(meme.uploadDate) > new Date(latest.uploadDate) ? meme : latest
  )

  const now = new Date()
  const uploadDate = new Date(latestMeme.uploadDate)
  const diffDays = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
  return `${Math.floor(diffDays / 365)}年前`
}

// 工具函数
const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

// 组件挂载时加载数据
onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.container {
  max-w: 1400px;
}

.category-card {
  transition: all 0.3s ease;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

:deep(.el-color-picker__trigger) {
  width: 40px;
  height: 32px;
}

:deep(.el-progress-bar__outer) {
  border-radius: 10px;
}

:deep(.el-progress-bar__inner) {
  border-radius: 10px;
}
</style>