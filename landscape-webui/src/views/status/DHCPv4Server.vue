<script lang="ts" setup>
import {
  get_all_iface_arp_scan_info,
  get_dhcp_v4_assigned_ips,
} from "@/api/service_dhcp_v4";
import type { ArpScanInfo, DHCPv4OfferInfo } from "@/api/service_dhcp_v4";
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Renew } from "@vicons/carbon";
import { usePageRequest } from "@/composables/usePageRequest";
const { t } = useI18n();

const request = usePageRequest(
  async () => {
    const [req_data, arp_infos] = await Promise.all([
      get_dhcp_v4_assigned_ips(),
      get_all_iface_arp_scan_info(),
    ]);
    const result = [];
    for (const [label, value] of req_data) {
      result.push({
        label,
        value,
      });
    }
    result.sort((a, b) => a.label.localeCompare(b.label));
    return { infos: result, arp_infos };
  },
  {
    initialData: {
      infos: [] as { label: string; value: DHCPv4OfferInfo | null }[],
      arp_infos: new Map<string, ArpScanInfo[]>(),
    },
    isEmpty: (data) => data.infos.length === 0,
  },
);
const get_info = request.refresh;

onMounted(get_info);
</script>

<template>
  <n-flex vertical class="standard-content-page">
    <n-flex class="standard-list-toolbar">
      <n-button :loading="request.refreshing.value" secondary @click="get_info">
        <template #icon
          ><n-icon><Renew /></n-icon
        ></template>
        {{ t("common.refresh") }}
      </n-button>
    </n-flex>
    <!-- {{ infos }} -->
    <StandardPageState :state="request.state.value" @retry="request.retry">
      <n-flex vertical style="width: 100%">
        <AssignedIpTable
          @refresh="get_info"
          v-for="(data, index) in request.data.value.infos"
          :key="index"
          :iface_name="data.label"
          :info="data.value"
          :arp_info="request.data.value.arp_infos.get(data.label)"
        ></AssignedIpTable>
      </n-flex>
    </StandardPageState>
  </n-flex>

  <!-- {{ infos }} -->
</template>
