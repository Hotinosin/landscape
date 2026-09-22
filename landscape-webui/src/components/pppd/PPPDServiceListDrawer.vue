<script setup lang="ts">
import CreatePPPDConfigModal from "@/components/pppd/CreatePPPDConfigModal.vue";
import PPPDServiceTable from "@/components/pppd/PPPDServiceTable.vue";
import {
  get_attach_iface_pppd_config,
  update_iface_pppd_config,
} from "@/api/service_pppd";
import { PPPDServiceConfig } from "@/lib/pppd";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";

const { t } = useI18n();
const emit = defineEmits(["refresh"]);
const show = defineModel<boolean>("show", { required: true });
const props = defineProps<{
  attach_iface_name: string;
  presentation?: "modal" | "embedded";
}>();

const pppd_configs = ref<PPPDServiceConfig[]>([]);
const switching = ref(false);
const pppd_enabled = computed(() =>
  pppd_configs.value.some((config) => config.enable),
);
async function inti_drawer() {
  pppd_configs.value = await get_attach_iface_pppd_config(
    props.attach_iface_name,
  );
}

async function refreshDrawer() {
  await inti_drawer();
  emit("refresh");
}

const show_create_pppd_modal = ref(false);

async function togglePppd(enabled: boolean) {
  if (enabled && !pppd_configs.value.length) {
    show_create_pppd_modal.value = true;
    return;
  }
  switching.value = true;
  try {
    await Promise.all(
      pppd_configs.value.map((config) =>
        update_iface_pppd_config(
          new PPPDServiceConfig({ ...config, enable: enabled }),
          config.iface_name,
        ),
      ),
    );
    await refreshDrawer();
  } finally {
    switching.value = false;
  }
}

onMounted(() => {
  if (props.presentation === "embedded") inti_drawer();
});
</script>
<template>
  <section v-if="props.presentation === 'embedded'">
    <StandardSettingRow
      :label="t('network.settings.pppd')"
      control-width="auto"
    >
      <n-switch
        :value="pppd_enabled"
        :loading="switching"
        size="medium"
        @update:value="togglePppd"
      />
    </StandardSettingRow>
    <n-flex v-if="pppd_enabled" vertical>
      <n-button
        style="align-self: flex-start"
        @click="show_create_pppd_modal = true"
        >{{ t("pppoe.pppd_drawer.add_pppd") }}</n-button
      >
      <PPPDServiceTable
        :configs="pppd_configs"
        :attach-iface-name="props.attach_iface_name"
        @refresh="refreshDrawer"
      />
    </n-flex>
    <CreatePPPDConfigModal
      v-model:show="show_create_pppd_modal"
      :attach_iface_name="props.attach_iface_name"
      :origin_value="undefined"
      @refresh="refreshDrawer"
    />
  </section>
  <ConfigModal
    v-else
    v-model:show="show"
    :prepare="inti_drawer"
    :show-switch="false"
    :title="
      t('pppoe.pppd_drawer.configure_pppd', {
        iface_name: props.attach_iface_name,
      })
    "
  >
    <n-flex vertical>
      <n-button
        style="align-self: flex-start"
        @click="show_create_pppd_modal = true"
        >{{ t("pppoe.pppd_drawer.add_pppd") }}</n-button
      >
      <PPPDServiceTable
        :configs="pppd_configs"
        :attach-iface-name="props.attach_iface_name"
        @refresh="refreshDrawer"
      />
      <CreatePPPDConfigModal
        @refresh="refreshDrawer"
        :attach_iface_name="props.attach_iface_name"
        v-model:show="show_create_pppd_modal"
        :origin_value="undefined"
      />
    </n-flex>
  </ConfigModal>
</template>

<style scoped>
.pppd-section-title {
  margin: 0 0 12px;
  font-size: var(--app-font-size-body);
}
</style>
