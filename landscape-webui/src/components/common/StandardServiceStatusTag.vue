<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { ServiceStatus } from "@/lib/services";
import {
  get_service_status_label,
  get_service_status_tag_type,
} from "@/lib/services";

defineProps<{ status?: ServiceStatus }>();
const { t } = useI18n();
</script>

<template>
  <n-tag
    :type="get_service_status_tag_type(status)"
    size="small"
    :bordered="false"
  >
    <template #icon><span class="standard-service-status-tag__dot" /></template>
    {{ get_service_status_label(status, t) }}
  </n-tag>
</template>

<style scoped>
.standard-service-status-tag__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
</style>
