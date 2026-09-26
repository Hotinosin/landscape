import { get_docker_container_summarys, get_docker_status } from "@/api/docker";
import { ServiceStatus, ServiceStatusType } from "@/lib/services";
import { defineStore } from "pinia";
import { ref } from "vue";
import { usePageRequest } from "@/composables/usePageRequest";

export const useDockerStore = defineStore("docker_status", () => {
  const docker_status = ref<ServiceStatus>({ t: ServiceStatusType.Stop });

  const container_summarys = ref<any[]>([]);

  const page_active = ref(false);
  const request = usePageRequest(
    async () => {
      const [status, containers] = await Promise.all([
        get_docker_status(),
        get_docker_container_summarys(),
      ]);
      return { status, containers };
    },
    {
      initialData: { status: docker_status.value, containers: [] as any[] },
      onSuccess: ({ status, containers }) => {
        docker_status.value = status;
        container_summarys.value = containers;
      },
    },
  );

  async function UPDATE_INFO() {
    if (!page_active.value) return;
    await request.refresh();
  }

  function SET_ACTIVE(active: boolean) {
    page_active.value = active;
  }

  return {
    docker_status,
    container_summarys,
    UPDATE_INFO,
    SET_ACTIVE,
    loading: request.loading,
    error: request.error,
    retry: request.retry,
    state: request.state,
  };
});
