<script setup lang="ts">
import { get_firewall_blacklists } from "@/api/firewall_blacklist";
import FirewallBlacklistEditModal from "@/components/firewall/FirewallBlacklistEditModal.vue";
import type { FirewallBlacklistConfig } from "@landscape-router/types/api/schemas";
import { computed, h, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import FirewallBlacklistListRow from "@/components/firewall/FirewallBlacklistListRow.vue";
import { Add, Renew } from "@vicons/carbon";
import type { DataTableColumns } from "naive-ui";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: configs,
  error,
  loading,
  refresh: read_configs,
} = usePageRequest(get_firewall_blacklists, {
  initialData: [] as FirewallBlacklistConfig[],
});
const show_create_modal = ref(false);
const { t } = useI18n();

const columns = computed<DataTableColumns<FirewallBlacklistConfig>>(() => [
  {
    title: `${t("common.status")} / ${t("common.remark")}`,
    key: "status",
    render: (rule) => h(FirewallBlacklistListRow, { rule, cell: "status" }),
  },
  {
    title: t("firewall.blacklist_edit.source"),
    key: "source",
    render: (rule) => h(FirewallBlacklistListRow, { rule, cell: "source" }),
  },
  {
    title: t("common.count"),
    key: "count",
    render: (rule) => h(FirewallBlacklistListRow, { rule, cell: "count" }),
  },
  {
    title: t("common.enable"),
    key: "enable",
    width: 80,
    render: (rule) =>
      h(FirewallBlacklistListRow, {
        rule,
        cell: "enable",
        onRefresh: read_configs,
      }),
  },
  {
    title: t("common.actions"),
    key: "actions",
    align: "left",
    render: (rule) =>
      h(FirewallBlacklistListRow, {
        rule,
        cell: "actions",
        onRefresh: read_configs,
      }),
  },
]);

function rowKey(row: FirewallBlacklistConfig) {
  return row.id ?? JSON.stringify(row.source);
}

onMounted(read_configs);
</script>
<template>
  <n-flex vertical class="standard-content-page">
    <n-flex
      align="center"
      justify="space-between"
      class="standard-list-toolbar"
    >
      <n-button type="primary" @click="show_create_modal = true">
        <template #icon
          ><n-icon><Add /></n-icon
        ></template>
        {{ t("common.create") }}
      </n-button>
      <n-button :loading="loading" secondary @click="read_configs">
        <template #icon
          ><n-icon><Renew /></n-icon
        ></template>
        {{ t("common.refresh") }}
      </n-button>
    </n-flex>

    <n-alert type="info">
      {{ t("firewall.card.ip_blacklist_desc") }}
    </n-alert>

    <StandardDataTable
      :columns="columns"
      :data="configs"
      :loading="loading"
      :error="error"
      :row-key="rowKey"
      :scroll-x="760"
      @retry="read_configs"
    />
    <FirewallBlacklistEditModal
      v-model:show="show_create_modal"
      :id="null"
      @refresh="read_configs()"
    />
  </n-flex>
</template>
