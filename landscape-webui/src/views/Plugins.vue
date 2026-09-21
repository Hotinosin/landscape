<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Renew } from "@vicons/carbon";
import type { DataTableColumns, UploadCustomRequestOptions } from "naive-ui";
import {
  NButton,
  NDialogProvider,
  NSelect,
  NSpace,
  useDialog,
  useMessage,
} from "naive-ui";
import { useI18n } from "vue-i18n";
import {
  importPlugin,
  listPlugins,
  pluginConfig,
  pluginLogs,
  removePlugin,
  restartPlugin,
  startPlugin,
  stopPlugin,
  savePluginConfig,
  type PluginInfo,
} from "@/api/plugins";
import { syncPluginSessionCookie } from "@/lib/common";
import { usePageRequest } from "@/composables/usePageRequest";
import DeleteButton from "@/components/common/DeleteButton.vue";
import EditButton from "@/components/common/EditButton.vue";
import StandardServiceStatusTag from "@/components/common/StandardServiceStatusTag.vue";

const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();

const actionLoading = ref<Record<string, boolean>>({});
const selectedActions = ref<Record<string, string>>({});

// Logs Modal
const logs = ref("");
const showLogs = ref(false);
const logsPlugin = ref<PluginInfo>();
const logsLoading = ref(false);
const autoRefreshLogs = ref(false);
let logsTimer: ReturnType<typeof setInterval> | undefined;

// Config Modal
const configPlugin = ref<PluginInfo>();
const activeConfigTab = ref<"override" | "base" | "effective">("override");
const baseConfigText = ref("");
const overrideConfigText = ref("");
const effectiveConfigText = ref("");
const configLoading = ref(false);
const saveBaseLoading = ref(false);
const saveOverrideLoading = ref(false);
const refreshEffectiveLoading = ref(false);
const configError = ref("");
const validateConfigOnSave = ref(true);

const formOverride = ref({
  mode: "rule",
  allowLan: true,
  tproxyPort: 12345,
  controllerPort: 9090,
  externalUi: "",
});

const modeOptions = computed(() => [
  { label: t("plugin.mode_rule"), value: "rule" },
  { label: t("plugin.mode_global"), value: "global" },
  { label: t("plugin.mode_direct"), value: "direct" },
]);

function getActionOptions(row: PluginInfo) {
  if (row.service_running) {
    return [
      { label: t("plugin.restart"), value: "restart" },
      { label: t("plugin.stop"), value: "stop" },
      { label: t("plugin.force_stop"), value: "force_stop" },
    ];
  }
  return [{ label: t("plugin.start"), value: "start" }];
}

function getSelectedAction(row: PluginInfo): string {
  if (!selectedActions.value[row.id]) {
    selectedActions.value[row.id] = row.service_running ? "restart" : "start";
  }
  return selectedActions.value[row.id];
}

function handleExecuteAction(row: PluginInfo) {
  const action = getSelectedAction(row);
  const actionLabels: Record<string, string> = {
    start: t("plugin.start"),
    restart: t("plugin.restart"),
    stop: t("plugin.stop"),
    force_stop: t("plugin.force_stop"),
  };
  const label = actionLabels[action] || action;

  dialog.warning({
    title: t("plugin.confirm_action_title"),
    content: t("plugin.confirm_action_content", {
      name: row.name,
      action: label,
    }),
    positiveText: t("common.confirm"),
    negativeText: t("common.cancel"),
    onPositiveClick: async () => {
      actionLoading.value[row.id] = true;
      try {
        if (action === "start") {
          await startPlugin(row.id);
        } else if (action === "restart") {
          await restartPlugin(row.id);
          message.success(t("plugin.restart_success"));
        } else if (action === "stop") {
          await stopPlugin(row.id, false);
        } else if (action === "force_stop") {
          await stopPlugin(row.id, true);
        }
        await refresh();
      } catch (e: any) {
        message.error(
          e.response?.data?.message || e.message || t("common.error"),
        );
      } finally {
        actionLoading.value[row.id] = false;
      }
    },
  });
}

const columns = computed<DataTableColumns<PluginInfo>>(() => [
  { title: t("plugin.name"), key: "name", width: 110 },
  { title: t("plugin.interface"), key: "host_interface" },
  { title: t("plugin.version"), key: "version" },
  {
    title: t("plugin.data_plane"),
    key: "interface_ready",
    render: (row) =>
      h(StandardServiceStatusTag, {
        type: row.interface_ready ? "success" : "default",
        label: row.interface_ready ? t("plugin.ready") : t("plugin.offline"),
      }),
  },
  {
    title: t("plugin.tproxy"),
    key: "tproxy_ready",
    render: (row) =>
      h(StandardServiceStatusTag, {
        type: row.tproxy_ready ? "success" : "default",
        label: row.tproxy_ready ? t("plugin.ready") : t("plugin.offline"),
      }),
  },
  {
    title: t("plugin.control_plane"),
    key: "controller_ready",
    render: (row) => {
      if (row.controller_ready) {
        return h(
          NButton,
          {
            size: "small",
            type: "primary",
            onClick: () => window.open(panelUrl(row), "_blank"),
          },
          {
            default: () => t("plugin.open_panel"),
          },
        );
      }
      return h(StandardServiceStatusTag, {
        type: "default",
        label: t("plugin.controller_not_ready"),
      });
    },
  },
  {
    title: t("plugin.service"),
    key: "service_running",
    render: (row) =>
      h(NSpace, { align: "center", size: "small", wrap: false }, () => [
        h(StandardServiceStatusTag, {
          status: { t: row.service_running ? "running" : "stop" },
        }),
        h(NSelect, {
          size: "small",
          style: { width: "105px" },
          value: getSelectedAction(row),
          options: getActionOptions(row),
          onUpdateValue: (val: string) => {
            selectedActions.value[row.id] = val;
          },
        }),
        h(
          NButton,
          {
            size: "small",
            type: "primary",
            loading: !!actionLoading.value[row.id],
            onClick: () => handleExecuteAction(row),
          },
          { default: () => t("plugin.execute") },
        ),
      ]),
  },
  {
    title: t("common.actions"),
    key: "actions",
    render: (row) =>
      h(NSpace, { size: "small", wrap: false }, () => [
        h(EditButton, {
          label: t("plugin.config"),
          onClick: () => openConfig(row),
        }),
        h(
          NButton,
          {
            size: "small",
            secondary: true,
            onClick: () => openLogs(row),
          },
          { default: () => t("plugin.logs") },
        ),
        h(DeleteButton, {
          item: row.name,
          onConfirm: () => deletePlugin(row),
        }),
      ]),
  },
]);

const listRequest = usePageRequest(listPlugins, {
  initialData: [] as PluginInfo[],
});
const {
  data: plugins,
  loading,
  error,
  hasSucceeded,
  lastSuccessAt,
  execute: refresh,
} = listRequest;

async function upload({ file, onFinish, onError }: UploadCustomRequestOptions) {
  try {
    if (!file.file) throw new Error("missing file");
    await importPlugin(file.file);
    await refresh();
    message.success(t("plugin.import_success"));
    onFinish();
  } catch {
    onError();
  }
}

function syncPluginCookie() {
  syncPluginSessionCookie();
}

async function deletePlugin(plugin: PluginInfo) {
  await removePlugin(plugin.id);
  await refresh();
}

async function fetchLogs() {
  if (!logsPlugin.value) return;
  logsLoading.value = true;
  try {
    logs.value = await pluginLogs(logsPlugin.value.id);
  } catch (e: any) {
    message.error(e?.message || t("common.error"));
  } finally {
    logsLoading.value = false;
  }
}

function openLogs(row: PluginInfo) {
  logsPlugin.value = row;
  showLogs.value = true;
  void fetchLogs();
}

watch(autoRefreshLogs, (enabled) => {
  if (logsTimer) clearInterval(logsTimer);
  if (enabled && showLogs.value) {
    logsTimer = setInterval(fetchLogs, 2500);
  }
});

watch(showLogs, (shown) => {
  if (!shown) {
    autoRefreshLogs.value = false;
    if (logsTimer) clearInterval(logsTimer);
    logsPlugin.value = undefined;
  }
});

onBeforeUnmount(() => {
  if (logsTimer) clearInterval(logsTimer);
});

function parseOverrideForm(yamlText: string) {
  const modeMatch = yamlText.match(/^mode:\s*["']?(\w+)["']?/m);
  if (modeMatch && ["rule", "global", "direct"].includes(modeMatch[1])) {
    formOverride.value.mode = modeMatch[1];
  }

  const lanMatch = yamlText.match(/^allow-lan:\s*(true|false)/m);
  if (lanMatch) {
    formOverride.value.allowLan = lanMatch[1] === "true";
  }

  const tpMatch = yamlText.match(/^tproxy-port:\s*(\d+)/m);
  if (tpMatch) {
    formOverride.value.tproxyPort = parseInt(tpMatch[1], 10);
  }

  const ctrlMatch = yamlText.match(
    /^external-controller:\s*["']?[^:\s]*:(\d+)["']?/m,
  );
  if (ctrlMatch) {
    formOverride.value.controllerPort = parseInt(ctrlMatch[1], 10);
  }

  const uiMatch = yamlText.match(/^external-ui:\s*["']?(.*?)["']?$/m);
  if (uiMatch) {
    formOverride.value.externalUi = uiMatch[1].trim();
  } else {
    formOverride.value.externalUi = "";
  }
}

function syncFormToYaml() {
  let text = overrideConfigText.value || "";

  if (/^mode:\s*.*$/m.test(text)) {
    text = text.replace(/^mode:\s*.*$/m, `mode: ${formOverride.value.mode}`);
  } else {
    text = `mode: ${formOverride.value.mode}\n` + text;
  }

  if (/^allow-lan:\s*.*$/m.test(text)) {
    text = text.replace(
      /^allow-lan:\s*.*$/m,
      `allow-lan: ${formOverride.value.allowLan}`,
    );
  } else {
    text = `allow-lan: ${formOverride.value.allowLan}\n` + text;
  }

  if (/^tproxy-port:\s*.*$/m.test(text)) {
    text = text.replace(
      /^tproxy-port:\s*.*$/m,
      `tproxy-port: ${formOverride.value.tproxyPort}`,
    );
  } else {
    text = `tproxy-port: ${formOverride.value.tproxyPort}\n` + text;
  }

  if (/^external-controller:\s*.*$/m.test(text)) {
    text = text.replace(
      /^external-controller:\s*.*$/m,
      `external-controller: 0.0.0.0:${formOverride.value.controllerPort}`,
    );
  } else {
    text =
      `external-controller: 0.0.0.0:${formOverride.value.controllerPort}\n` +
      text;
  }

  const extUiVal = formOverride.value.externalUi.trim();
  const extUiLine = extUiVal ? `external-ui: "${extUiVal}"` : 'external-ui: ""';
  if (/^external-ui:\s*.*$/m.test(text)) {
    text = text.replace(/^external-ui:\s*.*$/m, extUiLine);
  } else {
    text = `${extUiLine}\n` + text;
  }

  overrideConfigText.value = text;
}

function onOverrideYamlInput() {
  parseOverrideForm(overrideConfigText.value);
}

async function openConfig(row: PluginInfo) {
  configPlugin.value = row;
  activeConfigTab.value = "override";
  configError.value = "";
  configLoading.value = true;
  try {
    const [base, ovr, eff] = await Promise.all([
      pluginConfig(row.id, "base"),
      pluginConfig(row.id, "override"),
      pluginConfig(row.id, "effective"),
    ]);
    baseConfigText.value = base;
    overrideConfigText.value = ovr;
    effectiveConfigText.value = eff;
    parseOverrideForm(ovr);
  } catch (e: any) {
    message.error(e?.message || t("common.error"));
  } finally {
    configLoading.value = false;
  }
}

function closeConfigModal() {
  configPlugin.value = undefined;
  configError.value = "";
}

async function saveOverride() {
  if (!configPlugin.value) return;
  saveOverrideLoading.value = true;
  configError.value = "";
  try {
    syncFormToYaml();
    await savePluginConfig(
      configPlugin.value.id,
      overrideConfigText.value,
      "override",
      validateConfigOnSave.value,
    );
    message.success(t("plugin.config_saved"));
    effectiveConfigText.value = await pluginConfig(
      configPlugin.value.id,
      "effective",
    );
    await refresh();
  } catch (e: any) {
    const errMsg = e.response?.data?.message || e.message || t("common.error");
    configError.value = errMsg;
    message.error(errMsg);
  } finally {
    saveOverrideLoading.value = false;
  }
}

async function saveBase() {
  if (!configPlugin.value) return;
  saveBaseLoading.value = true;
  configError.value = "";
  try {
    await savePluginConfig(
      configPlugin.value.id,
      baseConfigText.value,
      "base",
      validateConfigOnSave.value,
    );
    message.success(t("plugin.config_saved"));
    effectiveConfigText.value = await pluginConfig(
      configPlugin.value.id,
      "effective",
    );
    await refresh();
  } catch (e: any) {
    const errMsg = e.response?.data?.message || e.message || t("common.error");
    configError.value = errMsg;
    message.error(errMsg);
  } finally {
    saveBaseLoading.value = false;
  }
}

async function fetchEffectiveConfig() {
  if (!configPlugin.value) return;
  refreshEffectiveLoading.value = true;
  try {
    effectiveConfigText.value = await pluginConfig(
      configPlugin.value.id,
      "effective",
    );
  } catch (e: any) {
    message.error(e?.message || t("common.error"));
  } finally {
    refreshEffectiveLoading.value = false;
  }
}

function panelUrl(plugin: PluginInfo) {
  const proxyPath = `/api/plugins/${encodeURIComponent(plugin.id)}/ui`;
  let sub = (plugin.ui_path ?? "").replace(/^\/+|\/+$/g, "");
  if (sub === "ui") {
    sub = "";
  } else if (sub.startsWith("ui/")) {
    sub = sub.slice(3);
  }
  if (!sub && plugin.id === "mihomo") {
    sub = "zashboard";
  }
  const prefix = sub ? `${proxyPath}/${sub}/` : `${proxyPath}/`;
  const setup = new URLSearchParams({
    hostname: window.location.hostname,
    port:
      window.location.port ||
      (window.location.protocol === "https:" ? "443" : "80"),
    protocol: window.location.protocol.replace(":", ""),
    secondaryPath: proxyPath,
    type: "clash",
    disableUpgradeCore: "1",
    disableTunMode: "1",
  });
  return `${prefix}#/setup?${setup}`;
}

onMounted(() => {
  syncPluginCookie();
  void refresh();
});
</script>

<template>
  <n-flex vertical class="standard-content-page plugin-page-container">
    <n-flex
      align="center"
      justify="space-between"
      :wrap="false"
      class="standard-list-toolbar"
    >
      <n-upload
        class="plugin-upload"
        accept="application/gzip,application/x-gzip,.tar.gz,.tgz"
        :show-file-list="false"
        :custom-request="upload"
      >
        <n-button type="primary">
          {{ t("plugin.import") }}
        </n-button>
      </n-upload>
      <n-button :loading="loading" secondary @click="refresh">
        <template #icon
          ><n-icon><Renew /></n-icon
        ></template>
        {{ t("common.refresh") }}
      </n-button>
    </n-flex>

    <StandardRequestStatus
      :has-succeeded="hasSucceeded"
      :loading="loading"
      :error="error"
      :last-success-at="lastSuccessAt"
      @retry="refresh"
    >
      <StandardDataTable
        :columns="columns"
        :data="plugins"
        :loading="loading"
        :row-key="(row: PluginInfo) => row.id"
      />
    </StandardRequestStatus>

    <!-- Logs Modal -->
    <n-modal v-model:show="showLogs">
      <n-card
        :title="t('plugin.logs')"
        style="width: min(900px, calc(100vw - 32px))"
      >
        <template #header-extra>
          <n-flex align="center" :size="12">
            <n-flex align="center" :size="4">
              <n-switch v-model:value="autoRefreshLogs" size="small" />
              <span style="font-size: var(--app-font-size-caption)">{{
                t("plugin.auto_refresh")
              }}</span>
            </n-flex>
            <n-button
              size="tiny"
              secondary
              :loading="logsLoading"
              @click="fetchLogs"
            >
              <template #icon
                ><n-icon><Renew /></n-icon
              ></template>
              {{ t("common.refresh") }}
            </n-button>
          </n-flex>
        </template>
        <pre class="plugin-logs">{{ logs }}</pre>
      </n-card>
    </n-modal>

    <!-- Config Modal -->
    <n-modal
      :show="!!configPlugin"
      :mask-closable="false"
      @update:show="closeConfigModal"
    >
      <n-card
        class="plugin-config-modal"
        :title="
          t('plugin.config') +
          (configPlugin ? ` - ${configPlugin.name}` : '')
        "
        style="width: min(900px, calc(100vw - 32px))"
        content-style="min-height: 0; display: flex; flex-direction: column; flex: 1; overflow: hidden"
        closable
        @close="closeConfigModal"
      >
        <n-spin :show="configLoading">
          <n-alert
            v-if="configError"
            type="error"
            style="margin-bottom: var(--app-space-sm)"
            :show-icon="false"
          >
            {{ configError }}
          </n-alert>

          <n-tabs
            v-model:value="activeConfigTab"
            type="line"
            :animated="false"
            pane-class="plugin-config-tab-pane"
          >
            <!-- Tab 1: 覆写配置 (Override / Mixin) -->
            <n-tab-pane name="override" :tab="t('plugin.tab_override')">
              <n-flex vertical :size="12" class="config-tab-pane">
                <n-text depth="3">
                  {{ t("plugin.override_desc") }}
                </n-text>

                <n-card size="small" embedded>
                  <n-grid :cols="24" :x-gap="16" :y-gap="12">
                    <n-grid-item :span="12">
                      <n-form-item
                        :label="t('plugin.mode')"
                        :show-feedback="false"
                      >
                        <n-select
                          v-model:value="formOverride.mode"
                          :options="modeOptions"
                          @update:value="syncFormToYaml"
                        />
                      </n-form-item>
                    </n-grid-item>

                    <n-grid-item :span="12">
                      <n-form-item
                        :label="t('plugin.allow_lan')"
                        :show-feedback="false"
                      >
                        <n-switch
                          v-model:value="formOverride.allowLan"
                          @update:value="syncFormToYaml"
                        />
                      </n-form-item>
                    </n-grid-item>

                    <n-grid-item :span="12">
                      <n-form-item
                        :label="t('plugin.tproxy_port')"
                        :show-feedback="false"
                      >
                        <n-input-number
                          v-model:value="formOverride.tproxyPort"
                          disabled
                          :min="1"
                          :max="65535"
                          style="width: 100%"
                          @update:value="syncFormToYaml"
                        />
                      </n-form-item>
                    </n-grid-item>

                    <n-grid-item :span="12">
                      <n-form-item
                        :label="t('plugin.controller_port')"
                        :show-feedback="false"
                      >
                        <n-input-number
                          v-model:value="formOverride.controllerPort"
                          :min="1"
                          :max="65535"
                          style="width: 100%"
                          @update:value="syncFormToYaml"
                        />
                      </n-form-item>
                    </n-grid-item>

                    <n-grid-item :span="24">
                      <n-form-item
                        :label="t('plugin.external_ui')"
                        :show-feedback="false"
                      >
                        <n-input
                          v-model:value="formOverride.externalUi"
                          placeholder=""
                          @input="syncFormToYaml"
                        />
                      </n-form-item>
                    </n-grid-item>

                    <n-grid-item :span="24">
                      <n-alert type="info" :show-icon="true">
                        {{
                          t("plugin.dns_protected_hint", {
                            dns: "100.64.127.1",
                          })
                        }}
                      </n-alert>
                    </n-grid-item>
                  </n-grid>
                </n-card>

                <n-flex vertical :size="4" class="config-yaml-section">
                  <n-text strong>{{ t("plugin.advanced_mixin_yaml") }}</n-text>
                  <n-input
                    v-model:value="overrideConfigText"
                    type="textarea"
                    class="config-yaml-input"
                    placeholder="# Mixin YAML"
                    @input="onOverrideYamlInput"
                  />
                </n-flex>

                <n-flex
                  justify="space-between"
                  align="center"
                  class="config-footer-row"
                >
                  <n-flex align="center" :size="8">
                    <n-switch
                      v-model:value="validateConfigOnSave"
                      size="small"
                    />
                    <n-text
                      depth="3"
                      style="font-size: var(--app-font-size-caption)"
                    >
                      {{ t("plugin.check_config_on_save") }}
                    </n-text>
                  </n-flex>
                  <n-button
                    type="primary"
                    :loading="saveOverrideLoading"
                    @click="saveOverride"
                  >
                    {{ t("common.save") }}
                  </n-button>
                </n-flex>
              </n-flex>
            </n-tab-pane>

            <!-- Tab 2: 用户配置 (User Config) -->
            <n-tab-pane name="base" :tab="t('plugin.tab_user_config')">
              <n-flex vertical :size="12" class="config-tab-pane">
                <n-text depth="3">
                  {{ t("plugin.user_config_desc") }}
                </n-text>
                <n-input
                  v-model:value="baseConfigText"
                  type="textarea"
                  class="config-yaml-input config-yaml-input--full"
                  placeholder="# proxies, proxy-groups, rules..."
                />
                <n-flex
                  justify="space-between"
                  align="center"
                  class="config-footer-row"
                >
                  <n-flex align="center" :size="8">
                    <n-switch
                      v-model:value="validateConfigOnSave"
                      size="small"
                    />
                    <n-text
                      depth="3"
                      style="font-size: var(--app-font-size-caption)"
                    >
                      {{ t("plugin.check_config_on_save") }}
                    </n-text>
                  </n-flex>
                  <n-button
                    type="primary"
                    :loading="saveBaseLoading"
                    @click="saveBase"
                  >
                    {{ t("common.save") }}
                  </n-button>
                </n-flex>
              </n-flex>
            </n-tab-pane>

            <!-- Tab 3: 最终生效配置 (Effective Config) -->
            <n-tab-pane
              name="effective"
              :tab="t('plugin.tab_effective_config')"
            >
              <n-flex vertical :size="12" class="config-tab-pane">
                <n-flex justify="space-between" align="center">
                  <n-text depth="3">
                    {{ t("plugin.effective_config_desc") }}
                  </n-text>
                  <n-button
                    size="small"
                    secondary
                    :loading="refreshEffectiveLoading"
                    @click="fetchEffectiveConfig"
                  >
                    <template #icon
                      ><n-icon><Renew /></n-icon
                    ></template>
                    {{ t("plugin.refresh_effective") }}
                  </n-button>
                </n-flex>
                <pre class="config-effective-preview">{{
                  effectiveConfigText
                }}</pre>
              </n-flex>
            </n-tab-pane>
          </n-tabs>
        </n-spin>
      </n-card>
    </n-modal>
  </n-flex>
</template>

<style scoped>
.plugin-upload {
  width: auto;
}
.plugin-page-container {
  width: 100%;
}
.plugin-logs {
  box-sizing: border-box;
  margin: 0;
  padding: var(--app-space-sm);
  border-radius: var(--app-radius-control);
  color: var(--app-text-inverse-color);
  background: var(--app-terminal-background-color);
  font-family: var(--font-mono);
  font-size: var(--app-font-size-caption);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 70vh;
  overflow: auto;
}
.plugin-config-modal {
  display: flex;
  flex-direction: column;
  height: min(800px, calc(100vh - 32px));
  max-height: calc(100vh - 32px);
  overflow: visible;
}
.plugin-config-modal :deep(> .n-card-header) {
  flex: none;
}
.plugin-config-modal :deep(> .n-card-content),
.plugin-config-modal :deep(> .n-card__content) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.plugin-config-modal :deep(.n-spin-container),
.plugin-config-modal :deep(.n-spin-content) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
}
.plugin-config-modal :deep(.n-tabs) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
}
.plugin-config-modal :deep(.n-tabs-nav) {
  flex: none;
}
.plugin-config-modal :deep(.n-tabs-pane-wrapper) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
}
.plugin-config-modal :deep(.plugin-config-tab-pane) {
  flex: 1;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
}
.config-effective-preview {
  box-sizing: border-box;
  margin: 0;
  padding: var(--app-space-sm);
  border-radius: var(--app-radius-control);
  color: var(--app-text-inverse-color);
  background: var(--app-terminal-background-color);
  font-family: var(--font-mono);
  font-size: var(--app-font-size-caption);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  flex: 1;
  min-height: 240px;
  max-height: none;
  overflow: auto;
}
.config-tab-pane {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  box-sizing: border-box;
  padding-top: var(--app-space-sm);
  padding-bottom: var(--app-space-sm);
}
.config-yaml-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 180px;
}
.config-yaml-input {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 160px;
}
.config-yaml-input--full {
  min-height: 320px;
}
.config-yaml-input :deep(.n-input-wrapper) {
  height: 100%;
  padding-top: 8px;
  padding-bottom: 8px;
}
.config-yaml-input :deep(.n-input__textarea) {
  height: 100%;
}
.config-yaml-input :deep(.n-input__textarea-el) {
  height: 100% !important;
  resize: none;
  font-family: var(--font-mono);
  font-size: var(--app-font-size-caption);
  line-height: 1.5;
}
.config-footer-row {
  flex: none;
  margin-top: auto;
  padding-top: var(--app-space-xs);
}
</style>
