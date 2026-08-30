<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import { Add, Launch, TrashCan } from "@vicons/carbon";
import type { DataTableColumns, UploadCustomRequestOptions } from "naive-ui";
import { useMessage } from "naive-ui";
import { useI18n } from "vue-i18n";
import { importPlugin, listPlugins, removePlugin, type PluginInfo } from "@/api/plugins";
import { syncPluginSessionCookie } from "@/lib/common";

const { t } = useI18n();
const message = useMessage();
const plugins = ref<PluginInfo[]>([]);
const loading = ref(false);
const activeTab = ref("manage");

const columns = computed<DataTableColumns<PluginInfo>>(() => [
  { title: t("plugin.name"), key: "name" },
  { title: t("plugin.interface"), key: "host_interface" },
  {
    title: t("plugin.data_plane"),
    key: "interface_ready",
    render: (row) => h("span", { class: row.interface_ready ? "status-ready" : "status-offline" },
      row.interface_ready ? t("plugin.ready") : t("plugin.offline")),
  },
  {
    title: t("plugin.control_plane"),
    key: "controller_ready",
    render: (row) => h("span", { class: row.controller_ready ? "status-ready" : "status-offline" },
      row.controller_ready ? t("plugin.ready") : t("plugin.offline")),
  },
  {
    title: t("common.actions"),
    key: "actions",
    render: (row) => h("div", { class: "plugin-actions" }, [
      h("button", { class: "plugin-action", disabled: !row.controller_ready, onClick: () => openPlugin(row) }, [
        h(Launch), t("plugin.open_panel"),
      ]),
      h("button", { class: "plugin-action plugin-action--danger", onClick: () => deletePlugin(row) }, [
        h(TrashCan), t("common.delete"),
      ]),
    ]),
  },
]);

async function refresh() {
  loading.value = true;
  try { plugins.value = await listPlugins(); } finally { loading.value = false; }
}

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
  <n-tabs v-model:value="activeTab" type="line" animated class="plugin-tabs">
    <n-tab-pane name="manage" :tab="t('plugin.manage')">
      <n-flex vertical class="standard-content-page">
        <n-flex align="center" justify="space-between" class="standard-list-toolbar">
          <n-upload accept="application/json,.json" :show-file-list="false" :custom-request="upload">
            <n-button type="primary">
              <template #icon><n-icon><Add /></n-icon></template>
              {{ t("plugin.import") }}
            </n-button>
          </n-upload>
          <n-button @click="refresh">{{ t("common.refresh") }}</n-button>
        </n-flex>

        <StandardDataTable
          :columns="columns"
          :data="plugins"
          :loading="loading"
          :row-key="(row: PluginInfo) => row.id"
        />
      </n-flex>
    </n-tab-pane>
    <n-tab-pane
      v-for="plugin in plugins.filter((item) => item.controller_ready)"
      :key="plugin.id"
      :name="plugin.id"
      :tab="plugin.name"
      display-directive="show:lazy"
    >
      <iframe class="plugin-panel-frame" :src="panelUrl(plugin)" :title="plugin.name" />
    </n-tab-pane>
  </n-tabs>
</template>

<style scoped>
.status-ready { color: var(--app-status-success-color); }
.status-offline { color: var(--app-text-muted-color); }
.plugin-actions { display: flex; gap: var(--app-space-sm); }
.plugin-action { display: inline-flex; align-items: center; gap: var(--app-space-xs); color: var(--app-brand-color); background: none; border: 0; cursor: pointer; }
.plugin-action svg { width: 16px; }
.plugin-action:disabled { color: var(--app-text-muted-color); cursor: not-allowed; }
.plugin-action--danger { color: var(--app-status-danger-color); }
.plugin-tabs { height: 100%; }
.plugin-tabs :deep(.n-tab-pane) { height: 100%; }
.plugin-panel-frame { width: 100%; height: 100%; border: 0; background: var(--app-surface-color); }
</style>
