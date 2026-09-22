import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";

import i18n from "@/i18n";
import { NetDev, DevStateType } from "@/lib/dev";
import { useIfaceNodeStore } from "@/stores/iface_node";
import { useMetricStore } from "@/stores/status_metric";
import MetricLineChart from "@/components/metric/connect/MetricLineChart.vue";
import RealtimeNetwork from "./RealtimeNetwork.vue";

describe("RealtimeNetwork", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("renders samples already collected by the metric store", async () => {
    const ifaceStore = useIfaceNodeStore();
    const metricStore = useMetricStore();
    ifaceStore.net_devs = [
      new NetDev({
        name: "wan0",
        index: 1,
        dev_type: "Ethernet",
        dev_kind: "ethernet",
        dev_status: { t: DevStateType.Up },
        carrier: true,
        zone_type: IfaceZoneType.wan,
        enable_in_boot: true,
      }),
    ];
    metricStore.iface_stats = [
      {
        ifindex: 1,
        last_report_time: 10,
        stats: {
          egress_bps: 0,
          ingress_bps: 20,
          egress_pps: 1,
          ingress_pps: 2,
        },
      } as never,
    ];
    metricStore.resourceStates.iface.lastSuccessAt = 1_000;
    metricStore.resourceStates.iface.hasSucceeded = true;
    metricStore.networkTrend.upload = [[1_000, 0]];
    metricStore.networkTrend.download = [[1_000, 20]];

    const wrapper = mount(RealtimeNetwork, {
      global: {
        plugins: [i18n],
        stubs: { MetricLineChart: true },
      },
    });
    expect(wrapper.text()).toContain("活跃连接");
    expect(wrapper.text()).toContain("数据包速率");
    const charts = wrapper.findAllComponents(MetricLineChart);
    expect(charts).toHaveLength(1);
    expect(charts[0].props("series")[0].data).toEqual([[1_000, 0]]);

    metricStore.resourceStates.iface.error = new Error("offline");
    await wrapper.vm.$nextTick();
    expect(charts[0].props("series")[0].data).toEqual([[1_000, 0]]);

    wrapper.unmount();
    const remounted = mount(RealtimeNetwork, {
      global: {
        plugins: [i18n],
        stubs: { MetricLineChart: true },
      },
    });
    expect(
      remounted.findComponent(MetricLineChart).props("series")[0].data,
    ).toEqual([[1_000, 0]]);
  });
});
