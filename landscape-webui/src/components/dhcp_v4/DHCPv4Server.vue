<script lang="ts" setup>
import {
  get_all_iface_arp_scan_info,
  get_dhcp_v4_assigned_ips,
} from "@/api/service_dhcp_v4";
import type { ArpScanInfo, DHCPv4OfferInfo } from "@/api/service_dhcp_v4";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Renew } from "@vicons/carbon";
import { usePageRequest } from "@/composables/usePageRequest";
const { t } = useI18n();
withDefaults(defineProps<{ showRefresh?: boolean }>(), { showRefresh: true });

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
defineExpose({ refresh: get_info, refreshing: request.refreshing });

const selectedIface = ref<string | null>(null);
const ifaceOptions = computed(() =>
  request.data.value.infos.map(({ label }) => ({ label, value: label })),
);
const selectedData = computed(() =>
  request.data.value.infos.find(({ label }) => label === selectedIface.value),
);

watch(
  () => request.data.value.infos.map(({ label }) => label),
  (labels) => {
    if (!selectedIface.value || !labels.includes(selectedIface.value)) {
      selectedIface.value = labels[0] ?? null;
    }
  },
  { immediate: true },
);

onMounted(get_info);
</script>

<template>
  <n-flex vertical class="standard-content-page">
    <n-flex v-if="showRefresh" class="standard-list-toolbar">
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
        <n-select
          v-model:value="selectedIface"
          :options="ifaceOptions"
          :placeholder="t('network.interface.select_interface')"
          style="width: 240px"
        />
        <AssignedIpTable
          v-if="selectedData"
          @refresh="get_info"
          :iface_name="selectedData.label"
          :info="selectedData.value"
          :arp_info="request.data.value.arp_infos.get(selectedData.label)"
          :show-title="false"
        ></AssignedIpTable>
      </n-flex>
    </StandardPageState>
  </n-flex>

  <!-- {{ infos }} -->
</template>
