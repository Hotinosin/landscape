<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    hasSucceeded: boolean;
    loading?: boolean;
    error?: unknown;
    lastSuccessAt?: number | null;
    stale?: boolean;
    compact?: boolean;
  }>(),
  { loading: false, lastSuccessAt: null, stale: false, compact: false },
);
defineEmits<{ retry: [] }>();

const initialState = computed(() =>
  props.error ? "error" : props.loading ? "loading" : "initial",
);
</script>

<template>
  <StandardPageState
    v-if="!hasSucceeded"
    :state="initialState"
    :compact="compact"
    @retry="$emit('retry')"
  />
  <div
    v-else
    class="request-status"
    :class="{ 'request-status--fill': !compact }"
  >
    <n-alert
      v-if="error || stale"
      type="warning"
      :show-icon="false"
      class="request-warning"
    >
      <n-flex justify="space-between" align="center" :wrap="false">
        <span>
          {{
            stale
              ? $t("common.showing_previous_query")
              : $t("common.refresh_failed_previous_result")
          }}
        </span>
        <n-button
          size="tiny"
          secondary
          :loading="loading"
          @click="$emit('retry')"
        >
          {{ $t("common.retry") }}
        </n-button>
      </n-flex>
    </n-alert>
    <slot />
  </div>
</template>

<style scoped>
.request-warning {
  margin-bottom: 8px;
}
.request-status {
  width: 100%;
  min-width: 0;
}
.request-status--fill {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
</style>
