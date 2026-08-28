<script setup lang="ts">
import { Edit } from "@vicons/carbon";

defineOptions({ inheritAttrs: false });
</script>

<template>
  <n-button v-bind="$attrs" type="primary" size="small" secondary>
    <template #icon>
      <n-icon><Edit /></n-icon>
    </template>
    {{ $t("common.edit") }}
  </n-button>
</template>
