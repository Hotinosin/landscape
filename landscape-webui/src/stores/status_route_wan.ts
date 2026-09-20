import { get_all_route_wan_status } from "@/api/route/wan";
import { ServiceStatus } from "@/lib/services";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useRouteWanConfigStore = defineStore("status_route_wan", () => {
  const status = ref<Map<string, ServiceStatus>>(
    new Map<string, ServiceStatus>(),
  );

  async function UPDATE_INFO() {
    status.value = await get_all_route_wan_status();
  }

  function GET_STATUS_BY_IFACE_NAME(
    name: string,
  ): ServiceStatus | undefined {
    return status.value.get(name);
  }

  return {
    status,
    UPDATE_INFO,
    GET_STATUS_BY_IFACE_NAME,
  };
});

// const routeWanConfigStore = useRouteWanConfigStore();
