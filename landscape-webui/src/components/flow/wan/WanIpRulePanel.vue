<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from "vue";
import type { DataTableColumns } from "naive-ui";
import type { WanIpRuleConfig } from "@landscape-router/types/api/schemas";
import { useI18n } from "vue-i18n";
import { useMessage } from "naive-ui";
import WanRuleEditModal from "./WanRuleEditModal.vue";
import WanRuleListRow from "./WanRuleListRow.vue";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import {
  get_flow_dst_ip_rules,
  push_many_dst_ip_rule,
} from "@/api/dst_ip_rule";
import {
  copy_context_to_clipboard,
  read_context_from_clipboard,
} from "@/lib/common";

const props = withDefaults(defineProps<{ flow_id?: number }>(), { flow_id: 0 });
const emit = defineEmits(["changed"]);
const { t } = useI18n();
const message = useMessage();
const rules = ref<WanIpRuleConfig[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);

const columns = computed<DataTableColumns<WanIpRuleConfig>>(() =>
  [
    [`${t("common.status")} / ${t("common.priority")}`, "status", "25%"],
    [t("flow.wan_rule_card.match_rules"), "sources", "35%"],
    [t("flow.wan_rule_edit.egress_select"), "action", "25%"],
    [t("common.actions"), "actions", "15%"],
  ].map(([title, cell, width]) => ({
    title,
    key: cell,
    width,
    render: (rule) =>
      h(WanRuleListRow, {
        rule,
        cell: cell as any,
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

async function importRules() {
  try {
    const imported = JSON.parse(await read_context_from_clipboard());
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
      <n-flex>
        <n-button @click="showCreateModal = true">{{
          t("flow.wan_rule_drawer.add_rule")
        }}</n-button>
        <n-button @click="exportConfig">{{
          t("flow.wan_rule_drawer.export_clipboard")
        }}</n-button>
        <n-popconfirm @positive-click="importRules">
          <template #trigger
            ><n-button>{{
              t("flow.wan_rule_drawer.import_clipboard")
            }}</n-button></template
          >
          {{ t("flow.wan_rule_drawer.confirm_import") }}
        </n-popconfirm>
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
.rule-panel {
  height: 520px;
}
.rule-list {
  flex: 1;
  min-height: 0;
}
</style>
