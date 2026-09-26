<script lang="ts" setup>
import { Help } from "@vicons/carbon";
</script>
<template>
  <n-flex :size="[5, 0]" justify="start" align="center">
    <slot></slot>
    <n-popover
      trigger="hover"
      placement="top-start"
      :style="{ maxWidth: '360px', whiteSpace: 'normal', lineHeight: '1.6' }"
    >
      <template #trigger>
        <n-button text>
          <template #icon>
            <n-icon><Help /></n-icon>
          </template>
        </n-button>
      </template>
      <slot name="msg"></slot>
    </n-popover>
  </n-flex>
</template>
