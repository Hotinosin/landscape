import { get_all_ipconfig_status } from "@/api/service_ipconfig";
import { ServiceStatus } from "@/lib/services";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useIpConfigStore = defineStore("status_ipconfig", () => {
  const status = ref<Map<string, ServiceStatus>>(
    new Map<string, ServiceStatus>(),
  );

  async function UPDATE_INFO() {
    status.value = await get_all_ipconfig_status();
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

// const ipConfigStore = useIpConfigStore();
