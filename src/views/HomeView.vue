<template>
  <div class="container mx-auto px-4 py-8">
    <!-- 表情包分类展示 -->
    <div v-if="memeStore.filteredMemes.length > 0" class="space-y-12">
      <!-- 表情包分类 -->
      <CategorySection
        v-if="memeStore.memesByCategory.emoji.length > 0"
        title="表情包"
        icon="😀"
        :memes="memeStore.memesByCategory.emoji"
        category="emoji"
      />

      <!-- 动漫分类 -->
      <CategorySection
        v-if="memeStore.memesByCategory.anime.length > 0"
        title="动漫"
        icon="🎨"
        :memes="memeStore.memesByCategory.anime"
        category="anime"
      />

      <!-- 其他分类 -->
      <CategorySection
        v-if="memeStore.memesByCategory.other.length > 0"
        title="其他"
        icon="📂"
        :memes="memeStore.memesByCategory.other"
        category="other"
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

    <!-- 上传提示 -->
    <div class="glass-effect backdrop-blur-custom rounded-3xl p-8 card-shadow mt-12">
      <div class="text-center">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">✨ 添加更多表情包</h3>
        <p class="text-gray-600 mb-6">支持拖拽上传，自动OCR识别文字，AI分析图片内容</p>
        <router-link to="/upload">
          <el-button type="primary" size="large" round class="px-8 hover-lift">
            📤 上传图片
          </el-button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMemeStore } from '@/stores/meme'
import CategorySection from '@/components/CategorySection.vue'

const memeStore = useMemeStore()
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>