<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type {
  FlowConfig,
  WanIPRuleSource,
  WanIpRuleConfig,
} from "@landscape-router/types/api/schemas";
import FlowRuleEgress from "@/components/flow/FlowRuleEgress.vue";
import CarrierStatusDot from "@/components/topology/CarrierStatusDot.vue";

const props = defineProps<{ rule: WanIpRuleConfig; flows: FlowConfig[] }>();
const { t } = useI18n();

function sourceLabel(source: WanIPRuleSource) {
  return source.t === "geo_key"
    ? `GeoIP/${source.key || source.name}`
    : `${source.ip}/${source.prefix}`;
}

const matchLabels = computed(() =>
  props.rule.source.length
    ? props.rule.source.map(sourceLabel)
    : [t("flow.list.all_target_ips")],
);
</script>

<template>
  <div class="target-ip-rule-summary">
    <n-flex align="center" size="small" :wrap="false">
      <CarrierStatusDot :active="rule.enable !== false" />
      <n-text>{{ t("flow.list.priority", { priority: rule.index }) }}</n-text>
      <n-text v-if="rule.name" strong>{{ rule.name }}</n-text>
      <n-text v-if="rule.remark" :depth="rule.name ? 3 : undefined">{{ rule.remark }}</n-text>
      <n-text v-if="!rule.name && !rule.remark" depth="3">{{ t("common.unnamed") }}</n-text>
    </n-flex>
    <n-flex align="center" size="small">
      <n-tag
        v-for="source in matchLabels"
        :key="source"
        class="semantic-tag--match"
        :bordered="false"
      >
        {{ source }}
      </n-tag>
    </n-flex>
    <FlowRuleEgress :mark="rule.mark" :flow-id="rule.flow_id" :flows="flows" />
  </div>
</template>

<style scoped>
.target-ip-rule-summary {
  display: grid;
  gap: 4px;
}

</style>
