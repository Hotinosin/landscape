<script setup lang="ts">
import type { FormItemProps } from "naive-ui";
import { Help } from "@vicons/carbon";

withDefaults(
  defineProps<{
    label?: string;
    controlWidth?: "auto" | "default" | "wide" | "compact";
    path?: string;
    rule?: FormItemProps["rule"];
    required?: boolean;
    feedback?: string;
    hint?: string;
    validationStatus?: FormItemProps["validationStatus"];
    layout?: "row" | "stacked";
  }>(),
  { controlWidth: "default", layout: "row" },
);
</script>

<template>
  <div
    class="standard-setting-row"
    :class="[
      `standard-setting-row--${controlWidth}`,
      { 'standard-setting-row--stacked': layout === 'stacked' },
    ]"
  >
    <strong class="standard-setting-row__label">
      <span class="standard-setting-row__label-text">
        <slot name="label">{{ label }}</slot>
      </span>
      <span v-if="required" class="standard-setting-row__required"> *</span>
      <n-tooltip v-if="hint" trigger="hover" placement="top">
        <template #trigger>
          <span class="standard-setting-row__hint-icon" role="button" tabindex="0">
            <n-icon><Help /></n-icon>
          </span>
        </template>
        <span>{{ hint }}</span>
      </n-tooltip>
    </strong>
    <div
      class="standard-setting-row__control"
      :class="[
        `standard-setting-row__control--${controlWidth}`,
        {
          'standard-setting-row__control--stacked': layout === 'stacked',
        },
      ]"
    >
      <n-form-item
        v-if="path || feedback || validationStatus"
        class="standard-setting-row__form-item"
        :path="path"
        :rule="rule"
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
.standard-setting-row {
  align-items: center;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--app-setting-control-width);
  gap: var(--app-space-lg);
  min-height: var(--app-control-height);
  font-size: var(--app-font-size-body);
  margin-bottom: var(--app-space-section);
}

.standard-setting-row--stacked {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xs);
  height: 100%;
}

.standard-setting-row--wide {
  grid-template-columns:
    minmax(0, 1fr)
    var(--app-setting-control-width-wide);
}

.standard-setting-row--compact {
  align-items: center;
  grid-template-columns:
    minmax(0, 1fr)
    var(--app-setting-control-width-compact, 110px);
  gap: var(--app-space-sm);
  margin-bottom: 0;
}

.standard-setting-row--auto {
  grid-template-columns: minmax(0, 1fr) auto;
}

.standard-setting-row__label {
  display: flex;
  align-items: center;
  flex: none;
  font-weight: 600;
  white-space: nowrap;
  min-height: var(--app-control-height);
}

.standard-setting-row--stacked .standard-setting-row__label {
  min-height: auto;
  white-space: normal;
  line-height: var(--app-line-height-tight, 1.35);
  margin-bottom: var(--app-space-xs);
}

.standard-setting-row--compact .standard-setting-row__label {
  white-space: normal;
  line-height: var(--app-line-height-tight, 1.35);
}

.standard-setting-row__control {
  min-width: 0;
  width: var(--app-setting-control-width);
}

.standard-setting-row__control--auto {
  width: auto;
  padding-right: 4px;
}

.standard-setting-row__control--wide {
  width: var(--app-setting-control-width-wide);
}

.standard-setting-row__control--compact {
  width: var(--app-setting-control-width-compact, 110px);
}

.standard-setting-row__control--stacked {
  width: 100%;
  margin-top: auto;
}

.standard-setting-row__control:not(.standard-setting-row__control--auto) :deep(.n-form-item),
.standard-setting-row__control:not(.standard-setting-row__control--auto) :deep(.n-form-item-blank),
.standard-setting-row__control:not(.standard-setting-row__control--auto) :deep(.n-form-item-blank > *),
.standard-setting-row__control:not(.standard-setting-row__control--auto) :deep(.n-input),
.standard-setting-row__control:not(.standard-setting-row__control--auto) :deep(.n-input-number),
.standard-setting-row__control:not(.standard-setting-row__control--auto) :deep(.n-select),
.standard-setting-row__control:not(.standard-setting-row__control--auto) > :deep(*) {
  width: 100%;
}

.standard-setting-row__required {
  color: var(--app-status-danger-color);
}

.standard-setting-row__hint-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: var(--app-space-xs);
  font-size: var(--app-setting-hint-size, 15px);
  color: var(--app-text-muted-color);
  cursor: pointer;
  vertical-align: middle;
  transition: color 0.15s ease;
  line-height: 1;
}

.standard-setting-row__hint-icon:hover,
.standard-setting-row__hint-icon:focus-visible {
  color: var(--app-brand-color);
}

.standard-setting-row__form-item {
  --n-feedback-height: 0px !important;
  margin-bottom: 0;
  width: 100%;
}

.standard-setting-row__form-item :deep(.n-form-item-blank) {
  width: 100%;
}

.standard-setting-row__form-item :deep(.n-form-item-blank > *) {
  width: 100%;
}

@media (max-width: 640px) {
  .standard-setting-row:not(.standard-setting-row--compact) {
    align-items: stretch;
    display: flex;
    flex-direction: column;
  }

  .standard-setting-row:not(.standard-setting-row--compact) .standard-setting-row__control,
  .standard-setting-row:not(.standard-setting-row--compact) .standard-setting-row__control--wide {
    width: 100%;
  }
}
</style>
