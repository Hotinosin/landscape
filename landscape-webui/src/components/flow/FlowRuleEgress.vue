<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  ContainerServices as Docker,
  Network3 as NetworkWired,
} from "@vicons/carbon";
import type { FlowConfig, FlowMark } from "@landscape-router/types/api/schemas";
import { useFrontEndStore } from "@/stores/front_end_config";
import { flowTargetName } from "@/lib/flow_target";

const props = defineProps<{
  mark: FlowMark;
  flowId: number;
  flows: FlowConfig[];
}>();
const { t } = useI18n();
const frontEndStore = useFrontEndStore();

const egressFlowId = computed(() =>
  props.mark.action.t === "direct"
    ? 0
    : props.mark.action.t === "redirect"
      ? props.mark.flow_id
      : props.flowId,
);
const target = computed(
  () =>
    props.flows.find((flow) => flow.flow_id === egressFlowId.value)
      ?.flow_targets[0]?.target,
);
const actionLabel = computed(() => {
  if (props.mark.action.t === "drop") return t("flow.mark_exhibit.drop");
  if (props.mark.action.t === "direct") {
    return t("flow.mark_exhibit.default_flow_egress");
  }
  return egressFlowId.value === 0
    ? t("flow.mark_exhibit.current_flow_egress")
    : t("flow.mark_exhibit.flow_id_egress", { flow_id: egressFlowId.value });
});
const targetLabel = computed(() => {
  if (!target.value) return "";
  return frontEndStore.MASK_INFO(flowTargetName(target.value));
});
</script>

<template>
  <n-flex align="center" size="small">
    <n-text depth="3">{{ t("flow.list.egress_label") }}</n-text>
    <n-tag :bordered="false">{{ actionLabel }}</n-tag>
    <n-text v-if="target" depth="3">→</n-text>
    <n-tag v-if="target" :bordered="false">
      <template #icon>
        <n-icon
          :component="
            target.t === 'netns' ? Docker : NetworkWired
          "
        />
      </template>
      {{ targetLabel }}
    </n-tag>
  </n-flex>
</template>
