<script lang="ts" setup>
import { get_static_nat_mappings_v4 } from "@/api/static_nat_mapping";
import type { StaticNatMappingV4Config } from "@landscape-router/types/api/schemas";
import { computed, h, ref, onMounted } from "vue";
import type { DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import StaticMappingV4ListRow from "@/components/nat/static_mapping/StaticMappingV4ListRow.vue";
import { Renew } from "@vicons/carbon";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: mapping_rules,
  error,
  loading,
  refresh: refresh_rules,
} = usePageRequest(get_static_nat_mappings_v4, {
  initialData: [] as StaticNatMappingV4Config[],
});
const { t } = useI18n();
type MappingCell =
  "status" | "target" | "protocol" | "ports" | "enable" | "actions";
const columns = computed<DataTableColumns<StaticNatMappingV4Config>>(() =>
  (
    [
      [`${t("common.status")} / ${t("common.remark")}`, "status"],
      [t("common.ipv4_target"), "target"],
      [t("common.type"), "protocol"],
      [t("common.port_mapping"), "ports"],
      [t("common.enable"), "enable"],
      [t("common.actions"), "actions"],
    ] satisfies Array<[string, MappingCell]>
  ).map(([title, cell]) => ({
    title,
    key: cell,
    width: cell === "enable" ? 80 : undefined,
    align: "left" as const,
    render: (rule: StaticNatMappingV4Config) =>
      h(StaticMappingV4ListRow, {
        rule,
        cell,
        ...(cell === "actions" ? { onRefresh: refresh_rules } : {}),
      }),
  })),
);
function rowKey(row: StaticNatMappingV4Config) {
  return (
    row.id ??
    JSON.stringify([row.lan_target, row.l4_protocols, row.mapping_pair_ports])
  );
}

onMounted(refresh_rules);

const show_edit_modal = ref(false);
</script>
<template>
  <n-flex vertical class="standard-content-page">
    <n-flex justify="space-between" class="standard-list-toolbar">
      <n-button type="primary" @click="show_edit_modal = true">
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
      :data="mapping_rules"
      :loading="loading"
      :error="error"
      :row-key="rowKey"
      :scroll-x="900"
      @retry="refresh_rules"
    />
    <MappingEditV4Modal @refresh="refresh_rules" v-model:show="show_edit_modal">
    </MappingEditV4Modal>
  </n-flex>
</template>
