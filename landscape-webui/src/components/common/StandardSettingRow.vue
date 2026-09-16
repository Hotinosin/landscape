<script setup lang="ts">
import type { FormItemProps } from "naive-ui";

withDefaults(
  defineProps<{
    label?: string;
    controlWidth?: "auto" | "default" | "wide";
    path?: string;
    required?: boolean;
    feedback?: string;
    validationStatus?: FormItemProps["validationStatus"];
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
      <span v-if="required" class="standard-setting-row__required"> *</span>
    </strong>
    <div
      class="standard-setting-row__control"
      :class="`standard-setting-row__control--${controlWidth}`"
    >
      <n-form-item
        v-if="path || feedback || validationStatus"
        class="standard-setting-row__form-item"
        :path="path"
        :show-label="false"
        :feedback="feedback"
        :validation-status="validationStatus"
      >
        <slot />
      </n-form-item>
      <slot v-else />
    </div>
  </div>
</template>

<style scoped>
.standard-setting-row__required {
  color: var(--app-status-danger-color);
}

.standard-setting-row__form-item {
  width: 100%;
}
</style>
