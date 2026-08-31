import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  get_connects_info,
  get_metric_status,
  get_connect_metric_info,
  get_src_ip_stats,
  get_dst_ip_stats,
  get_iface_stats,
  get_connect_global_stats,
} from "@/api/metric";
import { ServiceStatus, ServiceStatusType } from "@/lib/services";
import type {
  ConnectKey,
  ConnectRealtimeStatus,
  IfaceRealtimeStat,
  IpRealtimeStat,
  ConnectGlobalStats,
} from "@landscape-router/types/api/schemas";

export type FlowIpRealtimeStat = IpRealtimeStat & { flow_id?: number };

export const useMetricStore = defineStore("dns_metric", () => {
  const metric_status = ref<ServiceStatus>({ t: ServiceStatusType.Stop });
  const firewall_info = ref<ConnectRealtimeStatus[]>([]);
  const src_ip_stats = ref<IpRealtimeStat[]>([]);
  const dst_ip_stats = ref<IpRealtimeStat[]>([]);
  const iface_stats = ref<IfaceRealtimeStat[]>([]);
  const global_history_stats = ref<ConnectGlobalStats | null>(null);

  const is_down = computed(() => {
    return (
      metric_status.value.t == ServiceStatusType.Stop ||
      metric_status.value.t == ServiceStatusType.Failed
    );
  });

  async function UPDATE_INFO() {
    const results = await Promise.allSettled([
      get_metric_status().then((res) => (metric_status.value = res)),
      get_connects_info().then((res) => (firewall_info.value = res)),
      get_src_ip_stats().then((res) => (src_ip_stats.value = res)),
      get_dst_ip_stats().then((res) => (dst_ip_stats.value = res)),
      get_iface_stats().then((res) => (iface_stats.value = res)),
    ]);
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) throw failure.reason;
  }

  async function UPDATE_GLOBAL_HISTORY_STATS(force_refresh = false) {
    global_history_stats.value = await get_connect_global_stats(
      force_refresh ? { force_refresh: true } : undefined,
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
    UPDATE_INFO,
    UPDATE_GLOBAL_HISTORY_STATS,
  };
});
