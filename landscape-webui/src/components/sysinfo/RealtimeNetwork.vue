<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useThemeVars } from "naive-ui";
import { ArrowDown, ArrowUp } from "@vicons/carbon";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import { useIfaceNodeStore } from "@/stores/iface_node";
import { useMetricStore } from "@/stores/status_metric";
import { useSysInfo } from "@/stores/systeminfo";
import { formatPackets, formatRate } from "@/lib/util";
import { overviewCardStyles } from "@/components/overviewCardStyle";
import MetricLineChart from "@/components/metric/connect/MetricLineChart.vue";
import { resetNetworkTrend } from "./networkTrend";

const { t } = useI18n();
const themeVars = useThemeVars();
const ifaceStore = useIfaceNodeStore();
const metricStore = useMetricStore();
const sysInfo = useSysInfo();
const ifaceState = computed(() => metricStore.resourceStates.iface);
const connectionState = computed(() => metricStore.resourceStates.connections);
const metricError = computed(
  () => ifaceState.value.error || connectionState.value.error,
);
const hasAllMetrics = computed(
  () => ifaceState.value.hasSucceeded && connectionState.value.hasSucceeded,
);

const wanIndexes = computed(() =>
  ifaceStore.net_devs
    .filter((iface) => iface.zone_type === IfaceZoneType.wan)
    .map((iface) => iface.index)
    .sort((left, right) => left - right),
);
const wanIndexSet = computed(() => new Set(wanIndexes.value));
const stats = computed(() => {
  return metricStore.iface_stats
    .filter((item) => wanIndexSet.value.has(item.ifindex))
    .reduce(
      (total, item) => {
        total.egressBps += item.stats.egress_bps || 0;
        total.ingressBps += item.stats.ingress_bps || 0;
        total.egressPps += item.stats.egress_pps || 0;
        total.ingressPps += item.stats.ingress_pps || 0;
        return total;
      },
      {
        egressBps: 0,
        ingressBps: 0,
        egressPps: 0,
        ingressPps: 0,
      },
    );
});

const trend = metricStore.networkTrend;
const trendSeries = computed(() => ({
  all: [
    { name: t("sysinfo.upload_rate"), data: trend.upload },
    { name: t("sysinfo.download_rate"), data: trend.download },
  ],
}));

watch(
  () => sysInfo.router_status.uptime,
  (uptime, previous) => {
    if (previous > 0 && uptime < previous) resetNetworkTrend(trend);
  },
);

const wanCount = computed(
  () =>
    ifaceStore.net_devs.filter((iface) => iface.zone_type === IfaceZoneType.wan)
      .length,
);
</script>

<template>
  <n-card
    class="overview-card"
    :style="overviewCardStyles.card"
    :header-style="overviewCardStyles.header"
    :content-style="overviewCardStyles.content"
  >
    <template #header>{{ t("sysinfo.realtime_network") }}</template>
    <template #header-extra>
      <n-tag size="small" :bordered="false"> {{ wanCount }} WAN </n-tag>
    </template>

    <div class="network-summary">
      <n-flex
        vertical
        :size="8"
        class="overview-card__secondary"
        :style="overviewCardStyles.secondary"
      >
        <n-flex justify="space-between">
          <n-text depth="3">{{ t("sysinfo.active_connections") }}</n-text>
          <n-text v-if="connectionState.hasSucceeded" strong>
            {{ metricStore.firewall_info.length }}
          </n-text>
          <n-skeleton v-else text style="width: 30px" />
        </n-flex>
        <n-flex justify="space-between">
          <n-text depth="3">{{ t("sysinfo.packet_rate") }}</n-text>
          <n-text v-if="ifaceState.hasSucceeded">
            ↑ {{ formatPackets(stats.egressPps) }} · ↓
            {{ formatPackets(stats.ingressPps) }}
          </n-text>
          <n-skeleton v-else text style="width: 90px" />
        </n-flex>
        <n-flex v-if="metricError" justify="space-between" align="center">
          <n-text type="warning" class="metric-warning">
            {{
              t(
                hasAllMetrics
                  ? "common.refresh_failed_previous_result"
                  : "common.load_failed",
              )
            }}
          </n-text>
          <n-button
            size="tiny"
            secondary
            :loading="metricStore.currentState.loading"
            @click="metricStore.REFRESH_CURRENT"
          >
            {{ t("common.retry") }}
          </n-button>
        </n-flex>
      </n-flex>

      <div class="network-primary">
        <n-grid :cols="2" :x-gap="4">
          <n-gi class="rate-column">
            <n-statistic>
              <n-flex align="center" :wrap="false" :size="6">
                <n-icon size="20" :color="themeVars.infoColor">
                  <ArrowUp />
                </n-icon>
                <n-text
                  v-if="ifaceState.hasSucceeded"
                  class="rate-value"
                  :style="{ color: themeVars.infoColor, fontWeight: 600 }"
                >
                  {{ formatRate(stats.egressBps) }}
                </n-text>
                <n-skeleton v-else text style="width: 80px" />
              </n-flex>
            </n-statistic>
          </n-gi>
          <n-gi class="rate-column">
            <n-statistic>
              <n-flex align="center" :wrap="false" :size="6">
                <n-icon size="20" :color="themeVars.successColor">
                  <ArrowDown />
                </n-icon>
                <n-text
                  v-if="ifaceState.hasSucceeded"
                  class="rate-value"
                  :style="{ color: themeVars.successColor, fontWeight: 600 }"
                >
                  {{ formatRate(stats.ingressBps) }}
                </n-text>
                <n-skeleton v-else text style="width: 80px" />
              </n-flex>
            </n-statistic>
          </n-gi>
        </n-grid>
      </div>
    </div>

    <n-divider
      class="overview-card__divider"
      :style="overviewCardStyles.divider"
    />

    <div class="network-trends">
      <n-text v-if="!trend.upload.length" depth="3" class="collecting-trend">
        {{ t("sysinfo.collecting_network_trend") }}
      </n-text>
      <MetricLineChart
        v-else
        compact
        :series="trendSeries.all"
        x-axis-title=""
        y-axis-title=""
        :colors="[themeVars.infoColor, themeVars.successColor]"
        :value-formatter="formatRate"
      />
    </div>
  </n-card>
</template>

<style scoped>
.rate-value {
  display: block;
  font-size: var(--app-font-size-display);
  line-height: 1.4;
  white-space: nowrap;
}

.rate-column {
  min-width: 0;
}

.network-summary {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: var(--app-space-sm);
}

.network-primary {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.network-trends {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex: 1;
}

.collecting-trend {
  margin: auto;
}

.metric-warning,
.last-success {
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}
</style>
