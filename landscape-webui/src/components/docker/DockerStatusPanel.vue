<script setup lang="ts">
import { computed, ref } from "vue";

import { Renew } from "@vicons/carbon";

import { ServiceStatusType } from "@/lib/services";
import { useDockerStore } from "@/stores/status_docker";
import { useI18n } from "vue-i18n";

import DockerImageDrawer from "@/components/docker/image/DockerImageDrawer.vue";
import { start_docker_service, stop_docker_service } from "@/api/docker";

const dockerStatus = useDockerStore();
const show_image_drawer = ref(false);
const { t } = useI18n();
const is_down = computed(() => {
  return (
    dockerStatus.docker_status.t == ServiceStatusType.Stop ||
    dockerStatus.docker_status.t == ServiceStatusType.Failed
  );
});

async function start() {
  await start_docker_service();
}
async function stop() {
  await stop_docker_service();
}
</script>
<template>
  <n-flex justify="space-between" align="center" class="docker-list-toolbar">
    <n-flex align="center" size="small">
      <StandardServiceStatusTag :status="dockerStatus.docker_status" />
    </n-flex>
    <n-flex size="small">
      <n-button @click="show_image_drawer = true">{{
        t("common.image")
      }}</n-button>
      <n-button v-if="is_down" @click="start">{{
        t("common.open")
      }}</n-button>
      <ConfirmModal v-else @positive-click="stop"
        ><template #trigger
          ><n-button>{{ t("common.close_listener") }}</n-button></template
        >{{ t("common.confirm_stop") }}</ConfirmModal
      >
      <n-button
        secondary
        :loading="dockerStatus.loading"
        @click="dockerStatus.UPDATE_INFO()"
      >
        <template #icon
          ><n-icon><Renew /></n-icon
        ></template>
        {{ t("common.refresh") }}
      </n-button>
    </n-flex>
    <DockerImageDrawer v-model:show="show_image_drawer" />
  </n-flex>
</template>
<style scoped>
.docker-list-toolbar {
  width: 100%;
}
</style>
