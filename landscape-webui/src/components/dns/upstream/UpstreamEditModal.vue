<script setup lang="ts">
import { useMessage, type DataTableColumns } from "naive-ui";
import { isIP } from "is-ip";
import { computed, h, ref, watch } from "vue";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import {
  get_dns_upstream,
  push_dns_upstream,
  test_dns_upstream_quic,
  type DnsUpstreamQuicTestResult,
} from "@/api/dns_rule/upstream";
import {
  DnsUpstreamModeTsEnum,
  fill_default_dns_http_endpoint,
  UPSTREAM_OPTIONS,
} from "@/lib/dns";
import { copy_context_to_clipboard } from "@/lib/common";
import { useI18n } from "vue-i18n";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import ConfigModal from "@/components/common/ConfigModal.vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";

type Props = {
  rule_id: string | null;
};

const props = defineProps<Props>();

const message = useMessage();
const { t } = useI18n();

const emit = defineEmits<{
  refresh: [];
  saved: [rule: DnsUpstreamConfig];
}>();

const show = defineModel<boolean>("show", { required: true });

const origin_rule_json = ref<string>("");

const rule = ref<DnsUpstreamConfig>();

watch(
  () => rule.value?.mode.t,
  () => rule.value && fill_default_dns_http_endpoint(rule.value),
);

const commit_spin = ref(false);
const quicTestLoading = ref(false);
const quicTestResult = ref<DnsUpstreamQuicTestResult>();
const quicTestError = ref("");
const showQuicTestResult = ref(false);
const isModified = computed(() => {
  return JSON.stringify(rule.value) !== origin_rule_json.value;
});

const HTTP3_DOMAINS = new Set([
  "dns.alidns.com",
  "cloudflare-dns.com",
  "dns.google",
]);
const supportsHttp3 = computed(
  () =>
    rule.value?.mode.t === DnsUpstreamModeTsEnum.Https &&
    HTTP3_DOMAINS.has(rule.value.mode.domain),
);
const http3Enabled = computed({
  get: () =>
    rule.value?.mode.t === DnsUpstreamModeTsEnum.Https &&
    Boolean(rule.value.mode.http3),
  set: (enabled: boolean) => {
    if (rule.value?.mode.t === DnsUpstreamModeTsEnum.Https) {
      rule.value.mode.http3 = enabled;
    }
  },
});
const quicProtocol = computed(() =>
  rule.value?.mode.t === DnsUpstreamModeTsEnum.Quic ? "DoQ" : "H3",
);
const quicSuccessCount = computed(
  () =>
    quicTestResult.value?.attempts.filter((attempt) => !attempt.error).length ??
    0,
);
const quicTestSucceeded = computed(
  () =>
    Boolean(quicTestResult.value?.attempts.length) &&
    quicSuccessCount.value === quicTestResult.value?.attempts.length,
);
const quicTestPartial = computed(
  () => quicSuccessCount.value > 0 && !quicTestSucceeded.value,
);
const quicTestMessage = computed(() => {
  const params = { protocol: quicProtocol.value };
  if (quicTestSucceeded.value)
    return t("dns.upstream_edit.quic_test_success", params);
  if (quicTestPartial.value)
    return t("dns.upstream_edit.quic_test_partial", params);
  if (quicTestError.value)
    return t("dns.upstream_edit.quic_test_request_failed");

  const errorKinds = quicTestResult.value?.attempts
    .map((attempt) => attempt.error_kind)
    .filter(Boolean);
  if (errorKinds?.includes("timeout")) {
    return t("dns.upstream_edit.quic_test_timeout", params);
  }
  if (errorKinds?.includes("network")) {
    return t("dns.upstream_edit.quic_test_network_unreachable");
  }
  if (errorKinds?.includes("tls")) {
    return t("dns.upstream_edit.quic_test_tls_failed", params);
  }
  return t("dns.upstream_edit.quic_test_failed", params);
});
type QuicAttempt = DnsUpstreamQuicTestResult["attempts"][number];
function quicAttemptRowKey(attempt: QuicAttempt) {
  return JSON.stringify(attempt);
}
const quicAttemptColumns = computed<DataTableColumns<QuicAttempt>>(() => [
  {
    title: "#",
    key: "index",
    width: 44,
    render: (_attempt, index) => index + 1,
  },
  {
    title: t("dns.upstream_edit.latency"),
    key: "latency",
    width: 90,
    render: (attempt) => `${attempt.latency_ms.toFixed(2)} ms`,
  },
  {
    title: t("dns.upstream_edit.connection"),
    key: "connection",
    width: 80,
    render: (attempt, index) =>
      attempt.error
        ? "-"
        : index === 0
          ? t("dns.upstream_edit.connection_new")
          : attempt.connection_reused
            ? t("dns.upstream_edit.connection_reused")
            : t("dns.upstream_edit.connection_reconnected"),
  },
  {
    title: t("dns.upstream_edit.result"),
    key: "result",
    render: (attempt) =>
      h(
        "span",
        { class: "h3-attempt-result" },
        attempt.error || attempt.answers.join(", ") || "-",
      ),
  },
]);

async function testQuic() {
  if (!rule.value) return;
  showQuicTestResult.value = true;
  quicTestLoading.value = true;
  quicTestResult.value = undefined;
  quicTestError.value = "";
  try {
    quicTestResult.value = await test_dns_upstream_quic(rule.value);
  } catch (error: any) {
    quicTestError.value =
      error?.message ||
      error?.error_id ||
      t("dns.upstream_edit.quic_test_failed", {
        protocol: quicProtocol.value,
      });
  } finally {
    quicTestLoading.value = false;
  }
}

async function enter() {
  if (props.rule_id) {
    rule.value = await get_dns_upstream(props.rule_id);
  } else {
    rule.value = {
      name: null,
      remark: "",
      mode: { t: DnsUpstreamModeTsEnum.Plaintext },
      ips: [],
      port: 53,
      enable_ip_validation: false,
    };
  }
  fill_default_dns_http_endpoint(rule.value);
  origin_rule_json.value = JSON.stringify(rule.value);
}

const formRef = ref();

const ipRule = {
  trigger: ["input", "blur"],
  validator(_: unknown, value: string) {
    if (!value) return new Error(t("dns.upstream_edit.err_ip_required"));
    if (!isIP(value)) return new Error(t("dns.upstream_edit.err_ip_invalid"));
    return true;
  },
};

const rules = {
  name: {
    required: true,
    trigger: ["input", "blur"],
    message: () => t("common.name_required"),
  },
  ips: {
    trigger: ["blur", "change"],
    validator(_: unknown, value: string[]) {
      if (!value || value.length === 0) {
        return new Error(t("dns.upstream_edit.err_ips_required"));
      }
      return true;
    },
  },

  domain: {
    trigger: ["input", "blur"],
    validator(_: unknown, value: string) {
      if (rule.value?.mode.t === DnsUpstreamModeTsEnum.Plaintext) {
        return true; // Plaintext 不校验 domain
      }
      if (!value || value.trim() === "") {
        return new Error(t("dns.upstream_edit.err_domain_required"));
      }
      // 可选：简单域名正则
      const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(value)) {
        return new Error(t("dns.upstream_edit.err_domain_invalid"));
      }
      return true;
    },
  },
};

async function saveRule() {
  if (rule.value) {
    try {
      await formRef.value?.validate();
      fill_default_dns_http_endpoint(rule.value);
      if (
        rule.value.mode.t === DnsUpstreamModeTsEnum.Https &&
        !supportsHttp3.value
      ) {
        rule.value.mode.http3 = false;
      }

      commit_spin.value = true;
      const savedRule = await push_dns_upstream(rule.value);
      show.value = false;
      emit("saved", savedRule);
      emit("refresh");
    } finally {
      commit_spin.value = false;
    }
  }
}

async function export_config() {
  if (rule.value) {
    let configs = rule.value;
    await copy_context_to_clipboard(message, JSON.stringify(configs, null, 2));
  }
}

async function import_rules(rules: DnsUpstreamConfig) {
  try {
    if (rule.value) {
      fill_default_dns_http_endpoint(rules);
      rule.value = rules;
    }
  } catch (e) {}
}
</script>

<template>
  <ConfigModal
    v-model:show="show"
    :show-switch="false"
    width="var(--app-secondary-modal-width)"
    :title="t('dns.upstream_edit.title')"
    :dirty="isModified"
    :prepare="enter"
  >
    <template #header-extra>
      <n-flex>
        <n-button :focusable="false" @click="export_config" size="small" strong>
          {{ t("dns.upstream_edit.copy") }}
        </n-button>
        <ClipboardImportModal :on-confirm="import_rules">
          <template #trigger>
            <n-button :focusable="false" size="small" strong>
              {{ t("dns.upstream_edit.paste") }}
            </n-button>
          </template>
        </ClipboardImportModal>
      </n-flex>
    </template>
    <!-- {{ rule }} -->
    <n-form
      v-if="rule"
      :rules="rules"
      style="flex: 1"
      ref="formRef"
      :model="rule"
    >
      <StandardSettingRow
        :label="t('dns.upstream_edit.name')"
        path="name"
        required
      >
        <n-input
          :placeholder="t('dns.upstream_edit.name_placeholder')"
          v-model:value="rule.name"
          clearable
        />
      </StandardSettingRow>

      <StandardSettingRow :label="t('dns.upstream_edit.remark')">
        <n-input
          :placeholder="t('dns.upstream_edit.remark_placeholder')"
          v-model:value="rule.remark"
        />
      </StandardSettingRow>

      <StandardSettingRow control-width="auto">
        <template #label>
          <Notice>
            {{ t("dns.upstream_edit.ip_validation") }}
            <template #msg>
              {{ t("dns.upstream_edit.ip_validation_desc_1") }} <br />
              {{ t("dns.upstream_edit.ip_validation_desc_2") }}
            </template>
          </Notice>
        </template>

        <n-switch v-model:value="rule.enable_ip_validation" size="medium" />
      </StandardSettingRow>

      <StandardSettingRow
        :label="t('dns.upstream_edit.preset_fill')"
        layout="stacked"
      >
        <DefaultUpstream v-model:rule="rule"></DefaultUpstream>
      </StandardSettingRow>

      <StandardSettingRow
        :label="t('dns.upstream_edit.request_mode')"
        path="mode.domain"
      >
        <n-radio-group
          v-model:value="rule.mode.t"
          name="dns_server_upstream_mode"
          size="medium"
        >
          <n-radio-button
            v-for="mode in UPSTREAM_OPTIONS"
            :key="mode.value"
            :value="mode.value"
            :label="mode.label"
          />
        </n-radio-group>
        <!-- <n-select
            v-else
            style="width: 25%"
            v-model:value="rule.mode.t"
            filterable
            placeholder="上游请求模式"
            :options="UPSTREAM_OPTIONS"
          /> -->
      </StandardSettingRow>

      <StandardSettingRow
        v-if="supportsHttp3"
        label="HTTP/3"
        control-width="auto"
      >
        <n-flex align="center" :wrap="false" :size="8">
          <n-switch v-model:value="http3Enabled" size="medium" />
          <n-button
            v-if="http3Enabled"
            size="small"
            :loading="quicTestLoading"
            @click="testQuic"
          >
            {{ t("dns.upstream_edit.test") }}
          </n-button>
        </n-flex>
      </StandardSettingRow>

      <StandardSettingRow
        v-else-if="rule.mode.t === DnsUpstreamModeTsEnum.Quic"
        :label="t('dns.upstream_edit.doq_reuse_test')"
        control-width="auto"
      >
        <n-button size="small" :loading="quicTestLoading" @click="testQuic">
          {{ t("dns.upstream_edit.test") }}
        </n-button>
      </StandardSettingRow>

      <StandardSettingRow
        v-if="rule.mode.t !== DnsUpstreamModeTsEnum.Plaintext"
        :label="t('dns.upstream_edit.domain')"
      >
        <n-input
          style="width: 100%"
          size="medium"
          :placeholder="t('dns.upstream_edit.domain_placeholder')"
          v-model:value="rule.mode.domain"
        >
        </n-input>
      </StandardSettingRow>

      <StandardSettingRow
        path="mode.http_endpoint"
        v-if="rule.mode.t === DnsUpstreamModeTsEnum.Https"
        :label="t('dns.upstream_edit.url')"
      >
        <n-input
          :placeholder="t('dns.upstream_edit.url_placeholder')"
          v-model:value="rule.mode.http_endpoint"
        >
        </n-input>
      </StandardSettingRow>

      <StandardSettingRow :label="t('dns.upstream_edit.port')">
        <n-input-number
          size="medium"
          :min="1"
          :max="65535"
          :placeholder="t('dns.upstream_edit.port_placeholder')"
          v-model:value="rule.port"
        />
      </StandardSettingRow>

      <StandardSettingRow :label="t('dns.upstream_edit.server_ips')" path="ips">
        <n-dynamic-input
          v-model:value="rule.ips"
          :placeholder="t('dns.upstream_edit.enter_ip')"
          #="{ index }"
        >
          <n-form-item
            :path="`ips[${index}]`"
            :rule="ipRule"
            ignore-path-change
            :show-label="false"
            :show-feedback="false"
            style="margin-bottom: 0; flex: 1"
          >
            <n-input
              v-model:value="rule.ips[index]"
              :placeholder="t('dns.upstream_edit.enter_ip_v46')"
              @keydown.enter.prevent
            />
          </n-form-item>
        </n-dynamic-input>
      </StandardSettingRow>
    </n-form>
    <template #footer="{ close }">
      <n-flex justify="space-between">
        <n-button @click="close">{{ t("common.cancel") }}</n-button>
        <n-button
          :loading="commit_spin"
          @click="saveRule"
          :disabled="!isModified"
        >
          {{ t("common.save") }}
        </n-button>
      </n-flex>
    </template>
  </ConfigModal>
  <ConfigModal
    v-model:show="showQuicTestResult"
    :show-switch="false"
    :title="t('dns.upstream_edit.quic_test_title', { protocol: quicProtocol })"
    width="var(--app-compact-modal-width)"
  >
    <n-spin v-if="quicTestLoading" style="display: block; padding: 32px" />
    <template v-else>
      <n-alert
        :type="
          quicTestSucceeded ? 'success' : quicTestPartial ? 'warning' : 'error'
        "
        :bordered="false"
      >
        {{ quicTestMessage }}
      </n-alert>
      <n-text
        v-if="quicTestError"
        type="error"
        style="display: block; margin-top: 12px"
      >
        {{ quicTestError }}
      </n-text>
      <n-descriptions
        v-if="quicTestResult"
        :column="2"
        label-placement="left"
        style="margin-top: 12px"
      >
        <n-descriptions-item :label="t('dns.upstream_edit.test_domain')">
          {{ quicTestResult.query_domain }}
        </n-descriptions-item>
        <n-descriptions-item :label="t('dns.upstream_edit.reuse_average')">
          {{
            quicTestResult.reuse_average_ms == null
              ? "-"
              : `${quicTestResult.reuse_average_ms.toFixed(2)} ms`
          }}
        </n-descriptions-item>
        <n-descriptions-item :label="t('dns.upstream_edit.connection_count')">
          {{ quicTestResult.connection_count }}
        </n-descriptions-item>
      </n-descriptions>
      <StandardDataTable
        v-if="quicTestResult"
        class="quic-attempt-table"
        :columns="quicAttemptColumns"
        :data="quicTestResult.attempts"
        :row-key="quicAttemptRowKey"
        size="small"
      />
    </template>
  </ConfigModal>
</template>

<style scoped>
.quic-attempt-table {
  margin-top: var(--app-space-section);
}

.h3-attempt-result {
  overflow-wrap: anywhere;
}
</style>
