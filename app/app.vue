<template>
  <UApp>
    <div style="min-height: 100vh; display: flex; flex-direction: column">
      <!-- Центр экрана -->
      <div
        style="
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >
        <div class="flex items-center gap-2">
          <USelectMenu v-model="value" :items="items" class="w-48" />
          <UButton
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="ghost"
            size="md"
          />
        </div>
      </div>

      <!-- Низ экрана: по центру и на всю ширину -->
      <div class="p-4">
        <UButton
          class="w-full justify-center"
          color="primary"
          size="xl"
          label="Сгенерировать команды"
        />
      </div>

      <!-- PWA Install Prompt -->
      <PWAInstallPrompt />
    </div>
  </UApp>
</template>
<!--  -->
<script setup lang="ts">
const value = ref({
  label: "Todo",
});
const items = ref([
  {
    label: "Backlog",
  },
  {
    label: "Todo",
  },
  {
    label: "In Progress",
  },
  {
    label: "Done",
  },
]);
</script>
