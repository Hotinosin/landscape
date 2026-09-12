<script setup lang="ts">
import { computed } from "vue";
import { useMessage } from "naive-ui";
import { useFrontEndStore } from "@/stores/front_end_config";
import { copy_context_to_clipboard } from "@/lib/common";

const props = defineProps<{ value?: string | null; emptyText?: string }>();
const frontEndStore = useFrontEndStore();
const message = useMessage();
const displayValue = computed(() =>
  props.value ? frontEndStore.MASK_INFO(props.value) : (props.emptyText ?? "—"),
);
</script>

<template>
  <button
    v-if="value"
    class="mac-address"
    type="button"
    :title="$t('common.copy')"
    :aria-label="`${$t('common.copy')}: ${displayValue}`"
    @click="copy_context_to_clipboard(message, displayValue)"
  >
    {{ displayValue }}
  </button>
  <span v-else>{{ displayValue }}</span>
</template>

<style scoped>
.mac-address {
  padding: 2px 6px;
  border: 0;
  border-radius: var(--app-radius-control);
  background: transparent;
  color: inherit;
  font: inherit;
  font-family: var(--font-mono);
  white-space: nowrap;
  cursor: pointer;
  transition:
    color var(--app-motion-normal, 180ms) ease,
    background-color var(--app-motion-normal, 180ms) ease;
}

.mac-address:hover {
  color: var(--app-brand-active-color);
  background: color-mix(in srgb, var(--app-brand-color) 12%, transparent);
}

.mac-address:active {
  background: color-mix(in srgb, var(--app-brand-color) 20%, transparent);
}
</style>
