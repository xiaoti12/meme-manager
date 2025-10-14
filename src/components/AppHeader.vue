<template>
  <header class="header glass-effect backdrop-blur-custom card-shadow">
    <div class="container mx-auto px-4 py-6">
      <div class="text-center mb-6">
        <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2 md:gap-3">
          <img :src="iconUrl" alt="MemeHub图标" class="w-8 h-8 md:w-12 md:h-12" />
          MemeHub
        </h1>
        <p class="text-base md:text-lg text-gray-600">智能识别 · 快速搜索 · 分类管理</p>
      </div>

      <div class="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
        <el-input v-model="searchKeyword" placeholder="搜索表情包..." class="max-w-md w-full md:w-auto" size="large" clearable
          @input="handleSearch">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
      </div>



      <!-- 桌面端导航 -->
      <div class="hidden md:flex justify-center gap-4 mt-4">
        <router-link to="/" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'home' }">
          🏠 首页
        </router-link>
        <router-link to="/upload" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'upload' }">
          📤 上传
        </router-link>
        <router-link to="/search" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'search' }">
          🔍 搜索
        </router-link>
        <router-link to="/categories" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-primary-500 text-white': $route.name === 'categories' }">
          📁 分类
        </router-link>
        <router-link to="/trash" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-orange-500 text-white': $route.name === 'trash' }">
          🗑️ 回收站
        </router-link>
        <router-link to="/data-sync" class="px-4 py-2 rounded-lg transition-colors hover:bg-primary-100"
          :class="{ 'bg-blue-500 text-white': $route.name === 'data-sync' }">
          📦 数据同步
        </router-link>
      </div>

    </div>
  </header>

  <!-- 移动端底部固定导航栏 -->
  <nav class="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm border-t border-gray-200 safe-area-inset-bottom z-50">
    <div class="grid grid-cols-6 h-16">
      <router-link
        v-for="nav in navigationItems"
        :key="nav.name"
        :to="nav.path"
        class="flex flex-col items-center justify-center text-xs transition-colors"
        :class="$route.name === nav.name ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'"
        active-class="text-primary-600 bg-primary-50">
        <div class="text-lg mb-1">{{ nav.icon }}</div>
        <span class="text-xs leading-none">{{ nav.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useMemeStore } from '@/stores/meme'

// 图标URL
const iconUrl = computed(() => {
  if (typeof window !== 'undefined' && (window as any).APP_ICON_DATA) {
    return (window as any).APP_ICON_DATA
  }
  // 回退到默认图标
  return 'BASE64_IMAGE_DATA_PLACEHOLDER'
})

const memeStore = useMemeStore()

const searchKeyword = ref('')

// 移动端底部导航配置
const navigationItems = [
  { name: 'home', path: '/', icon: '🏠', label: '首页' },
  { name: 'upload', path: '/upload', icon: '📤', label: '上传' },
  { name: 'search', path: '/search', icon: '🔍', label: '搜索' },
  { name: 'categories', path: '/categories', icon: '📁', label: '分类' },
  { name: 'trash', path: '/trash', icon: '🗑️', label: '回收站' },
  { name: 'data-sync', path: '/data-sync', icon: '📦', label: '数据同步' }
]




const handleSearch = () => {
  memeStore.setSearchFilters({
    keyword: searchKeyword.value,
    category: 'all'
  })
}



watch(searchKeyword, () => {
  handleSearch()
})
</script>

<style scoped>
.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.container {
  max-width: 1200px;
}

/* 移动端底部导航样式 */
.mobile-bottom-nav {
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}


/* iOS 安全区域适配 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .safe-area-inset-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>