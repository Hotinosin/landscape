<script setup lang="ts">
import { computed } from "vue";
import { useDialog } from "naive-ui";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  onConfirm: () => void | Promise<void>;
  content?: string;
  item?: string;
  label?: string;
}>();

const dialog = useDialog();
const { t } = useI18n();
const dialogContent = computed(
  () =>
    props.content ??
    (props.item
      ? t("common.delete_confirm_content", { item: props.item })
      : t("common.delete_confirm_generic")),
);

function confirmDelete() {
  dialog.error({
    autoFocus: false,
    title: t("common.confirm_delete"),
    content: dialogContent.value,
    positiveText: t("common.delete"),
    negativeText: t("common.cancel"),
    negativeButtonProps: { type: "default", secondary: true },
    onPositiveClick: props.onConfirm,
  });
}
</script>

<template>
  <n-button
    class="standard-operation-button"
    size="small"
    type="error"
    @click="confirmDelete"
  >
    {{ label ?? t("common.delete") }}
  </n-button>
</template>
