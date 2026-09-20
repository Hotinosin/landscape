<script setup lang="ts">
import GlobalTerminal from "@/components/GlobalTerminal.vue";
</script>

<template>
  <div class="webshell-view">
    <GlobalTerminal page />
  </div>
</template>

<style scoped>
.webshell-view {
  width: 100%;
  height: 100%;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}
</style>
