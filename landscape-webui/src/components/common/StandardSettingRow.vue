<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    controlWidth?: "auto" | "default" | "wide";
  }>(),
  { controlWidth: "default" },
);
</script>

<template>
  <div
    class="standard-setting-row"
    :class="`standard-setting-row--${controlWidth}`"
  >
    <strong class="standard-setting-row__label">
      <slot name="label">{{ label }}</slot>
    </strong>
    <div
      class="standard-setting-row__control"
      :class="`standard-setting-row__control--${controlWidth}`"
    >
      <slot />
    </div>
  </div>
</template>
