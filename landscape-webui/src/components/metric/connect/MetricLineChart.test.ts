import { shallowMount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VChart from "vue-echarts";

import i18n from "@/i18n";
import MetricLineChart from "./MetricLineChart.vue";

describe("MetricLineChart", () => {
  it("shows missing tooltip values as no data instead of zero", () => {
    const wrapper = shallowMount(MetricLineChart, {
      props: {
        compact: true,
        series: [{ name: "rate", data: [[1, null]] }],
        xAxisTitle: "",
        yAxisTitle: "",
        valueFormatter: (value) => `${value} bps`,
      },
      global: { plugins: [i18n] },
    });
    const option = wrapper.findComponent(VChart).props("option") as any;

    expect(option.tooltip.valueFormatter(null)).toBe("暂无数据");
    expect(option.tooltip.valueFormatter(undefined)).toBe("暂无数据");
    expect(option.tooltip.valueFormatter("-")).toBe("暂无数据");
    expect(option.tooltip.valueFormatter(0)).toBe("0 bps");
  });
});
