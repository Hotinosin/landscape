<script setup lang="ts">
import { computed, h, ref } from "vue";
import { NFlex, NTag, type DataTableColumns } from "naive-ui";
import type { PPPDServiceConfig } from "@/lib/pppd";
import { stop_and_del_iface_pppd } from "@/api/service_pppd";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useI18n } from "vue-i18n";
import CreatePPPDConfigModal from "./CreatePPPDConfigModal.vue";
import EditButton from "@/components/common/EditButton.vue";
import DeleteButton from "@/components/common/DeleteButton.vue";

const props = defineProps<{
  configs: PPPDServiceConfig[];
  attachIfaceName: string;
}>();
const emit = defineEmits<{ refresh: [] }>();
const { t } = useI18n();
const front = useFrontEndStore();
const editing = ref<PPPDServiceConfig>();

function rowKey(config: PPPDServiceConfig) {
  return config.iface_name;
}

const columns = computed<DataTableColumns<PPPDServiceConfig>>(() => [
  {
    title: t("pppoe.editor.ppp_iface_name"),
    key: "iface_name",
    width: 110,
  },
  {
    title: t("common.username"),
    key: "username",
    render: (config) => front.MASK_INFO(config.pppd_config.peer_id),
  },
  {
    title: t("pppoe.editor.default_route"),
    key: "default_route",
    width: 100,
    render: (config) =>
      h(
        NTag,
        {
          bordered: false,
          type: config.pppd_config.default_route ? "success" : "default",
        },
        {
          default: () =>
            config.pppd_config.default_route
              ? t("interface.yes")
              : t("interface.no"),
        },
      ),
  },
  {
    title: t("common.enable"),
    key: "enable",
    width: 80,
    render: (config) =>
      h(
        NTag,
        { bordered: false, type: config.enable ? "success" : "default" },
        {
          default: () =>
            config.enable ? t("interface.yes") : t("interface.no"),
        },
      ),
  },
  {
    title: t("common.actions"),
    key: "actions",
    width: 160,
    render: (config) =>
      h(NFlex, { wrap: false }, () => [
        h(EditButton, { onClick: () => (editing.value = config) }),
        h(DeleteButton, {
          item: config.iface_name,
          onConfirm: async () => {
            await stop_and_del_iface_pppd(config.iface_name);
            emit("refresh");
          },
        }),
      ]),
  },
]);
</script>

<template>
  <StandardDataTable
    :columns="columns"
    :data="configs"
    :row-key="rowKey"
    :scroll-x="640"
    size="small"
  />
  <CreatePPPDConfigModal
    :show="Boolean(editing)"
    :attach_iface_name="attachIfaceName"
    :origin_value="editing"
    @update:show="(show) => !show && (editing = undefined)"
    @refresh="emit('refresh')"
  />
</template>
