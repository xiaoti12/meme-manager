<template>
  <div class="bg-white rounded-2xl overflow-hidden card-shadow hover-lift transition-all duration-300 group">
    <!-- 图片区域 -->
    <div class="relative h-48 bg-gray-100 overflow-hidden">
      <img
        v-if="meme.imageUrl"
        :src="meme.imageUrl"
        :alt="meme.filename"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        @error="handleImageError"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
        <el-icon size="48"><Picture /></el-icon>
      </div>

      <!-- 悬停操作按钮 -->
      <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
        <el-button
          type="primary"
          size="small"
          circle
          @click="$emit('download', meme)"
        >
          <el-icon><Download /></el-icon>
        </el-button>
        <el-button
          type="success"
          size="small"
          circle
          @click="$emit('copy', meme)"
        >
          <el-icon><CopyDocument /></el-icon>
        </el-button>
        <el-button
          type="danger"
          size="small"
          circle
          @click="$emit('delete', meme)"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
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

      <!-- 标签 -->
      <div v-if="meme.tags && meme.tags.length > 0" class="flex flex-wrap gap-1">
        <el-tag
          v-for="tag in meme.tags.slice(0, 3)"
          :key="tag"
          size="small"
          type="info"
        >
          {{ tag }}
        </el-tag>
        <el-tag v-if="meme.tags.length > 3" size="small" type="info">
          +{{ meme.tags.length - 3 }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MemeData } from '@/types'
import { Picture, Download, CopyDocument, Delete } from '@element-plus/icons-vue'

interface Props {
  meme: MemeData
}

defineProps<Props>()

defineEmits<{
  download: [meme: MemeData]
  copy: [meme: MemeData]
  delete: [meme: MemeData]
}>()

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}
</script>