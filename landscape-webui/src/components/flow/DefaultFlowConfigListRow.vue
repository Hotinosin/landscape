<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import FlowEditModal from "@/components/flow/FlowEditModal.vue";
import DnsRuleSummary from "@/components/flow/DnsRuleSummary.vue";
import TargetIpRuleSummary from "@/components/flow/TargetIpRuleSummary.vue";
import type {
  DnsUpstreamConfig,
  FlowConfig,
} from "@landscape-router/types/api/schemas";

const { t } = useI18n();
defineProps<{
  dns_rules?: any[];
  flows: FlowConfig[];
  upstreams: DnsUpstreamConfig[];
  target_ip_rules?: any[];
  cell:
    | "flow"
    | "ingress"
    | "dns"
    | "targetIp"
    | "egress"
    | "remark"
    | "enable"
    | "actions";
}>();
const emit = defineEmits(["refresh"]);
const showEdit = ref(false);
</script>

<template>
  <template v-if="cell === 'flow'">
    <n-flex align="center" size="small" :wrap="false">
      <span class="status-dot" />
      <n-text strong>0: {{ t("flow.default_card.title") }}</n-text>
    </n-flex>
  </template>
  <template v-else-if="cell === 'ingress'">
    <n-flex vertical align="start" size="small">
      <n-text depth="3">
        {{ t("flow.default_card.unmatched_traffic") }}
      </n-text>
    </n-flex>
  </template>
  <template v-else-if="cell === 'dns'">
    <n-flex v-if="dns_rules?.length" vertical size="small">
      <DnsRuleSummary
        v-for="rule in dns_rules"
        :key="rule.id ?? rule.index"
        class="rule-summary"
        :rule="rule"
        :flows="flows"
        :upstreams="upstreams"
      />
    </n-flex>
    <n-text v-else depth="3">{{ t("flow.list.no_dns_rules") }}</n-text>
  </template>
  <template v-else-if="cell === 'targetIp'">
    <n-flex v-if="target_ip_rules?.length" vertical size="small">
      <TargetIpRuleSummary
        v-for="rule in target_ip_rules"
        :key="rule.id ?? rule.index"
        class="rule-summary"
        :rule="rule"
        :flows="flows"
      />
    </n-flex>
    <n-text v-else depth="3">{{ t("flow.list.no_target_ip_rules") }}</n-text>
  </template>
  <template v-else-if="cell === 'egress'">
    <n-text depth="3">{{ t("flow.default_card.process_by_default") }}</n-text>
  </template>
  <template v-else-if="cell === 'remark' || cell === 'enable'">
    <n-text depth="3">—</n-text>
  </template>
  <template v-else-if="cell === 'actions'">
    <EditButton @click="showEdit = true" />
  </template>
  <FlowEditModal
    v-if="cell === 'actions'"
    v-model:show="showEdit"
    default_flow
    @refresh="emit('refresh')"
  />
</template>

<style scoped>
.rule-summary + .rule-summary {
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px dashed var(--app-border-subtle-color);
}

.status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: var(--app-brand-color);
}

.status-dot--disabled {
  background: var(--app-text-muted-color);
}
</style>
