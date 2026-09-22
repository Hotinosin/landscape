<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const viewMode = computed({
  get: () => {
    const lastPart = route.path.split("/").pop();
    return lastPart || "live";
  },
  set: (val) => {
    router.push({ path: `/metrics/conn/${val}`, query: { ...route.query } });
  },
});
const isHistory = computed(() => viewMode.value.startsWith("history"));
</script>

<template>
  <n-flex align="center" :wrap="false" class="connect-view-switcher">
    <n-tabs
      v-model:value="viewMode"
      type="segment"
      size="small"
      class="connect-view-tabs"
      :style="{ width: isHistory ? '480px' : '640px' }"
    >
      <template v-if="isHistory">
        <n-tab name="history">{{ $t("metric.connect.view.connection") }}</n-tab>
        <n-tab name="history-src">{{ $t("metric.connect.view.src_ip") }}</n-tab>
        <n-tab name="history-dst">{{ $t("metric.connect.view.dst_ip") }}</n-tab>
      </template>
      <template v-else>
        <n-tab name="live">{{ $t("metric.connect.view.connection") }}</n-tab>
        <n-tab name="iface">{{ $t("metric.connect.view.iface") }}</n-tab>
        <n-tab name="src">{{ $t("metric.connect.view.src_ip") }}</n-tab>
        <n-tab name="dst">{{ $t("metric.connect.view.dst_ip") }}</n-tab>
      </template>
    </n-tabs>

    <n-tag
      v-if="['live', 'iface', 'src', 'dst'].includes(viewMode)"
      :bordered="false"
      type="info"
      size="small"
    >
      <template #icon>
        <div class="pulse-dot"></div>
      </template>
      {{ $t("metric.connect.stats.five_sec_sample") }}
    </n-tag>
  </n-flex>
</template>

<style scoped>
.connect-view-switcher {
  flex: 0 0 auto;
}

.connect-view-tabs {
  flex: 0 0 auto;
  max-width: 640px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: var(--app-sampling-color);
  border-radius: 50%;
  box-shadow: 0 0 0 0 var(--app-sampling-glow-color);
  animation: pulse 1.5s infinite;
  margin-right: 4px;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 var(--app-sampling-glow-color);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px transparent;
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 transparent;
  }
}
</style>
