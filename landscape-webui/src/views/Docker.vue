<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import { useDockerStore } from "@/stores/status_docker";
import useDockerImgTask from "@/stores/docker_img_task";
import DockerAllContainer from "@/components/docker/DockerAllContainer.vue";
import DockerStatusCard from "@/components/docker/DockerStatusCard.vue";
import { useFrontEndStore } from "@/stores/front_end_config";

const dockerStore = useDockerStore();
const dockerImgTask = useDockerImgTask();
const frontEndStore = useFrontEndStore();

onMounted(async () => {
  dockerStore.SET_ACTIVE(true);
  dockerImgTask.SET_ACTIVE(true);
  await dockerStore.UPDATE_INFO();
});

onBeforeUnmount(() => {
  dockerStore.SET_ACTIVE(false);
  dockerImgTask.SET_ACTIVE(false);
  dockerImgTask.DISCONNECT();
});
</script>
<template>
  <n-layout :native-scrollbar="false">
    <n-flex style="flex: 1" vertical>
      <n-flex
        ><DockerStatusCard :display_style="frontEndStore.display_style"
      /></n-flex>
      <n-flex style="flex: 1">
        <DockerAllContainer></DockerAllContainer>
      </n-flex>
    </n-flex>
  </n-layout>
</template>
