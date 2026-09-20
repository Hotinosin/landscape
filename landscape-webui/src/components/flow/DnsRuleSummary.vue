<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type {
  DNSRuleConfig,
  DnsUpstreamConfig,
  FlowConfig,
  RuleSource,
} from "@landscape-router/types/api/schemas";
import { useRouter } from "vue-router";
import FlowRuleEgress from "@/components/flow/FlowRuleEgress.vue";
import CarrierStatusDot from "@/components/topology/CarrierStatusDot.vue";

const props = defineProps<{
  rule: DNSRuleConfig;
  flows: FlowConfig[];
  upstreams: DnsUpstreamConfig[];
}>();
const { t } = useI18n();
const router = useRouter();

function editUpstream() {
  if (props.rule.upstream_id) {
    router.push({
      name: "routes.dns-config",
      query: { edit: props.rule.upstream_id },
    });
  }
}

function sourceLabel(source: RuleSource) {
  return source.t === "geo_key"
    ? `GeoSite/${source.key || source.name}`
    : source.value;
}

const matchLabels = computed(() =>
  props.rule.source.length
    ? props.rule.source.map(sourceLabel)
    : [t("flow.list.all_domains")],
);
const visibleMatchLabels = computed(() =>
  matchLabels.value.slice(0, 2).map((full) => {
    const prefix = "GeoSite/";
    const value = full.startsWith(prefix) ? full.slice(prefix.length) : "";
    return {
      full,
      label: value.length > 3 ? `${prefix}${value.slice(0, 3)}...` : full,
    };
  }),
);
const hasHiddenMatchLabels = computed(() => matchLabels.value.length > 2);
const upstreamLabel = computed(() => {
  const upstream = props.upstreams.find(
    (item) => item.id === props.rule.upstream_id,
  );
  return (
    upstream?.name || upstream?.remark || t("flow.list.unknown_upstream")
  );
});
</script>

<template>
  <div class="dns-rule-summary">
    <n-flex align="center" size="small" :wrap="false">
      <CarrierStatusDot :active="rule.enable !== false" />
      <n-text>{{ t("flow.list.priority", { priority: rule.index }) }}</n-text>
      <n-text strong>{{ rule.name || t("common.unnamed") }}</n-text>
    </n-flex>
    <n-flex align="center" size="small" :wrap="false">
      <n-flex vertical align="start" :size="4">
        <n-tooltip
          v-for="(source, index) in visibleMatchLabels"
          :key="`${source.full}-${index}`"
          :disabled="source.label === source.full"
        >
          <template #trigger>
            <n-tag class="semantic-tag--match" :bordered="false">
              {{ source.label }}
            </n-tag>
          </template>
          {{ source.full }}
        </n-tooltip>
        <n-tooltip v-if="hasHiddenMatchLabels">
          <template #trigger>
            <n-tag class="semantic-tag--match" :bordered="false">...</n-tag>
          </template>
          <n-flex vertical :size="4">
            <n-text v-for="(source, index) in matchLabels" :key="index">
              {{ source }}
            </n-text>
          </n-flex>
        </n-tooltip>
      </n-flex>
      <n-flex align="center" size="small" :wrap="false">
        <n-text depth="3">{{ t("flow.list.uses_dns") }}</n-text>
        <n-tag
          class="upstream-link semantic-tag--upstream"
          :bordered="false"
          role="button"
          tabindex="0"
          @click="editUpstream"
          @keydown.enter="editUpstream"
        >
          {{ upstreamLabel }}
        </n-tag>
        <n-text depth="3">{{ t("flow.list.request") }}</n-text>
      </n-flex>
    </n-flex>
    <FlowRuleEgress :mark="rule.mark" :flow-id="rule.flow_id" :flows="flows" />
  </div>
</template>

<style scoped>
.dns-rule-summary {
  display: grid;
  gap: 4px;
}

.upstream-link {
  cursor: pointer;
}
</style>
