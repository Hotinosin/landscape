<script setup lang="ts">
import { ref } from "vue";
import type { EnrolledDevice } from "@landscape-router/types/api/schemas";
import { delete_enrolled_device } from "@/api/enrolled_device";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useI18n } from "vue-i18n";
import EnrolledDeviceEditModal from "./EnrolledDeviceEditModal.vue";
import { computed } from "vue";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";

const enrolledDeviceStore = useEnrolledDeviceStore();

const { t } = useI18n();
const frontEndStore = useFrontEndStore();
const displayName = computed(() => {
  if (frontEndStore.presentation_mode && props.rule.fake_name) {
    return props.rule.fake_name;
  }
  return props.rule.name;
});

type Props = {
  rule: EnrolledDevice;
  valid?: boolean | null;
  cell:
    "name" | "mac" | "iface" | "ipv4" | "ipv6" | "tags" | "remark" | "actions";
};

const props = defineProps<Props>();
const emit = defineEmits<{ refresh: [] }>();

const show_edit_modal = ref(false);

async function del() {
  if (props.rule.id) {
    await delete_enrolled_device(props.rule.id);
    await enrolledDeviceStore.UPDATE_INFO();
    emit("refresh");
  }
}
</script>

<template>
  <template v-if="cell === 'name'">
    <n-flex vertical align="start" size="small">
      <n-ellipsis style="max-width: 160px">{{ displayName }}</n-ellipsis>
      <n-tag v-if="valid === false" size="small" type="error" round>
        {{ t("device.invalid_status") }}
      </n-tag>
    </n-flex>
  </template>
  <template v-else-if="cell === 'mac'">
    <MacAddress :value="rule.mac" />
  </template>
  <template v-else-if="cell === 'iface'">
    <n-tag v-if="rule.iface_name" size="small" type="primary" :bordered="false">
      {{ rule.iface_name }}
    </n-tag>
    <n-text v-else depth="3">—</n-text>
  </template>
  <template v-else-if="cell === 'ipv4'">
    <span v-if="rule.ipv4">{{ frontEndStore.MASK_INFO(rule.ipv4) }}</span>
    <n-text v-else depth="3">—</n-text>
  </template>
  <template v-else-if="cell === 'ipv6'">
    <n-ellipsis v-if="rule.ipv6" style="max-width: 220px">
      {{ frontEndStore.MASK_INFO(rule.ipv6) }}
    </n-ellipsis>
    <n-text v-else depth="3">—</n-text>
  </template>
  <template v-else-if="cell === 'tags'">
    <n-flex v-if="rule.tag?.length" size="small">
      <n-tag
        v-for="tag in rule.tag"
        :key="tag"
        size="tiny"
        :bordered="false"
        type="success"
        round
        >{{ tag }}</n-tag
      >
    </n-flex>
    <n-text v-else depth="3">—</n-text>
  </template>
  <template v-else-if="cell === 'remark'">
    <n-ellipsis v-if="rule.remark" style="max-width: 220px">
      {{ frontEndStore.MASK_INFO(rule.remark) }}
    </n-ellipsis>
    <n-text v-else depth="3">—</n-text>
  </template>
  <template v-else-if="cell === 'actions'">
    <n-flex size="small" :wrap="false" justify="start">
      <EditButton @click="show_edit_modal = true" />
      <DeleteButton :content="t('device.delete_confirm')" :on-confirm="del" />
    </n-flex>
  </template>

  <EnrolledDeviceEditModal
    v-if="cell === 'actions'"
    :rule_id="rule.id ?? null"
    v-model:show="show_edit_modal"
    @refresh="emit('refresh')"
  />
</template>

<style scoped>
code {
  font-family: var(--font-mono);
  background: var(--app-surface-subtle-color);
  padding: 2px 4px;
  border-radius: var(--app-radius-indicator);
}
</style>
