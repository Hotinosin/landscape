<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type {
  FlowConfig,
  WanIPRuleSource,
  WanIpRuleConfig,
} from "@landscape-router/types/api/schemas";
import FlowRuleEgress from "@/components/flow/FlowRuleEgress.vue";

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
      <span
        class="status-dot"
        :class="{ 'status-dot--disabled': rule.enable === false }"
      />
      <n-text>{{ t("flow.list.priority", { priority: rule.index }) }}</n-text>
      <n-text strong>{{ rule.remark || t("common.unnamed") }}</n-text>
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
