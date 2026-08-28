<script setup lang="ts">
import { ref } from "vue";
import type { FirewallBlacklistConfig } from "@landscape-router/types/api/schemas";
import { delete_firewall_blacklist } from "@/api/firewall_blacklist";
import FirewallBlacklistEditModal from "./FirewallBlacklistEditModal.vue";
import BlacklistSourceExhibit from "./BlacklistSourceExhibit.vue";
import { useI18n } from "vue-i18n";
const props = defineProps<{
  rule: FirewallBlacklistConfig;
  cell: "status" | "source" | "count" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const show = ref(false);
const { t } = useI18n();
async function remove() {
  if (props.rule.id) {
    await delete_firewall_blacklist(props.rule.id);
    emit("refresh");
  }
}
</script>
<template>
  <StatusTitle
    v-if="cell === 'status'"
    :enable="rule.enable"
    :remark="rule.remark || t('common.no_remark')"
  />
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
    <n-popconfirm @positive-click="remove">
      <template #trigger>
        <n-button secondary type="error" size="small">
          {{ t("common.delete") }}
        </n-button>
      </template>
      {{ t("common.confirm_delete") }}
    </n-popconfirm>
  </n-flex>
  <FirewallBlacklistEditModal
    v-model:show="show"
    :id="rule.id ?? null"
    @refresh="emit('refresh')"
  />
</template>
