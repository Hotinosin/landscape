<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import type {
  ConnectKey,
  ConnectRealtimeStatus,
} from "@landscape-router/types/api/schemas";
import { useFrontEndStore } from "@/stores/front_end_config";
import ConnectItemInfo from "./ConnectItemInfo.vue";

const ConnectChartDrawer = defineAsyncComponent(
  () => import("../ConnectChartDrawer.vue"),
);

const frontEndStore = useFrontEndStore();

interface Props {
  connect_metrics: ConnectRealtimeStatus[];
}
const props = defineProps<Props>();
const virtualItems = computed(() =>
  props.connect_metrics.map((item) => ({
    ...item,
    virtual_key: `${item.key.create_time}-${item.key.cpu_id}`,
  })),
);

const show_chart = ref(false);
const show_chart_key = ref<ConnectKey | null>(null);
const show_chart_title = ref("");
const show_chart_create_time_ms = ref<number | undefined>();
const show_chart_last_report_time = ref<number | undefined>();

async function show_chart_drawer(conn: ConnectRealtimeStatus) {
  show_chart_key.value = conn.key;
  show_chart_title.value = `${frontEndStore.MASK_INFO(conn.src_ip)}:${frontEndStore.MASK_PORT(conn.src_port)} => ${frontEndStore.MASK_INFO(conn.dst_ip)}:${frontEndStore.MASK_PORT(conn.dst_port)}`;
  show_chart_create_time_ms.value = conn.create_time_ms;
  show_chart_last_report_time.value = conn.last_report_time;
  show_chart.value = true;
}
const emit = defineEmits(["search:tuple", "search:src", "search:dst"]);
</script>

<template>
  <n-virtual-list
    class="list"
    :item-size="44"
    :items="virtualItems"
    key-field="virtual_key"
  >
    <template #default="{ item, index }">
      <ConnectItemInfo
        @show:chart="show_chart_drawer"
        @search:tuple="emit('search:tuple', $event)"
        @search:src="emit('search:src', $event)"
        @search:dst="emit('search:dst', $event)"
        :conn="item"
        :index="index"
      />
    </template>
  </n-virtual-list>

  <ConnectChartDrawer
    v-if="show_chart"
    v-model:show="show_chart"
    :conn="show_chart_key"
    :title="show_chart_title"
    :create-time-ms="show_chart_create_time_ms"
    :last-report-time="show_chart_last_report_time"
  />
</template>

<style scoped>
.list {
  flex: 1;
  min-height: 0;
}
</style>
