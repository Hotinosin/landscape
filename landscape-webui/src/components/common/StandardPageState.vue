<script setup lang="ts">
import type { PageState } from "@/lib/page_state";

withDefaults(
  defineProps<{
    state: PageState;
    emptyText?: string;
    errorText?: string;
    compact?: boolean;
  }>(),
  { compact: false },
);

defineEmits<{ retry: [] }>();
</script>

<template>
  <div
    v-if="state !== 'ready'"
    class="standard-page-state"
    :class="{ 'standard-page-state--compact': compact }"
    role="status"
    aria-live="polite"
  >
    <n-spin v-if="state === 'initial' || state === 'loading'" size="small" />
    <n-result
      v-else-if="state === 'error'"
      status="error"
      :title="errorText ?? $t('common.load_failed')"
    >
      <template #footer>
        <n-button secondary @click="$emit('retry')">
          {{ $t("common.retry") }}
        </n-button>
      </template>
    </n-result>
    <n-empty v-else :description="emptyText ?? $t('common.no_data')">
      <template v-if="$slots['empty-extra']" #extra>
        <slot name="empty-extra" />
      </template>
    </n-empty>
  </div>
  <slot v-else />
</template>
