<script setup lang="ts">
import { useFrontEndStore } from "@/stores/front_end_config";
import type { ConnectKey } from "@landscape-router/types/api/schemas";
import { computed } from "vue";
import LiveConnectChart from "./live/LiveConnectChart.vue";
import HistoryConnectChart from "./history/HistoryConnectChart.vue";
import ConfigModal from "@/components/common/ConfigModal.vue";

const frontEndStore = useFrontEndStore();

interface Props {
  conn: ConnectKey | null;
  title?: string;
  type?: "live" | "history";
  createTimeMs?: number;
  lastReportTime?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  type: "live",
});

const show = defineModel<boolean>("show", { default: false });

const title = computed(() => {
  return frontEndStore.MASK_INFO(props.title);
});
</script>

<template>
  <ConfigModal
    v-model:show="show"
    :show-switch="false"
    width="min(1040px, calc(100vw - 32px))"
    :title="title"
  >
    <template v-if="conn">
      <LiveConnectChart
        v-if="type === 'live'"
        :conn="conn"
        :create-time-ms="createTimeMs"
        :last-report-time="lastReportTime"
      />
      <HistoryConnectChart
        v-else-if="type === 'history'"
        :conn="conn"
        :create-time-ms="createTimeMs"
        :last-report-time="lastReportTime"
      />
    </template>
  </ConfigModal>
</template>
