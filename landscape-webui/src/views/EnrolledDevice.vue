<script lang="ts" setup>
import { computed, h, ref, onMounted, onUnmounted } from "vue";
import type { DataTableColumns } from "naive-ui";
import type { EnrolledDevice } from "@landscape-router/types/api/schemas";
import { useI18n } from "vue-i18n";
import EnrolledDeviceCard from "@/components/device/EnrolledDeviceCard.vue";
import EnrolledDeviceEditModal from "@/components/device/EnrolledDeviceEditModal.vue";
import { Add, Renew } from "@vicons/carbon";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import { useFetchIntervalStore } from "@/stores/fetch_interval";
import { useFrontEndStore } from "@/stores/front_end_config";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import { usePageRequest } from "@/composables/usePageRequest";

const { t } = useI18n();
const enrolledDeviceStore = useEnrolledDeviceStore();
const fetchIntervalStore = useFetchIntervalStore();
const frontEndStore = useFrontEndStore();

const deviceRequest = usePageRequest(
  async () => {
    await enrolledDeviceStore.UPDATE_INFO();
    return enrolledDeviceStore.bindings;
  },
  { initialData: [] as EnrolledDevice[] },
);

onMounted(async () => {
  await deviceRequest.execute();
  fetchIntervalStore.enable_interval = false;
});

onUnmounted(() => {
  fetchIntervalStore.enable_interval = true;
});

const show_edit_modal = ref(false);

const columns = computed<DataTableColumns<EnrolledDevice>>(() => [
  {
    title: t("device.name"),
    key: "name",
    width: "18%",
    render: (rule) =>
      h(EnrolledDeviceCard, { rule, display_style: "list", cell: "name" }),
  },
  {
    title: t("device.mac"),
    key: "mac",
    width: "18%",
    render: (rule) =>
      h(EnrolledDeviceCard, { rule, display_style: "list", cell: "mac" }),
  },
  {
    title: t("device.iface"),
    key: "iface",
    width: "13%",
    render: (rule) =>
      h(EnrolledDeviceCard, { rule, display_style: "list", cell: "iface" }),
  },
  {
    title: t("device.ipv4"),
    key: "ipv4",
    width: "15%",
    render: (rule) =>
      h(EnrolledDeviceCard, { rule, display_style: "list", cell: "ipv4" }),
  },
  {
    title: t("device.ipv6"),
    key: "ipv6",
    width: "17%",
    render: (rule) =>
      h(EnrolledDeviceCard, { rule, display_style: "list", cell: "ipv6" }),
  },
  {
    title: t("device.tag"),
    key: "tags",
    width: "11%",
    render: (rule) =>
      h(EnrolledDeviceCard, { rule, display_style: "list", cell: "tags" }),
  },
  {
    title: t("device.actions"),
    key: "actions",
    width: 120,
    align: "left",
    render: (rule) =>
      h(EnrolledDeviceCard, { rule, display_style: "list", cell: "actions" }),
  },
]);

async function manualRefresh() {
  await deviceRequest.refresh();
}
</script>

<template>
  <n-flex vertical class="standard-content-page">
    <n-flex align="center" class="standard-list-toolbar">
      <n-button type="primary" @click="show_edit_modal = true">
        <template #icon>
          <n-icon><Add /></n-icon>
        </template>
        {{ t("device.add_btn") }}
      </n-button>
      <n-button
        :loading="deviceRequest.refreshing.value"
        secondary
        @click="manualRefresh"
      >
        <template #icon>
          <n-icon><Renew /></n-icon>
        </template>
        {{ t("common.refresh") }}
      </n-button>
    </n-flex>

    <StandardPageState
      v-if="frontEndStore.display_style === 'card'"
      :state="deviceRequest.state.value"
      :empty-text="t('device.empty_desc')"
      @retry="deviceRequest.retry"
    >
      <template #empty-extra>
        <n-button @click="show_edit_modal = true">
          {{ t("device.add_now") }}
        </n-button>
      </template>
      <n-grid
        x-gap="12"
        y-gap="12"
        :cols="
          frontEndStore.display_style === 'card' ? '1 600:2 1000:3 1400:4' : 1
        "
      >
        <n-grid-item v-for="item in deviceRequest.data.value" :key="item.id">
          <EnrolledDeviceCard
            :rule="item"
            :display_style="frontEndStore.display_style"
          />
        </n-grid-item>
      </n-grid>
    </StandardPageState>
    <StandardDataTable
      v-else
      :columns="columns"
      :data="deviceRequest.data.value"
      :loading="deviceRequest.loading.value"
      :error="deviceRequest.error.value"
      :row-key="(row) => row.id ?? row.mac"
      :scroll-x="1000"
      @retry="deviceRequest.retry"
    />

    <EnrolledDeviceEditModal :rule_id="null" v-model:show="show_edit_modal" />
  </n-flex>
</template>
