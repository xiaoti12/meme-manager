<template>
  <div class="bg-white rounded-2xl overflow-hidden card-shadow hover-lift transition-all duration-300 group cursor-pointer"
       @click="$emit('gallery')">
    <!-- 图片区域 -->
    <div class="relative aspect-square bg-gray-100 overflow-hidden">
      <img
        v-if="meme.imageUrl && !imageError"
        :src="meme.imageUrl"
        :alt="meme.filename"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        @error="handleImageError"
        @load="imageLoaded = true"
      />

      <!-- 加载状态 -->
      <div v-if="meme.imageUrl && !imageLoaded && !imageError"
           class="w-full h-full flex items-center justify-center bg-gray-100">
        <el-icon class="animate-spin text-gray-400" size="24">
          <Loading />
        </el-icon>
      </div>

      <!-- 错误状态 -->
      <div v-if="!meme.imageUrl || imageError"
           class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
        <el-icon size="48"><Picture /></el-icon>
      </div>

      <!-- 悬停操作按钮 -->
      <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
        <el-button
          type="primary"
          size="small"
          circle
          @click.stop="$emit('download', meme)"
          title="下载"
        >
          <el-icon><Download /></el-icon>
        </el-button>
        <el-button
          type="success"
          size="small"
          circle
          @click.stop="$emit('copy', meme)"
          title="复制"
        >
          <el-icon><CopyDocument /></el-icon>
        </el-button>
        <el-button
          type="danger"
          size="small"
          circle
          @click.stop="$emit('delete', meme)"
          title="删除"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>

      <!-- 分类标签 -->
      <div class="absolute top-2 right-2">
        <el-tag :type="categoryTagType" size="small" round>
          {{ getCategoryName(meme.category) }}
        </el-tag>
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="p-4">
      <h3 class="font-semibold text-gray-800 mb-3 truncate" :title="meme.filename">
        {{ meme.filename }}
      </h3>

      <!-- OCR文字 -->
      <div v-if="meme.ocrText" class="mb-3">
        <div class="text-xs font-semibold text-green-600 uppercase mb-1">OCR识别</div>
        <div class="bg-green-50 border-l-3 border-green-400 p-2 rounded-r-lg text-sm text-gray-700">
          {{ meme.ocrText || '无文字内容' }}
        </div>
      </div>

      <!-- AI描述 -->
      <div v-if="meme.aiDescription" class="mb-3">
        <div class="text-xs font-semibold text-blue-600 uppercase mb-1">AI分析</div>
        <div class="bg-blue-50 border-l-3 border-blue-400 p-2 rounded-r-lg text-sm text-gray-700 leading-relaxed">
          {{ meme.aiDescription || '无描述' }}
        </div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MemeData } from '@/types'
import { Picture, Download, CopyDocument, Delete, Loading } from '@element-plus/icons-vue'

interface Props {
  meme: MemeData
}

const props = defineProps<Props>()

defineEmits<{
  download: [meme: MemeData]
  copy: [meme: MemeData]
  delete: [meme: MemeData]
  gallery: []
}>()

const imageError = ref(false)
const imageLoaded = ref(false)

const categoryTagType = computed(() => {
  switch (props.meme.category) {
    case 'default': return 'primary'
    default: return 'primary'
  }
})

const getCategoryName = (category: string) => {
  const categoryMap: Record<string, string> = {
    default: '默认'
  }
  return categoryMap[category] || category
}

const handleImageError = () => {
  imageError.value = true
}

const formatFileSize = (size: number) => {
  if (!size) return '未知'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}
</script>