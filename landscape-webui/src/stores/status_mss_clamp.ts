import { get_all_mss_clamp_status } from "@/api/service/mss_clamp";
import { ServiceStatus } from "@/lib/services";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useMSSClampConfigStore = defineStore("status_mss_clamp", () => {
  const status = ref<Map<string, ServiceStatus>>(
    new Map<string, ServiceStatus>(),
  );

  async function UPDATE_INFO() {
    status.value = await get_all_mss_clamp_status();
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

// const mssclampConfigStore = useMSSClampConfigStore();
