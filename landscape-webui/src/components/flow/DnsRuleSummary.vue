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
      name: "routes.dns-upstream",
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
const upstreamLabel = computed(() => {
  const upstream = props.upstreams.find(
    (item) => item.id === props.rule.upstream_id,
  );
  return upstream?.remark || t("flow.list.unknown_upstream");
});
</script>

<template>
  <div class="dns-rule-summary">
    <n-flex align="center" size="small" :wrap="false">
      <span
        class="status-dot"
        :class="{ 'status-dot--disabled': rule.enable === false }"
      />
      <n-text>{{ t("flow.list.priority", { priority: rule.index }) }}</n-text>
      <n-text strong>{{ rule.name || t("common.unnamed") }}</n-text>
    </n-flex>
    <n-flex align="center" size="small" :wrap="false">
      <n-flex vertical align="start" :size="4">
        <n-tag v-for="source in matchLabels" :key="source" :bordered="false">
          {{ source }}
        </n-tag>
      </n-flex>
      <n-flex align="center" size="small" :wrap="false">
        <n-text depth="3">{{ t("flow.list.uses_dns") }}</n-text>
        <n-tag
          class="upstream-link"
          type="info"
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

.upstream-link {
  cursor: pointer;
}
</style>
