<script setup lang="ts">
import { computed, ref } from "vue";

import { DotMark } from "@vicons/carbon";
import { useThemeVars } from "naive-ui";

import { ServiceStatusType, get_service_status_color } from "@/lib/services";
import { useDockerStore } from "@/stores/status_docker";
import { useI18n } from "vue-i18n";

import DockerImageDrawer from "@/components/docker/image/DockerImageDrawer.vue";
import { start_docker_service, stop_docker_service } from "@/api/docker";

const dockerStatus = useDockerStore();
const themeVars = ref(useThemeVars());
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
      <n-icon
        :color="get_service_status_color(dockerStatus.docker_status, themeVars)"
        size="16"
        ><DotMark
      /></n-icon>
      <n-text strong>Docker</n-text>
    </n-flex>
    <n-flex size="small">
      <n-button size="small" @click="show_image_drawer = true">{{
        t("common.image")
      }}</n-button>
      <n-button v-if="is_down" size="small" type="primary" @click="start">{{
        t("common.open")
      }}</n-button>
      <ConfirmModal v-else @positive-click="stop"
        ><template #trigger
          ><n-button size="small">{{
            t("common.close_listener")
          }}</n-button></template
        >{{ t("common.confirm_stop") }}</ConfirmModal
      >
    </n-flex>
    <DockerImageDrawer v-model:show="show_image_drawer" />
  </n-flex>
</template>
<style scoped>
.docker-list-toolbar {
  width: 100%;
  margin-bottom: 12px;
}
</style>
