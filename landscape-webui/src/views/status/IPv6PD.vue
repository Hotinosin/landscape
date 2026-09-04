<script lang="ts" setup>
import { get_all_ipv6pd_prefix_status } from "@/api/service_ipv6pd";
import type { IPV6PDPrefixStatus } from "@/api/service_ipv6pd";
import { computed, h, onMounted, ref } from "vue";
import type { DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import { Renew } from "@vicons/carbon";
import IAPrefixInfoCard from "@/components/ipv6pd/IAPrefixInfoCard.vue";
const { t } = useI18n();

onMounted(async () => {
  await get_info();
});

const loading = ref(false);
const infos = ref<{ label: string; value: IPV6PDPrefixStatus }[]>([]);
type PrefixRow = (typeof infos.value)[number];
type PrefixCell = InstanceType<typeof IAPrefixInfoCard>["$props"]["cell"];
const renderCell = (data: PrefixRow, cell: PrefixCell) =>
  h(IAPrefixInfoCard, {
    prefix_status: data.value,
    iface_name: data.label,
    cell,
  });
const columns = computed<DataTableColumns<PrefixRow>>(() => [
  {
    title: `${t("common.status")} / ${t("common.interface")}`,
    key: "status",
    width: "18%",
    render: (data) => renderCell(data, "status"),
  },
  {
    title: t("lan_ipv6.prefix_info.prefix"),
    key: "prefix",
    width: "20%",
    render: (data) => renderCell(data, "prefix"),
  },
  {
    title: t("lan_ipv6.prefix_info.prefix_len_status"),
    key: "prefix_len_status",
    width: "14%",
    render: (data) => renderCell(data, "prefix_len_status"),
  },
  {
    title: t("lan_ipv6.prefix_info.ip_preferred_time"),
    key: "preferred_lifetime",
    width: "16%",
    render: (data) => renderCell(data, "preferred_lifetime"),
  },
  {
    title: t("lan_ipv6.prefix_info.ip_valid_time"),
    key: "valid_lifetime",
    width: "16%",
    render: (data) => renderCell(data, "valid_lifetime"),
  },
  {
    title: t("lan_ipv6.prefix_info.last_update"),
    key: "last_update",
    width: "16%",
    render: (data) => renderCell(data, "last_update"),
  },
]);

function rowKey(row: PrefixRow) {
  return row.label;
}
async function get_info() {
  try {
    loading.value = true;
    let req_data = await get_all_ipv6pd_prefix_status();
    const result = [];
    for (const [label, value] of req_data) {
      result.push({
        label,
        value,
      });
    }
    result.sort((a, b) => a.label.localeCompare(b.label));
    infos.value = result;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <n-flex vertical class="standard-content-page">
    <n-flex class="standard-list-toolbar">
      <n-button :loading="loading" secondary @click="get_info">
        <template #icon
          ><n-icon><Renew /></n-icon
        ></template>
        {{ t("common.refresh") }}
      </n-button>
    </n-flex>
    <StandardDataTable
      :columns="columns"
      :data="infos"
      :loading="loading"
      :row-key="rowKey"
      :scroll-x="960"
    />
  </n-flex>

  <!-- {{ infos }} -->
</template>
