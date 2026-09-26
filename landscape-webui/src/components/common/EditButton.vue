<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{ label?: string }>();

function clearPointerFocus(event: PointerEvent) {
  (event.currentTarget as HTMLElement).blur();
}
</script>

<template>
  <n-button
    v-bind="$attrs"
    class="standard-operation-button edit-button"
    size="small"
    @pointerup="clearPointerFocus"
  >
    {{ label ?? $t("common.config") }}
  </n-button>
</template>

<style scoped>
.edit-button:hover {
  --n-color: var(--app-brand-color) !important;
  --n-color-hover: var(--app-brand-color) !important;
  --n-border: 1px solid var(--app-brand-color) !important;
  --n-border-hover: 1px solid var(--app-brand-color) !important;
  --n-text-color: white !important;
  --n-text-color-hover: white !important;
}
</style>
