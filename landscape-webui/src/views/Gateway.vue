<script lang="ts" setup>
import {
  get_gateway_config_edit,
  get_gateway_rules,
  get_gateway_status,
  restart_gateway,
  update_gateway_config,
  type GatewayStatus,
} from "@/api/gateway";
import {
  ServiceStatusType,
  get_service_status_label,
  get_service_status_tag_type,
} from "@/lib/services";
import type { HttpUpstreamRuleConfig } from "@landscape-router/types/api/schemas";
import { Add, Settings } from "@vicons/carbon";
import { useMessage } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { computed, h, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { usePageRequest } from "@/composables/usePageRequest";
import { useFrontEndStore } from "@/stores/front_end_config";
import GatewayRuleListRow from "@/components/gateway/GatewayRuleListRow.vue";

const {
  data: rules,
  error: rulesError,
  loading: rulesLoading,
  state: rulesState,
  refresh: refresh_rules,
} = usePageRequest(get_gateway_rules, {
  initialData: [] as HttpUpstreamRuleConfig[],
});
const status = ref<GatewayStatus>();
const gatewayEnabled = ref(false);
const httpPort = ref<number | null>(80);
const httpsPort = ref<number | null>(443);
const configHash = ref("");
const savingConfig = ref(false);
const restartingGateway = ref(false);
const show_edit_modal = ref(false);
const show_settings = ref(false);
let status_poll_timer: ReturnType<typeof setInterval> | null = null;
const { t } = useI18n();
const message = useMessage();
const frontEndStore = useFrontEndStore();

const columns = computed<DataTableColumns<HttpUpstreamRuleConfig>>(() =>
  [
    ["gateway.list_status_name", "name"],
    ["gateway.match_type", "type"],
    ["gateway.domains", "domains"],
    ["gateway.upstream", "upstream"],
    ["gateway.path_groups", "paths"],
    ["common.actions", "actions"],
  ].map(([title, cell]) => ({
    title: t(title),
    key: cell,
    render: (rule) =>
      h(GatewayRuleListRow, {
        rule,
        cell: cell as
          "name" | "type" | "domains" | "upstream" | "paths" | "actions",
        ...(cell === "actions" ? { onRefresh: refreshAll } : {}),
      }),
  })),
);

function rowKey(rule: HttpUpstreamRuleConfig) {
  return rule.id ?? rule.name;
}

async function refresh_config() {
  const { gateway, hash } = await get_gateway_config_edit();
  gatewayEnabled.value = gateway.enable ?? false;
  httpPort.value = gateway.http_port ?? 80;
  httpsPort.value = gateway.https_port ?? 443;
  configHash.value = hash;
}

async function refresh_status() {
  status.value = await get_gateway_status();
}

async function refreshAll() {
  await Promise.all([refresh_rules(), refresh_status(), refresh_config()]);
}

function isTransitionStatus(statusValue: GatewayStatus | undefined) {
  return (
    statusValue?.status.t === ServiceStatusType.Staring ||
    statusValue?.status.t === ServiceStatusType.Stopping
  );
}

function start_status_polling() {
  if (status_poll_timer) return;
  status_poll_timer = setInterval(() => {
    void refresh_status();
  }, 2000);
}

function stop_status_polling() {
  if (status_poll_timer) {
    clearInterval(status_poll_timer);
    status_poll_timer = null;
  }
}

function sync_status_polling(statusValue: GatewayStatus | undefined) {
  if (isTransitionStatus(statusValue)) {
    start_status_polling();
  } else {
    stop_status_polling();
  }
}

function gateway_status_label(statusValue: GatewayStatus | undefined) {
  return get_service_status_label(statusValue?.status, t);
}

function gateway_status_tag_type(statusValue: GatewayStatus | undefined) {
  return get_service_status_tag_type(statusValue?.status);
}

async function saveGatewayConfig(showSuccess = true) {
  await update_gateway_config({
    new_gateway: {
      enable: gatewayEnabled.value,
      http_port: httpPort.value ?? undefined,
      https_port: httpsPort.value ?? undefined,
    },
    expected_hash: configHash.value,
  });
  await refresh_config();
  if (showSuccess) {
    show_settings.value = false;
    message.success(t("config.save_success"));
  }
}

async function handleSaveGatewayConfig() {
  savingConfig.value = true;
  try {
    await saveGatewayConfig();
  } catch (e: any) {
    if (e?.error_id === "config.conflict" || e?.response?.status === 409) {
      message.error(t("config.conflict"));
    } else if (!e?.error_id) {
      message.error(t("config.save_failed") + ": " + e.message);
    }
  } finally {
    savingConfig.value = false;
  }
}

async function handleSaveAndRestartGateway() {
  restartingGateway.value = true;
  try {
    await saveGatewayConfig(false);
    status.value = await restart_gateway();
    show_settings.value = false;
    message.success(t("gateway.restart_success"));
  } catch (e: any) {
    if (e?.error_id === "config.conflict" || e?.response?.status === 409) {
      message.error(t("config.conflict"));
    } else if (!e?.error_id) {
      message.error(t("gateway.restart_failed") + ": " + e.message);
    }
  } finally {
    restartingGateway.value = false;
  }
}

onMounted(async () => {
  try {
    await refreshAll();
  } catch (e) {
    message.error(t("config.load_failed"));
    console.error(e);
  }
});

onUnmounted(() => {
  stop_status_polling();
});

watch(
  () => status.value,
  (value) => {
    sync_status_polling(value);
  },
  { immediate: true },
);
</script>
<template>
  <n-flex vertical class="standard-content-page">
    <n-flex
      align="center"
      justify="space-between"
      class="standard-list-toolbar"
    >
      <n-flex>
        <n-button
          type="primary"
          :disabled="status?.supported === false"
          @click="show_edit_modal = true"
          ><template #icon
            ><n-icon><Add /></n-icon></template
          >{{ t("common.create") }}</n-button
        >
      </n-flex>
      <n-flex v-if="status" align="center" :size="16">
        <n-tag :type="gateway_status_tag_type(status)" size="small">
          {{ gateway_status_label(status) }}
        </n-tag>
        <n-text depth="3" style="font-size: var(--app-font-size-label)">
          HTTP: {{ status.http_port }} | HTTPS: {{ status.https_port }} |
          {{ t("gateway.rule_count") }}: {{ status.rule_count }}
        </n-text>
        <n-popover
          v-model:show="show_settings"
          trigger="click"
          placement="bottom-end"
        >
          <template #trigger>
            <n-button quaternary circle size="small">
              <template #icon>
                <n-icon :component="Settings" />
              </template>
            </n-button>
          </template>

          <n-flex
            vertical
            size="small"
            style="padding: 4px; min-width: 320px; max-width: 360px"
          >
            <n-text strong>{{ t("gateway.runtime_title") }}</n-text>
            <n-form label-placement="top">
              <n-form-item :label="t('gateway.enabled')">
                <n-switch v-model:value="gatewayEnabled" />
                <template #feedback>
                  {{ t("gateway.enabled_desc") }}
                </template>
              </n-form-item>
              <n-grid x-gap="12" cols="2">
                <n-grid-item>
                  <n-form-item :label="t('gateway.http_port')">
                    <n-input-number
                      v-model:value="httpPort"
                      :min="1"
                      :max="65535"
                      style="width: 100%"
                    />
                    <template #feedback>
                      {{ t("gateway.http_port_desc") }}
                    </template>
                  </n-form-item>
                </n-grid-item>
                <n-grid-item>
                  <n-form-item :label="t('gateway.https_port')">
                    <n-input-number
                      v-model:value="httpsPort"
                      :min="1"
                      :max="65535"
                      style="width: 100%"
                    />
                    <template #feedback>
                      {{ t("gateway.https_port_desc") }}
                    </template>
                  </n-form-item>
                </n-grid-item>
              </n-grid>
            </n-form>

            <n-alert type="info" :show-icon="false">
              {{ t("gateway.restart_hint") }}
            </n-alert>

            <n-flex justify="end" :size="8">
              <n-button
                :loading="savingConfig"
                @click="handleSaveGatewayConfig"
              >
                {{ t("gateway.save_runtime") }}
              </n-button>
              <n-button
                type="primary"
                :disabled="status?.supported === false"
                :loading="restartingGateway"
                @click="handleSaveAndRestartGateway"
              >
                {{ t("gateway.save_and_restart") }}
              </n-button>
            </n-flex>
          </n-flex>
        </n-popover>
      </n-flex>
    </n-flex>
    <StandardDataTable
      v-if="frontEndStore.display_style === 'list'"
      :columns="columns"
      :data="rules"
      :loading="rulesLoading"
      :error="rulesError"
      :empty-text="t('gateway.no_rules')"
      :row-key="rowKey"
      @retry="refreshAll"
    />
    <StandardPageState
      v-else
      :state="rulesState"
      :empty-text="t('gateway.no_rules')"
      @retry="refreshAll"
    >
      <n-grid x-gap="12" y-gap="10" cols="1 600:2 1200:3 1600:3">
        <n-grid-item v-for="rule in rules" :key="rule.id">
          <GatewayRuleCard @refresh="refreshAll" :rule="rule" />
        </n-grid-item>
      </n-grid>
    </StandardPageState>

    <GatewayRuleEditModal
      @refresh="refreshAll"
      v-model:show="show_edit_modal"
    />
  </n-flex>
</template>
