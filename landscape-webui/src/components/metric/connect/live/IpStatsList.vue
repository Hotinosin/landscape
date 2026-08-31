<script setup lang="ts">
import { ref, computed, h } from "vue";
import { formatRate, formatPackets } from "@/lib/util";
import { useThemeVars, NTooltip, NIcon, NButton } from "naive-ui";
import { Search, SearchLocate as GlobeSearch24Regular } from "@vicons/carbon";
import type { DataTableSortState } from "naive-ui";
import type { FlowIpRealtimeStat } from "@/stores/status_metric";
import FlowExhibit from "@/components/flow/FlowExhibit.vue";

import { useI18n } from "vue-i18n";
import { useFrontEndStore } from "@/stores/front_end_config";
import { mask_string } from "@/lib/common";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";

const frontEndStore = useFrontEndStore();
const enrolledDeviceStore = useEnrolledDeviceStore();

const props = defineProps<{
  stats: FlowIpRealtimeStat[];
  title: string;
  ipLabel: string;
  showGeoLookup?: boolean;
}>();

const { t } = useI18n();
const emit = defineEmits(["search:ip"]);

const themeVars = useThemeVars();

type SortKey = "ip" | keyof FlowIpRealtimeStat["stats"];

const sortKey = ref<SortKey>("egress_bps");
const sortOrder = ref<"asc" | "desc">("desc");

const columns = computed(() => [
  {
    title: props.ipLabel,
    key: "ip",
    sorter: "default",
    render: (row: FlowIpRealtimeStat) => {
      return h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "var(--app-space-section)",
          },
        },
        [
          h("div", { style: { display: "flex", flexDirection: "column" } }, [
            h(
              "span",
              { style: { fontWeight: "500" } },
              enrolledDeviceStore.GET_NAME_WITH_FALLBACK(row.ip),
            ),
            enrolledDeviceStore.GET_NAME_WITH_FALLBACK(row.ip) !==
            frontEndStore.MASK_INFO(row.ip)
              ? h(
                  "span",
                  { style: { fontSize: "12px", opacity: 0.5 } },
                  frontEndStore.MASK_INFO(row.ip),
                )
              : null,
          ]),
          props.showGeoLookup
            ? h(
                NTooltip,
                { trigger: "hover", placement: "right" },
                {
                  trigger: () =>
                    h(
                      NButton,
                      {
                        text: true,
                        tag: "a",
                        href: `https://edge-geo.y8955.workers.dev/${row.ip}`,
                        target: "_blank",
                        style: {
                          fontSize: "16px",
                          color: themeVars.value.warningColor,
                          opacity: 0.6,
                          display: "flex",
                          transition: "opacity 0.2s",
                        },
                        onMouseenter: (e: MouseEvent) => {
                          (e.currentTarget as HTMLElement).style.opacity = "1";
                        },
                        onMouseleave: (e: MouseEvent) => {
                          (e.currentTarget as HTMLElement).style.opacity =
                            "0.6";
                        },
                      },
                      {
                        icon: () =>
                          h(NIcon, { component: GlobeSearch24Regular }),
                      },
                    ),
                  default: () =>
                    t("metric.connect.ip_stats.query_ip_ownership"),
                },
              )
            : null,
          h(
            NTooltip,
            { trigger: "hover", placement: "right" },
            {
              trigger: () =>
                h(
                  NButton,
                  {
                    text: true,
                    style: {
                      fontSize: "16px",
                      color: themeVars.value.infoColor,
                      opacity: 0.6,
                      display: "flex",
                      transition: "opacity 0.2s",
                    },
                    onMouseenter: (e: MouseEvent) => {
                      (e.currentTarget as HTMLElement).style.opacity = "1";
                    },
                    onMouseleave: (e: MouseEvent) => {
                      (e.currentTarget as HTMLElement).style.opacity = "0.6";
                    },
                    onClick: () => emit("search:ip", row.ip),
                  },
                  {
                    icon: () => h(NIcon, { component: Search }),
                  },
                ),
              default: () => t("metric.connect.tip.search_ip"),
            },
          ),
        ],
      );
    },
  },
  {
    title: t("metric.connect.col.flow"),
    key: "flow_id",
    render: (row: FlowIpRealtimeStat) => {
      if (row.flow_id === undefined) return "-";
      if (row.flow_id === 0) {
        return h(
          "n-tag",
          {
            type: "info",
            bordered: false,
            size: "small",
            style: { opacity: 0.6 },
          },
          { default: () => t("metric.connect.tip.default_flow") },
        );
      }
      return h(FlowExhibit, {
        flow_id: row.flow_id,
      });
    },
  },
  {
    title: t("metric.connect.col.active_conns"),
    key: "active_conns",
    sorter: (a: FlowIpRealtimeStat, b: FlowIpRealtimeStat) =>
      a.stats.active_conns - b.stats.active_conns,
    render: (row: FlowIpRealtimeStat) => row.stats.active_conns,
  },
  {
    title: t("metric.connect.col.egress_rate"),
    key: "egress_bps",
    sorter: (a: FlowIpRealtimeStat, b: FlowIpRealtimeStat) =>
      a.stats.egress_bps - b.stats.egress_bps,
    render: (row: FlowIpRealtimeStat) => {
      return h(
        "span",
        {
          style: { color: themeVars.value.infoColor, fontWeight: "bold" },
        },
        formatRate(row.stats.egress_bps),
      );
    },
  },
  {
    title: t("metric.connect.col.ingress_rate"),
    key: "ingress_bps",
    sorter: (a: FlowIpRealtimeStat, b: FlowIpRealtimeStat) =>
      a.stats.ingress_bps - b.stats.ingress_bps,
    render: (row: FlowIpRealtimeStat) => {
      return h(
        "span",
        {
          style: { color: themeVars.value.successColor, fontWeight: "bold" },
        },
        formatRate(row.stats.ingress_bps),
      );
    },
  },
  {
    title: t("metric.connect.col.egress_pps"),
    key: "egress_pps",
    sorter: (a: FlowIpRealtimeStat, b: FlowIpRealtimeStat) =>
      a.stats.egress_pps - b.stats.egress_pps,
    render: (row: FlowIpRealtimeStat) => formatPackets(row.stats.egress_pps),
  },
  {
    title: t("metric.connect.col.ingress_pps"),
    key: "ingress_pps",
    sorter: (a: FlowIpRealtimeStat, b: FlowIpRealtimeStat) =>
      a.stats.ingress_pps - b.stats.ingress_pps,
    render: (row: FlowIpRealtimeStat) => formatPackets(row.stats.ingress_pps),
  },
]);

const handleSort = (sorter: DataTableSortState | null) => {
  if (sorter && typeof sorter.columnKey === "string") {
    sortKey.value = sorter.columnKey as SortKey;
    sortOrder.value = sorter.order === "ascend" ? "asc" : "desc";
  }
};

const processedData = computed(() => {
  const data = [...props.stats];
  return data.sort((a, b) => {
    let vA, vB;
    if (sortKey.value === "ip") {
      vA = a.ip;
      vB = b.ip;
    } else {
      const key = sortKey.value;
      vA = a.stats[key];
      vB = b.stats[key];
    }
    const result = vA > vB ? 1 : vA < vB ? -1 : 0;
    return sortOrder.value === "asc" ? result : -result;
  });
});
</script>

<template>
  <n-flex vertical style="flex: 1; overflow: hidden">
    <n-flex align="center" justify="space-between" style="margin-bottom: 12px">
      <n-h3 style="margin: 0">{{ title }}</n-h3>
      <n-text depth="3">
        {{ $t("metric.connect.stats.total_nodes", { count: stats.length }) }}
      </n-text>
    </n-flex>

    <n-data-table
      remote
      size="small"
      :columns="columns"
      :data="processedData"
      :pagination="false"
      :max-height="'calc(100vh - 350px)'"
      @update:sorter="handleSort"
    />
  </n-flex>
</template>
