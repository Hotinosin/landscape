<script setup lang="ts">
import { get_docker_images, pull_docker_image } from "@/api/docker";
import { ref } from "vue";
import DockerImageCard from "@/components/docker/image/DockerImageCard.vue";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";
const { t } = useI18n();
const show = defineModel<boolean>("show", { required: true });

import useDockerImgTask from "@/stores/docker_img_task";

const emit = defineEmits(["refresh"]);

const dockerImgTask = useDockerImgTask();
async function flush_tasks() {
  await dockerImgTask.INIT();
}

function leave() {
  emit("refresh");
}
</script>
<template>
  <ConfigModal
    @after-enter="flush_tasks()"
    @after-leave="leave"
    v-model:show="show"
    :show-switch="false"
    width="var(--app-compact-modal-width)"
    :title="t('docker.docker_pull.download_history')"
  >
    <n-flex style="height: 100%" vertical>
      <n-scrollbar>
        <n-flex>
          <PullTaskCard
            v-for="task in dockerImgTask.tasks"
            :key="task.id"
            :task="task"
          />
        </n-flex>
      </n-scrollbar>
    </n-flex>
  </ConfigModal>
</template>
