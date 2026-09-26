<script setup lang="ts" generic="T extends object">
import type { DataTableColumns, DataTableRowKey } from "naive-ui";

defineOptions({ inheritAttrs: false });
defineEmits<{ retry: [] }>();

withDefaults(
  defineProps<{
    columns: DataTableColumns<T>;
    data: T[];
    loading?: boolean;
    rowKey?: (row: T) => DataTableRowKey;
    scrollX?: number | string;
    size?: "small" | "medium" | "large";
    emptyText?: string;
    error?: unknown;
  }>(),
  {
    loading: false,
    size: "medium",
  },
);
</script>

<template>
  <StandardPageState
    v-if="error"
    state="error"
    compact
    @retry="$emit('retry')"
  />
  <n-data-table
    v-else
    v-bind="$attrs"
    class="standard-data-table"
    :columns="columns"
    :data="data"
    :loading="loading"
    :row-key="rowKey"
    :scroll-x="scrollX"
    :size="size"
    :bordered="false"
    :single-line="false"
  >
    <template #empty>
      <n-empty :description="emptyText ?? $t('common.no_data')" />
    </template>
  </n-data-table>
</template>
