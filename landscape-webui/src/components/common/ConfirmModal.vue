<script setup lang="ts">
import { ref } from "vue";
import type { ButtonProps } from "naive-ui";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  onPositiveClick?: () => unknown;
  positiveButtonProps?: ButtonProps;
}>();
const show = defineModel<boolean>("show", { default: false });
const pending = ref(false);
const { t } = useI18n();

async function confirm() {
  if (pending.value) return false;
  pending.value = true;
  try {
    const result = await props.onPositiveClick?.();
    if (result !== false) show.value = false;
  } finally {
    pending.value = false;
  }
  return false;
}
</script>

<template>
  <span style="display: inline-flex" @click="show = true">
    <slot name="trigger" />
  </span>
  <n-modal
    v-model:show="show"
    preset="dialog"
    type="warning"
    :title="t('common.confirm')"
    :auto-focus="false"
    :positive-text="t('common.confirm')"
    :negative-text="t('common.cancel')"
    :positive-button-props="{ ...positiveButtonProps, loading: pending || positiveButtonProps?.loading }"
    :negative-button-props="{ type: 'default', secondary: true, disabled: pending }"
    :mask-closable="!pending"
    :close-on-esc="!pending"
    :closable="!pending"
    @positive-click="confirm"
    @negative-click="show = false"
  >
    <slot />
  </n-modal>
</template>
