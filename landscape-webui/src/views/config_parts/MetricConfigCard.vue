<script setup lang="ts">
import { useMetricConfigStore } from "@/stores/metric_config";
import { useMessage } from "naive-ui";
import type { FormInst, FormRules } from "naive-ui";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";

const metricStore = useMetricConfigStore();
const message = useMessage();
const { t } = useI18n();
const formRef = ref<FormInst | null>(null);
const modeOptions = computed(() => [
  { label: t("config.metric_mode_off"), value: "off" },
  { label: t("config.metric_mode_memory"), value: "memory" },
  { label: t("config.metric_mode_persistent"), value: "persistent" },
]);

const dbCapRule = (): NonNullable<FormRules[string]> => {
  return {
    validator: (_rule, value: number | undefined) => {
      if (value === undefined || value === null || value === 0 || value >= 16) {
        return true;
      }
      return new Error(t("config.db_cap_min_hint"));
    },
    trigger: ["blur", "change"],
  };
};

const rules: FormRules = {
  connectDbMaxMb: dbCapRule(),
  dnsDbMaxMb: dbCapRule(),
};

async function handleSaveMetric() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  try {
    await metricStore.saveMetricConfig();
    message.success(t("config.save_success"));
  } catch (e: any) {
    if (e.response?.status === 409) {
      message.error(t("config.conflict"));
    } else {
      message.error(t("config.save_failed") + ": " + e.message);
    }
  }
}
</script>

<template>
  <n-card :title="t('config.metric_title')" segmented id="metric-config">
    <template #header-extra>
      <n-button type="primary" @click="handleSaveMetric">
        {{ t("config.save_metric") }}
      </n-button>
    </template>
    <n-form
      ref="formRef"
      :model="metricStore"
      :rules="rules"
    >
      <StandardSettingRow
        :label="t('config.metric_mode')"
        path="mode"
        :hint="t('config.metric_mode_desc')"
      >
        <n-select
          v-model:value="metricStore.mode"
          :options="modeOptions"
        />
      </StandardSettingRow>

      <n-divider title-placement="left">
        {{ t("config.conn_retention_mins") }}
      </n-divider>
      <StandardSettingRow
        :label="t('config.connect_second_window_mins')"
        :hint="t('config.connect_second_window_mins_desc')"
      >
        <n-input-number
          v-model:value="metricStore.connectSecondWindowMinutes"
          :min="1"
          :max="60"
          :show-button="false"
          placeholder="5"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.conn_retention_minute_days')"
        :hint="t('config.conn_retention_minute_days_desc')"
      >
        <n-input-number
          v-model:value="metricStore.connect1mRetentionDays"
          :min="1"
          :max="365"
          :show-button="false"
          placeholder="1"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.conn_retention_hour_days')"
        :hint="t('config.conn_retention_hour_days_desc')"
      >
        <n-input-number
          v-model:value="metricStore.connect1hRetentionDays"
          :min="1"
          :max="365"
          :show-button="false"
          placeholder="7"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.conn_retention_day_days')"
        :hint="t('config.conn_retention_day_days_desc')"
      >
        <n-input-number
          v-model:value="metricStore.connect1dRetentionDays"
          :min="1"
          :max="3650"
          :show-button="false"
          placeholder="30"
        />
      </StandardSettingRow>

      <n-divider title-placement="left">
        {{ t("config.conn_detail_settings") }}
      </n-divider>
      <StandardSettingRow
        :label="t('config.conn_summary_retention_days')"
        :hint="t('config.conn_summary_retention_days_desc')"
      >
        <n-input-number
          v-model:value="metricStore.connectSummaryRetentionDays"
          :min="1"
          :max="3650"
          :show-button="false"
          placeholder="30"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.conn_summary_max_rows')"
        :hint="t('config.conn_summary_max_rows_desc')"
      >
        <n-input-number
          v-model:value="metricStore.connectSummaryMaxRows"
          :min="0"
          :max="100000000"
          :show-button="false"
          placeholder="500000"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.connect_db_max_mb')"
        :hint="t('config.connect_db_max_mb_desc')"
        path="connectDbMaxMb"
      >
        <n-input-number
          v-model:value="metricStore.connectDbMaxMb"
          :min="0"
          :max="1048576"
          :show-button="false"
          placeholder="512"
          style="width: 100%"
        />
      </StandardSettingRow>

      <n-divider title-placement="left">
        {{ t("config.dns_retention_days") }}
      </n-divider>
      <StandardSettingRow
        :label="t('config.dns_retention_days')"
        :hint="t('config.dns_retention_days_desc')"
      >
        <n-input-number
          v-model:value="metricStore.dnsRetentionDays"
          :min="1"
          :max="365"
          :show-button="false"
          placeholder="7"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.dns_1m_retention_days')"
        :hint="t('config.dns_1m_retention_days_desc')"
      >
        <n-input-number
          v-model:value="metricStore.dns1mRetentionDays"
          :min="1"
          :max="365"
          :show-button="false"
          placeholder="30"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.dns_db_max_mb')"
        :hint="t('config.dns_db_max_mb_desc')"
        path="dnsDbMaxMb"
      >
        <n-input-number
          v-model:value="metricStore.dnsDbMaxMb"
          :min="0"
          :max="1048576"
          :show-button="false"
          placeholder="1024"
          style="width: 100%"
        />
      </StandardSettingRow>

      <n-divider title-placement="left">
        {{ t("config.performance_settings") }}
      </n-divider>
      <StandardSettingRow
        :label="t('config.write_flush_interval')"
        :hint="t('config.write_flush_interval_desc')"
      >
        <n-input-number
          v-model:value="metricStore.writeFlushIntervalSecs"
          :min="1"
          :max="3600"
          :show-button="false"
          placeholder="30"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.write_batch_size')"
        :hint="t('config.write_batch_size_desc')"
      >
        <n-input-number
          v-model:value="metricStore.writeBatchSize"
          :min="100"
          :max="50000"
          :show-button="false"
          placeholder="20000"
        />
      </StandardSettingRow>

      <n-divider title-placement="left">
        {{ t("config.maintenance_settings") }}
      </n-divider>
      <StandardSettingRow
        :label="t('config.cleanup_interval')"
        :hint="t('config.cleanup_interval_desc')"
      >
        <n-input-number
          v-model:value="metricStore.cleanupIntervalSecs"
          :min="60"
          :max="86400"
          :show-button="false"
          placeholder="300"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.cleanup_budget')"
        :hint="t('config.cleanup_budget_desc')"
      >
        <n-input-number
          v-model:value="metricStore.cleanupTimeBudgetSecs"
          :min="1"
          :max="60"
          :show-button="false"
          placeholder="2"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.cleanup_slice_window')"
        :hint="t('config.cleanup_slice_window_desc')"
      >
        <n-input-number
          v-model:value="metricStore.cleanupSliceWindowSecs"
          :min="10"
          :max="3600"
          :show-button="false"
          placeholder="300"
        />
      </StandardSettingRow>
    </n-form>
  </n-card>
</template>
