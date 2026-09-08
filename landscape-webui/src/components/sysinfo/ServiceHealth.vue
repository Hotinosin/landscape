<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  get_service_status_color,
  get_service_status_label,
  ServiceStatusType,
  type ServiceStatus,
} from "@/lib/services";
import { useThemeVars } from "naive-ui";
import { useIfaceNodeStore } from "@/stores/iface_node";
import { useDnsStore } from "@/stores/status_dns";
import { useMetricStore } from "@/stores/status_metric";
import { useNATConfigStore } from "@/stores/status_nats";
import { useFirewallConfigStore } from "@/stores/status_firewall";
import { useDHCPv4ConfigStore } from "@/stores/status_dhcp_v4";
import { useIPv6PDStore } from "@/stores/status_ipv6pd";
import { useLanIPv6Store } from "@/stores/status_lan_ipv6";
import { useRouteLanConfigStore } from "@/stores/status_route_lan";
import { useRouteWanConfigStore } from "@/stores/status_route_wan";
import { useIpConfigStore } from "@/stores/status_ipconfig";
import { useMSSClampConfigStore } from "@/stores/status_mss_clamp";
import { useWifiConfigStore } from "@/stores/status_wifi";
import { overviewCardStyles } from "@/components/overviewCardStyle";

const { t } = useI18n();
const themeVars = useThemeVars();
const ifaceStore = useIfaceNodeStore();
const dnsStore = useDnsStore();
const metricStore = useMetricStore();
const serviceGroups = [
  { label: "IP", stores: [useIpConfigStore()] },
  { label: "NAT", stores: [useNATConfigStore()] },
  { label: t("sysinfo.firewall"), stores: [useFirewallConfigStore()] },
  { label: "DHCP", stores: [useDHCPv4ConfigStore()] },
  {
    label: "IPv6",
    stores: [useIPv6PDStore(), useLanIPv6Store()],
  },
  {
    label: t("sysinfo.routing"),
    stores: [useRouteLanConfigStore(), useRouteWanConfigStore()],
  },
  { label: "MSS", stores: [useMSSClampConfigStore()] },
  { label: "Wi-Fi", stores: [useWifiConfigStore()] },
];

const groupStatus = (statuses: ServiceStatus[]): ServiceStatus | undefined => {
  const order = [
    ServiceStatusType.Failed,
    ServiceStatusType.Stopping,
    ServiceStatusType.Staring,
    ServiceStatusType.Stop,
    ServiceStatusType.Running,
  ];
  const type = order.find((value) =>
    statuses.some((status) => status.t === value),
  );
  return type ? { t: type } : undefined;
};

const details = computed(() => [
  { label: "DNS", status: dnsStore.dns_status, count: 1 },
  {
    label: t("sysinfo.metrics"),
    status: metricStore.metric_status,
    count: 1,
  },
  ...serviceGroups.map((group) => {
    const statuses = ifaceStore.net_devs.flatMap((iface) =>
      group.stores
        .map((store) => store.GET_STATUS_BY_IFACE_NAME(iface.name).value)
        .filter((status): status is ServiceStatus => Boolean(status)),
    );
    return {
      label: group.label,
      status: groupStatus(statuses),
      count: statuses.length,
    };
  }),
]);

const summary = computed(() => {
  const statuses: ServiceStatus[] = [
    dnsStore.dns_status,
    metricStore.metric_status,
  ];
  for (const iface of ifaceStore.net_devs) {
    for (const group of serviceGroups) {
      for (const store of group.stores) {
        const status = store.GET_STATUS_BY_IFACE_NAME(iface.name).value;
        if (status) statuses.push(status);
      }
    }
  }

  return {
    total: statuses.length,
    running: statuses.filter((status) => status.t === ServiceStatusType.Running)
      .length,
    failed: statuses.filter((status) => status.t === ServiceStatusType.Failed)
      .length,
    stopped: statuses.filter((status) => status.t === ServiceStatusType.Stop)
      .length,
    changing: statuses.filter(
      (status) =>
        status.t === ServiceStatusType.Staring ||
        status.t === ServiceStatusType.Stopping,
    ).length,
  };
});

const healthy = computed(
  () =>
    summary.value.failed === 0 &&
    summary.value.stopped === 0 &&
    summary.value.changing === 0,
);

const healthType = computed(() =>
  summary.value.failed ? "error" : healthy.value ? "success" : "warning",
);

const serviceCardContentStyle = {
  ...overviewCardStyles.content,
  gridTemplateRows: "44px auto minmax(0, 1fr)",
  rowGap: "10px",
};
</script>

<template>
  <n-card
    class="overview-card"
    :style="overviewCardStyles.card"
    :header-style="overviewCardStyles.header"
    :content-style="serviceCardContentStyle"
  >
    <template #header>{{ t("sysinfo.service_health") }}</template>
    <template #header-extra>
      <n-tag size="small" :bordered="false" :type="healthType">
        {{ healthy ? t("sysinfo.healthy") : t("sysinfo.needs_attention") }}
      </n-tag>
    </template>

    <n-flex
      vertical
      justify="end"
      class="overview-card__primary"
      :style="overviewCardStyles.primary"
    >
      <n-statistic :label="t('sysinfo.running_services')">
        <n-text :type="healthy ? 'success' : 'default'" strong>
          {{ summary.running }} / {{ summary.total }}
        </n-text>
      </n-statistic>
      <n-progress
        type="line"
        :show-indicator="false"
        :percentage="
          summary.total ? (summary.running / summary.total) * 100 : 0
        "
        :status="summary.failed ? 'error' : 'success'"
      />
    </n-flex>

    <n-divider
      class="overview-card__divider"
      :style="overviewCardStyles.divider"
    />

    <n-grid :cols="2" :x-gap="14" :y-gap="4" class="health-details">
      <n-gi v-for="item in details" :key="item.label">
        <n-flex justify="space-between" align="center" :wrap="false">
          <n-flex align="center" :size="5" :wrap="false">
            <span
              class="status-dot"
              :style="{
                backgroundColor: get_service_status_color(
                  item.status,
                  themeVars,
                ),
              }"
            />
            <n-text class="service-name">{{ item.label }}</n-text>
            <n-text v-if="item.count > 1" depth="3" class="instance-count">
              ×{{ item.count }}
            </n-text>
          </n-flex>
          <n-text depth="3" class="status-label">
            {{ get_service_status_label(item.status, t) }}
          </n-text>
        </n-flex>
      </n-gi>
    </n-grid>
  </n-card>
</template>

<style scoped>
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}

.service-name,
.status-label,
.instance-count {
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}

.status-label {
  margin-left: 4px;
}
</style>
