<script setup lang="ts">
import { ref, computed, h, watch } from "vue";
import { trace_flow_match, trace_verdict } from "@/api/route/trace";
import { check_domain } from "@/api/dns_service";
import { reset_cache } from "@/api/route/cache";
import {
  buildVerdictPlan,
  flowIdForFamily,
  mergeVerdictBatchResults,
  type TraceSourceAddresses,
  type VerdictPlan,
} from "@/lib/route_trace";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import { useFrontEndStore } from "@/stores/front_end_config";
import FlowExhibit from "@/components/flow/FlowExhibit.vue";
import type { FlowMatchResult } from "@/api/route/trace";
import type { FlowVerdictResult } from "@/api/route/trace";
import type { SingleVerdictResult } from "@landscape-router/types/api/schemas";
import { useI18n } from "vue-i18n";
import { NFlex, NTag, NText, type DataTableColumns } from "naive-ui";
import ConfigModal from "@/components/common/ConfigModal.vue";

const show = defineModel<boolean>("show", { required: true });

const enrolledDeviceStore = useEnrolledDeviceStore();
const frontEndStore = useFrontEndStore();
const { t } = useI18n();

// Step 1 state
const selectMode = ref(true);
const sourceModeOptions = computed(() => [
  { label: t("flow.trace.source_device"), value: true },
  { label: t("flow.trace.source_manual"), value: false },
]);
const selectedDevice = ref<string | null>(null);
const srcIpv4 = ref("");
const srcIpv6 = ref("");
const srcMac = ref("");
type ManualSourceType = "ipv4" | "ipv6" | "mac";
const manualSourceType = ref<ManualSourceType>("ipv4");
const manualSourceOptions = [
  { label: "IPv4", value: "ipv4" },
  { label: "IPv6", value: "ipv6" },
  { label: "MAC", value: "mac" },
];
const manualSourceInput = computed({
  get: () =>
    ({ ipv4: srcIpv4.value, ipv6: srcIpv6.value, mac: srcMac.value })[
      manualSourceType.value
    ],
  set: (value: string) => {
    srcIpv4.value = manualSourceType.value === "ipv4" ? value : "";
    srcIpv6.value = manualSourceType.value === "ipv6" ? value : "";
    srcMac.value = manualSourceType.value === "mac" ? value : "";
  },
});
const matchLoading = ref(false);
const matchResult = ref<FlowMatchResult | null>(null);
const matchRows = computed(() =>
  matchResult.value ? [matchResult.value] : [],
);
const matchColumns = computed<DataTableColumns<FlowMatchResult>>(() => {
  const matchedFlow = (flowId?: number | null) =>
    flowId == null
      ? h(NTag, { size: "small" }, () => t("flow.trace.no_match"))
      : h(FlowExhibit, { flow_id: flowId });
  const effectiveFlow = (flowId: number) =>
    flowId === 0
      ? h(NTag, { size: "small", type: "info" }, () =>
          t("flow.trace.default_flow"),
        )
      : h(FlowExhibit, { flow_id: flowId });

  return [
    {
      title: t("flow.trace.mac_match"),
      key: "flow_id_by_mac",
      width: "20%",
      render: (row) => matchedFlow(row.flow_id_by_mac),
    },
    {
      title: t("flow.trace.ipv4_match"),
      key: "flow_id_by_ipv4",
      width: "20%",
      render: (row) => matchedFlow(row.flow_id_by_ipv4),
    },
    {
      title: t("flow.trace.ipv6_match"),
      key: "flow_id_by_ipv6",
      width: "20%",
      render: (row) => matchedFlow(row.flow_id_by_ipv6),
    },
    {
      title: t("flow.trace.effective_flow_v4"),
      key: "effective_flow_id_v4",
      width: "20%",
      render: (row) => effectiveFlow(row.effective_flow_id_v4),
    },
    {
      title: t("flow.trace.effective_flow_v6"),
      key: "effective_flow_id_v6",
      width: "20%",
      render: (row) => effectiveFlow(row.effective_flow_id_v6),
    },
  ];
});

// Step 2 state
const queryMode = ref<"domain" | "ip">("domain");
const domainInput = ref("");
const ipInput = ref("");
const domainPresets = [
  {
    label: "Baidu",
    domain: "www.baidu.com",
    type: "info" as const,
  },
  {
    label: "WeChat",
    domain: "weixin.qq.com",
    type: "success" as const,
  },
  {
    label: "Google",
    domain: "www.google.com",
    type: "info" as const,
  },
  {
    label: "Cloudflare",
    domain: "www.cloudflare.com",
    type: "warning" as const,
  },
];
const verdictLoading = ref(false);
const verdictResult = ref<FlowVerdictResult | null>(null);
const resolvedDomain = ref("");
const resetCacheLoading = ref(false);

let sourceRevision = 0;
let matchRequestId = 0;
let verdictRequestId = 0;

const deviceOptions = computed(() =>
  enrolledDeviceStore.bindings
    .filter((d) => d.ipv4 || d.mac)
    .map((d) => ({
      label: `${enrolledDeviceStore.GET_DISPLAY_NAME(d.mac)} (${frontEndStore.MASK_INFO(d.ipv4 || d.mac)})`,
      value: d.mac,
    })),
);

// Whether the flow match button should be enabled
const canMatch = computed(() => {
  return !!srcIpv4.value || !!srcIpv6.value || !!srcMac.value;
});

function clearVerdictState() {
  verdictRequestId += 1;
  verdictLoading.value = false;
  verdictResult.value = null;
  resolvedDomain.value = "";
}

function invalidateSourceTrace() {
  sourceRevision += 1;
  matchRequestId += 1;
  matchLoading.value = false;
  matchResult.value = null;
  clearVerdictState();
}

watch([srcIpv4, srcIpv6, srcMac], invalidateSourceTrace, { flush: "sync" });
watch([domainInput, ipInput, queryMode], clearVerdictState, { flush: "sync" });

function onDeviceSelect(mac: string | null) {
  selectedDevice.value = mac;
  if (!mac) {
    srcIpv4.value = "";
    srcIpv6.value = "";
    srcMac.value = "";
    return;
  }

  const device = enrolledDeviceStore.bindings.find((d) => d.mac === mac);
  if (!device) {
    selectedDevice.value = null;
    srcIpv4.value = "";
    srcIpv6.value = "";
    srcMac.value = "";
    return;
  }

  srcIpv4.value = device.ipv4 || "";
  srcIpv6.value = device.ipv6 || "";
  srcMac.value = device.mac || "";
}

function setManualSourceType(value: ManualSourceType) {
  manualSourceType.value = value;
  manualSourceInput.value = "";
}

function getSourceAddresses(): TraceSourceAddresses {
  return {
    ipv4: srcIpv4.value.trim() || undefined,
    ipv6: srcIpv6.value.trim() || undefined,
  };
}

async function doFlowMatch() {
  if (!canMatch.value) return;

  const requestId = ++matchRequestId;
  const requestSourceRevision = sourceRevision;
  const request = {
    src_ipv4: srcIpv4.value.trim() || undefined,
    src_ipv6: srcIpv6.value.trim() || undefined,
    src_mac: srcMac.value.trim() || null,
  };
  matchLoading.value = true;
  matchResult.value = null;
  clearVerdictState();
  try {
    const result = await trace_flow_match(request);
    if (
      requestId === matchRequestId &&
      requestSourceRevision === sourceRevision
    ) {
      matchResult.value = result;
    }
  } finally {
    if (requestId === matchRequestId) {
      matchLoading.value = false;
    }
  }
}

function extractDomain(input: string): string {
  let s = input.trim();
  try {
    return new URL(s).hostname;
  } catch {
    s = s.replace(/\/.*$/, "");
  }
  // Convert IDN (e.g. Chinese domains) to Punycode
  try {
    return new URL("http://" + s).hostname;
  } catch {
    return s;
  }
}

interface VerdictRequestContext {
  requestId: number;
  sourceRevision: number;
  matchResult: FlowMatchResult;
  source: TraceSourceAddresses;
  hasMac: boolean;
}

function beginVerdictRequest(
  currentMatchResult: FlowMatchResult,
): VerdictRequestContext {
  const context = {
    requestId: ++verdictRequestId,
    sourceRevision,
    matchResult: currentMatchResult,
    source: getSourceAddresses(),
    hasMac: !!srcMac.value,
  };
  verdictLoading.value = true;
  verdictResult.value = null;
  resolvedDomain.value = "";
  return context;
}

function isVerdictRequestCurrent(context: VerdictRequestContext): boolean {
  return (
    context.requestId === verdictRequestId &&
    context.sourceRevision === sourceRevision &&
    context.matchResult === matchResult.value
  );
}

async function executeVerdictPlan(
  plan: VerdictPlan,
  totalCount: number,
): Promise<FlowVerdictResult> {
  const batchResults = await Promise.all(
    plan.batches.map(async (batch) => ({
      batch,
      result: await trace_verdict(batch.request),
    })),
  );
  return {
    verdicts: mergeVerdictBatchResults(totalCount, batchResults),
  };
}

function showInvalidIps(invalidIps: string[]): boolean {
  if (invalidIps.length === 0) return false;
  window.$message?.error(
    t("flow.trace.invalid_ip", { ip: invalidIps.join(", ") }),
  );
  return true;
}

async function doVerdictByDomain() {
  const currentMatchResult = matchResult.value;
  if (!domainInput.value || !currentMatchResult) return;
  const domain = extractDomain(domainInput.value);
  if (!domain) return;
  const displayDomain = domainInput.value.trim();
  const context = beginVerdictRequest(currentMatchResult);
  try {
    const ips: string[] = [];
    let dnsFiltered = false;

    // Query A records
    const dnsResultA = await check_domain({
      flow_id: flowIdForFamily(currentMatchResult, "ipv4"),
      domain,
      record_type: "A",
      apply_filter: true,
    });
    if (!isVerdictRequestCurrent(context)) return;
    dnsFiltered ||= dnsResultA.query_filtered === true;
    if (dnsResultA.records) {
      for (const r of dnsResultA.records) {
        if (r.rr_type === "A") {
          ips.push(r.data);
        }
      }
    }

    // MAC-only matching can still determine the IPv6 flow even without a known source IPv6.
    if (context.source.ipv6 || context.hasMac) {
      try {
        const dnsResultAAAA = await check_domain({
          flow_id: flowIdForFamily(currentMatchResult, "ipv6"),
          domain,
          record_type: "AAAA",
          apply_filter: true,
        });
        if (!isVerdictRequestCurrent(context)) return;
        dnsFiltered ||= dnsResultAAAA.query_filtered === true;
        if (dnsResultAAAA.records) {
          for (const r of dnsResultAAAA.records) {
            if (r.rr_type === "AAAA") {
              ips.push(r.data);
            }
          }
        }
      } catch {
        // AAAA query failure is non-fatal
      }
    }

    if (!isVerdictRequestCurrent(context)) return;
    if (ips.length === 0) {
      window.$message?.warning(
        dnsFiltered
          ? t("flow.trace.dns_filtered")
          : t("flow.trace.dns_no_records"),
      );
      return;
    }

    const plan = buildVerdictPlan(currentMatchResult, context.source, ips);
    if (showInvalidIps(plan.invalidIps)) return;
    const result = await executeVerdictPlan(plan, ips.length);
    if (isVerdictRequestCurrent(context)) {
      verdictResult.value = result;
      resolvedDomain.value = displayDomain;
    }
  } finally {
    if (context.requestId === verdictRequestId) {
      verdictLoading.value = false;
    }
  }
}

function parseIpList(input: string): string[] {
  return input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function doVerdictByIp() {
  const currentMatchResult = matchResult.value;
  if (!ipInput.value || !currentMatchResult) return;
  const ips = parseIpList(ipInput.value);
  if (ips.length === 0) return;
  const source = getSourceAddresses();
  const plan = buildVerdictPlan(currentMatchResult, source, ips);
  if (showInvalidIps(plan.invalidIps)) return;

  const context = beginVerdictRequest(currentMatchResult);
  try {
    const result = await executeVerdictPlan(plan, ips.length);
    if (isVerdictRequestCurrent(context)) {
      verdictResult.value = result;
    }
  } finally {
    if (context.requestId === verdictRequestId) {
      verdictLoading.value = false;
    }
  }
}

async function queryPreset(domain: string) {
  if (verdictLoading.value) return;
  queryMode.value = "domain";
  domainInput.value = domain;
  await doVerdictByDomain();
}

async function doResetCache() {
  resetCacheLoading.value = true;
  try {
    await reset_cache();
    window.$message?.success(t("flow.trace.cache_cleared"));
  } finally {
    resetCacheLoading.value = false;
  }
}

async function onOpen() {
  await enrolledDeviceStore.UPDATE_INFO();
  if (selectedDevice.value) {
    onDeviceSelect(selectedDevice.value);
  }
}

function isCacheConsistent(v: SingleVerdictResult): boolean {
  return v.cache_consistent;
}

function formatAction(mark: { action: { t: string }; flow_id: number }) {
  switch (mark.action.t) {
    case "keep_going":
      return t("flow.trace.action_keep_going");
    case "direct":
      return t("flow.trace.action_direct");
    case "drop":
      return t("flow.trace.action_drop");
    case "redirect":
      return t("flow.trace.action_redirect", { flow_id: mark.flow_id });
    default:
      return mark.action.t;
  }
}

function actionTagType(
  mark: { action: { t: string } } | undefined,
): "default" | "info" | "success" | "warning" | "error" {
  if (!mark) return "default";
  switch (mark.action.t) {
    case "direct":
      return "success";
    case "drop":
      return "error";
    case "redirect":
      return "warning";
    default:
      return "info";
  }
}

function renderRuleMatch(match: SingleVerdictResult["ip_rule_match"]) {
  if (!match) {
    return h(NTag, { size: "small" }, () => t("flow.trace.no_match"));
  }
  return h(NFlex, { align: "center", size: 4, wrap: false }, () => [
    h(NTag, { size: "small", type: actionTagType(match.mark as any) }, () =>
      formatAction(match.mark as any),
    ),
    h(
      NText,
      { depth: 3, style: "font-size: var(--app-font-size-caption)" },
      () => t("flow.trace.priority", { priority: match.priority }),
    ),
  ]);
}

const verdictRows = computed(() => verdictResult.value?.verdicts ?? []);
const verdictColumns = computed<DataTableColumns<SingleVerdictResult>>(() => [
  { title: t("flow.trace.target_ip"), key: "dst_ip", width: "18%" },
  {
    title: t("flow.trace.ip_rule"),
    key: "ip_rule_match",
    width: "23%",
    render: (row) => renderRuleMatch(row.ip_rule_match),
  },
  {
    title: t("flow.trace.dns_rule"),
    key: "dns_rule_match",
    width: "23%",
    render: (row) => renderRuleMatch(row.dns_rule_match),
  },
  {
    title: t("flow.trace.final_action"),
    key: "effective_mark",
    width: "20%",
    render: (row) =>
      h(
        NTag,
        { size: "small", type: actionTagType(row.effective_mark as any) },
        () => formatAction(row.effective_mark as any),
      ),
  },
  {
    title: t("flow.trace.cache"),
    key: "has_cache",
    width: "16%",
    render: (row) =>
      h(
        NTag,
        {
          size: "small",
          type: !row.has_cache
            ? "default"
            : isCacheConsistent(row)
              ? "success"
              : "warning",
          title:
            row.has_cache && !isCacheConsistent(row)
              ? t("flow.trace.cache_mismatch_alert")
              : undefined,
        },
        () =>
          !row.has_cache
            ? t("flow.trace.no_cache")
            : isCacheConsistent(row)
              ? t("flow.trace.cache_consistent")
              : t("flow.trace.cache_inconsistent"),
      ),
  },
]);
</script>

<template>
  <ConfigModal
    v-model:show="show"
    :show-switch="false"
    width="var(--app-secondary-modal-width)"
    max-height="calc(100vh - 120px)"
    :title="t('flow.trace.title')"
    :prepare="onOpen"
  >
    <n-flex vertical :size="16">
      <section class="route-trace-section">
        <n-divider class="network-settings__divider" title-placement="left">
          {{ t("flow.list.ingress_match") }}
        </n-divider>
        <n-flex vertical :size="8">
          <n-flex :wrap="false" align="center">
            <n-select
              v-model:value="selectMode"
              :options="sourceModeOptions"
              style="width: 120px"
            />
            <template v-if="selectMode">
              <n-select
                :options="deviceOptions"
                :value="selectedDevice"
                @update:value="onDeviceSelect"
                :placeholder="t('flow.trace.select_device_placeholder')"
                clearable
                filterable
                style="flex: 1"
              />
            </template>
            <template v-else>
              <n-select
                :value="manualSourceType"
                :options="manualSourceOptions"
                style="width: 100px"
                @update:value="setManualSourceType"
              />
              <n-input
                v-model:value="manualSourceInput"
                :placeholder="
                  t(`flow.trace.src_${manualSourceType}_placeholder`)
                "
                style="flex: 1"
              />
            </template>
            <n-button
              type="primary"
              :loading="matchLoading"
              :disabled="!canMatch"
              @click="doFlowMatch"
            >
              {{ t("flow.trace.match_btn") }}
            </n-button>
          </n-flex>
          <n-text
            v-if="selectMode && (srcIpv4 || srcMac)"
            depth="3"
            style="font-size: var(--app-font-size-caption)"
          >
            IPv4:
            {{
              srcIpv4 ? frontEndStore.MASK_INFO(srcIpv4) : t("flow.trace.none")
            }}
            &nbsp; IPv6:
            {{
              srcIpv6 ? frontEndStore.MASK_INFO(srcIpv6) : t("flow.trace.none")
            }}
            &nbsp; MAC:
            {{
              srcMac ? frontEndStore.MASK_INFO(srcMac) : t("flow.trace.none")
            }}
          </n-text>
        </n-flex>
      </section>

      <section v-if="matchResult" class="route-trace-section">
        <n-divider class="network-settings__divider" title-placement="left">
          {{ t("flow.trace.match_result_title") }}
        </n-divider>
        <StandardDataTable
          :columns="matchColumns"
          :data="matchRows"
          table-layout="fixed"
          size="small"
        />
      </section>

      <section v-if="matchResult" class="route-trace-section">
        <n-divider class="network-settings__divider" title-placement="left">
          {{ t("flow.trace.route_decision") }}
        </n-divider>
        <n-flex vertical :size="8">
          <n-tabs
            v-model:value="queryMode"
            type="segment"
            size="small"
            style="width: 240px"
          >
            <n-tab name="domain">{{ t("flow.trace.query_domain") }}</n-tab>
            <n-tab name="ip">{{ t("flow.trace.query_ip") }}</n-tab>
          </n-tabs>

          <!-- Domain mode -->
          <template v-if="queryMode === 'domain'">
            <n-flex :size="8">
              <n-tag
                v-for="preset in domainPresets"
                :key="preset.domain"
                size="small"
                :type="preset.type"
                role="button"
                tabindex="0"
                :style="{ cursor: verdictLoading ? 'wait' : 'pointer' }"
                @click="queryPreset(preset.domain)"
                @keydown.enter="queryPreset(preset.domain)"
                @keydown.space.prevent="queryPreset(preset.domain)"
              >
                {{ preset.label }}
              </n-tag>
            </n-flex>
            <n-flex :size="8" :wrap="false">
              <n-input
                key="domain"
                v-model:value="domainInput"
                :placeholder="t('flow.trace.domain_placeholder')"
                style="min-width: 0; flex: 1"
              />
              <n-button
                type="primary"
                :loading="verdictLoading"
                :disabled="!domainInput"
                @click="doVerdictByDomain"
              >
                {{ t("flow.trace.resolve_and_query") }}
              </n-button>
            </n-flex>
          </template>

          <!-- IP mode -->
          <template v-else>
            <n-flex :size="8" :wrap="false">
              <n-input
                key="ip"
                v-model:value="ipInput"
                :placeholder="t('flow.trace.target_ip_placeholder')"
                style="min-width: 0; flex: 1"
              />
              <n-button
                type="primary"
                :loading="verdictLoading"
                :disabled="!ipInput"
                @click="doVerdictByIp"
              >
                {{ t("flow.trace.query_btn") }}
              </n-button>
            </n-flex>
          </template>
        </n-flex>

        <!-- Verdict results -->
        <template v-if="verdictResult">
          <n-flex align="center" justify="space-between">
            <n-text
              v-if="resolvedDomain"
              depth="3"
              style="font-size: var(--app-font-size-caption)"
            >
              {{
                t("flow.trace.domain_resolved_count", {
                  domain: resolvedDomain,
                  count: verdictResult.verdicts.length,
                })
              }}
            </n-text>
            <span v-else />
            <n-button
              size="tiny"
              tertiary
              type="warning"
              :loading="resetCacheLoading"
              @click="doResetCache"
            >
              {{ t("flow.trace.reset_route_cache") }}
            </n-button>
          </n-flex>
          <StandardDataTable
            :columns="verdictColumns"
            :data="verdictRows"
            table-layout="fixed"
            size="small"
          />
        </template>
      </section>
    </n-flex>
  </ConfigModal>
</template>

<style scoped>
.route-trace-section {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-section);
}

.network-settings__divider {
  margin: 0;
}
</style>
