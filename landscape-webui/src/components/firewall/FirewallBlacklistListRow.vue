<script setup lang="ts">
import { ref } from "vue";
import type { FirewallBlacklistConfig } from "@landscape-router/types/api/schemas";
import {
  delete_firewall_blacklist,
  push_firewall_blacklist,
} from "@/api/firewall_blacklist";
import FirewallBlacklistEditModal from "./FirewallBlacklistEditModal.vue";
import BlacklistSourceExhibit from "./BlacklistSourceExhibit.vue";
import { useI18n } from "vue-i18n";
const props = defineProps<{
  rule: FirewallBlacklistConfig;
  cell: "status" | "enable" | "source" | "count" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const show = ref(false);
const { t } = useI18n();
const enableLoading = ref(false);
async function remove() {
  if (props.rule.id) {
    await delete_firewall_blacklist(props.rule.id);
    emit("refresh");
  }
}
async function updateEnabled(enable: boolean) {
  enableLoading.value = true;
  try {
    await push_firewall_blacklist({ ...props.rule, enable });
    emit("refresh");
  } finally {
    enableLoading.value = false;
  }
}
</script>
<template>
  <StatusTitle v-if="cell === 'status'" :enable="rule.enable" :name="rule.name" :remark="rule.remark" />
  <StandardEnableSwitch v-else-if="cell === 'enable'" :value="rule.enable" :loading="enableLoading" @update:value="updateEnabled" />
  <n-flex v-else-if="cell === 'source'" size="small">
    <BlacklistSourceExhibit
      v-for="(source, i) in rule.source"
      :key="i"
      :source="source"
    />
    <n-text v-if="!rule.source.length" depth="3">—</n-text>
  </n-flex>
  <template v-else-if="cell === 'count'">{{ rule.source.length }}</template>
  <n-flex v-else justify="start" :wrap="false">
    <EditButton @click="show = true" />
    <DeleteButton
      :item="rule.name || rule.remark || t('common.unnamed')"
      :on-confirm="remove"
    />
  </n-flex>
  <FirewallBlacklistEditModal
    v-model:show="show"
    :id="rule.id ?? null"
    @refresh="emit('refresh')"
  />
</template>
