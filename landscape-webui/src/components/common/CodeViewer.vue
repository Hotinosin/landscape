<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { CSSProperties } from "vue";
import { Copy } from "@vicons/carbon";
import { darkTheme, useMessage } from "naive-ui";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    content?: string;
    maxHeight?: string | number;
    height?: string | number;
    showCopy?: boolean;
    autoScrollBottom?: boolean;
    emptyText?: string;
    wrap?: boolean;
  }>(),
  {
    content: "",
    height: "100%",
    showCopy: false,
    autoScrollBottom: false,
    wrap: true,
  },
);

const { t } = useI18n();
const message = useMessage();
const scrollbarRef = ref<any>(null);

const containerStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    height:
      typeof props.height === "number" ? `${props.height}px` : props.height,
  };
  if (props.maxHeight) {
    style.maxHeight =
      typeof props.maxHeight === "number"
        ? `${props.maxHeight}px`
        : props.maxHeight;
  }
  return style;
});

async function handleCopy() {
  if (!props.content) return;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.content);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = props.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    message.success(t("common.copy_success"));
  } catch {
    message.error(t("common.copy_failed"));
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollbarRef.value) {
      scrollbarRef.value.scrollTo({ position: "bottom", silent: true });
    }
  });
}

watch(
  () => props.content,
  () => {
    if (props.autoScrollBottom) {
      scrollToBottom();
    }
  },
);

defineExpose({
  scrollToBottom,
});
</script>

<template>
  <n-config-provider
    :theme="darkTheme"
    class="app-code-viewer"
    :style="containerStyle"
  >
    <div v-if="showCopy && content" class="app-code-viewer__actions">
      <n-tooltip trigger="hover" placement="left">
        <template #trigger>
          <n-button
            size="tiny"
            quaternary
            circle
            class="app-code-viewer__copy-btn"
            @click="handleCopy"
          >
            <template #icon>
              <n-icon><Copy /></n-icon>
            </template>
          </n-button>
        </template>
        {{ t("common.copy") }}
      </n-tooltip>
    </div>

    <n-scrollbar ref="scrollbarRef" class="app-code-viewer__scrollbar">
      <pre
        class="app-code-viewer__content"
        :class="{ 'app-code-viewer__content--nowrap': !wrap }"
      >{{ content || emptyText || "" }}</pre>
    </n-scrollbar>
  </n-config-provider>
</template>

<style scoped>
.app-code-viewer {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  min-height: 0;
  border-radius: var(--app-radius-control, 8px);
  background-color: var(--app-terminal-background-color, #121212) !important;
  color: #f0f0f0 !important;
  border: 1px solid
    var(--app-terminal-border-color, rgba(255, 255, 255, 0.15));
  box-sizing: border-box;
  overflow: hidden;
}

.app-code-viewer__actions {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 5;
}

.app-code-viewer__copy-btn {
  color: rgba(255, 255, 255, 0.6) !important;
  background-color: rgba(255, 255, 255, 0.08) !important;
  transition:
    color 0.2s,
    background-color 0.2s;
}

.app-code-viewer__copy-btn:hover {
  color: #ffffff !important;
  background-color: rgba(255, 255, 255, 0.2) !important;
}

.app-code-viewer__scrollbar {
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
  background-color: transparent !important;
}

:deep(.n-scrollbar-container),
:deep(.n-scrollbar-content) {
  background-color: transparent !important;
}

.app-code-viewer__content {
  box-sizing: border-box;
  margin: 0;
  padding: var(--app-space-sm, 12px);
  font-family: var(--font-mono);
  font-size: var(--app-font-size-caption);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: #f0f0f0 !important;
  background-color: transparent !important;
}

.app-code-viewer__content--nowrap {
  white-space: pre;
  overflow-wrap: normal;
}
</style>
