<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const value = defineModel<boolean>("value", { required: true });

function railStyle({ checked }: { checked: boolean }) {
  return checked ? { background: "var(--app-status-success-color)" } : {};
}
</script>

<template>
  <n-switch
    v-model:value="value"
    v-bind="$attrs"
    size="medium"
    :rail-style="railStyle"
  />
</template>
