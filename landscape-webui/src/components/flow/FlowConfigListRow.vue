<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  ContainerServices as Docker,
  Network3 as NetworkWired,
} from "@vicons/carbon";
import type { FlowConfig } from "@landscape-router/types/api/schemas";
import {
  addFlowRule,
  delFlowRule,
} from "@landscape-router/types/api/flow-rules/flow-rules";
import { useFrontEndStore } from "@/stores/front_end_config";
import FlowEditModal from "@/components/flow/FlowEditModal.vue";
import FlowEntryRuleExhibit from "@/components/flow/FlowEntryRuleExhibit.vue";
import DnsRuleSummary from "@/components/flow/DnsRuleSummary.vue";
import TargetIpRuleSummary from "@/components/flow/TargetIpRuleSummary.vue";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import { flowTargetName } from "@/lib/flow_target";

const props = defineProps<{
  config: FlowConfig;
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
const { t } = useI18n();
const frontEndStore = useFrontEndStore();

const showEdit = ref(false);
const enableLoading = ref(false);

const titleName = computed(() => {
  if (props.config.name) return frontEndStore.MASK_INFO(props.config.name);
  if (props.config.remark) return frontEndStore.MASK_INFO(props.config.remark);
  return t("common.unnamed");
});

async function removeFlow() {
  if (!props.config.id) return;
  await delFlowRule(props.config.id);
  emit("refresh");
}

async function updateEnabled(value: boolean) {
  enableLoading.value = true;
  try {
    await addFlowRule({ ...props.config, enable: value });
    emit("refresh");
  } finally {
    enableLoading.value = false;
  }
}

function flowEnableRailStyle({ checked }: { checked: boolean }) {
  return checked ? { background: "var(--app-status-success-color)" } : {};
}
</script>

<template>
  <template v-if="cell === 'flow'">
    <n-flex vertical align="start" size="small">
      <StatusTitle
        :enable="config.enable"
        :remark="`${config.flow_id}: ${titleName}`"
      />
    </n-flex>
  </template>
  <template v-else-if="cell === 'ingress'">
    <n-flex v-if="config.flow_match_rules.length" size="small">
      <FlowEntryRuleExhibit
        v-for="(rule, index) in config.flow_match_rules"
        :key="index"
        :rule="rule"
      />
    </n-flex>
    <n-text v-else depth="3">
      {{ t("flow.config_card.no_ingress_rules") }}
    </n-text>
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
    <n-flex size="small" justify="start">
      <n-tag
        v-for="(target, index) in config.flow_targets"
        :key="index"
        size="small"
        :bordered="false"
      >
        {{ frontEndStore.MASK_INFO(flowTargetName(target.target)) }}
        <span v-if="(target.weight ?? 1) !== 1">
          ×{{ target.weight ?? 1 }}
        </span>
        <template #icon>
          <n-icon
            :component="
              target.target.t === 'netns' ? Docker : NetworkWired
            "
          />
        </template>
      </n-tag>
      <n-text v-if="config.flow_targets.length === 0" depth="3">—</n-text>
    </n-flex>
  </template>
  <template v-else-if="cell === 'remark'">
    <n-text v-if="config.remark">{{
      frontEndStore.MASK_INFO(config.remark)
    }}</n-text>
    <n-text v-else depth="3">—</n-text>
  </template>
  <template v-else-if="cell === 'enable'">
    <n-switch
      :value="config.enable"
      :loading="enableLoading"
      size="small"
      :rail-style="flowEnableRailStyle"
      @update:value="updateEnabled"
    />
  </template>
  <template v-else-if="cell === 'actions'">
    <n-flex size="small" :wrap="false" justify="start">
      <EditButton @click="showEdit = true" />
      <n-popconfirm @positive-click="removeFlow">
        <template #trigger>
          <n-button type="error" secondary size="small">
            {{ t("common.delete") }}
          </n-button>
        </template>
        {{ t("common.confirm_delete") }}
      </n-popconfirm>
    </n-flex>
  </template>

  <FlowEditModal
    v-if="cell === 'actions'"
    v-model:show="showEdit"
    :rule_id="config.id"
    @refresh="emit('refresh')"
  />
</template>

<style scoped>
.flow-remark {
  display: block;
  margin-top: 4px;
  font-size: var(--app-font-size-caption);
}

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
