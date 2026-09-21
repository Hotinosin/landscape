<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import type { DataTableColumns } from "naive-ui";
import type {
  DnsUpstreamConfig,
  FlowConfig,
} from "@landscape-router/types/api/schemas";
import { getFlowRules } from "@landscape-router/types/api/flow-rules/flow-rules";
import FlowEditModal from "@/components/flow/FlowEditModal.vue";
import FlowConfigListRow from "@/components/flow/FlowConfigListRow.vue";
import DefaultFlowConfigListRow from "@/components/flow/DefaultFlowConfigListRow.vue";
import RouteTraceDrawer from "@/components/flow/RouteTraceDrawer.vue";
import { reset_cache } from "@/api/route/cache";
import { getDnsRules } from "@landscape-router/types/api/dns-rules/dns-rules";
import { get_all_dst_ip_rules } from "@/api/dst_ip_rule";
import { Clean, Renew, Search } from "@vicons/carbon";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import { useI18n } from "vue-i18n";
import { usePageRequest } from "@/composables/usePageRequest";
import { get_dns_upstreams } from "@/api/dns_rule/upstream";

type FlowTableRow = { kind: "default" } | { kind: "flow"; flow: FlowConfig };

const flows = ref<FlowConfig[]>([]);
const ruleSummaries = ref<Record<number, { dns: any[]; targetIp: any[] }>>({});
const upstreams = ref<DnsUpstreamConfig[]>([]);
const { t } = useI18n();

const show_edit = ref(false);
const show_route_trace = ref(false);
const tableRows = computed<FlowTableRow[]>(() => [
  { kind: "default" },
  ...flows.value.map((flow) => ({ kind: "flow" as const, flow })),
]);

function renderCell(
  row: FlowTableRow,
  cell:
    | "flow"
    | "ingress"
    | "dns"
    | "targetIp"
    | "egress"
    | "remark"
    | "enable"
    | "actions",
) {
  const flowId = row.kind === "default" ? 0 : row.flow.flow_id;
  const shared = {
    cell,
    dns_rules: ruleSummaries.value[flowId]?.dns,
    target_ip_rules: ruleSummaries.value[flowId]?.targetIp,
    flows: flows.value,
    upstreams: upstreams.value,
    onRefresh: refresh,
  };
  return row.kind === "default"
    ? h(DefaultFlowConfigListRow, shared)
    : h(FlowConfigListRow, { ...shared, config: row.flow });
}

const columns = computed<DataTableColumns<FlowTableRow>>(() => [
  {
    title: t("flow.list.status_flow"),
    key: "flow",
    width: 110,
    render: (row) => renderCell(row, "flow"),
  },
  {
    title: t("flow.list.ingress_match"),
    key: "ingress",
    width: "12%",
    render: (row) => renderCell(row, "ingress"),
  },
  {
    title: t("flow.list.dns"),
    key: "dns",
    width: "30%",
    render: (row) => renderCell(row, "dns"),
  },
  {
    title: t("flow.list.target_ip"),
    key: "targetIp",
    width: "20%",
    render: (row) => renderCell(row, "targetIp"),
  },
  {
    title: t("flow.list.egress"),
    key: "egress",
    width: "10%",
    render: (row) => renderCell(row, "egress"),
  },
  {
    title: t("flow.list.remark"),
    key: "remark",
    width: "10%",
    render: (row) => renderCell(row, "remark"),
  },
  {
    title: t("common.enable"),
    key: "enable",
    width: 80,
    align: "left",
    render: (row) => renderCell(row, "enable"),
  },
  {
    title: t("flow.list.actions"),
    key: "actions",
    width: 130,
    align: "left",
    render: (row) => renderCell(row, "actions"),
  },
]);
const flowRequest = usePageRequest(
  async () => {
    const [nextFlows, nextUpstreams, dnsRules, targetIpRules] =
      await Promise.all([
        getFlowRules(),
        get_dns_upstreams(),
        getDnsRules(),
        get_all_dst_ip_rules(),
      ]);
    const flowIds = [0, ...nextFlows.map((flow) => flow.flow_id)];
    const entries = flowIds.map(
      (flowId) =>
        [
          flowId,
          {
            dns: dnsRules.filter((rule) => rule.flow_id === flowId),
            targetIp: targetIpRules.filter((rule) => rule.flow_id === flowId),
          },
        ] as const,
    );

    return {
      flows: nextFlows,
      upstreams: nextUpstreams,
      summaries: Object.fromEntries(entries),
    };
  },
  {
    initialData: {
      flows: [] as FlowConfig[],
      upstreams: [] as DnsUpstreamConfig[],
      summaries: {} as Record<number, { dns: any[]; targetIp: any[] }>,
    },
    isEmpty: () => false,
    onSuccess: (result) => {
      flows.value = result.flows;
      upstreams.value = result.upstreams;
      ruleSummaries.value = result.summaries;
    },
  },
);
const refresh = flowRequest.refresh;

onMounted(refresh);
</script>
<template>
  <n-layout :native-scrollbar="false">
    <n-flex
      class="flow-list-toolbar standard-list-align"
      justify="space-between"
      align="center"
    >
      <n-button type="primary" @click="show_edit = true">
        {{ t("common.create") }}
      </n-button>
      <n-flex size="small">
        <n-button secondary @click="reset_cache">
          <template #icon
            ><n-icon><Clean /></n-icon
          ></template>
          {{ $t("flow.default_card.clear_route_cache") }}
        </n-button>
        <n-button secondary @click="show_route_trace = true">
          <template #icon
            ><n-icon><Search /></n-icon
          ></template>
          {{ $t("flow.default_card.trace") }}
        </n-button>
        <n-button
          :loading="flowRequest.loading.value"
          secondary
          @click="refresh"
        >
          <template #icon
            ><n-icon><Renew /></n-icon
          ></template>
          {{ t("common.refresh") }}
        </n-button>
      </n-flex>
    </n-flex>
    <n-spin :show="flowRequest.loading.value">
      <StandardDataTable
        :columns="columns"
        :data="tableRows"
        :loading="flowRequest.loading.value"
        :error="flowRequest.error.value"
        :row-key="
          (row) => (row.kind === 'default' ? 'default' : row.flow.flow_id)
        "
        :scroll-x="1200"
        @retry="flowRequest.retry"
      />
    </n-spin>
    <FlowEditModal @refresh="refresh" v-model:show="show_edit" />
    <RouteTraceDrawer v-model:show="show_route_trace" />
  </n-layout>
</template>

<style scoped>
.flow-list-toolbar {
  margin-bottom: 12px;
}
</style>
