<script lang="ts" setup>
import { get_dns_redirects } from "@/api/dns_rule/redirect";
import type { DNSRedirectRule } from "@landscape-router/types/api/schemas";
import { computed, h, ref, onMounted } from "vue";
import type { DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import { Add } from "@vicons/carbon";
import { useFrontEndStore } from "@/stores/front_end_config";
import DnsRedirectListRow from "@/components/dns/redirect/DnsRedirectListRow.vue";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: redirect_rules,
  error,
  loading,
  state,
  refresh: refresh_rules,
} = usePageRequest(get_dns_redirects, {
  initialData: [] as DNSRedirectRule[],
});
const { t } = useI18n();
const frontEndStore = useFrontEndStore();
const columns = computed<DataTableColumns<DNSRedirectRule>>(() =>
  [
    [`${t("common.status")} / ${t("common.remark")}`, "status"],
    [t("dns.redirect_card.apply_to"), "flows"],
    [t("dns.rule_card.match_rules"), "rules"],
    [t("dns.redirect_card.answer_mode"), "mode"],
    [t("dns.redirect_card.response_info"), "response"],
    [t("dns.redirect_card.block_metadata_queries"), "metadata"],
    [t("common.actions"), "actions"],
  ].map(([title, cell]) => ({
    title,
    key: cell,
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
      v-if="frontEndStore.display_style === 'list'"
      :columns="columns"
      :data="redirect_rules"
      :loading="loading"
      :error="error"
      :row-key="rowKey"
      @retry="refresh_rules"
    />
    <StandardPageState v-else :state="state" @retry="refresh_rules">
      <n-grid x-gap="12" y-gap="10" cols="1 600:2 1200:3 1600:3">
        <n-grid-item v-for="rule in redirect_rules" :key="rule.id">
          <DnsRedirectCard @refresh="refresh_rules()" :rule="rule">
          </DnsRedirectCard>
        </n-grid-item>
      </n-grid>
    </StandardPageState>

    <DnsRedirectEditModal
      :rule_id="null"
      @refresh="refresh_rules"
      v-model:show="show_edit_modal"
    >
    </DnsRedirectEditModal>
  </n-flex>
</template>
