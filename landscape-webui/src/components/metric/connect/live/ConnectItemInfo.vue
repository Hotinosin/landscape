<script setup lang="ts">
import type {
  ConnectKey,
  ConnectRealtimeStatus,
} from "@landscape-router/types/api/schemas";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useRouter } from "vue-router";
import {
  ChartLine,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Search,
  Catalog,
  SearchLocate as GlobeSearch24Regular,
} from "@vicons/carbon";
import { mask_string } from "@/lib/common";
import { formatRate, formatPackets } from "@/lib/util";
import { useThemeVars } from "naive-ui";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const enrolledDeviceStore = useEnrolledDeviceStore();

const frontEndStore = useFrontEndStore();
const themeVars = useThemeVars();
const router = useRouter();
import { usePreferenceStore } from "@/stores/preference";
const prefStore = usePreferenceStore();

interface Props {
  conn: ConnectRealtimeStatus;
  index?: number;
}

const props = defineProps<Props>();

function l4_proto(value: number): string {
  if (value == 6) {
    return "TCP";
  } else if (value == 17) {
    return "UDP";
  } else if (value == 1) {
    return "ICMP";
  }
  return "Unknow";
}

const lastActiveTime = (conn: ConnectRealtimeStatus) => {
  return conn.last_report_time || Date.now();
};

const goToHistory = (conn: ConnectRealtimeStatus) => {
  router.push({
    path: "/metrics/conn/history",
    query: {
      src_ip: conn.src_ip,
      dst_ip: conn.dst_ip,
      port_start: conn.src_port,
      port_end: conn.dst_port,
      flow_id: conn.flow_id,
      ifindex: conn.ifindex,
    },
  });
};

const emit = defineEmits([
  "show:chart",
  "search:tuple",
  "search:src",
  "search:dst",
]);
</script>

<template>
  <div
    class="box"
    :style="{
      backgroundColor:
        (index ?? 0) % 2 === 1
          ? 'var(--app-surface-alternate-color)'
          : 'var(--app-surface-color)',
    }"
  >
    <n-card
      size="small"
      :bordered="false"
      style="background: transparent"
      content-style="padding: 4px var(--app-space-section)"
    >
      <n-flex align="center" justify="space-between" :wrap="false">
        <n-flex class="connect-row-main" align="center" :wrap="false">
          <n-flex align="center" :wrap="false" style="flex: 0 0 220px">
            <n-tooltip trigger="hover">
              <template #trigger>
                <div style="cursor: help">
                  <n-flex align="center" :wrap="false" size="small">
                    <span
                      class="metric-muted"
                      style="font-size: var(--app-font-size-caption)"
                      >{{ $t("metric.connect.filter.now") }}</span
                    >
                    <n-time
                      :time="lastActiveTime(conn)"
                      format="HH:mm:ss"
                      :time-zone="prefStore.timezone"
                    />
                    <n-divider vertical />
                    <span
                      class="metric-muted"
                      style="font-size: var(--app-font-size-caption)"
                    >
                      <DurationTime
                        :seconds="
                          Math.max(
                            0,
                            lastActiveTime(conn) - conn.create_time_ms,
                          ) / 1000
                        "
                      />
                    </span>
                  </n-flex>
                </div>
              </template>
              {{ $t("metric.connect.filter.create_time") }}:
              <n-time
                :time="conn.create_time_ms"
                format="yyyy-MM-dd HH:mm:ss"
                :time-zone="prefStore.timezone"
              />
            </n-tooltip>
          </n-flex>

          <n-flex
            :wrap="false"
            style="
              flex: 0 0 270px;
              font-variant-numeric: tabular-nums;
              font-family: var(--font-mono);
            "
          >
            <n-tag type="success" :bordered="false" size="small">
              {{ conn.l3_proto == 0 ? "IPV4" : "IPV6" }}
            </n-tag>
            <n-tag type="info" :bordered="false" size="small">
              {{ l4_proto(conn.l4_proto) }}
            </n-tag>
            <n-tag
              v-if="conn.gress === 0"
              type="warning"
              :bordered="false"
              size="small"
            >
              IN
            </n-tag>

            <n-tag
              v-if="conn.flow_id != 0"
              type="info"
              :bordered="false"
              size="small"
            >
              FLOW: {{ conn.flow_id }}
            </n-tag>
            <n-tag :bordered="false" size="small">
              IF: {{ conn.ifindex }}
            </n-tag>
          </n-flex>

          <n-flex
            class="connect-endpoints"
            align="center"
            :wrap="false"
            style="font-variant-numeric: tabular-nums"
            size="small"
          >
            <div
              style="
                display: inline-flex;
                align-items: center;
                gap: var(--app-space-2xs);
              "
              :style="{
                flexDirection: conn.gress === 0 ? 'row-reverse' : 'row',
              }"
            >
              <span>{{
                `${enrolledDeviceStore.GET_NAME_WITH_FALLBACK(conn.src_ip)}:${frontEndStore.MASK_PORT(conn.src_port)}`
              }}</span>
              <n-icon size="14" color="var(--app-text-muted-color)">
                <ArrowRight />
              </n-icon>
              <span>{{
                `${enrolledDeviceStore.GET_NAME_WITH_FALLBACK(conn.dst_ip)}:${frontEndStore.MASK_PORT(conn.dst_port)}`
              }}</span>
            </div>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  text
                  tag="a"
                  :href="`https://edge-geo.y8955.workers.dev/${conn.dst_ip}`"
                  target="_blank"
                  @click.stop
                  :style="{
                    fontSize: '16px',
                    color: themeVars.warningColor,
                    opacity: 0.7,
                  }"
                >
                  <n-icon><GlobeSearch24Regular /></n-icon>
                </n-button>
              </template>
              {{ t("metric.connect.ip_stats.query_ip_ownership") }}
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  text
                  @click.stop="emit('search:tuple', conn)"
                  :style="{
                    fontSize: '16px',
                    color: themeVars.infoColor,
                    opacity: 0.7,
                  }"
                >
                  <n-icon><Search /></n-icon>
                </n-button>
              </template>
              {{ $t("metric.connect.tip.precise_filter") }}
            </n-tooltip>

            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  text
                  @click.stop="goToHistory(conn)"
                  :style="{
                    fontSize: '16px',
                    opacity: 0.7,
                  }"
                >
                  <n-icon><Catalog /></n-icon>
                </n-button>
              </template>
              {{ $t("metric.connect.tip.view_history") }}
            </n-tooltip>
          </n-flex>

          <!-- 速率展示 -->
          <n-flex
            class="connect-rate"
            align="center"
            :wrap="false"
            style="gap: var(--app-space-lg)"
          >
            <!-- 出站 (Egress) -->
            <n-flex
              align="center"
              :wrap="false"
              size="small"
              style="width: 120px"
            >
              <n-icon
                :color="themeVars.infoColor"
                size="20"
                :style="{
                  filter: `drop-shadow(0 0 4px ${themeVars.infoColor}88)`,
                }"
              >
                <ArrowUp />
              </n-icon>
              <n-flex vertical :size="[-4, 0]" style="flex: 1">
                <span
                  style="
                    font-size: var(--app-font-size-label);
                    font-weight: 600;
                    font-variant-numeric: tabular-nums;
                    line-height: 1.2;
                    white-space: nowrap;
                  "
                >
                  {{ formatRate(conn.egress_bps) }}
                </span>
                <span
                  style="
                    font-size: var(--app-font-size-micro);
                    color: var(--app-text-muted-color);
                    font-variant-numeric: tabular-nums;
                    white-space: nowrap;
                  "
                >
                  {{ formatPackets(conn.egress_pps) }}
                </span>
              </n-flex>
            </n-flex>

            <!-- 进站 (Ingress) -->
            <n-flex
              align="center"
              :wrap="false"
              size="small"
              style="width: 120px"
            >
              <n-icon
                :color="themeVars.successColor"
                size="20"
                :style="{
                  filter: `drop-shadow(0 0 4px ${themeVars.successColor}88)`,
                }"
              >
                <ArrowDown />
              </n-icon>
              <n-flex vertical :size="[-4, 0]" style="flex: 1">
                <span
                  style="
                    font-size: var(--app-font-size-label);
                    font-weight: 600;
                    font-variant-numeric: tabular-nums;
                    line-height: 1.2;
                    white-space: nowrap;
                  "
                >
                  {{ formatRate(conn.ingress_bps) }}
                </span>
                <span
                  style="
                    font-size: var(--app-font-size-micro);
                    color: var(--app-text-muted-color);
                    font-variant-numeric: tabular-nums;
                    white-space: nowrap;
                  "
                >
                  {{ formatPackets(conn.ingress_pps) }}
                </span>
              </n-flex>
            </n-flex>
          </n-flex>
        </n-flex>

        <!-- 右侧区域：操作按钮 -->
        <n-flex align="center" :wrap="false">
          <!-- 图表按钮 -->
          <n-button
            :focusable="false"
            text
            style="font-size: var(--app-font-size-title)"
            @click="emit('show:chart', conn)"
          >
            <n-icon>
              <ChartLine />
            </n-icon>
          </n-button>
        </n-flex>
      </n-flex>
    </n-card>
  </div>
</template>

<style scoped>
.box {
  border: 2px solid transparent;
  transition: border-color 0.25s ease;
  width: 100%;
  box-sizing: border-box;
}

.box:hover {
  border-color: var(--app-brand-color);
}

.metric-muted {
  color: var(--app-text-muted-color);
}

.connect-row-main {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.connect-endpoints {
  min-width: 240px;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
}

.connect-endpoints > :first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connect-rate {
  flex: 0 0 256px;
}
</style>
