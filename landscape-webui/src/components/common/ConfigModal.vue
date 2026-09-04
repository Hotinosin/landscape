<script setup lang="ts">
import { computed } from "vue";
import type { CSSProperties } from "vue";

defineOptions({ inheritAttrs: false });

const show = defineModel<boolean>("show", { required: true });
const enabled = defineModel<boolean>("enabled", { required: true });

const props = withDefaults(
  defineProps<{
    title: string;
    width?: string | number;
    maxHeight?: string;
    closable?: boolean;
    switchDisabled?: boolean;
    showSwitch?: boolean;
  }>(),
  {
    width: "var(--app-secondary-modal-width)",
    maxHeight: "var(--app-secondary-modal-max-height)",
    closable: true,
    switchDisabled: false,
    showSwitch: true,
  },
);

const cardStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    width: typeof props.width === "number" ? `${props.width}px` : props.width,
  };

  if (props.maxHeight) {
    style.maxHeight = props.maxHeight;
  }

  return style;
});

const headerStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  };

  if (props.closable) {
    style.paddingRight = "28px";
  }

  return style;
});

function closeModal() {
  show.value = false;
}

function enableRailStyle({ checked }: { checked: boolean }) {
  return checked ? { background: "var(--app-status-success-color)" } : {};
}
</script>

<template>
  <n-modal v-bind="$attrs" v-model:show="show" :auto-focus="false">
    <n-card
      :style="cardStyle"
      :bordered="false"
      :closable="closable"
      size="small"
      content-style="min-height: 0; overflow: auto"
      role="dialog"
      aria-modal="true"
      @close="closeModal"
    >
      <template #header>
        <div :style="headerStyle">
          <span>{{ title }}</span>
          <n-switch
            v-if="showSwitch"
            v-model:value="enabled"
            :disabled="switchDisabled"
            :rail-style="enableRailStyle"
            size="small"
          />
        </div>
      </template>

      <slot v-if="$slots.default" :enabled="enabled" :disabled="!enabled" />

      <template v-if="$slots.footer" #footer>
        <slot name="footer" :enabled="enabled" :disabled="!enabled" />
      </template>
    </n-card>
  </n-modal>
</template>
