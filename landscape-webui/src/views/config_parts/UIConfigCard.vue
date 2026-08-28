<script setup lang="ts">
import { usePreferenceStore } from "@/stores/preference";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useMessage } from "naive-ui";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { HelpCircleOutline } from "@vicons/ionicons5";

const prefStore = usePreferenceStore();
const frontEndStore = useFrontEndStore();
const message = useMessage();
const { t } = useI18n();

// Language labels are always shown in their native form, not translated
const languageOptions = [
  { label: "简体中文", value: "zh" },
  { label: "English", value: "en" },
];

const themeOptions = computed(() => [
  { label: t("config.system_mode"), value: "system" },
  { label: t("config.light_mode"), value: "light" },
  { label: t("config.dark_mode"), value: "dark" },
]);

const displayStyleOptions = computed(() => [
  { label: t("config.display_style_card"), value: "card" },
  { label: t("config.display_style_list"), value: "list" },
]);

const timezoneOptions = (Intl as any)
  .supportedValuesOf("timeZone")
  .map((tz: string) => ({
    label: tz,
    value: tz,
  }));

async function handleSave() {
  try {
    await prefStore.savePreference();
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
  <n-card :title="t('config.ui_title')" segmented id="ui-config">
    <template #header-extra>
      <n-button type="primary" @click="handleSave">
        {{ t("config.save_ui") }}
      </n-button>
    </template>

    <n-form label-placement="left" label-width="160">
      <n-form-item :label="t('config.language')">
        <n-select
          class="preference-control"
          v-model:value="prefStore.language"
          :options="languageOptions"
        />
      </n-form-item>
      <n-form-item :label="t('config.theme')">
        <n-select
          class="preference-control"
          v-model:value="prefStore.theme"
          :options="themeOptions"
          :placeholder="t('config.theme_placeholder')"
        />
      </n-form-item>
      <n-form-item :label="t('config.display_style')">
        <n-flex align="center" :wrap="false" size="small">
          <n-select
            class="preference-control"
            v-model:value="frontEndStore.display_style"
            :options="displayStyleOptions"
            :placeholder="t('config.display_style_placeholder')"
          />
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon size="16" style="cursor: help"
                ><HelpCircleOutline
              /></n-icon>
            </template>
            {{ t("config.display_style_tip") }}
          </n-tooltip>
        </n-flex>
      </n-form-item>
      <n-form-item :label="t('config.timezone')">
        <n-select
          class="preference-control"
          v-model:value="prefStore.timezone"
          filterable
          :options="timezoneOptions"
          :placeholder="t('config.timezone_placeholder')"
        />
      </n-form-item>
    </n-form>
  </n-card>
</template>

<style scoped>
.preference-control {
  width: 300px;
  max-width: 100%;
}
</style>
