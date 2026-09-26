<script setup lang="ts">
import { Help, Renew } from "@vicons/carbon";

defineOptions({ inheritAttrs: false });
defineProps<{
  kind: "help" | "refresh";
  tooltip?: string;
}>();
</script>

<template>
  <n-tooltip trigger="hover">
    <template #trigger>
      <n-button v-bind="$attrs" quaternary circle size="small">
        <template #icon>
          <n-icon :size="18">
            <Help v-if="kind === 'help'" />
            <Renew v-else />
          </n-icon>
        </template>
      </n-button>
    </template>
    <slot>{{ tooltip }}</slot>
  </n-tooltip>
</template>
