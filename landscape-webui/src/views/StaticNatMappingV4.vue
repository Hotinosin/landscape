<script lang="ts" setup>
import { get_static_nat_mappings_v4 } from "@/api/static_nat_mapping";
import type { StaticNatMappingV4Config } from "@landscape-router/types/api/schemas";
import { computed, h, ref, onMounted } from "vue";
import type { DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import { useFrontEndStore } from "@/stores/front_end_config";
import StaticMappingV4ListRow from "@/components/nat/static_mapping/StaticMappingV4ListRow.vue";
import { Add } from "@vicons/carbon";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: mapping_rules,
  error,
  loading,
  state,
  refresh: refresh_rules,
} = usePageRequest(get_static_nat_mappings_v4, {
  initialData: [] as StaticNatMappingV4Config[],
});
const { t } = useI18n();
const frontEndStore = useFrontEndStore();
const columns = computed<DataTableColumns<StaticNatMappingV4Config>>(() =>
  [
    [`${t("common.status")} / ${t("common.remark")}`, "status"],
    [t("common.ipv4_target"), "target"],
    [t("common.type"), "protocol"],
    [t("common.port_mapping"), "ports"],
    [t("common.actions"), "actions"],
  ].map(([title, cell]) => ({
    title,
    key: cell,
    align: "left" as const,
    render: (rule: StaticNatMappingV4Config) =>
      h(StaticMappingV4ListRow, {
        rule,
        cell: cell as any,
        ...(cell === "actions" ? { onRefresh: refresh_rules } : {}),
      }),
  })),
);
function rowKey(row: StaticNatMappingV4Config) {
  return row.id ?? row.remark ?? String(row.mapping_pair_ports.length);
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
      :data="mapping_rules"
      :loading="loading"
      :error="error"
      :row-key="rowKey"
      @retry="refresh_rules"
    />
    <StandardPageState v-else :state="state" @retry="refresh_rules">
      <n-grid x-gap="12" y-gap="10" cols="1 600:2 1200:3 1600:3">
        <n-grid-item v-for="rule in mapping_rules" :key="rule.id">
          <StaticMappingV4Card @refresh="refresh_rules()" :rule="rule">
          </StaticMappingV4Card>
        </n-grid-item>
      </n-grid>
    </StandardPageState>

    <MappingEditV4Modal @refresh="refresh_rules" v-model:show="show_edit_modal">
    </MappingEditV4Modal>
  </n-flex>
</template>
