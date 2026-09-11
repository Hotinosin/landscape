import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import {
  get_connects_info,
  get_metric_status,
  get_src_ip_stats,
  get_dst_ip_stats,
  get_iface_stats,
  get_connect_global_stats,
} from "@/api/metric";
import { ServiceStatus, ServiceStatusType } from "@/lib/services";
import type {
  ConnectRealtimeStatus,
  IfaceRealtimeStat,
  IpRealtimeStat,
  ConnectGlobalStats,
} from "@landscape-router/types/api/schemas";
import type { NetworkTrendState } from "@/components/sysinfo/networkTrend";

export type FlowIpRealtimeStat = IpRealtimeStat & { flow_id?: number };
export type MetricResource = "connections" | "src" | "dst" | "iface";
export type MetricDemand = MetricResource[];
export interface MetricResourceState {
  loading: boolean;
  error?: unknown;
  hasSucceeded: boolean;
  lastSuccessAt: number | null;
}

export function metricDemandForPath(path: string): MetricDemand {
  if (path === "/") return ["iface", "connections"];
  if (path === "/metrics/conn/live") return ["connections"];
  if (path === "/metrics/conn/src") return ["src", "connections"];
  if (path === "/metrics/conn/dst") return ["dst", "connections"];
  if (path === "/metrics/conn/iface") return ["iface"];
  return [];
}

const newState = (): MetricResourceState => ({
  loading: false,
  error: undefined,
  hasSucceeded: false,
  lastSuccessAt: null,
});

export const useMetricStore = defineStore("dns_metric", () => {
  const metric_status = ref<ServiceStatus>({ t: ServiceStatusType.Stop });
  const firewall_info = ref<ConnectRealtimeStatus[]>([]);
  const src_ip_stats = ref<IpRealtimeStat[]>([]);
  const dst_ip_stats = ref<IpRealtimeStat[]>([]);
  const iface_stats = ref<IfaceRealtimeStat[]>([]);
  const global_history_stats = ref<ConnectGlobalStats | null>(null);
  const networkTrend = reactive<NetworkTrendState>({
    upload: [],
    download: [],
  });
  const demand = ref<MetricDemand>([]);
  const resourceStates = reactive<Record<MetricResource, MetricResourceState>>({
    connections: newState(),
    src: newState(),
    dst: newState(),
    iface: newState(),
  });
  const statusState = reactive(newState());
  const globalHistoryState = reactive(newState());
  const inFlight = new Map<string, Promise<void>>();

  const is_down = computed(
    () =>
      metric_status.value.t === ServiceStatusType.Stop ||
      metric_status.value.t === ServiceStatusType.Failed,
  );

  const currentState = computed<MetricResourceState>(() => {
    const states = demand.value.map((name) => resourceStates[name]);
    return {
      loading: states.some((state) => state.loading),
      error: states.find((state) => state.error)?.error,
      hasSucceeded:
        states.length > 0 && states.every((state) => state.hasSucceeded),
      lastSuccessAt:
        states.length > 0 &&
        states.every((state) => state.lastSuccessAt !== null)
          ? Math.min(...states.map((state) => state.lastSuccessAt!))
          : null,
    };
  });

  function run(
    key: string,
    state: MetricResourceState,
    load: () => Promise<void>,
  ) {
    const existing = inFlight.get(key);
    if (existing) return existing;
    state.loading = true;
    state.error = undefined;
    const request = load()
      .then(() => {
        state.hasSucceeded = true;
        state.lastSuccessAt = Date.now();
      })
      .catch((error) => {
        state.error = error;
        throw error;
      })
      .finally(() => {
        state.loading = false;
        inFlight.delete(key);
      });
    inFlight.set(key, request);
    return request;
  }

  const loaders: Record<MetricResource, () => Promise<void>> = {
    connections: () =>
      get_connects_info().then((result) => {
        firewall_info.value = result;
      }),
    src: () =>
      get_src_ip_stats().then((result) => {
        src_ip_stats.value = result;
      }),
    dst: () =>
      get_dst_ip_stats().then((result) => {
        dst_ip_stats.value = result;
      }),
    iface: () =>
      get_iface_stats().then((result) => {
        iface_stats.value = result;
      }),
  };

  const loadResource = (name: MetricResource) =>
    run(name, resourceStates[name], loaders[name]);

  async function UPDATE_DEMAND() {
    const results = await Promise.allSettled(demand.value.map(loadResource));
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) throw failure.reason;
  }

  async function UPDATE_INFO() {
    const results = await Promise.allSettled([
      run("status", statusState, () =>
        get_metric_status().then((result) => {
          metric_status.value = result;
        }),
      ),
      UPDATE_DEMAND(),
    ]);
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) throw failure.reason;
  }

  function SET_PAGE(path: string, load = true) {
    demand.value = metricDemandForPath(path);
    if (load && demand.value.length)
      void UPDATE_DEMAND().catch(() => undefined);
  }

  async function REFRESH_CURRENT() {
    try {
      await UPDATE_DEMAND();
    } catch {
      // Resource state carries the inline error.
    }
  }

  async function UPDATE_GLOBAL_HISTORY_STATS(force_refresh = false) {
    return run("global-history", globalHistoryState, () =>
      get_connect_global_stats(
        force_refresh ? { force_refresh: true } : undefined,
      ).then((result) => {
        global_history_stats.value = result;
      }),
    );
  }

  return {
    is_down,
    metric_status,
    firewall_info,
    src_ip_stats,
    dst_ip_stats,
    iface_stats,
    global_history_stats,
    networkTrend,
    demand,
    resourceStates,
    statusState,
    globalHistoryState,
    currentState,
    SET_PAGE,
    UPDATE_INFO,
    UPDATE_DEMAND,
    REFRESH_CURRENT,
    UPDATE_GLOBAL_HISTORY_STATS,
  };
});
