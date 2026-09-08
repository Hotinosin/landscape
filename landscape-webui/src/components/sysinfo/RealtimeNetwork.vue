<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useThemeVars } from "naive-ui";
import { ArrowDown, ArrowUp } from "@vicons/carbon";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import { useIfaceNodeStore } from "@/stores/iface_node";
import { useMetricStore } from "@/stores/status_metric";
import { formatPackets, formatRate } from "@/lib/util";
import { overviewCardStyles } from "@/components/overviewCardStyle";

const { t } = useI18n();
const themeVars = useThemeVars();
const ifaceStore = useIfaceNodeStore();
const metricStore = useMetricStore();

const stats = computed(() => {
  const wanIndexes = new Set(
    ifaceStore.net_devs
      .filter((iface) => iface.zone_type === IfaceZoneType.wan)
      .map((iface) => iface.index),
  );
  return metricStore.iface_stats
    .filter((item) => wanIndexes.has(item.ifindex))
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

    <div class="overview-card__primary" :style="overviewCardStyles.primary">
      <n-grid :cols="2" :x-gap="12">
        <n-gi>
          <n-statistic :label="t('sysinfo.upload_rate')">
            <n-flex align="center" :wrap="false" :size="6">
              <n-icon :color="themeVars.infoColor"><ArrowUp /></n-icon>
              <n-text
                class="rate-value"
                :style="{ color: themeVars.infoColor, fontWeight: 600 }"
              >
                {{ formatRate(stats.egressBps) }}
              </n-text>
            </n-flex>
          </n-statistic>
        </n-gi>
        <n-gi>
          <n-statistic :label="t('sysinfo.download_rate')">
            <n-flex align="center" :wrap="false" :size="6">
              <n-icon :color="themeVars.successColor"><ArrowDown /></n-icon>
              <n-text
                class="rate-value"
                :style="{ color: themeVars.successColor, fontWeight: 600 }"
              >
                {{ formatRate(stats.ingressBps) }}
              </n-text>
            </n-flex>
          </n-statistic>
        </n-gi>
      </n-grid>
    </div>

    <n-divider
      class="overview-card__divider"
      :style="overviewCardStyles.divider"
    />

    <n-flex
      vertical
      :size="8"
      class="overview-card__secondary"
      :style="overviewCardStyles.secondary"
    >
      <n-flex justify="space-between">
        <n-text depth="3">{{ t("sysinfo.active_connections") }}</n-text>
        <n-text strong>{{ metricStore.firewall_info.length }}</n-text>
      </n-flex>
      <n-flex justify="space-between">
        <n-text depth="3">{{ t("sysinfo.packet_rate") }}</n-text>
        <n-text>
          ↑ {{ formatPackets(stats.egressPps) }} · ↓
          {{ formatPackets(stats.ingressPps) }}
        </n-text>
      </n-flex>
    </n-flex>
  </n-card>
</template>

<style scoped>
.rate-value {
  white-space: nowrap;
}
</style>
