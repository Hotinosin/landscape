<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from "vue";
import type { DataTableColumns } from "naive-ui";
import type {
  FlowConfig,
  WanIpRuleConfig,
} from "@landscape-router/types/api/schemas";
import { useI18n } from "vue-i18n";
import { useMessage } from "naive-ui";
import WanRuleEditModal from "./WanRuleEditModal.vue";
import WanRuleListRow from "./WanRuleListRow.vue";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import {
  get_flow_dst_ip_rules,
  push_many_dst_ip_rule,
} from "@/api/dst_ip_rule";
import { copy_context_to_clipboard } from "@/lib/common";
import { Copy, Paste } from "@vicons/carbon";

const props = withDefaults(
  defineProps<{ flow_id?: number; flows?: FlowConfig[] }>(),
  { flow_id: 0, flows: () => [] },
);
const emit = defineEmits(["changed"]);
const { t } = useI18n();
const message = useMessage();
const rules = ref<WanIpRuleConfig[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
type WanRuleCell =
  "name" | "sources" | "action" | "enable" | "remark" | "actions";

const columns = computed<DataTableColumns<WanIpRuleConfig>>(() =>
  (
    [
      [t("common.name"), "name", 110],
      [t("flow.wan_rule_card.match_rules"), "sources", undefined],
      [t("flow.wan_rule_edit.egress_select"), "action", undefined],
      [t("common.enable"), "enable", 80],
      [t("common.remark"), "remark", 120],
      [t("common.actions"), "actions", 110],
    ] satisfies Array<[string, WanRuleCell, number | undefined]>
  ).map(([title, cell, width]) => ({
    title,
    key: cell,
    width,
    render: (rule) =>
      h(WanRuleListRow, {
        rule,
        flows: props.flows,
        cell,
        onRefresh: handleRulesChanged,
      }),
  })),
);

async function readRules() {
  loading.value = true;
  try {
    rules.value = await get_flow_dst_ip_rules(props.flow_id);
  } finally {
    loading.value = false;
  }
}

async function exportConfig() {
  const configs = await get_flow_dst_ip_rules(props.flow_id);
  await copy_context_to_clipboard(
    message,
    JSON.stringify(
      configs,
      (key, value) => (key === "id" ? undefined : value),
      2,
    ),
  );
}

async function importRules(imported: WanIpRuleConfig[]) {
  try {
    for (const rule of imported) rule.flow_id = props.flow_id;
    await push_many_dst_ip_rule(imported);
    message.success("Import Success");
    await readRules();
    emit("changed");
  } catch (_error) {}
}

async function handleRulesChanged() {
  await readRules();
  emit("changed");
}

onMounted(readRules);
watch(() => props.flow_id, readRules);
</script>

<template>
  <n-spin :show="loading">
    <n-flex vertical class="rule-panel">
      <n-flex class="standard-list-align">
        <n-button size="small" type="primary" @click="showCreateModal = true">
          {{ t("common.add_new") }}
        </n-button>
        <n-button size="small" @click="exportConfig">
          <template #icon
            ><n-icon><Copy /></n-icon
          ></template>
          {{ t("common.copy") }}
        </n-button>
        <ClipboardImportModal :on-confirm="importRules">
          <template #trigger>
            <n-button size="small">
              <template #icon
                ><n-icon><Paste /></n-icon
              ></template>
              {{ t("common.paste") }}
            </n-button>
          </template>
          {{ t("flow.wan_rule_drawer.confirm_import") }}
        </ClipboardImportModal>
      </n-flex>
      <n-scrollbar class="rule-list">
        <StandardDataTable
          :columns="columns"
          :data="rules"
          :loading="loading"
          :row-key="(rule) => rule.id ?? rule.index"
          :scroll-x="760"
          size="small"
        />
      </n-scrollbar>
    </n-flex>
  </n-spin>
  <WanRuleEditModal
    :id="null"
    :flow_id="flow_id"
    v-model:show="showCreateModal"
    @refresh="handleRulesChanged"
  />
</template>

<style scoped>
.rule-list {
  min-height: 160px;
  max-height: min(440px, calc(100vh - 300px));
}
</style>
