<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useMetricStore } from "@/stores/status_metric";
import { useFrontEndStore } from "@/stores/front_end_config";
import {
  ConnectFilter,
  queryNumber,
  queryString,
  summarizeConnections,
} from "@/lib/metric.rs";
import { formatRate, formatPackets } from "@/lib/util";
import { useThemeVars } from "naive-ui";
import ConnectVirtualList from "@/components/metric/connect/live/ConnectVirtualList.vue";
import FlowSelect from "@/components/flow/FlowSelect.vue";
import ConnectViewSwitcher from "@/components/metric/connect/ConnectViewSwitcher.vue";
import { ArrowDown, ArrowUp, ArrowsVertical } from "@vicons/carbon";
import type { ConnectRealtimeStatus } from "@landscape-router/types/api/schemas";

const metricStore = useMetricStore();
const frontEndStore = useFrontEndStore();
const themeVars = useThemeVars();
const route = useRoute();
const { t } = useI18n();

// Live filter state
const liveFilter = reactive(new ConnectFilter());

// Protocol options
const protocolOptions = computed(() => [
  { label: t("metric.connect.all_types"), value: null },
  { label: "TCP", value: 6 },
  { label: "UDP", value: 17 },
  { label: "ICMP", value: 1 },
  { label: "ICMPv6", value: 58 },
]);

// IP type options
const ipTypeOptions = computed(() => [
  { label: t("metric.connect.all_types"), value: null },
  { label: "IPv4", value: 0 },
  { label: "IPv6", value: 1 },
]);

// Direction options
const gressOptions = computed(() => [
  { label: t("metric.connect.all_types"), value: null },
  { label: t("metric.connect.filter.gress_egress"), value: 1 },
  { label: t("metric.connect.filter.gress_ingress"), value: 0 },
]);

// Sorting state
const sortKey = computed(() => frontEndStore.conn_sort_key);
const sortOrder = computed(() => frontEndStore.conn_sort_order);

const resetLiveFilter = () => {
  Object.assign(liveFilter, new ConnectFilter());
};

const toggleSort = (key: "time" | "port" | "ingress" | "egress") => {
  if (frontEndStore.conn_sort_key === key) {
    frontEndStore.conn_sort_order =
      frontEndStore.conn_sort_order === "asc" ? "desc" : "asc";
  } else {
    frontEndStore.conn_sort_key = key;
    frontEndStore.conn_sort_order = "desc";
  }
};
const sortIcon = (key: "time" | "port" | "ingress" | "egress") =>
  sortKey.value !== key
    ? ArrowsVertical
    : sortOrder.value === "asc"
      ? ArrowUp
      : ArrowDown;
const handleSearchTuple = (conn: ConnectRealtimeStatus) => {
  liveFilter.src_ip = conn.src_ip;
  liveFilter.dst_ip = conn.dst_ip;
  liveFilter.port_start = conn.src_port;
  liveFilter.port_end = conn.dst_port;
};

// System-wide summary
const systemStats = computed(() =>
  summarizeConnections(metricStore.firewall_info),
);

// Calculate filtered and sorted connection metrics
const filteredConnectMetrics = computed(() => {
  if (!metricStore.firewall_info) return [];

  const filtered = metricStore.firewall_info.filter((item) => {
    if (liveFilter.src_ip && !item.src_ip.includes(liveFilter.src_ip))
      return false;
    if (liveFilter.dst_ip && !item.dst_ip.includes(liveFilter.dst_ip))
      return false;
    if (
      liveFilter.port_start !== null &&
      item.src_port !== liveFilter.port_start
    )
      return false;
    if (liveFilter.port_end !== null && item.dst_port !== liveFilter.port_end)
      return false;
    if (liveFilter.l3_proto !== null && item.l3_proto !== liveFilter.l3_proto)
      return false;
    if (liveFilter.l4_proto !== null && item.l4_proto !== liveFilter.l4_proto)
      return false;
    if (liveFilter.flow_id !== null && item.flow_id !== liveFilter.flow_id)
      return false;
    if (liveFilter.gress !== null && item.gress !== liveFilter.gress)
      return false;
    if (liveFilter.ifindex !== null && item.ifindex !== liveFilter.ifindex)
      return false;
    return true;
  });

  return filtered.sort((a, b) => {
    let result = 0;
    if (sortKey.value === "time") {
      const timeA = a.last_report_time || a.create_time_ms || 0;
      const timeB = b.last_report_time || b.create_time_ms || 0;
      result = timeA - timeB;
    } else if (sortKey.value === "port") {
      result = (a.src_port || 0) - (b.src_port || 0);
    } else if (sortKey.value === "ingress") {
      result = (a.ingress_bps || 0) - (b.ingress_bps || 0);
    } else if (sortKey.value === "egress") {
      result = (a.egress_bps || 0) - (b.egress_bps || 0);
    }
    return sortOrder.value === "asc" ? result : -result;
  });
});

// Filtered data summary
const totalStats = computed(() =>
  summarizeConnections(filteredConnectMetrics.value),
);

onMounted(async () => {
  // Initialize filters from route query
  const srcIp = queryString(route.query.src_ip);
  const dstIp = queryString(route.query.dst_ip);
  const portStart = queryNumber(route.query.port_start);
  const portEnd = queryNumber(route.query.port_end);
  const flowId = queryNumber(route.query.flow_id);
  const ifindex = queryNumber(route.query.ifindex);

  if (srcIp) liveFilter.src_ip = srcIp;
  if (dstIp) liveFilter.dst_ip = dstIp;
  if (portStart !== null) liveFilter.port_start = portStart;
  if (portEnd !== null) liveFilter.port_end = portEnd;
  if (flowId !== null) liveFilter.flow_id = flowId;
  if (ifindex !== null) liveFilter.ifindex = ifindex;

  await metricStore.UPDATE_INFO();
});
</script>

<template>
  <n-flex vertical :size="0" style="flex: 1; overflow: hidden">
    <!-- System-wide active connection stats -->
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
            <span :style="{ fontWeight: 'bold', color: themeVars.infoColor }">{{
              formatRate(systemStats.egressBps)
            }}</span>
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
        </n-flex>
      </n-flex>
    </n-card>

    <!-- Live mode toolbar -->
    <n-flex align="center" :wrap="true" style="margin-bottom: 12px">
      <n-input
        v-model:value="liveFilter.src_ip"
        :placeholder="$t('metric.connect.filter.src_ip')"
        clearable
        style="width: 170px"
      />
      <n-input
        v-model:value="liveFilter.dst_ip"
        :placeholder="$t('metric.connect.filter.dst_ip')"
        clearable
        style="width: 170px"
      />
      <n-input-group style="width: 220px">
        <n-input-number
          v-model:value="liveFilter.port_start"
          :placeholder="$t('metric.connect.filter.port_start')"
          :show-button="false"
          clearable
        />
        <n-input-group-label>=></n-input-group-label>
        <n-input-number
          v-model:value="liveFilter.port_end"
          :placeholder="$t('metric.connect.filter.port_end')"
          :show-button="false"
          clearable
        />
      </n-input-group>
      <n-select
        v-model:value="liveFilter.l4_proto"
        :placeholder="$t('metric.connect.filter.proto')"
        :options="protocolOptions"
        clearable
        style="width: 130px"
      />
      <n-select
        v-model:value="liveFilter.l3_proto"
        :placeholder="$t('metric.connect.filter.l3_proto')"
        :options="ipTypeOptions"
        clearable
        style="width: 110px"
      />
      <n-select
        v-model:value="liveFilter.gress"
        :placeholder="$t('metric.connect.filter.gress')"
        :options="gressOptions"
        clearable
        style="width: 110px"
      />
      <FlowSelect v-model="liveFilter.flow_id" width="120px" />

      <n-button-group>
        <n-button @click="metricStore.UPDATE_INFO()" type="primary">{{
          $t("metric.connect.stats.refresh_sample")
        }}</n-button>
        <n-button @click="resetLiveFilter">{{
          $t("metric.connect.reset")
        }}</n-button>
      </n-button-group>
    </n-flex>

    <n-grid x-gap="12" :cols="5" style="margin-bottom: 12px">
      <n-gi>
        <n-card
          size="small"
          :bordered="false"
          style="background-color: var(--app-surface-color); height: 100%"
        >
          <n-statistic
            :label="$t('metric.connect.stats.filter_total')"
            :value="totalStats.count"
          />
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small"
          :bordered="false"
          style="background-color: var(--app-surface-color); height: 100%"
        >
          <n-statistic :label="$t('metric.connect.stats.total_egress')">
            <span :style="{ color: themeVars.infoColor, fontWeight: 'bold' }">
              {{ formatRate(totalStats.egressBps) }}
            </span>
          </n-statistic>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small"
          :bordered="false"
          style="background-color: var(--app-surface-color); height: 100%"
        >
          <n-statistic :label="$t('metric.connect.stats.total_ingress')">
            <span
              :style="{ color: themeVars.successColor, fontWeight: 'bold' }"
            >
              {{ formatRate(totalStats.ingressBps) }}
            </span>
          </n-statistic>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small"
          :bordered="false"
          style="background-color: var(--app-surface-color); height: 100%"
        >
          <n-statistic :label="$t('metric.connect.stats.filter_ingress_pkts')">
            <span style="color: var(--app-text-muted-color)">
              {{ formatPackets(totalStats.ingressPps) }}
            </span>
          </n-statistic>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small"
          :bordered="false"
          style="background-color: var(--app-surface-color); height: 100%"
        >
          <n-statistic :label="$t('metric.connect.stats.filter_egress_pkts')">
            <span style="color: var(--app-text-muted-color)">
              {{ formatPackets(totalStats.egressPps) }}
            </span>
          </n-statistic>
        </n-card>
      </n-gi>
    </n-grid>

    <div class="connect-list-header">
      <div class="sortable-column" :class="{ active: sortKey === 'time' }">
        <span>{{ $t("metric.connect.filter.time") }}</span
        ><n-button text class="sort-trigger" @click="toggleSort('time')"
          ><n-icon size="18" :component="sortIcon('time')"
        /></n-button>
      </div>
      <span></span>
      <div class="sortable-column" :class="{ active: sortKey === 'port' }">
        <span>{{ $t("metric.connect.filter.port") }}</span
        ><n-button text class="sort-trigger" @click="toggleSort('port')"
          ><n-icon size="18" :component="sortIcon('port')"
        /></n-button>
      </div>
      <div class="sortable-column" :class="{ active: sortKey === 'egress' }">
        <span>{{ $t("metric.connect.stats.egress") }}</span
        ><n-button text class="sort-trigger" @click="toggleSort('egress')"
          ><n-icon size="18" :component="sortIcon('egress')"
        /></n-button>
      </div>
      <div class="sortable-column" :class="{ active: sortKey === 'ingress' }">
        <span>{{ $t("metric.connect.stats.ingress") }}</span
        ><n-button text class="sort-trigger" @click="toggleSort('ingress')"
          ><n-icon size="18" :component="sortIcon('ingress')"
        /></n-button>
      </div>
      <span></span>
    </div>

    <ConnectVirtualList
      v-if="filteredConnectMetrics"
      :connect_metrics="filteredConnectMetrics"
      @search:tuple="handleSearchTuple"
      @search:src="(ip) => (liveFilter.src_ip = ip)"
      @search:dst="(ip) => (liveFilter.dst_ip = ip)"
    />
  </n-flex>
</template>

<style scoped>
.connect-list-header {
  display: grid;
  grid-template-columns: 220px 270px minmax(240px, 1fr) 120px 128px 28px;
  column-gap: var(--app-space-sm);
  align-items: center;
  min-height: 42px;
  padding: 0 14px;
  background: var(--app-surface-interactive-color);
  border-bottom: 1px solid var(--app-border-subtle-color);
  box-sizing: border-box;
}

.sortable-column {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-2xs);
  color: var(--app-text-secondary-color);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.sortable-column.active {
  color: var(--app-brand-color);
}

.sort-trigger {
  color: var(--app-text-muted-color);
}
.sortable-column.active .sort-trigger {
  color: var(--app-brand-color);
}

.sortable-column:nth-child(5) {
  padding-left: 8px;
}
</style>
