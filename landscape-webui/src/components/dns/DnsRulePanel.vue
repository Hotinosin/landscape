<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from "vue";
import type { DataTableColumns } from "naive-ui";
import type { DNSRuleConfig } from "@landscape-router/types/api/schemas";
import { SearchLocate } from "@vicons/carbon";
import { useI18n } from "vue-i18n";
import { useMessage } from "naive-ui";
import DnsRuleListRow from "@/components/dns/DnsRuleListRow.vue";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import {
  getFlowDnsRules,
  addManyDnsRules,
} from "@landscape-router/types/api/dns-rules/dns-rules";
import {
  copy_context_to_clipboard,
  read_context_from_clipboard,
} from "@/lib/common";

const props = withDefaults(defineProps<{ flow_id?: number }>(), { flow_id: 0 });
const emit = defineEmits(["changed"]);
const { t } = useI18n();
const message = useMessage();
const rules = ref<DNSRuleConfig[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showQueryModal = ref(false);

const columns = computed<DataTableColumns<DNSRuleConfig>>(() =>
  [
    [`${t("common.status")} / ${t("common.priority")}`, "status", "22%"],
    [t("dns.rule_card.match_rules"), "sources", "28%"],
    [t("dns.rule_card.upstream_config"), "upstream", "18%"],
    [t("dns.rule_card.traffic_action"), "action", "20%"],
    [t("common.actions"), "actions", "12%"],
  ].map(([title, cell, width]) => ({
    title,
    key: cell,
    width,
    render: (rule) =>
      h(DnsRuleListRow, {
        rule,
        cell: cell as any,
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

async function importRules() {
  try {
    const imported = JSON.parse(await read_context_from_clipboard());
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
      <n-flex>
        <n-button @click="showCreateModal = true">
          {{ t("dns.rule_drawer.add_rule") }}
        </n-button>
        <n-button @click="exportConfig">
          {{ t("dns.rule_drawer.export_clipboard") }}
        </n-button>
        <n-popconfirm @positive-click="importRules">
          <template #trigger>
            <n-button>{{ t("dns.rule_drawer.import_clipboard") }}</n-button>
          </template>
          {{ t("dns.rule_drawer.confirm_import") }}
        </n-popconfirm>
        <n-button @click="showQueryModal = true">
          <template #icon
            ><n-icon><SearchLocate /></n-icon
          ></template>
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
.rule-panel {
  height: 520px;
}
.rule-list {
  flex: 1;
  min-height: 0;
}
</style>
