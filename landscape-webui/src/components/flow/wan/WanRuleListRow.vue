<script setup lang="ts">
import { ref } from "vue";
import type {
  FlowConfig,
  WanIPRuleSource,
  WanIpRuleConfig,
} from "@landscape-router/types/api/schemas";
import {
  delete_dst_ip_rules_rule,
  update_dst_ip_rules_rule,
} from "@/api/dst_ip_rule";
import { useI18n } from "vue-i18n";
import WanRuleEditModal from "./WanRuleEditModal.vue";

const props = defineProps<{
  rule: WanIpRuleConfig;
  flows: FlowConfig[];
  cell: "status" | "enable" | "action" | "sources" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const { t } = useI18n();
const showEdit = ref(false);
const enableLoading = ref(false);

function sourceLabel(source: WanIPRuleSource) {
  return source.t === "geo_key"
    ? `GeoIP/${source.key || source.name}`
    : `${source.ip}/${source.prefix}`;
}

async function remove() {
  if (!props.rule.id) return;
  await delete_dst_ip_rules_rule(props.rule.id);
  emit("refresh");
}
async function updateEnabled(enable: boolean) {
  if (!props.rule.id) return;
  enableLoading.value = true;
  try {
    await update_dst_ip_rules_rule(props.rule.id, { ...props.rule, enable });
    emit("refresh");
  } finally {
    enableLoading.value = false;
  }
}
</script>

<template>
  <StatusTitle v-if="cell === 'status'" :enable="rule.enable" :remark="`${rule.index}: ${rule.remark || t('common.no_remark')}`" />
  <StandardEnableSwitch v-else-if="cell === 'enable'" :value="rule.enable" :loading="enableLoading" @update:value="updateEnabled" />
  <FlowRuleEgress
    v-else-if="cell === 'action'"
    :mark="rule.mark"
    :flow-id="rule.flow_id"
    :flows="flows"
  />
  <n-flex v-else-if="cell === 'sources' && rule.source.length" size="small">
    <n-tag
      v-for="(source, index) in rule.source"
      :key="index"
      class="semantic-tag--match"
      :bordered="false"
    >
      {{ sourceLabel(source) }}
    </n-tag>
  </n-flex>
  <n-text v-else-if="cell === 'sources'" depth="3">
    {{ t("flow.wan_rule_card.no_match_rules") }}
  </n-text>
  <n-flex v-else-if="cell === 'actions'" size="small" :wrap="false">
    <EditButton @click="showEdit = true" />
    <DeleteButton
      :item="`${rule.index}: ${rule.remark || t('common.no_remark')}`"
      :on-confirm="remove"
    />
  </n-flex>

  <WanRuleEditModal
    v-if="cell === 'actions'"
    v-model:show="showEdit"
    :flow_id="rule.flow_id"
    :id="rule.id ?? null"
    :rule="rule"
    :show-switch="false"
    @refresh="emit('refresh')"
  />
</template>
