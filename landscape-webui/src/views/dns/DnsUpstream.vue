<script lang="ts" setup>
import { get_dns_upstreams } from "@/api/dns_rule/upstream";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import { computed, h, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import DnsUpstreamListRow from "@/components/dns/upstream/DnsUpstreamListRow.vue";
import { Renew } from "@vicons/carbon";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: redirect_rules,
  error,
  loading,
  refresh: refresh_rules,
} = usePageRequest(get_dns_upstreams, {
  initialData: [] as DnsUpstreamConfig[],
});
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const columns = computed<DataTableColumns<DnsUpstreamConfig>>(() =>
  [
    [`${t("common.name")} / ${t("common.remark")}`, "remark"],
    [t("dns.upstream_card.request_mode"), "mode"],
    [t("dns.upstream_card.domain_addr"), "domain"],
    [t("dns.upstream_card.request_port"), "port"],
    [t("dns.upstream_card.upstream_ip"), "ip"],
    [t("common.actions"), "actions"],
  ].map(([title, cell]) => ({
    title,
    key: cell,
    render: (rule) =>
      h(DnsUpstreamListRow, {
        rule,
        cell: cell as "ip" | "port" | "domain" | "mode" | "remark" | "actions",
        ...(cell === "actions" ? { onRefresh: refresh_rules } : {}),
      }),
  })),
);

function rowKey(row: DnsUpstreamConfig) {
  return row.id ?? `${row.ips.join(",")}:${row.port}`;
}

onMounted(refresh_rules);

const show_edit_modal = ref(false);
const edit_rule_id = ref<string | null>(null);

watch(
  () => route.query.edit,
  (id) => {
    if (typeof id === "string") {
      edit_rule_id.value = id;
      show_edit_modal.value = true;
    }
  },
  { immediate: true },
);

function createUpstream() {
  edit_rule_id.value = null;
  show_edit_modal.value = true;
}

function modalVisibleChanged(show: boolean) {
  show_edit_modal.value = show;
  if (!show && route.query.edit) {
    const { edit: _, ...query } = route.query;
    router.replace({ query });
  }
}
</script>
<template>
  <n-flex vertical class="standard-content-page">
    <n-flex justify="space-between" class="standard-list-toolbar">
      <n-button type="primary" @click="createUpstream">
        {{ t("common.create") }}
      </n-button>
      <n-button :loading="loading" secondary @click="refresh_rules">
        <template #icon
          ><n-icon><Renew /></n-icon
        ></template>
        {{ t("common.refresh") }}
      </n-button>
    </n-flex>
    <StandardDataTable
      :columns="columns"
      :data="redirect_rules"
      :loading="loading"
      :error="error"
      :row-key="rowKey"
      :scroll-x="900"
      @retry="refresh_rules"
    />
    <UpstreamEditModal
      :rule_id="edit_rule_id"
      @refresh="refresh_rules"
      :show="show_edit_modal"
      @update:show="modalVisibleChanged"
    >
    </UpstreamEditModal>
  </n-flex>
</template>
