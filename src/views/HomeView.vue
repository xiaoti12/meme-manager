<template>
  <div class="container mx-auto px-4 py-8">
    <!-- 表情包分类展示 -->
    <div v-if="memeStore.filteredMemes.length > 0" class="space-y-12">
      <!-- 动态分类 -->
      <CategorySection
        v-for="categoryItem in categoryList"
        :key="categoryItem.id"
        v-if="memeStore.memesByCategory[categoryItem.id]?.length > 0"
        :title="categoryItem.name"
        :icon="categoryItem.icon || '📂'"
        :memes="memeStore.memesByCategory[categoryItem.id]"
        :category="categoryItem.id"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-16">
      <div class="glass-effect backdrop-blur-custom rounded-3xl p-12 card-shadow max-w-md mx-auto">
        <div class="text-6xl mb-6">🎭</div>
        <h3 class="text-xl font-semibold text-gray-700 mb-4">还没有表情包</h3>
        <p class="text-gray-500 mb-8">开始上传你的第一个表情包吧！</p>
        <router-link to="/upload">
          <el-button type="primary" size="large" round class="px-8">
            📤 开始上传
          </el-button>
        </router-link>
      </div>
    </div>

    <!-- 数据统计 -->
    <div v-if="memeStore.memes.length > 0" class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow mt-12">
      <div class="text-center mb-6">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">📈 数据统计</h3>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div class="text-center p-4 bg-white rounded-lg">
          <div class="text-2xl font-bold text-primary-600">{{ stats.total }}</div>
          <div class="text-sm text-gray-500">总数量</div>
        </div>
        <div
          v-for="categoryItem in categoryList"
          :key="categoryItem.id"
          v-if="stats.byCategory[categoryItem.id] > 0"
          class="text-center p-4 bg-white rounded-lg"
        >
          <div class="text-2xl font-bold text-blue-600">{{ stats.byCategory[categoryItem.id] }}</div>
          <div class="text-sm text-gray-500">{{ categoryItem.icon }} {{ categoryItem.name }}</div>
        </div>
        <div class="text-center p-4 bg-white rounded-lg">
          <div class="text-2xl font-bold text-gray-600">{{ formatFileSize(stats.totalSize) }}</div>
          <div class="text-sm text-gray-500">总大小</div>
        </div>
      </div>
    </div>

    <!-- 上传提示 -->
    <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow mt-12">
      <div class="text-center">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">✨ 添加更多表情包</h3>
        <p class="text-gray-600 mb-6">支持拖拽上传，自动OCR识别文字，AI分析图片内容</p>
        <div class="flex justify-center gap-4">
          <router-link to="/upload">
            <el-button type="primary" size="large" round class="px-8 hover-lift">
              📤 上传图片
            </el-button>
          </router-link>
          <el-button size="large" round @click="exportAllData">
            📦 导出数据
          </el-button>
          <el-button size="large" round @click="importData">
            📥 导入数据
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useMemeStore } from '@/stores/meme'
import CategorySection from '@/components/CategorySection.vue'
import { CategoryManager, type Category } from '@/utils/categoryManager'

const memeStore = useMemeStore()
const categoryList = ref<Category[]>([])

// 统计数据
const stats = computed(() => memeStore.getStatistics)

// 加载分类列表
const loadCategories = () => {
  categoryList.value = CategoryManager.getCategories()
}

// 工具函数
const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// 导出所有数据
const exportAllData = () => {
  const exportData = memeStore.exportData()
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `memes-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${exportData.memes.length} 个表情包`)
}

// 导入数据
const importData = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string)
          if (memeStore.importData(data)) {
            ElMessage.success('数据导入成功')
          } else {
            ElMessage.error('数据格式错误')
          }
        } catch (error) {
          ElMessage.error('文件解析失败')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

// 组件挂载时加载分类
onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>