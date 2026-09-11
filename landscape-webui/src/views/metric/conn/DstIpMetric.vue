<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useMetricStore } from "@/stores/status_metric";
import { formatRate } from "@/lib/util";
import { useThemeVars } from "naive-ui";
import IpStatsList from "@/components/metric/connect/live/IpStatsList.vue";
import ConnectViewSwitcher from "@/components/metric/connect/ConnectViewSwitcher.vue";
import FlowSelect from "@/components/flow/FlowSelect.vue";
import type { FlowIpRealtimeStat } from "@/stores/status_metric";
import { summarizeConnections } from "@/lib/metric.rs";

const metricStore = useMetricStore();
const themeVars = useThemeVars();
const route = useRoute();

const ipFilter = ref("");
const flowFilter = ref<number | null>(null);

const stats = computed(() => {
  if (!ipFilter.value && flowFilter.value === null) {
    return metricStore.dst_ip_stats;
  }

  const connections = metricStore.firewall_info || [];
  const aggregatedMap = new Map<string, FlowIpRealtimeStat>();

  connections.forEach((conn) => {
    if (
      ipFilter.value &&
      !conn.dst_ip.toLowerCase().includes(ipFilter.value.toLowerCase())
    )
      return;
    if (flowFilter.value !== null && conn.flow_id !== flowFilter.value) return;

    const key = `${conn.dst_ip}_${conn.flow_id}`;
    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, {
        ip: conn.dst_ip,
        flow_id: conn.flow_id,
        stats: {
          active_conns: 0,
          ingress_bps: 0,
          egress_bps: 0,
          ingress_pps: 0,
          egress_pps: 0,
        },
      });
    }

    const item = aggregatedMap.get(key)!;
    item.stats.active_conns += 1;
    item.stats.ingress_bps += conn.ingress_bps || 0;
    item.stats.egress_bps += conn.egress_bps || 0;
    item.stats.ingress_pps += conn.ingress_pps || 0;
    item.stats.egress_pps += conn.egress_pps || 0;
  });

  return Array.from(aggregatedMap.values());
});

// 系统全局汇总
const systemStats = computed(() =>
  summarizeConnections(metricStore.firewall_info),
);

onMounted(() => {
  if (route.query.ip) ipFilter.value = route.query.ip as string;
  if (route.query.flow_id)
    flowFilter.value = parseInt(route.query.flow_id as string);
});
</script>

<template>
  <StandardRequestStatus
    :has-succeeded="metricStore.currentState.hasSucceeded"
    :loading="metricStore.currentState.loading"
    :error="metricStore.currentState.error"
    :last-success-at="metricStore.currentState.lastSuccessAt"
    @retry="metricStore.REFRESH_CURRENT"
  >
    <n-flex
      vertical
      :wrap="false"
      style="flex: 1; min-height: 0; overflow: hidden"
    >
      <!-- 系统全局活跃连接统计 -->
      <n-card
        size="small"
        :bordered="false"
        style="margin-bottom: 12px; background-color: var(--app-surface-color)"
      >
        <n-flex align="center" justify="space-between">
          <ConnectViewSwitcher />

          <n-flex align="center" size="large">
            <n-flex align="center" size="small">
              <span
                style="
                  color: var(--app-text-muted-color);
                  font-size: var(--app-font-size-label);
                "
                >{{ $t("metric.connect.stats.total_active_conns") }}:</span
              >
              <span style="font-weight: bold">{{ systemStats.count }}</span>
            </n-flex>
            <n-divider vertical />
            <n-flex align="center" size="small">
              <span
                style="
                  color: var(--app-text-muted-color);
                  font-size: var(--app-font-size-label);
                "
                >{{ $t("metric.connect.stats.total_egress") }}:</span
              >
              <span
                :style="{ fontWeight: 'bold', color: themeVars.infoColor }"
                >{{ formatRate(systemStats.egressBps) }}</span
              >
            </n-flex>
            <n-divider vertical />
            <n-flex align="center" size="small">
              <span
                style="
                  color: var(--app-text-muted-color);
                  font-size: var(--app-font-size-label);
                "
                >{{ $t("metric.connect.stats.total_ingress") }}:</span
              >
              <span
                :style="{ fontWeight: 'bold', color: themeVars.successColor }"
                >{{ formatRate(systemStats.ingressBps) }}</span
              >
            </n-flex>
            <IconActionButton
              kind="refresh"
              :tooltip="$t('metric.connect.stats.refresh_data')"
              :disabled="metricStore.currentState.loading"
              @click="metricStore.REFRESH_CURRENT()"
            />
          </n-flex>
        </n-flex>
      </n-card>

      <!-- 过滤器工具栏 -->
      <n-flex
        align="center"
        :wrap="true"
        style="margin-bottom: 12px"
        size="small"
      >
        <n-input
          v-model:value="ipFilter"
          :placeholder="$t('metric.connect.filter.search_dst')"
          clearable
          style="width: 200px"
        />
        <FlowSelect v-model="flowFilter" width="150px" />
      </n-flex>

      <IpStatsList
        :stats="stats"
        title=""
        :ip-label="$t('metric.connect.col.dst_ip')"
        show-geo-lookup
        @search:ip="(ip) => (ipFilter = ip)"
      />
    </n-flex>
  </StandardRequestStatus>
</template>
