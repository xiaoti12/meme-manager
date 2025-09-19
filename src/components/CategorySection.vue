<template>
  <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow">
    <div class="flex items-center gap-4 mb-6">
      <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
           :class="categoryStyles[category]">
        {{ icon }}
      </div>
      <h2 class="text-2xl font-bold text-gray-800">
        {{ title }} ({{ memes.length }}张)
      </h2>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      <MemeCard
        v-for="meme in memes"
        :key="meme.id"
        :meme="meme"
        @download="handleDownload"
        @copy="handleCopy"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MemeData, CategoryType } from '@/types'
import MemeCard from './MemeCard.vue'
import { ElMessage } from 'element-plus'

interface Props {
  title: string
  icon: string
  memes: MemeData[]
  category: CategoryType
}

defineProps<Props>()

const categoryStyles = {
  emoji: 'bg-gradient-to-r from-yellow-200 to-orange-200',
  anime: 'bg-gradient-to-r from-pink-200 to-purple-200',
  other: 'bg-gradient-to-r from-blue-200 to-indigo-200',
  all: 'bg-gradient-to-r from-gray-200 to-gray-300'
}

const handleDownload = (meme: MemeData) => {
  // 模拟下载
  ElMessage.success(`开始下载: ${meme.filename}`)
}

const handleCopy = (meme: MemeData) => {
  // 模拟复制到剪贴板
  ElMessage.success(`${meme.filename} 已复制到剪贴板`)
}

const handleDelete = (meme: MemeData) => {
  // 删除功能将在后续实现
  ElMessage.info(`删除功能开发中...`)
}
</script>