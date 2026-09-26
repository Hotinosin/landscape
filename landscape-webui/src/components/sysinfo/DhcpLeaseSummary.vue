<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Renew } from "@vicons/carbon";
import { IPv4 } from "ip-num";
import {
  get_all_iface_arp_scan_info,
  get_dhcp_v4_assigned_ips,
  get_iface_dhcp_v4_config,
  type DHCPv4OfferInfo,
} from "@/api/service_dhcp_v4";
import type { DHCPv4ServiceConfig } from "@/lib/dhcp_v4";
import { overviewCardStyles } from "@/components/overviewCardStyle";

const { t } = useI18n();
const loading = ref(false);
const error = ref(false);
const leases = ref(new Map<string, DHCPv4OfferInfo | null>());
const onlineIps = ref(new Set<string>());
const configs = ref<DHCPv4ServiceConfig[]>([]);

const ipValue = (ip: string) => IPv4.fromString(ip).getValue();

const activeLeaseIps = computed(() => {
  const result = new Set<string>();
  for (const info of leases.value.values()) {
    if (!info) continue;
    for (const lease of info.offered_ips) {
      if (
        lease.is_static ||
        lease.relative_active_time + lease.expire_time > info.relative_boot_time
      ) {
        result.add(lease.ip);
      }
    }
  }
  return result;
});

const pool = computed(() => {
  let total = 0;
  let used = 0;
  for (const service of configs.value) {
    if (!service.enable) continue;
    const start = ipValue(service.config.ip_range_start);
    const end = ipValue(service.config.ip_range_end!);
    total += Number(end - start + 1n);
    used += [...activeLeaseIps.value].filter((ip) => {
      const value = ipValue(ip);
      return value >= start && value <= end;
    }).length;
  }
  return { total, remaining: Math.max(0, total - used) };
});

async function refresh() {
  loading.value = true;
  error.value = false;
  try {
    const [leaseMap, arpMap] = await Promise.all([
      get_dhcp_v4_assigned_ips(),
      get_all_iface_arp_scan_info(),
    ]);
    leases.value = leaseMap;
    configs.value = await Promise.all(
      [...leaseMap.keys()].map((name) => get_iface_dhcp_v4_config(name)),
    );
    onlineIps.value = new Set(
      [...arpMap.values()].flatMap((snapshots) =>
        (snapshots[snapshots.length - 1]?.infos ?? []).map((item) => item.ip),
      ),
    );
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<template>
  <n-card
    class="overview-card"
    :style="overviewCardStyles.card"
    :header-style="overviewCardStyles.header"
    :content-style="overviewCardStyles.content"
  >
    <template #header>{{ t("sysinfo.dhcp_leases") }}</template>
    <template #header-extra>
      <n-button
        quaternary
        circle
        size="small"
        :loading="loading"
        @click="refresh"
      >
        <template #icon
          ><n-icon><Renew /></n-icon
        ></template>
      </n-button>
    </template>

    <div class="overview-card__primary" :style="overviewCardStyles.primary">
      <n-statistic :label="t('sysinfo.online_devices')">
        <n-text type="success" strong>{{ onlineIps.size }}</n-text>
      </n-statistic>
    </div>

    <n-divider :style="overviewCardStyles.divider" />

    <n-flex vertical :size="8" :style="overviewCardStyles.secondary">
      <n-alert v-if="error" type="error" :show-icon="false">
        {{ t("sysinfo.dhcp_load_failed") }}
      </n-alert>
      <template v-else>
        <n-flex justify="space-between">
          <n-text depth="3">{{ t("sysinfo.active_leases") }}</n-text>
          <n-text strong>{{ activeLeaseIps.size }}</n-text>
        </n-flex>
        <n-flex justify="space-between">
          <n-text depth="3">{{ t("sysinfo.pool_remaining") }}</n-text>
          <n-text strong>{{ pool.remaining }} / {{ pool.total }}</n-text>
        </n-flex>
      </template>
    </n-flex>
  </n-card>
</template>
