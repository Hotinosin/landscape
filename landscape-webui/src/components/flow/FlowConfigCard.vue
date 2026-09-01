<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { FlowConfig } from "@landscape-router/types/api/schemas";
import FlowEditModal from "@/components/flow/FlowEditModal.vue";
import { useFrontEndStore } from "@/stores/front_end_config";
import { delFlowRule } from "@landscape-router/types/api/flow-rules/flow-rules";
import FlowEntryRuleExhibit from "@/components/flow/FlowEntryRuleExhibit.vue";

import {
  ContainerServices as Docker,
  Network3 as NetworkWired,
} from "@vicons/carbon";
import { flowTargetName } from "@/lib/flow_target";

const frontEndStore = useFrontEndStore();
const { t } = useI18n();

interface Props {
  config: FlowConfig;
  show_action?: boolean;
  display_style?: "card" | "list";
}

const props = withDefaults(defineProps<Props>(), {
  show_action: true,
  display_style: "card",
});

const emit = defineEmits(["refresh"]);

const show_edit = ref(false);

async function refresh() {
  emit("refresh");
}

async function del() {
  if (props.config.id) {
    await delFlowRule(props.config.id);
    await refresh();
  }
}
const title_name = computed(() => {
  if (props.config.name != null && props.config.name !== "") {
    return frontEndStore.MASK_INFO(props.config.name);
  }
  if (props.config.remark != null && props.config.remark !== "") {
    return frontEndStore.MASK_INFO(props.config.remark);
  }
  return t("common.unnamed");
});
const show_remark = computed(
  () =>
    props.config.name != null &&
    props.config.name !== "" &&
    props.config.remark != null &&
    props.config.remark !== "",
);
</script>

<template>
  <n-card
    :class="[
      'flow-config-card',
      { 'flow-config-card--list': display_style === 'list' },
    ]"
    :style="display_style === 'card' ? 'min-height: 224px' : undefined"
    content-style="display: flex"
    size="small"
    :hoverable="true"
  >
    <template #header>
      <StatusTitle
        :enable="config.enable"
        :remark="`${config.flow_id}: ${title_name}`"
      ></StatusTitle>
    </template>

    <template v-if="show_action" #header-extra>
      <n-flex>
        <EditButton @click="show_edit = true" />
        <n-popconfirm @positive-click="del">
          <template #trigger>
            <n-button type="error" secondary size="small">{{
              t("common.delete")
            }}</n-button>
          </template>
          {{ t("common.confirm_delete") }}
        </n-popconfirm>
      </n-flex>
    </template>

    <template #footer>
      <!-- <n-flex>
        <n-tag :bordered="false" v-for="rule in config.flow_match_rules">
          {{ `${rule.ip} - ${rule.qos ?? "N/A"} - ${rule.vlan_id ?? "N/A"}` }}
        </n-tag>
      </n-flex>
    </template>
    <template #action>
      <n-flex>
        <n-tag
          :bordered="false"
          v-for="target in config.packet_handle_iface_name"
          :type="`${target.t === FlowTargetTypes.NETNS ? 'info' : ''}`"
        >
          {{
            target.t === FlowTargetTypes.NETNS
              ? target.container_name
              : target.name
          }}
        </n-tag>
      </n-flex> -->
    </template>

    <!-- <n-descriptions bordered :column="1" label-placement="left">
      <n-descriptions-item label="入口规则">
        <n-tag v-if="config.flow_match_rules.length > 0" :bordered="false">
          {{
            `${
              config.flow_match_rules[0].vlan_id
                ? `${config.flow_match_rules[0].vlan_id}@`
                : ""
            }${config.flow_match_rules[0].ip}`
          }}
        </n-tag>
        <n-empty :show-icon="false" v-else description="没有入口规则">
        </n-empty>
      </n-descriptions-item>
      <n-descriptions-item label="分流出口">

        <n-tag v-for="each in config.flow_targets" :bordered="false">
          {{ each.t === "netns" ? each.container_name : each.name }}
          <template #icon>
            <n-icon :component="each.t === 'netns' ? Docker : NetworkWired" />
          </template>
        </n-tag>
      </n-descriptions-item>
    </n-descriptions> -->

    <n-flex
      align="center"
      justify="center"
      v-if="config.flow_match_rules.length == 0"
      style="flex: 1"
    >
      <n-empty
        :show-icon="false"
        :description="t('flow.config_card.no_ingress_rules')"
      >
      </n-empty>
    </n-flex>
    <n-flex v-else vertical>
      <n-text
        v-if="show_remark"
        depth="3"
        style="font-size: var(--app-font-size-caption)"
      >
        {{ frontEndStore.MASK_INFO(config.remark) }}
      </n-text>
      <n-flex>
        <FlowEntryRuleExhibit
          v-for="item in config.flow_match_rules"
          :rule="item"
        ></FlowEntryRuleExhibit>
      </n-flex>
    </n-flex>
    <template #action>
      <n-tag
        v-for="each in config.flow_targets"
        class="semantic-tag--egress"
        :bordered="false"
      >
        {{ frontEndStore.MASK_INFO(flowTargetName(each.target)) }}
        <span v-if="(each.weight ?? 1) !== 1"> ×{{ each.weight ?? 1 }}</span>
        <template #icon>
          <n-icon
            :component="
              each.target.t === 'netns' ? Docker : NetworkWired
            "
          />
        </template>
      </n-tag>
    </template>

    <!-- {{ config }} -->
    <FlowEditModal
      @refresh="refresh"
      v-model:show="show_edit"
      :rule_id="props.config.id"
    >
    </FlowEditModal>
  </n-card>
</template>

<style scoped>
.flow-config-card--list :deep(.n-card-header) {
  padding: 10px var(--app-space-section);
}

.flow-config-card--list :deep(.n-card__content) {
  min-width: 220px;
  padding: 8px var(--app-space-section);
}

.flow-config-card--list :deep(.n-card__action) {
  padding: 8px var(--app-space-section);
}

.flow-config-card--list :deep(.n-card-header__extra) {
  margin-left: auto;
}
</style>
