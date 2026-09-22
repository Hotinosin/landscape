<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import CarrierStatusDot from "@/components/topology/CarrierStatusDot.vue";

const { t } = useI18n();

type Props = {
  enable: boolean;
  name?: string | null;
  remark?: string | null;
  prefix?: string | number | null;
};

const props = withDefaults(defineProps<Props>(), {
  name: null,
  remark: null,
  prefix: null,
});

const hasName = computed(() => Boolean(props.name && props.name.trim() !== ""));
const hasRemark = computed(
  () => Boolean(props.remark && props.remark.trim() !== ""),
);
</script>

<template>
  <div class="status-title">
    <CarrierStatusDot :active="enable" />
    <div class="status-title-text">
      <n-ellipsis v-if="hasName" class="status-title-name">
        {{ prefix !== null && prefix !== undefined ? `${prefix}: ${name}` : name }}
      </n-ellipsis>
      <n-ellipsis
        v-if="hasRemark"
        :class="['status-title-remark', { 'is-secondary': hasName }]"
        :depth="hasName ? 3 : undefined"
      >
        {{
          !hasName && prefix !== null && prefix !== undefined
            ? `${prefix}: ${remark}`
            : remark
        }}
      </n-ellipsis>
      <n-text v-if="!hasName && !hasRemark" depth="3">
        {{
          prefix !== null && prefix !== undefined
            ? `${prefix}: —`
            : t("common.no_remark")
        }}
      </n-text>
    </div>
  </div>
</template>

<style scoped>
.status-title {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: var(--app-space-section, 8px);
}

.status-title-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}

.status-title-name {
  font-weight: 500;
}

.status-title-remark.is-secondary {
  font-size: var(--app-font-size-caption);
  color: var(--app-text-muted-color);
}
</style>
