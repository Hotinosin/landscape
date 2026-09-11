<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Renew, WarningAlt } from "@vicons/carbon";
import { useI18n } from "vue-i18n";

import { useFetchIntervalStore } from "@/stores/fetch_interval";

const fetchIntervalStore = useFetchIntervalStore();
const { t } = useI18n();
const edit_interval = ref(fetchIntervalStore.interval_time);

onMounted(() => {
  fetchIntervalStore.SETTING_CALLBACK(() => {});
  fetchIntervalStore.IMMEDIATELY_EXECUTE();
});

onUnmounted(() => fetchIntervalStore.destroy());

function handleUpdateShow() {
  edit_interval.value = fetchIntervalStore.interval_time;
}

function confirmChangeInterval() {
  fetchIntervalStore.interval_time = edit_interval.value;
  fetchIntervalStore.IMMEDIATELY_EXECUTE();
}
</script>

<template>
  <n-flex align="center">
    <n-tooltip v-if="fetchIntervalStore.error_message">
      <template #trigger>
        <n-button quaternary circle size="small">
          <template #icon>
            <n-icon size="18" color="var(--app-status-warning-color)">
              <WarningAlt />
            </n-icon>
          </template>
        </n-button>
      </template>
      {{ fetchIntervalStore.error_message }}
    </n-tooltip>
    <n-popover trigger="hover" @update:show="handleUpdateShow">
      <template #trigger>
        <n-flex align="center" :size="6" :wrap="false">
          <n-icon size="17"><Renew /></n-icon>
          <n-switch
            v-model:value="fetchIntervalStore.enable_interval"
            size="small"
          />
        </n-flex>
      </template>

      <n-input-group>
        <n-input-group-label>{{
          t("common.refresh_interval_ms")
        }}</n-input-group-label>
        <n-input-number
          v-model:value="edit_interval"
          style="width: 130px"
          :min="500"
          :max="50000"
          :step="500"
          button-placement="both"
        />
        <n-button type="primary" ghost @click="confirmChangeInterval">
          {{ t("common.confirm") }}
        </n-button>
      </n-input-group>
    </n-popover>
  </n-flex>
</template>
