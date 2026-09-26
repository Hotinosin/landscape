<script setup lang="ts">
import { useDnsConfigStore } from "@/stores/dns_config";
import { useMessage } from "naive-ui";
import { useI18n } from "vue-i18n";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";

const dnsStore = useDnsConfigStore();
const message = useMessage();
const { t } = useI18n();

async function handleSaveDns() {
  try {
    await dnsStore.saveDnsConfig();
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
  <n-card :title="t('config.dns_title')" segmented id="dns-config">
    <template #header-extra>
      <n-button type="primary" @click="handleSaveDns">
        {{ t("config.save_dns") }}
      </n-button>
    </template>
    <n-form>
      <StandardSettingRow
        :label="t('config.cache_capacity')"
        :hint="t('config.cache_capacity_desc')"
      >
        <n-input-number
          v-model:value="dnsStore.cacheCapacity"
          :min="1024"
          :max="1048576"
          :show-button="false"
          placeholder="4096"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.cache_ttl')"
        :hint="t('config.cache_ttl_desc')"
      >
        <n-input-number
          v-model:value="dnsStore.cacheTtl"
          :min="60"
          :max="2592000"
          :show-button="false"
          placeholder="86400"
        />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.cache_negative_ttl')"
        :hint="t('config.cache_negative_ttl_desc')"
      >
        <n-input-number
          v-model:value="dnsStore.cacheNegativeTtl"
          :min="5"
          :max="3600"
          :show-button="false"
          placeholder="60"
        />
      </StandardSettingRow>
    </n-form>
  </n-card>
</template>
