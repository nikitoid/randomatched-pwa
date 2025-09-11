<template>
  <UContainer class="flex flex-col items-center justify-center min-h-screen py-8">
    <!-- Theme Switcher -->
    <UButton
      :icon="isDark ? 'i-heroicons-sun-20-solid' : 'i-heroicons-moon-20-solid'"
      color="gray"
      variant="ghost"
      aria-label="Theme"
      class="absolute top-4 right-4"
      @click="isDark = !isDark"
    />

    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold">Randomatched</h1>
    </div>

    <div class="flex flex-col items-center w-full max-w-xs space-y-4">
      <!-- List Selector -->
      <div class="flex items-center w-full gap-2">
        <USelect
          v-model="activeListId"
          :options="listOptions"
          placeholder="Выберите список"
          class="flex-grow"
          size="xl"
        />
        <UButton
          icon="i-heroicons-cog-6-tooth"
          size="xl"
          color="gray"
          variant="outline"
          aria-label="Настройки списков"
        />
      </div>

      <!-- Generate Button -->
      <UButton
        label="Сгенерировать команды"
        size="xl"
        :disabled="isGenerateDisabled"
        block
      />

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-2 w-full">
        <UButton
          label="Последняя генерация"
          variant="outline"
          :disabled="!lastGeneration"
          block
        />
        <UButton
          label="Сброс сессии"
          variant="outline"
          color="red"
          block
          @click="isConfirmModalOpen = true"
        />
      </div>
    </div>

    <!-- Confirmation Modal (placeholder) -->
    <UModal v-model="isConfirmModalOpen">
      <UCard>
        <template #header>
          <div class="text-lg font-bold">Подтверждение</div>
        </template>
        <p>Вы уверены, что хотите сбросить сессию? Это действие удалит последнюю генерацию.</p>
        <template #footer>
          <div class="flex justify-end space-x-2">
            <UButton label="Отмена" color="gray" @click="isConfirmModalOpen = false" />
            <UButton label="Сбросить" color="red" @click="resetSession" />
          </div>
        </template>
      </UCard>
    </UModal>

  </UContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppState } from '~/composables/useAppState';

const { heroLists, activeListId, lastGeneration } = useAppState();

const colorMode = useColorMode();
const isDark = computed({
  get() {
    return colorMode.value === 'dark';
  },
  set() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
  },
});

const isConfirmModalOpen = ref(false);

const listOptions = computed(() => 
  heroLists.value.map(list => ({ label: list.name, value: list.id }))
);

const activeList = computed(() => 
  heroLists.value.find(list => list.id === activeListId.value)
);

const isGenerateDisabled = computed(() => {
  if (!activeList.value) return true;
  return activeList.value.heroes.length < 4;
});

const resetSession = () => {
  lastGeneration.value = null;
  isConfirmModalOpen.value = false;
  // Here you might want to add a toast notification
};

</script>
