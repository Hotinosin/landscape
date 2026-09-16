<script setup lang="ts">
import { computed, inject, onMounted } from "vue";
import type { CSSProperties } from "vue";
import { useDialog } from "naive-ui";
import { useI18n } from "vue-i18n";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";
import { useNeutralDialogButtonProps } from "@/composables/useNeutralDialogButtonProps";

defineOptions({ inheritAttrs: false });

const show = defineModel<boolean>("show", { required: true });
const enabled = defineModel<boolean>("enabled", { default: true });
const emit = defineEmits(["after-enter", "dirty"]);
const modalDepth = inject("app-modal-depth", 1);
const dialog = useDialog();
const { t } = useI18n();
const neutralButtonProps = useNeutralDialogButtonProps();

const props = withDefaults(
  defineProps<{
    title: string;
    titleTip?: string;
    width?: string | number;
    maxHeight?: string;
    closable?: boolean;
    switchDisabled?: boolean;
    showSwitch?: boolean;
    embedded?: boolean;
    fixedTop?: boolean;
    topOffset?: string;
    dirty?: boolean;
  }>(),
  {
    width: "var(--app-secondary-modal-width)",
    maxHeight: "var(--app-secondary-modal-max-height)",
    closable: true,
    switchDisabled: false,
    showSwitch: true,
    embedded: false,
    fixedTop: false,
    topOffset: "var(--app-modal-top-offset)",
    dirty: false,
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

  if (!props.embedded && props.fixedTop && modalDepth === 1) {
    style.marginTop = props.topOffset;
    style.marginBottom = "auto";
  } else if (!props.embedded && modalDepth > 1) {
    style.marginTop = "auto";
    style.marginBottom = "auto";
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

function requestClose() {
  if (!props.dirty) {
    closeModal();
    return;
  }

  dialog.warning({
    title: t("common.unsaved_title"),
    content: t("common.unsaved_content"),
    positiveText: t("common.discard"),
    negativeText: t("common.cancel"),
    positiveButtonProps: { type: "error" },
    negativeButtonProps: neutralButtonProps.value,
    onPositiveClick: closeModal,
  });
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
    <StandardSettingRow v-if="showSwitch" control-width="auto">
      <template #label>
        <Notice v-if="titleTip">
          {{ title }}
          <template #msg>{{ titleTip }}</template>
        </Notice>
        <template v-else>{{ title }}</template>
      </template>
      <n-switch
        v-model:value="enabled"
        :disabled="switchDisabled"
        size="medium"
      />
    </StandardSettingRow>
    <slot v-if="$slots.default" :enabled="enabled" :disabled="!enabled" />
  </section>

  <n-modal
    v-else
    v-bind="$attrs"
    :show="show"
    :auto-focus="false"
    @update:show="(value: boolean) => !value && requestClose()"
    @after-enter="emit('after-enter')"
  >
    <n-card
      class="standard-config-modal"
      :style="cardStyle"
      :bordered="false"
      :closable="closable"
      size="small"
      content-style="min-height: 0; overflow: auto"
      role="dialog"
      :aria-modal="true"
      @close="requestClose"
    >
      <template #header>
        <div :style="headerStyle">
          <Notice v-if="titleTip">
            {{ title }}
            <template #msg>{{ titleTip }}</template>
          </Notice>
          <span v-else>{{ title }}</span>
          <n-switch
            v-if="showSwitch"
            v-model:value="enabled"
            :disabled="switchDisabled"
            size="medium"
          />
        </div>
      </template>

      <slot v-if="$slots.default" :enabled="enabled" :disabled="!enabled" />

      <template v-if="$slots.footer" #footer>
        <slot
          name="footer"
          :enabled="enabled"
          :disabled="!enabled"
          :close="requestClose"
        />
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
.config-modal--embedded {
  width: 100%;
  min-width: 0;
}

:deep(.standard-config-modal > .n-card__footer > .n-flex) {
  justify-content: flex-end !important;
}

:deep(
  .standard-config-modal > .n-card__footer > .standard-modal-footer--split
) {
  justify-content: space-between !important;
}
</style>
