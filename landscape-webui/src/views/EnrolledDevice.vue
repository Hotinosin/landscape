<script lang="ts" setup>
import { computed, h, ref, onMounted } from "vue";
import type { DataTableColumns } from "naive-ui";
import type { EnrolledDevice } from "@landscape-router/types/api/schemas";
import { useI18n } from "vue-i18n";
import EnrolledDeviceListRow from "@/components/device/EnrolledDeviceListRow.vue";
import EnrolledDeviceEditModal from "@/components/device/EnrolledDeviceEditModal.vue";
import { Renew } from "@vicons/carbon";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import { usePageRequest } from "@/composables/usePageRequest";
import { validate_enrolled_device_ip } from "@/api/enrolled_device";

const { t } = useI18n();
const enrolledDeviceStore = useEnrolledDeviceStore();

const deviceRequest = usePageRequest(
  async () => {
    await enrolledDeviceStore.UPDATE_INFO();
    return enrolledDeviceStore.bindings;
  },
  { initialData: [] as EnrolledDevice[] },
);

onMounted(async () => {
  await deviceRequest.execute();
  await validateDevices(deviceRequest.data.value);
});

const show_edit_modal = ref(false);
const validity = ref<Record<string, boolean | null>>({});

function deviceKey(device: EnrolledDevice) {
  return String(device.id ?? device.mac);
}

async function validateDevices(devices: EnrolledDevice[]) {
  const entries = await Promise.all(
    devices.map(async (device): Promise<[string, boolean | null]> => {
      if (!device.iface_name || !device.ipv4) return [deviceKey(device), true];
      try {
        return [
          deviceKey(device),
          await validate_enrolled_device_ip(device.iface_name, device.ipv4),
        ];
      } catch {
        return [deviceKey(device), null];
      }
    }),
  );
  validity.value = Object.fromEntries(entries);
}

const columns = computed<DataTableColumns<EnrolledDevice>>(() => [
  {
    title: t("device.name"),
    key: "name",
    width: 110,
    render: (rule) =>
      h(EnrolledDeviceListRow, {
        rule,
        cell: "name",
        valid: validity.value[deviceKey(rule)],
      }),
  },
  {
    title: t("device.mac"),
    key: "mac",
    width: 160,
    render: (rule) => h(EnrolledDeviceListRow, { rule, cell: "mac" }),
  },
  {
    title: t("device.iface"),
    key: "iface",
    width: 110,
    render: (rule) => h(EnrolledDeviceListRow, { rule, cell: "iface" }),
  },
  {
    title: t("device.ipv4"),
    key: "ipv4",
    width: 140,
    render: (rule) => h(EnrolledDeviceListRow, { rule, cell: "ipv4" }),
  },
  {
    title: t("device.ipv6"),
    key: "ipv6",
    width: 180,
    render: (rule) => h(EnrolledDeviceListRow, { rule, cell: "ipv6" }),
  },
  {
    title: t("device.tag"),
    key: "tags",
    width: 120,
    render: (rule) => h(EnrolledDeviceListRow, { rule, cell: "tags" }),
  },
  {
    title: t("device.remark"),
    key: "remark",
    render: (rule) => h(EnrolledDeviceListRow, { rule, cell: "remark" }),
  },
  {
    title: t("device.actions"),
    key: "actions",
    width: 120,
    align: "left",
    render: (rule) =>
      h(EnrolledDeviceListRow, {
        rule,
        cell: "actions",
        onRefresh: manualRefresh,
      }),
  },
]);

async function manualRefresh() {
  await deviceRequest.refresh();
  await validateDevices(deviceRequest.data.value);
}
</script>

<template>
  <n-flex vertical class="standard-content-page">
    <n-flex
      align="center"
      justify="space-between"
      class="standard-list-toolbar"
    >
      <n-button type="primary" @click="show_edit_modal = true">
        {{ t("common.create") }}
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

    <StandardDataTable
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
