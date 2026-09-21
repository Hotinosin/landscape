<script setup lang="ts">
import { computed, h, ref } from "vue";
import { useMessage, type DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import { SearchLocate } from "@vicons/carbon";
import type {
  CheckChainDnsResult,
  CheckDomainParams,
  DNSRedirectRule,
  DNSRuleConfig,
  FlowConfig,
  LandscapeDnsRecordType,
} from "@landscape-router/types/api/schemas";
import {
  check_domain,
  invalidate_domain_cache,
  refresh_domain_cache,
} from "@/api/dns_service";
import { DnsRule } from "@/lib/dns";
import { getDnsRule } from "@landscape-router/types/api/dns-rules/dns-rules";
import { get_dns_redirect } from "@/api/dns_rule/redirect";
import { getFlowRules } from "@landscape-router/types/api/flow-rules/flow-rules";
import DnsRuleListRow from "@/components/dns/DnsRuleListRow.vue";
import DnsRedirectListRow from "@/components/dns/redirect/DnsRedirectListRow.vue";
import ConfigModal from "@/components/common/ConfigModal.vue";
const message = useMessage();
const { t } = useI18n();

interface Props {
  flow_id?: number;
  initialDomain?: string;
  initialType?: LandscapeDnsRecordType;
}

const props = withDefaults(defineProps<Props>(), {
  flow_id: 0,
  initialDomain: "",
  initialType: "A",
});

const show = defineModel<boolean>("show", { required: true });
const req = ref<CheckDomainParams>({
  flow_id: 0,
  domain: "",
  record_type: "A",
});
function createEmptyResult(): CheckChainDnsResult {
  return {
    redirect_id: undefined,
    dynamic_redirect_source: undefined,
    rule_id: undefined,
    rule_filter: undefined,
    query_filtered: false,
    records: undefined,
    cache_records: undefined,
  };
}

const result = ref<CheckChainDnsResult>(createEmptyResult());

async function init_req(isEnter = false) {
  req.value = {
    flow_id: props.flow_id,
    domain: props.initialDomain || "",
    record_type: props.initialType || "A",
  };
  result.value = createEmptyResult();
  config_rule.value = undefined;
  redirect_rule.value = undefined;
  if (isEnter) flows.value = await getFlowRules();
  if (isEnter && req.value.domain) {
    await query();
  }
}
const options = [
  {
    label: "A",
    value: "A",
  },
  {
    label: "AAAA",
    value: "AAAA",
  },
  {
    label: "HTTPS",
    value: "HTTPS",
  },
];

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

const loading = ref(false);
const quickLoading = ref("");
const deleteCacheLoading = ref(false);
const refreshCacheLoading = ref(false);
const config_rule = ref<DnsRule>();
const redirect_rule = ref<DNSRedirectRule>();
const flows = ref<FlowConfig[]>([]);
const dnsRuleColumns = computed<DataTableColumns<DNSRuleConfig>>(() => [
  {
    title: `${t("common.status")} / ${t("common.priority")}`,
    key: "status",
    width: 110,
    render: (rule) =>
      h(DnsRuleListRow, { rule, flows: flows.value, cell: "status" }),
  },
  {
    title: t("dns.rule_card.match_rules"),
    key: "sources",
    render: (rule) =>
      h(DnsRuleListRow, { rule, flows: flows.value, cell: "sources" }),
  },
  {
    title: t("dns.rule_card.upstream_config"),
    key: "upstream",
    render: (rule) =>
      h(DnsRuleListRow, { rule, flows: flows.value, cell: "upstream" }),
  },
  {
    title: t("dns.rule_card.traffic_action"),
    key: "action",
    render: (rule) =>
      h(DnsRuleListRow, { rule, flows: flows.value, cell: "action" }),
  },
]);
type RedirectCell = "status" | "flows" | "rules" | "mode" | "response";
const redirectColumns = computed<DataTableColumns<DNSRedirectRule>>(() =>
  (
    ["status", "flows", "rules", "mode", "response"] satisfies RedirectCell[]
  ).map((cell) => ({
    title: t(
      cell === "status"
        ? "common.status"
        : cell === "flows"
          ? "dns.redirect_card.apply_to"
          : cell === "rules"
            ? "dns.rule_card.match_rules"
            : cell === "mode"
              ? "dns.redirect_card.answer_mode"
              : "dns.redirect_card.response_info",
    ),
    key: cell,
    width: cell === "status" ? 110 : undefined,
    render: (rule: DNSRedirectRule) => h(DnsRedirectListRow, { rule, cell }),
  })),
);
const busy = computed(
  () => loading.value || deleteCacheLoading.value || refreshCacheLoading.value,
);
const canDeleteCache = computed(() => req.value.domain.trim() !== "");
const canRefreshCache = computed(
  () =>
    req.value.domain.trim() !== "" &&
    !!result.value.rule_id &&
    !redirect_rule.value,
);

function getNormalizedReq(): CheckDomainParams | undefined {
  const domain = extractDomain(req.value.domain);
  if (domain === "") {
    message.info(t("dns.check_domain.enter_domain"));
    return;
  }

  req.value.domain = domain;
  return {
    ...req.value,
    domain,
    apply_filter: false,
  };
}

async function syncRuleDetails(nextResult: CheckChainDnsResult) {
  config_rule.value = undefined;
  redirect_rule.value = undefined;

  if (nextResult.rule_id) {
    config_rule.value = new DnsRule(await getDnsRule(nextResult.rule_id));
  }
  if (nextResult.redirect_id) {
    redirect_rule.value = await get_dns_redirect(nextResult.redirect_id);
  }
}

async function applyResult(nextResult: CheckChainDnsResult) {
  result.value = nextResult;
  await syncRuleDetails(nextResult);
}

async function query() {
  const nextReq = getNormalizedReq();
  if (!nextReq) {
    return;
  }

  loading.value = true;
  try {
    await applyResult(await check_domain(nextReq));
  } finally {
    loading.value = false;
  }
}

async function deleteCache() {
  const nextReq = getNormalizedReq();
  if (!nextReq) {
    return;
  }

  deleteCacheLoading.value = true;
  try {
    await applyResult(await invalidate_domain_cache(nextReq));
    message.success(t("dns.check_domain.delete_cache_success"));
  } finally {
    deleteCacheLoading.value = false;
  }
}

async function refreshCache() {
  const nextReq = getNormalizedReq();
  if (!nextReq) {
    return;
  }

  refreshCacheLoading.value = true;
  try {
    await applyResult(await refresh_domain_cache(nextReq));
    message.success(t("dns.check_domain.refresh_cache_success"));
  } finally {
    refreshCacheLoading.value = false;
  }
}

async function quick_btn(record_type: LandscapeDnsRecordType, domain: string) {
  req.value.domain = domain;
  req.value.record_type = record_type;
  quickLoading.value = `${record_type}:${domain}`;
  try {
    await query();
  } finally {
    quickLoading.value = "";
  }
}
</script>

<template>
  <ConfigModal
    @after-enter="init_req(true)"
    @after-leave="init_req(false)"
    v-model:show="show"
    :show-switch="false"
    width="min(900px, calc(100vw - 32px))"
    max-height="min(680px, calc(100vh - 120px))"
    :title="t('dns.check_domain.test_flow_query', { flow_id })"
  >
    <n-flex style="height: 100%" vertical>
      <n-flex :wrap="true" size="small">
        <n-button
          size="small"
          :loading="quickLoading === 'A:www.baidu.com'"
          :disabled="busy"
          type="info"
          ghost
          @click="quick_btn('A', 'www.baidu.com')"
        >
          IPv4 Baidu
        </n-button>
        <n-button
          size="small"
          ghost
          :loading="quickLoading === 'AAAA:www.baidu.com'"
          :disabled="busy"
          type="success"
          @click="quick_btn('AAAA', 'www.baidu.com')"
        >
          IPv6 Baidu
        </n-button>
        <n-button
          size="small"
          :loading="quickLoading === 'HTTPS:crypto.cloudflare.com'"
          :disabled="busy"
          type="info"
          ghost
          @click="quick_btn('HTTPS', 'crypto.cloudflare.com')"
        >
          HTTPS CF
        </n-button>
        <n-button
          size="small"
          :loading="quickLoading === 'A:test.ustc.edu.cn'"
          :disabled="busy"
          type="info"
          ghost
          @click="quick_btn('A', 'test.ustc.edu.cn')"
        >
          IPv4 USTC
        </n-button>
        <n-button
          size="small"
          ghost
          :loading="quickLoading === 'AAAA:test6.ustc.edu.cn'"
          :disabled="busy"
          type="success"
          @click="quick_btn('AAAA', 'test6.ustc.edu.cn')"
        >
          IPv6 USTC
        </n-button>
      </n-flex>
      <n-spin :show="loading">
        <n-input-group>
          <n-select
            :style="{ width: '33%' }"
            v-model:value="req.record_type"
            :options="options"
          />
          <n-input
            :placeholder="t('dns.check_domain.query_instruction')"
            @keyup.enter="query"
            v-model:value="req.domain"
          />

          <n-button @click="query">
            <template #icon>
              <n-icon>
                <SearchLocate />
              </n-icon>
            </template>
          </n-button>
        </n-input-group>
        <n-flex justify="space-between" align="center" style="margin-top: 10px">
          <n-text depth="3">
            {{ t("dns.check_domain.diagnostic_hint") }}
          </n-text>
          <n-flex>
            <DeleteButton
              :disabled="!canDeleteCache"
              :loading="deleteCacheLoading"
              :label="t('dns.check_domain.delete_cache')"
              :content="t('dns.check_domain.confirm_delete_cache')"
              :on-confirm="deleteCache"
            />
            <ConfirmModal
              :positive-button-props="{ loading: refreshCacheLoading }"
              @positive-click="refreshCache"
            >
              <template #trigger>
                <n-button
                  size="small"
                  type="warning"
                  :disabled="!canRefreshCache"
                >
                  {{ t("dns.check_domain.refresh_cache") }}
                </n-button>
              </template>
              {{ t("dns.check_domain.confirm_refresh_cache") }}
            </ConfirmModal>
          </n-flex>
        </n-flex>
        <n-alert
          v-if="result.query_filtered"
          type="warning"
          :show-icon="false"
          style="margin-top: 10px"
        >
          {{ t("dns.check_domain.query_filtered_hint") }}
        </n-alert>
      </n-spin>

      <n-scrollbar>
        <n-flex v-if="config_rule" vertical>
          <StandardDataTable
            :columns="dnsRuleColumns"
            :data="[config_rule]"
            :row-key="(rule: DNSRuleConfig) => rule.id ?? rule.index"
            :scroll-x="760"
            size="small"
          />

          <n-divider title-placement="left">
            {{ t("dns.check_domain.upstream_result") }}
          </n-divider>
          <n-flex v-if="result.records?.length">
            <n-flex v-for="each in result.records">
              {{ each }}
            </n-flex>
          </n-flex>
          <n-text v-else depth="3">
            {{
              result.records
                ? "上游返回空记录"
                : "未返回上游记录；当前接口未提供查询失败原因，无法区分超时、解析失败或无有效响应。"
            }}
          </n-text>
          <n-divider title-placement="left">
            {{ t("dns.check_domain.cache_result") }}
          </n-divider>
          <n-flex v-if="result.cache_records?.length">
            <n-flex v-for="each in result.cache_records">
              {{ each }}
            </n-flex>
          </n-flex>
          <n-text v-else depth="3">当前没有缓存记录</n-text>
        </n-flex>

        <n-flex v-if="redirect_rule" vertical>
          <StandardDataTable
            :columns="redirectColumns"
            :data="[redirect_rule]"
            :row-key="(rule: DNSRedirectRule) => rule.id ?? rule.remark"
            :scroll-x="760"
            size="small"
          />
          <n-divider title-placement="left">
            {{ t("dns.check_domain.redirect_result") }}
          </n-divider>
          <n-flex v-if="result.records">
            <n-flex v-for="each in result.records">
              {{ each }}
            </n-flex>
          </n-flex>
        </n-flex>
      </n-scrollbar>
    </n-flex>
  </ConfigModal>
</template>
