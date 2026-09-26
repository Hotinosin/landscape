import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  status: vi.fn(),
  connections: vi.fn(),
  src: vi.fn(),
  dst: vi.fn(),
  iface: vi.fn(),
  history: vi.fn(),
}));

vi.mock("@/api/metric", () => ({
  get_metric_status: api.status,
  get_connects_info: api.connections,
  get_src_ip_stats: api.src,
  get_dst_ip_stats: api.dst,
  get_iface_stats: api.iface,
  get_connect_global_stats: api.history,
}));

import { metricDemandForPath, useMetricStore } from "./status_metric";
import { useIfaceNodeStore } from "./iface_node";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import { DevStateType, NetDev } from "@/lib/dev";

describe("metric request demand", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api.status.mockResolvedValue({ t: "running" });
    api.connections.mockResolvedValue([]);
    api.src.mockResolvedValue([]);
    api.dst.mockResolvedValue([]);
    api.iface.mockResolvedValue([]);
    api.history.mockResolvedValue({});
  });

  it.each([
    ["/", ["iface", "connections"]],
    ["/metrics/conn/live", ["connections"]],
    ["/metrics/conn/src", ["src", "connections"]],
    ["/metrics/conn/dst", ["dst", "connections"]],
    ["/metrics/conn/iface", ["iface"]],
    ["/config", []],
    ["/metrics/conn/history", []],
    ["/metrics/dns", []],
  ])("maps %s to only its required resources", (path, expected) => {
    expect(metricDemandForPath(path)).toEqual(expected);
  });

  it.each([
    ["/", ["connections"]],
    ["/metrics/conn/live", ["connections"]],
    ["/metrics/conn/src", ["connections", "src"]],
    ["/metrics/conn/dst", ["connections", "dst"]],
    ["/metrics/conn/iface", ["iface"]],
    ["/config", []],
  ])(
    "always requests iface plus the current page resources for %s",
    async (path, names) => {
      const store = useMetricStore();
      store.SET_PAGE(path, false);
      await store.UPDATE_INFO();

      expect(api.status).toHaveBeenCalledOnce();
      expect(api.connections).toHaveBeenCalledTimes(
        names.includes("connections") ? 1 : 0,
      );
      expect(api.src).toHaveBeenCalledTimes(names.includes("src") ? 1 : 0);
      expect(api.dst).toHaveBeenCalledTimes(names.includes("dst") ? 1 : 0);
      expect(api.iface).toHaveBeenCalledOnce();
    },
  );

  it("deduplicates the same resource without blocking a newly required one", async () => {
    let finishConnections!: (value: never[]) => void;
    api.connections.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishConnections = resolve;
        }),
    );
    const store = useMetricStore();

    store.SET_PAGE("/metrics/conn/live");
    store.SET_PAGE("/metrics/conn/live");
    store.SET_PAGE("/metrics/conn/src");
    await Promise.resolve();

    expect(api.connections).toHaveBeenCalledOnce();
    expect(api.src).toHaveBeenCalledOnce();
    finishConnections([]);
    await store.REFRESH_CURRENT();
  });

  it("collects WAN trend while another page is active", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    useIfaceNodeStore().net_devs = [
      new NetDev({
        name: "wan0",
        index: 7,
        dev_type: "Ethernet",
        dev_kind: "ethernet",
        dev_status: { t: DevStateType.Up },
        carrier: true,
        zone_type: IfaceZoneType.wan,
        enable_in_boot: true,
      }),
    ];
    api.iface.mockResolvedValue([
      {
        ifindex: 7,
        last_report_time: 900,
        stats: { ingress_bps: 20, egress_bps: 10 },
      },
    ]);
    const store = useMetricStore();
    store.SET_PAGE("/config", false);

    await store.UPDATE_INFO(3_000);

    expect(store.networkTrend.upload).toEqual([[1_000, 10]]);
    expect(store.networkTrend.download).toEqual([[1_000, 20]]);

    now.mockReturnValue(4_000);
    api.iface.mockResolvedValue([]);
    await store.UPDATE_INFO(3_000);
    expect(
      store.networkTrend.upload[store.networkTrend.upload.length - 1],
    ).toEqual([4_000, 0]);
    expect(
      store.networkTrend.download[store.networkTrend.download.length - 1],
    ).toEqual([4_000, 0]);
    now.mockRestore();
  });
});
