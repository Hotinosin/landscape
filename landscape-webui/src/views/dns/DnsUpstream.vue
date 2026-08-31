<script lang="ts" setup>
import { get_dns_upstreams } from "@/api/dns_rule/upstream";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import { computed, h, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import { useFrontEndStore } from "@/stores/front_end_config";
import DnsUpstreamListRow from "@/components/dns/upstream/DnsUpstreamListRow.vue";
import { Add } from "@vicons/carbon";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: redirect_rules,
  error,
  loading,
  state,
  refresh: refresh_rules,
} = usePageRequest(get_dns_upstreams, {
  initialData: [] as DnsUpstreamConfig[],
});
const { t } = useI18n();
const frontEndStore = useFrontEndStore();
const route = useRoute();
const router = useRouter();

const columns = computed<DataTableColumns<DnsUpstreamConfig>>(() =>
  [
    ["dns.upstream_card.upstream_ip", "ip"],
    ["dns.upstream_card.request_port", "port"],
    ["dns.upstream_card.domain_addr", "domain"],
    ["dns.upstream_card.request_mode", "mode"],
    ["common.remark", "remark"],
    ["common.actions", "actions"],
  ].map(([title, cell]) => ({
    title: t(title),
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
    <n-flex class="standard-list-toolbar">
      <n-button type="primary" @click="createUpstream">
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
          <DnsUpstreamCard @refresh="refresh_rules()" :rule="rule">
          </DnsUpstreamCard>
        </n-grid-item>
      </n-grid>
    </StandardPageState>

    <UpstreamEditModal
      :rule_id="edit_rule_id"
      @refresh="refresh_rules"
      :show="show_edit_modal"
      @update:show="modalVisibleChanged"
    >
    </UpstreamEditModal>
  </n-flex>
</template>
