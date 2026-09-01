<script setup lang="ts">
import { computed, ref } from "vue";
import type { DNSRuleConfig } from "@landscape-router/types/api/schemas";
import { delDnsRules } from "@landscape-router/types/api/dns-rules/dns-rules";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  rule: DNSRuleConfig;
  cell: "status" | "action" | "upstream" | "sources" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const { t } = useI18n();
const showEdit = ref(false);

const title = computed(() => props.rule.name || t("common.no_remark"));

async function remove() {
  if (!props.rule.id) return;
  await delDnsRules(props.rule.id);
  emit("refresh");
}
</script>

<template>
  <StatusTitle
    v-if="cell === 'status'"
    :enable="rule.enable"
    :remark="`${rule.index}: ${title}`"
  />
  <FlowMarkExhibit
    v-else-if="cell === 'action'"
    :mark="rule.mark"
    :flow_id="rule.flow_id"
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
    <n-popconfirm @positive-click="remove">
      <template #trigger>
        <n-button size="small" type="error" secondary>
          {{ t("common.delete") }}
        </n-button>
      </template>
      {{ t("common.confirm_delete") }}
    </n-popconfirm>
  </n-flex>

  <DnsRuleEditModal
    v-if="cell === 'actions'"
    v-model:show="showEdit"
    :flow_id="rule.flow_id"
    :rule_id="rule.id"
    @refresh="emit('refresh')"
  />
</template>
