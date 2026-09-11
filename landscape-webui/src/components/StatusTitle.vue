<script setup lang="ts">
import { useI18n } from "vue-i18n";
import CarrierStatusDot from "@/components/topology/CarrierStatusDot.vue";

const { t } = useI18n();

type Props = {
  enable: boolean;
  remark: string;
};

const props = defineProps<Props>();
</script>
<template>
  <div class="status-title">
    <CarrierStatusDot :active="enable" />
    <n-ellipsis>
      {{ remark !== "" ? remark : t("common.no_remark") }}
    </n-ellipsis>
  </div>
</template>

<style scoped>
.status-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--app-space-section);
}
</style>
