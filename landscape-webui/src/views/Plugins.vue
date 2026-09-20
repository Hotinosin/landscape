<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Launch, Renew } from "@vicons/carbon";
import type { DataTableColumns, UploadCustomRequestOptions } from "naive-ui";
import { NButton, NIcon, NSpace, useMessage } from "naive-ui";
import { useI18n } from "vue-i18n";
import {
  importPlugin,
  listPlugins,
  pluginConfig,
  pluginLogs,
  removePlugin,
  startPlugin,
  stopPlugin,
  savePluginConfig,
  type PluginInfo,
} from "@/api/plugins";
import { syncPluginSessionCookie } from "@/lib/common";
import { usePageRequest } from "@/composables/usePageRequest";
import DeleteButton from "@/components/common/DeleteButton.vue";

const { t } = useI18n();
const message = useMessage();
const activeTab = ref("manage");
const actionLoading = ref<Record<string, boolean>>({});
const logs = ref("");
const showLogs = ref(false);
const logsPlugin = ref<PluginInfo>();
const logsLoading = ref(false);
const autoRefreshLogs = ref(false);
let logsTimer: ReturnType<typeof setInterval> | undefined;

const config = ref("");
const configPlugin = ref<PluginInfo>();
const saveConfigLoading = ref(false);
const configError = ref("");
const activePlugin = computed(() =>
  plugins.value.find((plugin) => plugin.id === activeTab.value),
);

const columns = computed<DataTableColumns<PluginInfo>>(() => [
  { title: t("plugin.name"), key: "name" },
  { title: t("plugin.interface"), key: "host_interface" },
  { title: t("plugin.version"), key: "version" },
  { title: t("plugin.trust"), key: "trust" },
  {
    title: t("plugin.service"),
    key: "service_running",
    render: (row) =>
      h(
        "span",
        { class: row.service_running ? "status-ready" : "status-offline" },
        row.service_running ? t("plugin.running") : t("plugin.stopped"),
      ),
  },
  {
    title: t("plugin.data_plane"),
    key: "interface_ready",
    render: (row) =>
      h(
        "span",
        { class: row.interface_ready ? "status-ready" : "status-offline" },
        row.interface_ready ? t("plugin.ready") : t("plugin.offline"),
      ),
  },
  {
    title: t("plugin.tproxy"),
    key: "tproxy_ready",
    render: (row) =>
      h(
        "span",
        { class: row.tproxy_ready ? "status-ready" : "status-offline" },
        row.tproxy_ready ? t("plugin.ready") : t("plugin.offline"),
      ),
  },
  {
    title: t("plugin.control_plane"),
    key: "controller_ready",
    render: (row) =>
      h(
        "span",
        { class: row.controller_ready ? "status-ready" : "status-offline" },
        row.controller_ready ? t("plugin.ready") : t("plugin.offline"),
      ),
  },
  {
    title: t("common.actions"),
    key: "actions",
    render: (row) =>
      h(NSpace, { size: "small", wrap: false }, () => [
        h(
          NButton,
          {
            size: "small",
            secondary: true,
            onClick: () => openConfig(row),
          },
          { default: () => t("plugin.config") },
        ),
        h(
          NButton,
          {
            size: "small",
            secondary: true,
            loading: !!actionLoading.value[row.id],
            disabled: !!actionLoading.value[row.id],
            onClick: async () => {
              actionLoading.value[row.id] = true;
              try {
                if (row.service_running) await stopPlugin(row.id);
                else await startPlugin(row.id);
                await refresh();
              } catch (e: any) {
                message.error(
                  e.response?.data?.message || e.message || t("common.error"),
                );
              } finally {
                actionLoading.value[row.id] = false;
              }
            },
          },
          {
            default: () =>
              row.service_running ? t("plugin.stop") : t("plugin.start"),
          },
        ),
        h(
          NButton,
          {
            size: "small",
            secondary: true,
            onClick: () => openLogs(row),
          },
          { default: () => t("plugin.logs") },
        ),
        h(
          NButton,
          {
            size: "small",
            type: "primary",
            secondary: true,
            disabled: !row.controller_ready,
            onClick: () => openPlugin(row),
          },
          {
            icon: () => h(NIcon, null, { default: () => h(Launch) }),
            default: () => t("plugin.open_panel"),
          },
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

function openPlugin(plugin: PluginInfo) {
  activeTab.value = plugin.id;
}

function syncPluginCookie() {
  syncPluginSessionCookie();
}

async function deletePlugin(plugin: PluginInfo) {
  await removePlugin(plugin.id);
  if (activeTab.value === plugin.id) activeTab.value = "manage";
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

async function openConfig(row: PluginInfo) {
  configError.value = "";
  try {
    config.value = await pluginConfig(row.id);
    configPlugin.value = row;
  } catch (e: any) {
    message.error(e?.message || t("common.error"));
  }
}

async function saveConfig() {
  if (!configPlugin.value) return;
  saveConfigLoading.value = true;
  configError.value = "";
  try {
    await savePluginConfig(configPlugin.value.id, config.value);
    configPlugin.value = undefined;
    await refresh();
    message.success(t("plugin.config_saved"));
  } catch (e: any) {
    const errMsg = e.response?.data?.message || e.message || t("common.error");
    configError.value = errMsg;
    message.error(errMsg);
  } finally {
    saveConfigLoading.value = false;
  }
}

function panelUrl(plugin: PluginInfo) {
  const proxyPath = `/api/plugins/${encodeURIComponent(plugin.id)}/ui`;
  const uiPath = plugin.ui_path.replace(/^\//, "");
  const setup = new URLSearchParams({
    hostname: window.location.hostname,
    port: window.location.port,
    secondaryPath: proxyPath,
    type: "clash",
    disableUpgradeCore: "1",
    disableTunMode: "1",
  });
  return `${proxyPath}/${uiPath}#/setup?${setup}`;
}

onMounted(() => {
  syncPluginCookie();
  void refresh();
});
</script>

<template>
  <n-flex vertical :wrap="false" class="plugin-tabs">
    <n-tabs
      v-model:value="activeTab"
      type="segment"
      size="small"
      style="width: fit-content; min-width: 240px; max-width: 100%"
    >
      <n-tab name="manage">
        <n-flex align="center" :size="6" :wrap="false">
          {{ t("plugin.manage") }}
          <n-tag size="tiny" :bordered="false">dev</n-tag>
        </n-flex>
      </n-tab>
      <n-tab
        v-for="plugin in plugins.filter((item) => item.controller_ready)"
        :key="plugin.id"
        :name="plugin.id"
      >
        {{ plugin.name }}
      </n-tab>
    </n-tabs>

    <template v-if="activeTab === 'manage'">
      <n-flex vertical class="standard-content-page">
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
      </n-flex>
    </template>
    <iframe
      v-else-if="activePlugin"
      class="plugin-panel-frame"
      :src="panelUrl(activePlugin)"
      :title="activePlugin.name"
    />
    <n-modal v-model:show="showLogs">
      <n-card :title="t('plugin.logs')" style="width: min(900px, 90vw)">
        <template #header-extra>
          <n-flex align="center" :size="12">
            <n-flex align="center" :size="4">
              <n-switch v-model:value="autoRefreshLogs" size="small" />
              <span style="font-size: var(--app-font-size-caption)">{{ t("plugin.auto_refresh") }}</span>
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
    <n-modal :show="!!configPlugin" @update:show="configPlugin = undefined">
      <n-card :title="t('plugin.config')" style="width: min(900px, 90vw)">
        <n-alert
          v-if="configError"
          type="error"
          style="margin-bottom: 12px"
          :show-icon="false"
        >
          {{ configError }}
        </n-alert>
        <n-input
          v-model:value="config"
          type="textarea"
          :autosize="{ minRows: 14, maxRows: 28 }"
        />
        <template #footer>
          <n-button
            type="primary"
            :loading="saveConfigLoading"
            @click="saveConfig"
          >
            {{ t("common.save") }}
          </n-button>
        </template>
      </n-card>
    </n-modal>
  </n-flex>
</template>

<style scoped>
.status-ready {
  color: var(--app-status-success-color);
}
.status-offline {
  color: var(--app-text-muted-color);
}
.plugin-upload {
  width: auto;
}
.plugin-tabs {
  width: 100%;
  height: 100%;
}
.plugin-panel-frame {
  flex: 1;
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--app-surface-color);
}
.plugin-logs {
  max-height: 70vh;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
