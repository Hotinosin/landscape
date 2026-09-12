<script lang="ts" setup>
import { get_dns_redirects } from "@/api/dns_rule/redirect";
import type { DNSRedirectRule } from "@landscape-router/types/api/schemas";
import { computed, h, ref, onMounted } from "vue";
import type { DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import { Add } from "@vicons/carbon";
import DnsRedirectListRow from "@/components/dns/redirect/DnsRedirectListRow.vue";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: redirect_rules,
  error,
  loading,
  refresh: refresh_rules,
} = usePageRequest(get_dns_redirects, {
  initialData: [] as DNSRedirectRule[],
});
const { t } = useI18n();
const columns = computed<DataTableColumns<DNSRedirectRule>>(() =>
  [
    [`${t("common.status")} / ${t("common.remark")}`, "status"],
    [t("dns.redirect_card.apply_to"), "flows"],
    [t("dns.rule_card.match_rules"), "rules"],
    [t("dns.redirect_card.answer_mode"), "mode"],
    [t("dns.redirect_card.response_info"), "response"],
    [t("dns.redirect_card.block_metadata_queries"), "metadata"],
    [t("common.enable"), "enable"],
    [t("common.actions"), "actions"],
  ].map(([title, cell]) => ({
    title,
    key: cell,
    width: cell === "enable" ? 80 : undefined,
    render: (rule: DNSRedirectRule) =>
      h(DnsRedirectListRow, {
        rule,
        cell: cell as any,
        ...(cell === "actions" ? { onRefresh: refresh_rules } : {}),
      }),
  })),
);
function rowKey(row: DNSRedirectRule) {
  return row.id ?? row.remark ?? String(row.match_rules.length);
}

onMounted(refresh_rules);

const show_edit_modal = ref(false);
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
      :columns="columns"
      :data="redirect_rules"
      :loading="loading"
      :error="error"
      :row-key="rowKey"
      @retry="refresh_rules"
    />
    <DnsRedirectEditModal
      :rule_id="null"
      @refresh="refresh_rules"
      v-model:show="show_edit_modal"
    >
    </DnsRedirectEditModal>
  </n-flex>
</template>
