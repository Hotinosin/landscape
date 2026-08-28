<script lang="ts" setup>
import { get_all_ipv6pd_prefix_status } from "@/api/service_ipv6pd";
import type { IPV6PDPrefixStatus } from "@/api/service_ipv6pd";
import { onMounted, ref } from "vue";
import type { DataTableColumns } from "naive-ui";
import { useI18n } from "vue-i18n";
import { Renew } from "@vicons/carbon";
const { t } = useI18n();

onMounted(async () => {
  await get_info();
});

const loading = ref(false);
const infos = ref<{ label: string; value: IPV6PDPrefixStatus }[]>([]);
const emptyColumns: DataTableColumns<(typeof infos.value)[number]> = [
  { title: t("common.interface"), key: "label" },
  { title: t("lan_ipv6.prefix_info.prefix"), key: "prefix" },
  {
    title: t("lan_ipv6.prefix_info.prefix_len_status"),
    key: "prefix_len_status",
  },
  {
    title: t("lan_ipv6.prefix_info.ip_preferred_time"),
    key: "preferred_lifetime",
  },
  {
    title: t("lan_ipv6.prefix_info.ip_valid_time"),
    key: "valid_lifetime",
  },
  { title: t("lan_ipv6.prefix_info.last_update"), key: "last_update" },
];
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
    <n-flex v-if="infos.length > 0">
      <n-grid x-gap="12" y-gap="10" cols="1 600:2 1200:3 1600:3">
        <n-grid-item v-for="(data, index) in infos" :key="index">
          <IAPrefixInfoCard
            :prefix_status="data.value"
            :iface_name="data.label"
          />
        </n-grid-item>
      </n-grid>
    </n-flex>
    <StandardDataTable
      v-else
      :columns="emptyColumns"
      :data="[]"
      :loading="loading"
    />
  </n-flex>

  <!-- {{ infos }} -->
</template>
