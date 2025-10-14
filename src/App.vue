<template>
  <div class="min-h-screen">
    <AppHeader />
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
</script>

<style scoped>
.main-content {
  padding: 0;
  min-height: calc(100vh - 200px);
  /* 移动端底部导航栏留白 */
  padding-bottom: 0;
}

@media (max-width: 767px) {
  .main-content {
    /* 移动端为底部固定导航栏预留 64px 空间 */
    padding-bottom: 64px;
  }
}
</style>