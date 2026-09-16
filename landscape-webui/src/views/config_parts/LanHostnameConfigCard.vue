<script setup lang="ts">
import { useLanHostnameConfigStore } from "@/stores/lan_hostname_config";
import { useMessage } from "naive-ui";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";

const lanHostnameStore = useLanHostnameConfigStore();
const message = useMessage();
const { t } = useI18n();
const saving = ref(false);

async function handleSaveLanHostname() {
  saving.value = true;
  try {
    await lanHostnameStore.saveLanHostnameConfig();
    message.success(t("config.save_success"));
  } catch (e: any) {
    // Structured API errors are localized and displayed by the shared interceptor.
    if (!e?.error_id) {
      message.error(t("config.save_failed") + ": " + e.message);
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <n-card
    :title="t('config.lan_hostname_title')"
    segmented
    id="lan-hostname-config"
  >
    <template #header-extra>
      <n-button type="primary" :loading="saving" @click="handleSaveLanHostname">
        {{ t("config.save_lan_hostname") }}
      </n-button>
    </template>
    <n-form>
      <StandardSettingRow
        :label="t('config.lan_hostname_enable')"
        control-width="auto"
      >
        <n-switch v-model:value="lanHostnameStore.enabled" size="medium" />
      </StandardSettingRow>
      <StandardSettingRow
        :label="t('config.lan_suffix')"
        :feedback="t('config.lan_suffix_desc')"
      >
        <n-input
          v-model:value="lanHostnameStore.lanSuffix"
          clearable
          :disabled="!lanHostnameStore.enabled"
          :placeholder="t('config.lan_suffix_placeholder')"
        />
      </StandardSettingRow>
    </n-form>
  </n-card>
</template>
