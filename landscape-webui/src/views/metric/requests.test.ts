import { flushPromises, shallowMount, type VueWrapper } from "@vue/test-utils";
import { createPinia, disposePinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HistoryMetric from "./conn/HistoryMetric.vue";
import HistorySrcIpMetric from "./conn/HistorySrcIpMetric.vue";
import HistoryDstIpMetric from "./conn/HistoryDstIpMetric.vue";
import DNSDashboard from "./DNSDashboard.vue";

const mocks = vi.hoisted(() => ({
  history: vi.fn(),
  src: vi.fn(),
  dst: vi.fn(),
  dns: vi.fn(),
  query: {} as Record<string, string>,
}));
vi.mock("@/api/metric", () => ({
  get_connect_history: mocks.history,
  get_history_src_ip_stats: mocks.src,
  get_history_dst_ip_stats: mocks.dst,
}));
vi.mock("@/api/metric/dns", () => ({ get_dns_summary: mocks.dns }));
vi.mock("@/stores/status_metric", () => ({
  useMetricStore: () => ({
    global_history_stats: null,
    UPDATE_GLOBAL_HISTORY_STATS: vi.fn(),
  }),
}));
vi.mock("vue-router", async (original) => ({
  ...(await original<typeof import("vue-router")>()),
  useRoute: () => ({ query: mocks.query }),
}));
vi.mock("vue-i18n", async (original) => ({
  ...(await original<typeof import("vue-i18n")>()),
  useI18n: () => ({ t: (key: string) => key }),
}));

let pinia: ReturnType<typeof createPinia>;
let wrapper: VueWrapper;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  mocks.query = {};
  vi.clearAllMocks();
  mocks.history.mockResolvedValue({ items: [], total: 0 });
  mocks.src.mockResolvedValue([]);
  mocks.dst.mockResolvedValue([]);
  mocks.dns.mockResolvedValue(null);
});
afterEach(() => {
  wrapper?.unmount();
  disposePinia(pinia);
});

it("keeps zero history filters and separates total matches from page traffic", async () => {
  wrapper = shallowMount(HistoryMetric);
  await flushPromises();
  const vm = wrapper.vm as any;
  Object.assign(vm.historyFilter, {
    flow_id: 0,
    l3_proto: 0,
    port_start: 0,
    port_end: 0,
  });
  const item = { total_egress_bytes: 7, total_ingress_bytes: 3 };
  mocks.history.mockResolvedValue({ items: [item], total: 12_000 });
  await vm.fetchHistory();
  expect(mocks.history).toHaveBeenLastCalledWith(
    expect.objectContaining({
      flow_id: 0,
      l3_proto: 0,
      port_start: 0,
      port_end: 0,
    }),
  );
  expect(vm.filteredTotal).toBe(12_000);
  expect(vm.pagination.itemCount).toBe(10_000);
  expect(vm.historyTotalStats.totalEgressBytes).toBe(7);
  expect(vm.historyTotalStats.totalIngressBytes).toBe(3);
});

it("returns to a valid page after the result count shrinks", async () => {
  wrapper = shallowMount(HistoryMetric);
  await flushPromises();
  const vm = wrapper.vm as any;
  vm.pagination.page = 4;
  mocks.history
    .mockResolvedValueOnce({ items: [], total: 51 })
    .mockResolvedValueOnce({ items: [{ total_egress_bytes: 9 }], total: 51 });
  await vm.fetchHistory();
  await flushPromises();
  expect(vm.pagination.page).toBe(2);
  expect(mocks.history).toHaveBeenLastCalledWith(
    expect.objectContaining({ offset: 50 }),
  );
  expect(vm.historicalData).toEqual([{ total_egress_bytes: 9 }]);
});

it.each([
  ["source", HistorySrcIpMetric, mocks.src],
  ["destination", HistoryDstIpMetric, mocks.dst],
] as const)(
  "preserves Flow 0 and latest %s IP response",
  async (_, component, request) => {
    mocks.query = { flow_id: "0" };
    wrapper = shallowMount(component);
    await flushPromises();
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ flow_id: 0 }),
    );
    const vm = wrapper.vm as any;
    let finish!: (value: unknown[]) => void;
    request
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce([{ ip: "latest" }]);
    const old = vm.fetchStats();
    await vm.fetchStats();
    finish([{ ip: "old" }]);
    await old;
    expect(vm.stats).toEqual([{ ip: "latest" }]);
  },
);

it("keeps Flow 0 and ignores DNS summaries for old filters", async () => {
  let finish!: (value: unknown) => void;
  mocks.dns
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce({ total_queries: 2 });
  wrapper = shallowMount(DNSDashboard, {
    props: { timeRange: null, flowId: 0 },
  });
  expect(mocks.dns).toHaveBeenCalledWith(
    expect.objectContaining({ flow_id: 0 }),
  );
  await wrapper.setProps({ flowId: 1 });
  await flushPromises();
  finish({ total_queries: 1 });
  await flushPromises();
  expect((wrapper.vm as any).summary).toEqual({ total_queries: 2 });
});
