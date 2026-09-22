<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { read_context_from_clipboard } from "@/lib/common";
import ConfirmModal from "@/components/common/ConfirmModal.vue";
import CodeViewer from "@/components/common/CodeViewer.vue";

const props = defineProps<{
  onConfirm: (value: any) => unknown;
}>();

const { t } = useI18n();
const show = ref(false);
const loading = ref(false);
const pending = ref(false);
const raw = ref("");
const parsed = ref<any>();
const error = ref(false);
const count = computed(() =>
  Array.isArray(parsed.value)
    ? parsed.value.length
    : parsed.value == null
      ? 0
      : 1,
);
const preview = computed(() => {
  if (parsed.value !== undefined) return JSON.stringify(parsed.value, null, 2);
  return raw.value;
});

async function open() {
  show.value = true;
  loading.value = true;
  raw.value = "";
  parsed.value = undefined;
  error.value = false;
  try {
    raw.value = await read_context_from_clipboard();
    parsed.value = JSON.parse(raw.value);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function confirm() {
  if (pending.value || error.value || parsed.value === undefined) return false;
  pending.value = true;
  try {
    const result = await props.onConfirm(parsed.value);
    if (result !== false) show.value = false;
  } finally {
    pending.value = false;
  }
  return false;
}
</script>

<template>
  <ConfirmModal
    v-model:show="show"
    :title="t('common.paste_confirm_title')"
    :on-positive-click="confirm"
    :positive-button-props="{ disabled: loading || error, loading: pending }"
  >
    <template #trigger>
      <span style="display: inline-flex" @click.stop="open">
        <slot name="trigger" />
      </span>
    </template>
    <n-spin :show="loading">
      <n-flex vertical :size="8">
        <n-text v-if="!error">
          {{ t("common.paste_confirm_description", { count }) }}
        </n-text>
        <n-alert v-else type="error">
          {{ t("common.paste_failed") }}
        </n-alert>
        <CodeViewer
          v-if="preview"
          :content="preview"
          max-height="320px"
          style="min-height: 120px"
        />
      </n-flex>
    </n-spin>
  </ConfirmModal>
</template>
