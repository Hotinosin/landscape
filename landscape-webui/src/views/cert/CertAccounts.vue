<script lang="ts" setup>
import { get_cert_accounts } from "@/api/cert/account";
import type { CertAccountConfig } from "@landscape-router/types/api/schemas";
import { computed, h, ref, onMounted } from "vue";
import type { DataTableColumns } from "naive-ui";
import CertAccountCard from "@/components/cert/account/CertAccountCard.vue";
import { useI18n } from "vue-i18n";
import { useFrontEndStore } from "@/stores/front_end_config";
import { Add } from "@vicons/carbon";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: items,
  error,
  loading,
  state,
  refresh,
} = usePageRequest(get_cert_accounts, {
  initialData: [] as CertAccountConfig[],
});
const { t } = useI18n();
const show_edit_modal = ref(false);
const frontEndStore = useFrontEndStore();
const columns = computed<DataTableColumns<CertAccountConfig>>(() =>
  [
    [t("common.name"), "name", "18%"],
    [t("cert.account_provider"), "provider", "14%"],
    [t("cert.account_email"), "email", "24%"],
    [t("cert.account_status"), "status", "14%"],
    [t("cert.account_staging"), "staging", "12%"],
    [t("common.actions"), "actions", "18%"],
  ].map(([title, cell, width]) => ({
    title,
    key: cell,
    width,
    render: (rule: CertAccountConfig) =>
      h(CertAccountCard, {
        rule,
        display_style: "list",
        cell: cell as any,
        ...(cell === "actions" ? { onRefresh: refresh } : {}),
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
    <n-flex class="standard-list-toolbar">
      <n-button type="primary" @click="show_edit_modal = true">
        <template #icon
          ><n-icon><Add /></n-icon
        ></template>
        {{ t("common.create") }}
      </n-button>
    </n-flex>
    <StandardDataTable
      v-if="frontEndStore.display_style === 'list'"
      :columns="columns"
      :data="items"
      :loading="loading"
      :error="error"
      :row-key="rowKey"
      :empty-text="t('cert.no_accounts')"
      @retry="refresh"
    />
    <StandardPageState
      v-else
      :state="state"
      :empty-text="t('cert.no_accounts')"
      @retry="refresh"
    >
      <n-grid x-gap="12" y-gap="10" cols="1 600:2 1200:3">
        <n-grid-item v-for="item in items" :key="item.id">
          <CertAccountCard @refresh="refresh()" :rule="item" />
        </n-grid-item>
      </n-grid>
    </StandardPageState>

    <CertAccountEditModal
      :rule_id="null"
      @refresh="refresh"
      v-model:show="show_edit_modal"
    />
  </n-flex>
</template>
