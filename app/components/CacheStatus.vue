<template>
  <div v-if="cacheInfo" class="cache-status">
    <p>Кэш: {{ cacheInfo.entries }} файлов</p>
    <p>Статус: {{ cacheInfo.status }}</p>
  </div>
</template>

<script setup lang="ts">
const cacheInfo = ref({ entries: 0, status: "loading..." });

onMounted(async () => {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const cacheStorage = await caches.keys();
      const cache = await caches.open("static-assets-v1");
      const cachedRequests = await cache.keys();
      cacheInfo.value = {
        entries: cachedRequests.length,
        status: "Готово к оффлайн-работе!",
      };
    }
  }
});
</script>

<style scoped>
.cache-status {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  z-index: 9999;
}
</style>
