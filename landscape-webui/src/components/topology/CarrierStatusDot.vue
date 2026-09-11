<script setup lang="ts">
import { useThemeVars } from "naive-ui";
import { changeColor } from "seemly";

defineProps<{ active: boolean; title?: string }>();
const themeVars = useThemeVars();
</script>

<template>
  <span
    class="topology-carrier-dot"
    :title="title"
    :style="{
      backgroundColor: active ? themeVars.successColor : themeVars.borderColor,
      boxShadow: `0 0 0 4px ${changeColor(themeVars.textColor3, { alpha: 0.12 })}`,
    }"
  />
</template>

<style scoped>
.topology-carrier-dot {
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: var(--app-radius-pill);
}
</style>
