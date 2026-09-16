<script setup lang="ts">
import { run_cmd } from "@/api/docker";
import { KeyValuePair } from "@/lib/common";
import { LAND_REDIRECT_ID_KEY } from "@/lib/docker";
import { DockerCmd } from "@landscape-router/types/api/schemas";
import { useDockerStore } from "@/stores/status_docker";
import { useNotification } from "naive-ui";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";

const show_model = defineModel<boolean>("show", { required: true });

const props = defineProps<{
  image_name: string;
}>();

const emit = defineEmits(["refresh"]);

const dockerStore = useDockerStore();
const notification = useNotification();
const { t } = useI18n();

// 定义表单的状态
const formModel = ref<DockerCmd>();

async function on_modal_enter() {
  formModel.value = {
    image_name: props.image_name,
    restart: DockerRestartPolicy.NO,
    restart_max_retries: 3,
    container_name: undefined,
    ports: undefined,
    environment: undefined,
    volumes: undefined,
    labels: undefined,
    entrypoint: undefined,
    params: undefined,
  };
}

const save_loading = ref(false);
async function save_config() {
  if (formModel.value) {
    try {
      save_loading.value = true;
      await run_cmd(formModel.value);
      dockerStore.UPDATE_INFO();
      show_model.value = false;
    } finally {
      save_loading.value = false;
    }
  }
}

enum DockerRestartPolicy {
  NO = "no",
  ON_FAILURE = "on-failure",
  ON_FAILURE_WITH_MAX_RETRIES = "on-failure:<max-retries>",
  ALWAYS = "always",
  UNLESS_STOPPED = "unless-stopped",
}

const restrt_options = [
  {
    label: t("docker.docker_run.restart_no"),
    value: DockerRestartPolicy.NO,
  },
  {
    label: t("docker.docker_run.restart_on_failure"),
    value: DockerRestartPolicy.ON_FAILURE,
  },
  {
    label: t("docker.docker_run.restart_on_failure_max"),
    value: DockerRestartPolicy.ON_FAILURE_WITH_MAX_RETRIES,
  },
  {
    label: t("docker.docker_run.restart_always"),
    value: DockerRestartPolicy.ALWAYS,
  },
  {
    label: t("docker.docker_run.restart_unless_stopped"),
    value: DockerRestartPolicy.UNLESS_STOPPED,
  },
];

const has_edge_label = computed({
  get() {
    if (formModel.value?.labels) {
      for (const label of formModel.value.labels) {
        if (label.key === LAND_REDIRECT_ID_KEY) {
          return true;
        }
      }
    }

    return false;
  },
  set(new_value) {
    if (new_value) {
      if (formModel.value?.labels) {
        formModel.value?.labels.unshift({
          key: LAND_REDIRECT_ID_KEY,
          value: "",
        });
      } else {
        if (formModel.value) {
          formModel.value.labels = [
            {
              key: LAND_REDIRECT_ID_KEY,
              value: "",
            },
          ];
        }
      }
    } else {
      if (formModel.value?.labels) {
        formModel.value.labels = formModel.value.labels.filter(
          (e) => e.key !== LAND_REDIRECT_ID_KEY,
        );
      }
    }
  },
});
</script>

<template>
  <ConfigModal
    v-model:show="show_model"
    :show-switch="false"
    width="var(--app-secondary-modal-width)"
    :title="t('docker.docker_run.title', { image: props.image_name })"
    @after-enter="on_modal_enter"
  >
    <n-form v-if="formModel" :model="formModel">
      <StandardSettingRow
        :label="t('docker.docker_run.container_name')"
        path="containerName"
      >
        <n-input
          v-model:value="formModel.container_name"
          :placeholder="t('docker.docker_run.container_name_placeholder')"
        />
      </StandardSettingRow>

      <StandardSettingRow
        :label="t('docker.docker_run.flow_egress')"
        path="imageName"
      >
        <n-switch v-model:value="has_edge_label" size="medium"> </n-switch>
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('docker.docker_run.restart_policy')"
        path="containerName"
      >
        <n-input-group>
          <n-select
            v-model:value="formModel.restart"
            :options="restrt_options"
          />
          <n-input-number
            v-if="
              formModel.restart ===
              DockerRestartPolicy.ON_FAILURE_WITH_MAX_RETRIES
            "
            v-model:value="formModel.restart_max_retries"
            placeholder=""
          />
        </n-input-group>
      </StandardSettingRow>

      <StandardSettingRow
        :label="t('docker.docker_run.entrypoint')"
        path="containerName"
      >
        <n-input
          v-model:value="formModel.entrypoint"
          :placeholder="t('docker.docker_run.entrypoint_placeholder')"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('docker.docker_run.port_mapping')"
        path="ports"
      >
        <n-dynamic-input
          v-model:value="formModel.ports"
          preset="pair"
          separator=":"
          :key-placeholder="t('docker.docker_run.host_port')"
          :value-placeholder="t('docker.docker_run.container_port')"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('docker.docker_run.env_vars')"
        path="environment"
      >
        <n-dynamic-input
          v-model:value="formModel.environment"
          preset="pair"
          separator=":"
          :key-placeholder="t('docker.docker_run.env_name')"
          :value-placeholder="t('docker.docker_run.env_value')"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('docker.docker_run.volume_mapping')"
        path="volumes"
      >
        <n-dynamic-input
          v-model:value="formModel.volumes"
          preset="pair"
          separator=":"
          :key-placeholder="t('docker.docker_run.host_dir')"
          :value-placeholder="t('docker.docker_run.container_dir')"
        />
      </StandardSettingRow>
    </n-form>
    <template #footer>
      <n-flex justify="end">
        <n-button :loading="save_loading" type="primary" @click="save_config">
          {{ t("docker.docker_run.create") }}
        </n-button>
      </n-flex>
    </template>
  </ConfigModal>
</template>
