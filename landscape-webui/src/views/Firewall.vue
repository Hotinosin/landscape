<script setup lang="ts">
import { get_firewall_blacklists } from "@/api/firewall_blacklist";
import FirewallBlacklistEditModal from "@/components/firewall/FirewallBlacklistEditModal.vue";
import FirewallBlacklistCard from "@/components/firewall/FirewallBlacklistCard.vue";
import type { FirewallBlacklistConfig } from "@landscape-router/types/api/schemas";
import { computed, h, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useFrontEndStore } from "@/stores/front_end_config";
import FirewallBlacklistListRow from "@/components/firewall/FirewallBlacklistListRow.vue";
import { Add } from "@vicons/carbon";
import type { DataTableColumns } from "naive-ui";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: configs,
  error,
  loading,
  state,
  refresh: read_configs,
} = usePageRequest(get_firewall_blacklists, {
  initialData: [] as FirewallBlacklistConfig[],
});
const show_create_modal = ref(false);
const { t } = useI18n();
const frontEndStore = useFrontEndStore();

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
  return row.id ?? row.remark ?? `firewall-${row.source.length}`;
}

onMounted(read_configs);
</script>
<template>
  <n-flex vertical class="standard-content-page">
    <n-flex align="center" class="standard-list-toolbar">
      <n-button type="primary" @click="show_create_modal = true">
        <template #icon
          ><n-icon><Add /></n-icon
        ></template>
        {{ t("common.create") }}
      </n-button>
      <n-text depth="3">
        {{ t("firewall.card.ip_blacklist_desc") }}
      </n-text>
    </n-flex>

    <StandardDataTable
      v-if="frontEndStore.display_style === 'list'"
      :columns="columns"
      :data="configs"
      :loading="loading"
      :error="error"
      :row-key="rowKey"
      @retry="read_configs"
    />
    <StandardPageState
      v-else
      :state="state"
      :empty-text="t('common.no_firewall_rules')"
      @retry="read_configs"
    >
      <n-grid x-gap="12" y-gap="10" cols="1 600:2 900:3 1200:4 1600:5">
        <n-grid-item
          v-for="config in configs"
          :key="config.id"
          style="display: flex"
        >
          <FirewallBlacklistCard :rule="config" @refresh="read_configs()" />
        </n-grid-item>
      </n-grid>
    </StandardPageState>

    <FirewallBlacklistEditModal
      v-model:show="show_create_modal"
      :id="null"
      @refresh="read_configs()"
    />
  </n-flex>
</template>
