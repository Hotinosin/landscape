<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from "vue";
import type { DataTableColumns } from "naive-ui";
import type {
  DNSRuleConfig,
  FlowConfig,
} from "@landscape-router/types/api/schemas";
import { Copy, Paste, SearchLocate } from "@vicons/carbon";
import { useI18n } from "vue-i18n";
import { useMessage } from "naive-ui";
import DnsRuleListRow from "@/components/dns/DnsRuleListRow.vue";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import {
  getFlowDnsRules,
  addManyDnsRules,
} from "@landscape-router/types/api/dns-rules/dns-rules";
import { copy_context_to_clipboard } from "@/lib/common";

const props = withDefaults(
  defineProps<{ flow_id?: number; flows?: FlowConfig[] }>(),
  { flow_id: 0, flows: () => [] },
);
const emit = defineEmits(["changed"]);
const { t } = useI18n();
const message = useMessage();
const rules = ref<DNSRuleConfig[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showQueryModal = ref(false);
type DnsRuleCell =
  "status" | "sources" | "upstream" | "action" | "enable" | "actions";

const columns = computed<DataTableColumns<DNSRuleConfig>>(() =>
  (
    [
      [`${t("common.status")} / ${t("common.priority")}`, "status", 110],
      [t("dns.rule_card.match_rules"), "sources", undefined],
      [t("dns.rule_card.upstream_config"), "upstream", undefined],
      [t("dns.rule_card.traffic_action"), "action", undefined],
      [t("common.enable"), "enable", 80],
      [t("common.actions"), "actions", 110],
    ] satisfies Array<[string, DnsRuleCell, number | undefined]>
  ).map(([title, cell, width]) => ({
    title,
    key: cell,
    width,
    render: (rule) =>
      h(DnsRuleListRow, {
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
    rules.value = await getFlowDnsRules(props.flow_id);
  } finally {
    loading.value = false;
  }
}

async function exportConfig() {
  const configs = await getFlowDnsRules(props.flow_id);
  await copy_context_to_clipboard(
    message,
    JSON.stringify(
      configs,
      (key, value) => (key === "id" ? undefined : value),
      2,
    ),
  );
}

async function importRules(imported: DNSRuleConfig[]) {
  try {
    for (const rule of imported) rule.flow_id = props.flow_id;
    await addManyDnsRules(imported);
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
        <n-button
          size="small"
          type="primary"
          @click="showCreateModal = true"
        >
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
          {{ t("dns.rule_drawer.confirm_import") }}
        </ClipboardImportModal>
        <n-button size="small" @click="showQueryModal = true">
          <template #icon
            ><n-icon><SearchLocate /></n-icon
          ></template>
          {{ t("common.query") }}
        </n-button>
      </n-flex>
      <n-scrollbar class="rule-list">
        <StandardDataTable
          :columns="columns"
          :data="rules"
          :loading="loading"
          :row-key="(rule) => rule.id ?? rule.index"
          :scroll-x="900"
          size="small"
        />
      </n-scrollbar>
    </n-flex>
  </n-spin>
  <DnsRuleEditModal
    v-model:show="showCreateModal"
    :flow_id="flow_id"
    :rule_id="null"
    @refresh="handleRulesChanged"
  />
  <CheckDomainDrawer v-model:show="showQueryModal" :flow_id="flow_id" />
</template>

<style scoped>
.rule-list {
  max-height: min(440px, calc(100vh - 300px));
}
</style>
