<script setup lang="ts">
import CreatePPPDConfigModal from "@/components/pppd/CreatePPPDConfigModal.vue";
import PPPDCard from "@/components/pppd/PPPDCard.vue";
import { get_attach_iface_pppd_config } from "@/api/service_pppd";
import { PPPDServiceConfig } from "@/lib/pppd";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const emit = defineEmits(["refresh"]);
const show = defineModel<boolean>("show", { required: true });
const props = defineProps<{
  attach_iface_name: string;
  presentation?: "drawer" | "modal" | "embedded";
}>();

const pppd_configs = ref<PPPDServiceConfig[]>([]);
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

onMounted(() => {
  if (props.presentation === "embedded") inti_drawer();
});
</script>
<template>
  <section v-if="props.presentation === 'embedded'">
    <h3 class="pppd-section-title">
      {{
        t("pppoe.pppd_drawer.configure_pppd", {
          iface_name: props.attach_iface_name,
        })
      }}
    </h3>
    <n-flex vertical>
      <n-button
        style="align-self: flex-start"
        @click="show_create_pppd_modal = true"
        >{{ t("pppoe.pppd_drawer.add_pppd") }}</n-button
      >
      <PPPDCard
        v-for="each in pppd_configs"
        :key="each.iface_name"
        :config="each"
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
  <n-modal
    v-else-if="props.presentation === 'modal'"
    v-model:show="show"
    :auto-focus="false"
    @after-enter="inti_drawer"
  >
    <n-card
      style="
        width: var(--app-secondary-modal-width);
        max-height: var(--app-secondary-modal-max-height);
      "
      :title="
        t('pppoe.pppd_drawer.configure_pppd', {
          iface_name: props.attach_iface_name,
        })
      "
      :bordered="false"
      closable
      size="small"
      content-style="min-height: 0; overflow: auto"
      role="dialog"
      aria-modal="true"
      @close="show = false"
    >
      <n-flex vertical>
        <n-button
          style="align-self: flex-start"
          @click="show_create_pppd_modal = true"
          >{{ t("pppoe.pppd_drawer.add_pppd") }}</n-button
        >
        <PPPDCard
          v-for="each in pppd_configs"
          :key="each.iface_name"
          :config="each"
          @refresh="refreshDrawer"
        />
        <CreatePPPDConfigModal
          @refresh="refreshDrawer"
          :attach_iface_name="props.attach_iface_name"
          v-model:show="show_create_pppd_modal"
          :origin_value="undefined"
        />
      </n-flex>
    </n-card>
  </n-modal>
  <n-drawer v-else v-model:show="show" width="500px" @after-enter="inti_drawer">
    <n-drawer-content
      :title="
        t('pppoe.pppd_drawer.configure_pppd', {
          iface_name: props.attach_iface_name,
        })
      "
      closable
    >
      <n-flex style="height: 100%" vertical>
        <n-button @click="show_create_pppd_modal = true">
          {{ t("pppoe.pppd_drawer.add_pppd") }}
        </n-button>

        <n-scrollbar>
          <n-flex vertical>
            <PPPDCard
              @refresh="refreshDrawer"
              :config="each"
              v-for="each in pppd_configs"
            >
            </PPPDCard>
          </n-flex>
        </n-scrollbar>
      </n-flex>

      <!-- {{ pppd_configs }} -->

      <CreatePPPDConfigModal
        @refresh="refreshDrawer"
        :attach_iface_name="props.attach_iface_name"
        v-model:show="show_create_pppd_modal"
        :origin_value="undefined"
      />
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.pppd-section-title {
  margin: 0 0 12px;
  font-size: var(--app-font-size-body);
}
</style>
