<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  DNSRuleConfig,
  FlowConfig,
} from "@landscape-router/types/api/schemas";
import {
  addDnsRules,
  delDnsRules,
} from "@landscape-router/types/api/dns-rules/dns-rules";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  rule: DNSRuleConfig;
  flows: FlowConfig[];
  cell: "name" | "enable" | "action" | "upstream" | "sources" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const { t } = useI18n();
const showEdit = ref(false);
const enableLoading = ref(false);

const title = computed(() => props.rule.name || t("common.unnamed"));

async function remove() {
  if (!props.rule.id) return;
  await delDnsRules(props.rule.id);
  emit("refresh");
}
async function updateEnabled(enable: boolean) {
  enableLoading.value = true;
  try {
    await addDnsRules({ ...props.rule, enable });
    emit("refresh");
  } finally {
    enableLoading.value = false;
  }
}
</script>

<template>
  <StatusTitle
    v-if="cell === 'name'"
    :enable="rule.enable"
    :name="title"
    :prefix="rule.index"
  />
  <StandardEnableSwitch
    v-else-if="cell === 'enable'"
    :value="rule.enable"
    :loading="enableLoading"
    @update:value="updateEnabled"
  />
  <FlowRuleEgress
    v-else-if="cell === 'action'"
    :mark="rule.mark"
    :flow-id="rule.flow_id"
    :flows="flows"
  />
  <UpstreamExhibit
    v-else-if="cell === 'upstream'"
    :rule_id="rule.upstream_id"
  />
  <n-flex v-else-if="cell === 'sources' && rule.source.length" size="small">
    <RuleSourceExhibit
      v-for="(source, index) in rule.source"
      :key="index"
      :source="source"
    />
  </n-flex>
  <n-text v-else-if="cell === 'sources'" depth="3">
    {{ t("dns.rule_card.no_match_rules") }}
  </n-text>
  <n-flex v-else-if="cell === 'actions'" size="small" :wrap="false">
    <EditButton @click="showEdit = true" />
    <DeleteButton :item="`${rule.index}: ${title}`" :on-confirm="remove" />
  </n-flex>

  <DnsRuleEditModal
    v-if="cell === 'actions'"
    v-model:show="showEdit"
    :flow_id="rule.flow_id"
    :rule_id="rule.id"
    @refresh="emit('refresh')"
  />
</template>
