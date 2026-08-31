<script setup lang="ts">
import { computed, ref } from "vue";

import {
  remove_container,
  start_container,
  stop_container,
} from "@/api/docker";
import { DockerContainerSummary, DockerBtnShow } from "@/lib/docker";
import { useDockerStore } from "@/stores/status_docker";
import { useFrontEndStore } from "@/stores/front_end_config";
import { mask_string } from "@/lib/common";
import { usePreferenceStore } from "@/stores/preference";
import { useI18n } from "vue-i18n";
const prefStore = usePreferenceStore();

const frontEndStore = useFrontEndStore();
const { t } = useI18n();
const props = defineProps<{
  container: DockerContainerSummary;
}>();

const dockerStore = useDockerStore();

const title = computed(() => {
  let t = undefined;
  if (props.container.Names != undefined && props.container.Names.length > 0) {
    t = props.container.Names[0].replace(/^\/+/, "");
  }
  return t;
});

const time = computed(() => {
  let t = undefined;
  if (props.container.Created != undefined) {
    t = props.container.Created * 1000;
  }
  return t;
});

const show_btn = computed(() => new DockerBtnShow(props.container.State));
const start_spin = ref(false);
async function start() {
  if (title.value) {
    try {
      start_spin.value = true;
      await start_container(title.value);
      await dockerStore.UPDATE_INFO();
    } finally {
      start_spin.value = false;
    }
  }
}

const stop_spin = ref(false);
const show_stop_popconfirm = ref(false);
async function stop() {
  show_stop_popconfirm.value = false;
  if (title.value) {
    try {
      stop_spin.value = true;
      await stop_container(title.value);
    } catch (e) {
    } finally {
      stop_spin.value = false;
      await dockerStore.UPDATE_INFO();
    }
  }
}

const remove_spin = ref(false);
async function remove() {
  if (title.value) {
    try {
      remove_spin.value = true;
      await remove_container(title.value);
      await dockerStore.UPDATE_INFO();
    } finally {
      remove_spin.value = false;
    }
  }
}
</script>
<template>
  <n-card class="docker-container-exhibit-card" size="small">
    <template #header>
      <!-- <n-marquee :speed="13">
        {{ title }}
      </n-marquee> -->
      <n-ellipsis>
        {{ frontEndStore.MASK_INFO(title) }}
      </n-ellipsis>
    </template>
    <template #header-extra>
      <n-flex>
        <n-button
          :loading="start_spin"
          secondary
          size="small"
          @click="start"
          type="success"
          :disabled="!show_btn.start"
        >
          start
        </n-button>
        <n-popconfirm
          v-model:show="show_stop_popconfirm"
          @positive-click="stop"
        >
          <template #trigger>
            <n-button
              :loading="stop_spin"
              secondary
              size="small"
              @click="show_stop_popconfirm = true"
              type="warning"
              :disabled="!show_btn.stop"
            >
              stop
            </n-button>
          </template>
          {{ t("common.confirm_stop") }}
        </n-popconfirm>

        <n-popconfirm @positive-click="remove">
          <template #trigger>
            <n-button
              :loading="remove_spin"
              secondary
              size="small"
              type="error"
              :disabled="!show_btn.remove"
            >
              remove
            </n-button>
          </template>
          {{ t("common.confirm_delete") }}
        </n-popconfirm>
      </n-flex>
    </template>

    <n-descriptions :column="1" label-placement="left">
      <n-descriptions-item :label="t('common.image')">
        <n-ellipsis style="max-width: 220px">
          {{ frontEndStore.MASK_INFO(props.container.Image) }}
        </n-ellipsis>
      </n-descriptions-item>
      <n-descriptions-item :label="t('common.status')">
        {{ props.container.State }}
      </n-descriptions-item>

      <n-descriptions-item :label="t('common.created_at')">
        <n-time
          v-if="time !== undefined"
          :time="time"
          :time-zone="prefStore.timezone"
        />
        <span v-else>N/A</span>
      </n-descriptions-item>
    </n-descriptions>

    <!-- {{ props.container }} -->
  </n-card>
</template>
<style scoped>
.docker-container-exhibit-card {
  flex: 1;
}
</style>
