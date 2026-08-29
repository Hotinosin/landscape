import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { useSysInfo } from "./systeminfo";
import { useIfaceNodeStore } from "./iface_node";
import { useIpConfigStore } from "./status_ipconfig";
import { useNATConfigStore } from "@/stores/status_nats";
import { useDockerStore } from "./status_docker";
import { useDnsStore } from "./status_dns";
import { useIPv6PDStore } from "./status_ipv6pd";
import { useLanIPv6Store } from "./status_lan_ipv6";
import { useFirewallConfigStore } from "./status_firewall";
import { useWifiConfigStore } from "./status_wifi";
import { useDHCPv4ConfigStore } from "./status_dhcp_v4";
import { useMetricStore } from "./status_metric";
import { useMSSClampConfigStore } from "./status_mss_clamp";
import { useRouteLanConfigStore } from "./status_route_lan";
import { useRouteWanConfigStore } from "./status_route_wan";

import useDockerImgTask from "@/stores/docker_img_task";

export async function runRefreshTasks(
  tasks: Array<() => Promise<unknown>>,
): Promise<string | undefined> {
  const results = await Promise.allSettled(
    tasks.map((task) => Promise.resolve().then(task)),
  );
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  return failures.length
    ? failures
        .map(({ reason }) =>
          reason instanceof Error ? reason.message : String(reason),
        )
        .join("; ")
    : undefined;
}

export const useFetchIntervalStore = defineStore("fetch_interval", () => {
  const sysinfo = useSysInfo();
  const ifaceNodeStore = useIfaceNodeStore();
  const ipConfigStore = useIpConfigStore();
  const natConfigStore = useNATConfigStore();
  const dockerStore = useDockerStore();
  const dnsStore = useDnsStore();
  const ipv6PDStore = useIPv6PDStore();
  const lanIpv6Store = useLanIPv6Store();
  const firewallConfigStore = useFirewallConfigStore();
  const wifiConfigStore = useWifiConfigStore();
  const dhcpv4ConfigStore = useDHCPv4ConfigStore();
  const metricStore = useMetricStore();
  const mssclampConfigStore = useMSSClampConfigStore();
  const routeLanConfigStore = useRouteLanConfigStore();
  const routeWanConfigStore = useRouteWanConfigStore();

  // SOCK
  const dockerImgTask = useDockerImgTask();

  let refresh_running = false;
  const interval_function = async () => {
    if (refresh_running) return;
    refresh_running = true;
    if (start_count_down_callback.value !== undefined) {
      start_count_down_callback.value();
    }
    try {
      error_message.value = await runRefreshTasks([
        () => sysinfo.UPDATE_INFO(),
        () => dockerStore.UPDATE_INFO(),
        () => dnsStore.UPDATE_INFO(),
        () => ifaceNodeStore.UPDATE_INFO(),
        () => ipConfigStore.UPDATE_INFO(),
        () => natConfigStore.UPDATE_INFO(),
        () => ipv6PDStore.UPDATE_INFO(),
        () => lanIpv6Store.UPDATE_INFO(),
        () => firewallConfigStore.UPDATE_INFO(),
        () => wifiConfigStore.UPDATE_INFO(),
        () => dhcpv4ConfigStore.UPDATE_INFO(),
        () => metricStore.UPDATE_INFO(),
        () => mssclampConfigStore.UPDATE_INFO(),
        () => routeLanConfigStore.UPDATE_INFO(),
        () => routeWanConfigStore.UPDATE_INFO(),
      ]);
      dockerImgTask.CONNECT();
    } finally {
      refresh_running = false;
    }
  };

  const error_message = ref<string | undefined>(undefined);
  const enable_interval = ref<boolean>(true);
  const interval_time = ref<number>(3000);
  let interval_timer: ReturnType<typeof setInterval> | undefined;
  let visibility_listener_attached = false;

  const start_count_down_callback = ref<(() => void) | undefined>();

  function set_interval() {
    // 如果已经存在计时器，先清理掉
    if (interval_timer !== undefined) {
      clean_interval();
    }
    // 立即执行一次函数，然后设置新的计时器
    interval_function();
    interval_timer = setInterval(
      () => void interval_function(),
      interval_time.value,
    );
  }

  function clean_interval() {
    if (interval_timer !== undefined) clearInterval(interval_timer);
    interval_timer = undefined;
  }

  watch(enable_interval, (new_value, _) => {
    if (new_value) {
      set_interval();
    } else {
      clean_interval();
    }
  });

  const visibilityChangeHandler = () => {
    if (document.hidden) {
      if (interval_timer != undefined) {
        clean_interval();
      }
    } else {
      if (enable_interval.value) {
        set_interval();
      }
    }
  };

  function destroy() {
    clean_interval();
    if (visibility_listener_attached) {
      document.removeEventListener("visibilitychange", visibilityChangeHandler);
      visibility_listener_attached = false;
    }
    start_count_down_callback.value = undefined;
  }

  function IMMEDIATELY_EXECUTE() {
    if (!visibility_listener_attached) {
      document.addEventListener("visibilitychange", visibilityChangeHandler);
      visibility_listener_attached = true;
    }
    if (enable_interval.value) set_interval();
    else enable_interval.value = true;
  }

  function SETTING_CALLBACK(call_back: () => void) {
    start_count_down_callback.value = call_back;
  }
  return {
    enable_interval,
    interval_time,
    error_message,
    IMMEDIATELY_EXECUTE,
    SETTING_CALLBACK,
    destroy,
  };
});
