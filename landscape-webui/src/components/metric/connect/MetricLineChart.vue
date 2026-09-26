<script setup lang="ts">
import { computed } from "vue";
import { useThemeVars } from "naive-ui";
import { useI18n } from "vue-i18n";
import VChart from "vue-echarts";
import { use, type ComposeOption } from "echarts/core";
import { LineChart, type LineSeriesOption } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
  type DataZoomComponentOption,
  type GridComponentOption,
  type LegendComponentOption,
  type ToolboxComponentOption,
  type TooltipComponentOption,
} from "echarts/components";

use([
  CanvasRenderer,
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
]);

type ECOption = ComposeOption<
  | LineSeriesOption
  | DataZoomComponentOption
  | GridComponentOption
  | LegendComponentOption
  | ToolboxComponentOption
  | TooltipComponentOption
>;

type MetricPoint = [timestamp: number, value: number | null];

interface MetricSeries {
  name: string;
  data: MetricPoint[];
}

interface Props {
  series: MetricSeries[];
  xAxisTitle: string;
  yAxisTitle: string;
  valueFormatter: (value: number) => string;
  compact?: boolean;
  colors?: string[];
}

const props = defineProps<Props>();
const themeVars = useThemeVars();
const { t, locale } = useI18n();

const updateOptions = { replaceMerge: ["series"] };

const timeSpan = computed(() => {
  const timestamps = props.series.flatMap((series) =>
    series.data.map(([timestamp]) => timestamp),
  );
  if (timestamps.length < 2) return 0;
  return Math.max(...timestamps) - Math.min(...timestamps);
});

const timeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(
      locale.value || "zh-CN",
      timeSpan.value > 2 * 24 * 3600 * 1000
        ? {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        : {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          },
    ),
);

const option = computed<ECOption>(() => ({
  animation: false,
  color: props.colors ?? [
    themeVars.value.successColor,
    themeVars.value.infoColor,
  ],
  textStyle: {
    color: themeVars.value.textColor2,
  },
  grid: {
    top: props.compact ? 8 : 52,
    right: props.compact ? 8 : 24,
    bottom: props.compact ? 8 : 32,
    left: props.compact ? 8 : 16,
    outerBoundsMode: "same",
    outerBoundsContain: "all",
  },
  legend: {
    show: !props.compact,
    type: "scroll",
    top: 8,
    left: 16,
    right: 112,
    textStyle: {
      color: themeVars.value.textColor2,
    },
  },
  tooltip: {
    show: !props.compact,
    trigger: "axis",
    backgroundColor: themeVars.value.popoverColor,
    borderColor: themeVars.value.borderColor,
    textStyle: {
      color: themeVars.value.textColor1,
    },
    valueFormatter: (value) =>
      value === null || value === undefined || value === "-"
        ? t("common.no_data")
        : props.valueFormatter(Number(value)),
  },
  toolbox: {
    show: !props.compact,
    top: 4,
    right: 16,
    itemSize: 16,
    itemGap: 10,
    iconStyle: {
      borderColor: themeVars.value.textColor3,
    },
    emphasis: {
      iconStyle: {
        borderColor: themeVars.value.primaryColor,
      },
    },
    feature: {
      dataZoom: {
        yAxisIndex: "none",
        title: {
          zoom: t("metric.connect.chart.zoom"),
          back: t("metric.connect.chart.zoom_back"),
        },
      },
      restore: {
        title: t("metric.connect.chart.reset_zoom"),
      },
    },
  },
  dataZoom: props.compact
    ? []
    : [
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "none",
        },
      ],
  xAxis: {
    type: "time",
    show: !props.compact,
    name: props.compact ? "" : props.xAxisTitle,
    nameLocation: "middle",
    nameGap: 26,
    nameTextStyle: {
      color: themeVars.value.textColor2,
    },
    axisLabel: {
      color: themeVars.value.textColor3,
      hideOverlap: true,
      formatter: (value: number) => timeFormatter.value.format(value),
    },
    axisLine: {
      lineStyle: {
        color: themeVars.value.borderColor,
      },
    },
    axisTick: {
      lineStyle: {
        color: themeVars.value.borderColor,
      },
    },
    splitLine: {
      show: false,
    },
  },
  yAxis: {
    type: "value",
    min: props.compact ? 0 : undefined,
    name: props.compact ? "" : props.yAxisTitle,
    nameLocation: "middle",
    nameGap: 54,
    nameTextStyle: {
      color: themeVars.value.textColor2,
    },
    axisLabel: {
      show: !props.compact,
      color: themeVars.value.textColor3,
      formatter: (value: number) => props.valueFormatter(value),
    },
    splitLine: {
      show: !props.compact,
      lineStyle: {
        color: themeVars.value.dividerColor,
      },
    },
  },
  series: props.series.map((series) => ({
    ...series,
    type: "line",
    smooth: true,
    connectNulls: false,
    showSymbol:
      props.compact &&
      series.data.filter(([, value]) => value !== null).length <= 1,
    symbolSize: 5,
    lineStyle: {
      width: 2,
    },
    emphasis: {
      focus: "series",
    },
  })),
}));
</script>

<template>
  <VChart
    :class="['metric-line-chart', { 'metric-line-chart--compact': compact }]"
    :option="option"
    :update-options="updateOptions"
    autoresize
  />
</template>

<style scoped>
.metric-line-chart {
  width: 100%;
  height: 300px;
}

.metric-line-chart--compact {
  height: 72px;
}
</style>
