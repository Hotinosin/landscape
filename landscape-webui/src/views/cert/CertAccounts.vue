<script lang="ts" setup>
import { get_cert_accounts } from "@/api/cert/account";
import type { CertAccountConfig } from "@landscape-router/types/api/schemas";
import { computed, h, ref, onMounted } from "vue";
import type { DataTableColumns } from "naive-ui";
import CertAccountListRow from "@/components/cert/account/CertAccountListRow.vue";
import { useI18n } from "vue-i18n";
import { Renew } from "@vicons/carbon";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: items,
  error,
  loading,
  refresh,
} = usePageRequest(get_cert_accounts, {
  initialData: [] as CertAccountConfig[],
});
const { t } = useI18n();
const show_edit_modal = ref(false);
type AccountCell =
  | "name"
  | "provider"
  | "email"
  | "status"
  | "staging"
  | "accountActions"
  | "actions";
const columns = computed<DataTableColumns<CertAccountConfig>>(() =>
  (
    [
      [t("common.name"), "name", "14%"],
      [t("cert.account_provider"), "provider", "14%"],
      [t("cert.account_email"), "email", "22%"],
      [t("cert.account_status"), "status", "12%"],
      [t("cert.account_staging"), "staging", "10%"],
      [t("cert.account_actions"), "accountActions", "16%"],
      [t("common.actions"), "actions", "12%"],
    ] satisfies Array<[string, AccountCell, string]>
  ).map(([title, cell, width]) => ({
    title,
    key: cell,
    width,
    render: (rule: CertAccountConfig) =>
      h(CertAccountListRow, {
        rule,
        cell,
        ...(["accountActions", "actions"].includes(cell)
          ? { onRefresh: refresh }
          : {}),
      }),
  })),
);
function rowKey(row: CertAccountConfig) {
  return row.id ?? row.name;
}

onMounted(refresh);
</script>

<template>
  <n-flex vertical class="standard-content-page">
    <n-flex justify="space-between" class="standard-list-toolbar">
      <n-button type="primary" @click="show_edit_modal = true">
        {{ t("common.create") }}
      </n-button>
      <n-button :loading="loading" secondary @click="refresh">
        <template #icon
          ><n-icon><Renew /></n-icon
        ></template>
        {{ t("common.refresh") }}
      </n-button>
    </n-flex>
    <StandardDataTable
      :columns="columns"
      :data="items"
      :loading="loading"
      :error="error"
      :row-key="rowKey"
      :scroll-x="900"
      :empty-text="t('cert.no_accounts')"
      @retry="refresh"
    />
    <CertAccountEditModal
      :rule_id="null"
      @refresh="refresh"
      v-model:show="show_edit_modal"
    />
  </n-flex>
</template>
