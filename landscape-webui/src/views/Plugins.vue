<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import { Add, Launch, Renew, TrashCan } from "@vicons/carbon";
import type { DataTableColumns, UploadCustomRequestOptions } from "naive-ui";
import { NButton, NIcon, NPopconfirm, useMessage } from "naive-ui";
import { useI18n } from "vue-i18n";
import {
  importPlugin,
  listPlugins,
  removePlugin,
  type PluginInfo,
} from "@/api/plugins";
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
      h("div", { class: "plugin-actions" }, [
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
        h(
          NPopconfirm,
          { onPositiveClick: () => deletePlugin(row) },
          {
            trigger: () =>
              h(
                NButton,
                { size: "small", type: "error", secondary: true },
                {
                  icon: () => h(NIcon, null, { default: () => h(TrashCan) }),
                  default: () => t("common.delete"),
                },
              ),
            default: () => t("common.confirm_delete"),
          },
        ),
      ]),
  },
]);

async function refresh() {
  loading.value = true;
  try {
    plugins.value = await listPlugins();
  } finally {
    loading.value = false;
  }
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
        <n-flex
          align="center"
          justify="space-between"
          :wrap="false"
          class="standard-list-toolbar"
        >
          <n-upload
            class="plugin-upload"
            accept="application/json,.json"
            :show-file-list="false"
            :custom-request="upload"
          >
            <n-button type="primary">
              <template #icon
                ><n-icon><Add /></n-icon
              ></template>
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
      <iframe
        class="plugin-panel-frame"
        :src="panelUrl(plugin)"
        :title="plugin.name"
      />
    </n-tab-pane>
  </n-tabs>
</template>

<style scoped>
.status-ready {
  color: var(--app-status-success-color);
}
.status-offline {
  color: var(--app-text-muted-color);
}
.plugin-actions {
  display: flex;
  gap: var(--app-space-sm);
}
.plugin-upload {
  width: auto;
}
.plugin-tabs {
  height: 100%;
}
.plugin-tabs :deep(.n-tab-pane) {
  height: 100%;
}
.plugin-panel-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--app-surface-color);
}
</style>
