<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";
import {
  get_iface_mss_clamp_config,
  update_mss_clamp_config,
} from "@/api/service/mss_clamp";
import type { MSSClampServiceConfig } from "@landscape-router/types/api/schemas";

const { t } = useI18n();
const show_model = defineModel<boolean>("show", { required: true });
const emit = defineEmits(["refresh"]);

const iface_info = defineProps<{
  iface_name: string;
}>();

const service_config = ref<MSSClampServiceConfig>({
  iface_name: iface_info.iface_name,
  enable: false,
  clamp_size: 1492,
});

async function on_modal_enter() {
  try {
    let config = await get_iface_mss_clamp_config(iface_info.iface_name);
    console.log(config);
    // iface_service_type.value = config.t;
    service_config.value = config;
  } catch (e) {
    service_config.value = {
      iface_name: iface_info.iface_name,
      enable: false,
      clamp_size: 1492,
    };
  }
}

async function save_config() {
  await update_mss_clamp_config(service_config.value);
  emit("refresh");
  show_model.value = false;
}

defineExpose({ save: save_config });
</script>

<template>
  <ConfigModal
    v-model:show="show_model"
    v-model:enabled="service_config.enable"
    :title="t('network.mss_clamp.title')"
    width="var(--app-secondary-modal-width)"
    @after-enter="on_modal_enter"
  >
    <n-form v-if="service_config.enable" :model="service_config">
      <StandardSettingRow :label="t('network.mss_clamp.clamp_value')">
        <n-input-number
          v-model:value="service_config.clamp_size"
          :show-button="false"
          style="flex: 1"
          min="0"
          max="65535"
          placeholder=""
        />
      </StandardSettingRow>
    </n-form>

    <template #footer>
      <n-flex justify="end">
        <n-button round type="primary" @click="save_config">
          {{ t("common.update") }}
        </n-button>
      </n-flex>
    </template>
  </ConfigModal>
</template>
