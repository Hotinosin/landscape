<script setup lang="ts">
import { useMessage } from "naive-ui";
import { isIP } from "is-ip";
import { computed } from "vue";
import { ref } from "vue";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import {
  get_dns_upstream,
  push_dns_upstream,
  test_dns_upstream_h3,
  type DnsUpstreamH3TestResult,
} from "@/api/dns_rule/upstream";
import { DnsUpstreamModeTsEnum, UPSTREAM_OPTIONS } from "@/lib/dns";
import {
  copy_context_to_clipboard,
  read_context_from_clipboard,
} from "@/lib/common";
import { useI18n } from "vue-i18n";

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

const commit_spin = ref(false);
const h3TestLoading = ref(false);
const h3TestResult = ref<DnsUpstreamH3TestResult>();
const showH3TestResult = ref(false);
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
const h3TestSucceeded = computed(() =>
  h3TestResult.value?.attempts.some((attempt) => !attempt.error),
);

async function testH3() {
  if (!rule.value) return;
  await formRef.value?.validate();
  h3TestLoading.value = true;
  try {
    h3TestResult.value = await test_dns_upstream_h3(rule.value);
    showH3TestResult.value = true;
  } finally {
    h3TestLoading.value = false;
  }
}

async function enter() {
  if (props.rule_id) {
    rule.value = await get_dns_upstream(props.rule_id);
  } else {
    rule.value = {
      remark: "",
      mode: { t: DnsUpstreamModeTsEnum.Plaintext },
      ips: [],
      port: 53,
      enable_ip_validation: false,
    };
  }
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

  "mode.http_endpoint": {
    trigger: ["blur", "input"],
    level: "warning",
    validator(_: unknown, value: string) {
      if (!value || value.trim() === "") {
        return new Error(t("dns.upstream_edit.warn_default_endpoint"));
      }
      return true;
    },
  },
};

async function saveRule() {
  if (rule.value) {
    try {
      await formRef.value?.validate();
      // 如果是 HTTPS 模式且 endpoint 为空
      if (
        rule.value.mode.t === DnsUpstreamModeTsEnum.Https &&
        (!rule.value.mode.http_endpoint ||
          rule.value.mode.http_endpoint.trim() === "")
      ) {
        message.warning(t("dns.upstream_edit.warn_empty_endpoint_fill"));
        rule.value.mode.http_endpoint = null as any;
      }
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

async function import_rules() {
  try {
    if (rule.value) {
      let rules = JSON.parse(await read_context_from_clipboard());
      rule.value = rules;
    }
  } catch (e) {}
}
</script>

<template>
  <n-modal
    :auto-focus="false"
    v-model:show="show"
    style="width: 600px"
    class="custom-card"
    preset="card"
    :title="t('dns.upstream_edit.title')"
    @after-enter="enter"
    :bordered="false"
  >
    <template #header-extra>
      <n-flex>
        <n-button :focusable="false" @click="export_config" size="small" strong>
          {{ t("dns.upstream_edit.copy") }}
        </n-button>
        <n-button :focusable="false" @click="import_rules" size="small" strong>
          {{ t("dns.upstream_edit.paste") }}
        </n-button>
      </n-flex>
    </template>
    <!-- {{ rule }} -->
    <n-form
      v-if="rule"
      :rules="rules"
      style="flex: 1"
      ref="formRef"
      :model="rule"
      :cols="8"
    >
      <n-grid :cols="8">
        <n-form-item-gi :span="4" :label="t('dns.upstream_edit.remark')">
          <n-input
            :placeholder="t('dns.upstream_edit.remark_placeholder')"
            v-model:value="rule.remark"
          />
        </n-form-item-gi>

        <n-form-item-gi :offset="1" :span="2">
          <template #label>
            <Notice>
              {{ t("dns.upstream_edit.ip_validation") }}
              <template #msg>
                {{ t("dns.upstream_edit.ip_validation_desc_1") }} <br />
                {{ t("dns.upstream_edit.ip_validation_desc_2") }}
              </template>
            </Notice>
          </template>

          <n-switch v-model:value="rule.enable_ip_validation">
            <template #checked>
              {{ t("dns.upstream_edit.ip_validation_on") }}
            </template>
            <template #unchecked>
              {{ t("dns.upstream_edit.ip_validation_off") }}
            </template>
          </n-switch>
        </n-form-item-gi>

        <n-form-item-gi :span="8" :label="t('dns.upstream_edit.preset_fill')">
          <DefaultUpstream v-model:rule="rule"></DefaultUpstream>
        </n-form-item-gi>

        <n-form-item-gi
          :span="4"
          :label="t('dns.upstream_edit.request_mode')"
          path="mode.domain"
        >
          <n-radio-group
            v-model:value="rule.mode.t"
            name="dns_server_upstream_mode"
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
        </n-form-item-gi>

        <n-form-item-gi v-if="supportsHttp3" :span="2" label="HTTP/3">
          <n-flex align="center" :wrap="false">
            <n-checkbox v-model:checked="http3Enabled">H3</n-checkbox>
            <n-button size="small" :loading="h3TestLoading" @click="testH3">
              {{ t("dns.upstream_edit.test_h3") }}
            </n-button>
          </n-flex>
        </n-form-item-gi>

        <n-form-item-gi
          :span="supportsHttp3 ? 2 : 4"
          :label="t('dns.upstream_edit.port')"
        >
          <n-input-number
            style="flex: 1"
            :min="1"
            :max="65535"
            :placeholder="t('dns.upstream_edit.port_placeholder')"
            v-model:value="rule.port"
          />
        </n-form-item-gi>

        <n-form-item-gi
          :span="4"
          v-if="rule.mode.t !== DnsUpstreamModeTsEnum.Plaintext"
          :label="t('dns.upstream_edit.domain')"
        >
          <n-input
            style="width: 230px"
            :placeholder="t('dns.upstream_edit.domain_placeholder')"
            v-model:value="rule.mode.domain"
          >
          </n-input>
        </n-form-item-gi>

        <n-form-item-gi
          :span="4"
          path="mode.http_endpoint"
          v-if="rule.mode.t === DnsUpstreamModeTsEnum.Https"
          :label="t('dns.upstream_edit.url')"
        >
          <n-input
            :placeholder="t('dns.upstream_edit.url_placeholder')"
            v-model:value="rule.mode.http_endpoint"
          >
          </n-input>
        </n-form-item-gi>

        <n-form-item-gi
          :span="8"
          :label="t('dns.upstream_edit.server_ips')"
          path="ips"
        >
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
        </n-form-item-gi>
      </n-grid>
    </n-form>
    <template #footer>
      <n-flex justify="space-between">
        <n-button @click="show = false">{{ t("common.cancel") }}</n-button>
        <n-button
          :loading="commit_spin"
          @click="saveRule"
          :disabled="!isModified"
        >
          {{ t("common.save") }}
        </n-button>
      </n-flex>
    </template>
  </n-modal>
  <n-modal
    v-model:show="showH3TestResult"
    preset="card"
    :title="t('dns.upstream_edit.h3_test_title')"
    style="width: 560px"
  >
    <n-alert :type="h3TestSucceeded ? 'success' : 'error'" :bordered="false">
      {{
        h3TestSucceeded
          ? t("dns.upstream_edit.h3_test_success")
          : t("dns.upstream_edit.h3_test_failed")
      }}
    </n-alert>
    <n-descriptions v-if="h3TestResult" :column="2" style="margin-top: 12px">
      <n-descriptions-item :label="t('dns.upstream_edit.test_domain')">
        {{ h3TestResult.query_domain }}
      </n-descriptions-item>
      <n-descriptions-item :label="t('dns.upstream_edit.reuse_average')">
        {{
          h3TestResult.reuse_average_ms == null
            ? "-"
            : `${h3TestResult.reuse_average_ms.toFixed(2)} ms`
        }}
      </n-descriptions-item>
    </n-descriptions>
    <n-table v-if="h3TestResult" size="small" style="margin-top: 12px">
      <thead>
        <tr>
          <th>#</th>
          <th>{{ t("dns.upstream_edit.latency") }}</th>
          <th>{{ t("dns.upstream_edit.result") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(attempt, index) in h3TestResult.attempts" :key="index">
          <td>{{ index + 1 }}</td>
          <td>{{ attempt.latency_ms.toFixed(2) }} ms</td>
          <td>{{ attempt.error || attempt.answers.join(", ") || "-" }}</td>
        </tr>
      </tbody>
    </n-table>
  </n-modal>
</template>
