<script setup lang="ts">
import { computed, inject, onMounted } from "vue";
import type { CSSProperties } from "vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";

defineOptions({ inheritAttrs: false });

const show = defineModel<boolean>("show", { required: true });
const enabled = defineModel<boolean>("enabled", { required: true });
const emit = defineEmits(["after-enter", "dirty"]);
const modalDepth = inject("app-modal-depth", 1);

const props = withDefaults(
  defineProps<{
    title: string;
    width?: string | number;
    maxHeight?: string;
    closable?: boolean;
    switchDisabled?: boolean;
    showSwitch?: boolean;
    embedded?: boolean;
  }>(),
  {
    width: "var(--app-secondary-modal-width)",
    maxHeight: "var(--app-secondary-modal-max-height)",
    closable: true,
    switchDisabled: false,
    showSwitch: true,
    embedded: false,
  },
);

const cardStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    width: props.embedded
      ? "100%"
      : modalDepth > 1 && props.width === "var(--app-secondary-modal-width)"
        ? "var(--app-tertiary-modal-width)"
        : typeof props.width === "number"
          ? `${props.width}px`
          : props.width,
  };

  if (!props.embedded && props.maxHeight) {
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

  if (props.closable && !props.embedded) {
    style.paddingRight = "28px";
  }

  return style;
});

function closeModal() {
  show.value = false;
}

onMounted(() => {
  if (props.embedded) emit("after-enter");
});
</script>

<template>
  <section
    v-if="embedded"
    class="config-modal--embedded"
    @change.capture="emit('dirty')"
    @input.capture="emit('dirty')"
  >
    <StandardSettingRow v-if="showSwitch" :label="title" control-width="auto">
      <n-switch
        v-model:value="enabled"
        :disabled="switchDisabled"
        size="small"
      />
    </StandardSettingRow>
    <slot v-if="$slots.default" :enabled="enabled" :disabled="!enabled" />
  </section>

  <n-modal
    v-else
    v-bind="$attrs"
    :show="show"
    :auto-focus="false"
    @update:show="(value: boolean) => (show = value)"
    @after-enter="emit('after-enter')"
  >
    <n-card
      :style="cardStyle"
      :bordered="false"
      :closable="closable"
      size="small"
      content-style="min-height: 0; overflow: auto"
      role="dialog"
      :aria-modal="true"
      @close="closeModal"
    >
      <template #header>
        <div :style="headerStyle">
          <span>{{ title }}</span>
          <n-switch
            v-if="showSwitch"
            v-model:value="enabled"
            :disabled="switchDisabled"
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

<style scoped>
.config-modal--embedded {
  width: 100%;
  min-width: 0;
}
</style>
