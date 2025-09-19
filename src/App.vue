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
}
</style>