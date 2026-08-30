<script setup lang="ts">
import { computed, h } from "vue";
import type { DataTableColumns } from "naive-ui";
import { NTag, NTime } from "naive-ui";
import { useI18n } from "vue-i18n";

import { HelpFilled, Time } from "@vicons/carbon";
import type { IPv6NAInfo } from "@landscape-router/types/api/schemas";
import { useFrontEndStore } from "@/stores/front_end_config";
import { usePreferenceStore } from "@/stores/preference";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
const prefStore = usePreferenceStore();
const { t } = useI18n();

const frontEndStore = useFrontEndStore();

interface Props {
  config: IPv6NAInfo | null;
  iface_name: string;
  show_action?: boolean;
}
interface TableItem {
  ip: string;
  mac: string;
  active: number;
  stale: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  show_action: false,
});

const emit = defineEmits(["refresh"]);

async function refresh() {
  emit("refresh");
}

const info = computed(() => {
  let result: TableItem[] = [];
  if (props.config?.offered_ips) {
    const time = new Date().getTime();
    for (const value of Object.values(props.config?.offered_ips ?? {})) {
      if (!value) continue;
      const each_time =
        value?.relative_active_time * 1000 + props.config.boot_time;
      // console.log(time);
      // console.log(each_time);
      // console.log(time - each_time);
      result.push({
        ip: value.ip,
        mac: value.mac as unknown as string,
        active: each_time,
        stale: time - each_time < 30 * 1000,
      });
    }
  }
  return result;
});

const columns = computed<DataTableColumns<TableItem>>(() => [
  {
    title: "IPv6",
    key: "ip",
    render: (row) => frontEndStore.MASK_INFO(row.ip),
  },
  {
    title: "Mac",
    key: "mac",
    render: (row) => frontEndStore.MASK_INFO(row.mac),
  },
  {
    title: t("common.time"),
    key: "active",
    render: (row) =>
      h(NTime, { time: row.active, timeZone: prefStore.timezone }),
  },
  {
    title: t("common.status"),
    key: "stale",
    render: (row) =>
      h(
        NTag,
        { bordered: false, type: row.stale ? "success" : "warning" },
        { default: () => (row.stale ? "ACTIVE" : "STALE") },
      ),
  },
]);
</script>

<template>
  <n-card
    style="min-height: 224px"
    content-style="display: flex"
    size="small"
    :hoverable="true"
  >
    <template #header>
      {{ props.iface_name }}
    </template>
    <!-- {{ config }} -->
    <StandardDataTable
      v-if="info.length > 0"
      :columns="columns"
      :data="info"
      size="small"
      :row-key="(row) => row.ip"
    />
    <n-flex
      align="center"
      justify="center"
      style="height: 190px; flex: 1"
      v-else
    >
      <n-empty :description="t('lan_ipv6.neighbor_count_unknown')"> </n-empty>
    </n-flex>
  </n-card>
</template>
