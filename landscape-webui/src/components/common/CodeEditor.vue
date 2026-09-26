<script setup lang="ts">
import { computed } from "vue";
import type { CSSProperties } from "vue";
import { darkTheme } from "naive-ui";

const modelValue = defineModel<string>("value", { default: "" });

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    minHeight?: string | number;
    maxHeight?: string | number;
    height?: string | number;
  }>(),
  {
    minHeight: "180px",
    height: "100%",
    disabled: false,
    readonly: false,
  },
);

const emit = defineEmits<{
  (e: "input", value: string): void;
  (e: "change", value: string): void;
}>();

const containerStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    height:
      typeof props.height === "number" ? `${props.height}px` : props.height,
  };
  if (props.minHeight) {
    style.minHeight =
      typeof props.minHeight === "number"
        ? `${props.minHeight}px`
        : props.minHeight;
  }
  if (props.maxHeight) {
    style.maxHeight =
      typeof props.maxHeight === "number"
        ? `${props.maxHeight}px`
        : props.maxHeight;
  }
  return style;
});

function handleInput(val: string) {
  emit("input", val);
}

function handleChange(val: string) {
  emit("change", val);
}

const darkInputOverrides = {
  Input: {
    color: "var(--app-terminal-background-color)",
    colorFocus: "var(--app-terminal-background-color)",
    colorDisabled: "var(--app-terminal-background-color)",
    textColor: "var(--app-text-inverse-strong-color)",
    placeholderColor: "var(--app-text-inverse-muted-color)",
    caretColor: "var(--app-text-inverse-strong-color)",
    border: "1px solid var(--app-terminal-border-color)",
    borderHover: "1px solid var(--n-primary-color-hover)",
    borderFocus: "1px solid var(--n-primary-color)",
    boxShadowFocus: "0 0 0 2px var(--n-primary-color-suppl)",
    borderRadius: "var(--app-radius-control)",
  },
};
</script>

<template>
  <n-config-provider
    :theme="darkTheme"
    :theme-overrides="darkInputOverrides"
    class="app-code-editor"
    :style="containerStyle"
  >
    <n-input
      v-model:value="modelValue"
      type="textarea"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      class="app-code-editor__input"
      @input="handleInput"
      @change="handleChange"
    />
  </n-config-provider>
</template>

<style scoped>
.app-code-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-height: 0;
  box-sizing: border-box;
  position: relative;
  background-color: var(--app-terminal-background-color) !important;
  border-radius: var(--app-radius-control);
}

.app-code-editor__input {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  background-color: transparent !important;
}

:deep(.n-input) {
  background-color: var(--app-terminal-background-color) !important;
  border-radius: var(--app-radius-control);
  border: 1px solid var(--app-terminal-border-color) !important;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

:deep(.n-input:hover) {
  border-color: var(--n-primary-color-hover) !important;
}

:deep(.n-input.n-input--focus) {
  border-color: var(--n-primary-color) !important;
  box-shadow: 0 0 0 2px var(--n-primary-color-suppl) !important;
}

:deep(.n-input-wrapper) {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  padding: 0 !important;
  background-color: transparent !important;
}

:deep(.n-input__textarea) {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  position: relative;
  background-color: transparent !important;
}

:deep(.n-input__textarea-el) {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  padding: 8px 12px !important;
  box-sizing: border-box !important;
  resize: none;
  font-family: var(--font-mono);
  font-size: var(--app-font-size-caption);
  line-height: 1.5;
  overflow-y: auto !important;
  color: var(--app-text-inverse-strong-color) !important;
  caret-color: var(--app-text-inverse-strong-color) !important;
  background-color: transparent !important;
}

:deep(.n-input__textarea-el)::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

:deep(.n-input__textarea-el)::-webkit-scrollbar-thumb {
  background: var(--app-text-inverse-subtle-color);
  border-radius: var(--app-radius-control);
}

:deep(.n-input__textarea-el)::-webkit-scrollbar-thumb:hover {
  background: var(--app-text-inverse-muted-color);
}

:deep(.n-input__textarea-el)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.n-input__placeholder) {
  padding: 8px 12px !important;
  font-family: var(--font-mono);
  font-size: var(--app-font-size-caption);
  color: var(--app-text-inverse-muted-color) !important;
}
</style>
