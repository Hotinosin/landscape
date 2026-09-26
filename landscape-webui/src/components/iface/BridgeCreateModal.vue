<script setup lang="ts">
import { create_bridge } from "@/api/network";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";

const showModal = defineModel<boolean>("show", { required: true });
const { t } = useI18n();

const loading = ref(false);
const bridge_name = ref<string>("");
async function add_bridge() {
  if (bridge_name.value !== "") {
    try {
      loading.value = true;
      await create_bridge(bridge_name.value);
      showModal.value = false;
      bridge_name.value = "";
    } finally {
      loading.value = false;
    }
  }
}
</script>

<template>
  <ConfigModal
    v-model:show="showModal"
    :show-switch="false"
    :dirty="Boolean(bridge_name)"
    :title="t('common.create_bridge_device')"
  >
    <StandardSettingRow :label="t('common.name')">
      <n-input v-model:value="bridge_name" placeholder="bridge name" />
    </StandardSettingRow>

    <template #footer="{ close }">
      <n-flex justify="end">
        <n-button @click="close">{{ t("common.cancel") }}</n-button>
        <n-button
          :loading="loading"
          :disabled="!bridge_name"
          type="primary"
          @click="add_bridge"
        >
          {{ t("common.add_bridge") }}
        </n-button>
      </n-flex>
    </template>
  </ConfigModal>
</template>
