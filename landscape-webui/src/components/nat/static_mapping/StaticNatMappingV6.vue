<script lang="ts" setup>
import { get_static_nat_mappings_v6 } from "@/api/static_nat_mapping";
import type { StaticNatMappingV6Config } from "@landscape-router/types/api/schemas";
import { computed, h, ref, onMounted } from "vue";
import type { DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import StaticMappingV6ListRow from "@/components/nat/static_mapping/StaticMappingV6ListRow.vue";
import { Renew } from "@vicons/carbon";
import { usePageRequest } from "@/composables/usePageRequest";

const {
  data: mapping_rules,
  error,
  loading,
  refresh: refresh_rules,
} = usePageRequest(get_static_nat_mappings_v6, {
  initialData: [] as StaticNatMappingV6Config[],
});
const { t } = useI18n();
type MappingCell =
  "name" | "target" | "protocol" | "ports" | "enable" | "remark" | "actions";
const columns = computed<DataTableColumns<StaticNatMappingV6Config>>(() =>
  (
    [
      [t("common.name"), "name"],
      [t("common.ipv6_target"), "target"],
      [t("common.type"), "protocol"],
      [t("common.port_mapping"), "ports"],
      [t("common.enable"), "enable"],
      [t("common.remark"), "remark"],
      [t("common.actions"), "actions"],
    ] satisfies Array<[string, MappingCell]>
  ).map(([title, cell]) => ({
    title,
    key: cell,
    width: cell === "name" ? 110 : cell === "enable" ? 80 : undefined,
    align: "left" as const,
    render: (rule: StaticNatMappingV6Config) =>
      h(StaticMappingV6ListRow, {
        rule,
        cell,
        ...(cell === "actions" ? { onRefresh: refresh_rules } : {}),
      }),
  })),
);
function rowKey(row: StaticNatMappingV6Config) {
  return (
    row.id ??
    JSON.stringify([row.lan_target, row.l4_protocols, row.port_config])
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
    <MappingEditV6Modal @refresh="refresh_rules" v-model:show="show_edit_modal">
    </MappingEditV6Modal>
  </n-flex>
</template>
