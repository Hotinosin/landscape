<script setup lang="ts">
import { get_docker_images, pull_docker_image } from "@/api/docker";
import { ref } from "vue";
import DockerImageCard from "@/components/docker/image/DockerImageCard.vue";
import { useMessage } from "naive-ui";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";
const show = defineModel<boolean>("show", { required: true });
const images = ref<any>([]);
const message = useMessage();
const { t } = useI18n();

async function flush_images() {
  images.value = await get_docker_images();
}

async function pull_image() {
  if (
    pull_docker_image_name.value == null ||
    pull_docker_image_name.value == undefined ||
    pull_docker_image_name.value == ""
  ) {
    message.warning(t("common.pull_image_name_required"));
    return;
  }
  await pull_docker_image(pull_docker_image_name.value);
  pull_docker_image_name.value = "";
}

const pull_docker_image_name = ref("");
const show_pull_history = ref(false);
</script>
<template>
  <ConfigModal
    :prepare="flush_images"
    v-model:show="show"
    :show-switch="false"
    width="var(--app-compact-modal-width)"
    :title="t('common.docker_image_list')"
  >
    <n-flex style="height: 100%" vertical>
      <n-input-group>
        <n-input v-model:value="pull_docker_image_name" />
        <n-button @click="pull_image">{{ t("common.pull_image") }}</n-button>
        <n-button @click="show_pull_history = true">{{
          t("docker.docker_image.history_tasks")
        }}</n-button>
      </n-input-group>
      <!-- <n-input-group>
          <n-input-group-label>filter</n-input-group-label>
          <n-input />
        </n-input-group> -->
      <n-scrollbar>
        <n-flex>
          <DockerImageCard
            v-for="image in images"
            :key="image.index"
            :image="image"
            @refresh="flush_images()"
          >
          </DockerImageCard>
        </n-flex>
      </n-scrollbar>
    </n-flex>
    <ImgPullHistory
      @refresh="flush_images()"
      v-model:show="show_pull_history"
    />
  </ConfigModal>
</template>
