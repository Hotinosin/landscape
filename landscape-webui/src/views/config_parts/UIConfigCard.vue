<script setup lang="ts">
import { usePreferenceStore } from "@/stores/preference";
import { useMessage } from "naive-ui";
import { computed, h } from "vue";
import { useI18n } from "vue-i18n";
import {
  selectThemePreset,
  themePresets,
  themeStyleColor,
  themeStyleFromRgb,
  type ThemePreset,
  type ThemeRadius,
  type ThemeStyle,
} from "@/themes";

const prefStore = usePreferenceStore();
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

const presetOptions = computed(() => [
  ...Object.keys(themePresets).map((value) => ({
    label: value.charAt(0).toUpperCase() + value.slice(1),
    value: value as Exclude<ThemePreset, "custom">,
    color: themeStyleColor(
      selectThemePreset(prefStore.themeStyle, value as ThemePreset),
    ),
  })),
  {
    label: t("config.theme_custom"),
    value: "custom" as const,
    color: themeColor.value,
  },
]);

const radiusOptions = computed<{ label: string; value: ThemeRadius }[]>(() => [
  { label: t("config.radius_none"), value: "none" },
  { label: t("config.radius_small"), value: "small" },
  { label: t("config.radius_medium"), value: "medium" },
  { label: t("config.radius_large"), value: "large" },
]);

const themeColor = computed({
  get: () => themeStyleColor(prefStore.themeStyle),
  set: (value: string) => {
    prefStore.themeStyle = themeStyleFromRgb(prefStore.themeStyle, value);
  },
});

function choosePreset(preset: ThemePreset) {
  prefStore.themeStyle = selectThemePreset(prefStore.themeStyle, preset);
}

function renderPresetLabel(option: { label?: string; color?: string }) {
  return h(
    "span",
    {
      class: "preset-label",
      style: "display:inline-flex;align-items:center;gap:8px",
    },
    [
      h("span", {
        class: "preset-label-swatch",
        style: {
          backgroundColor: option.color,
          width: "14px",
          height: "14px",
          flex: "0 0 14px",
          borderRadius: "50%",
        },
      }),
      option.label,
    ],
  );
}

function updateThemeValue<K extends keyof ThemeStyle>(
  key: K,
  value: ThemeStyle[K] | null,
) {
  if (value === null) return;
  prefStore.themeStyle = {
    ...prefStore.themeStyle,
    [key]: value,
  };
}

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
      <n-form-item :label="t('config.theme_preset')">
        <div class="theme-editor">
          <div class="preset-row">
            <n-select
              class="preference-control"
              :value="prefStore.themeStyle.preset"
              :options="presetOptions"
              :render-label="renderPresetLabel"
              @update:value="choosePreset"
            />
            <n-color-picker
              v-if="prefStore.themeStyle.preset === 'custom'"
              class="custom-color-picker"
              v-model:value="themeColor"
              :modes="['rgb']"
              :show-alpha="false"
            >
              <template #trigger="{ value, onClick, ref: triggerRef }">
                <button
                  :ref="triggerRef"
                  class="color-trigger"
                  type="button"
                  :style="{ backgroundColor: value || themeColor }"
                  :aria-label="t('config.theme_color')"
                  @click="onClick"
                />
              </template>
            </n-color-picker>
          </div>
          <div class="theme-parameters">
            <label>
              <span>{{ t("config.theme_base") }}</span>
              <n-slider
                :value="prefStore.themeStyle.base"
                :min="0"
                :max="0.08"
                :step="0.005"
                @update:value="updateThemeValue('base', $event)"
              />
              <n-input-number
                :value="prefStore.themeStyle.base"
                :min="0"
                :max="0.08"
                :step="0.005"
                :show-button="false"
                size="small"
                @update:value="updateThemeValue('base', $event)"
              />
            </label>
            <label>
              <span>{{ t("config.radius") }}</span>
              <n-select
                :value="prefStore.themeStyle.radius"
                :options="radiusOptions"
                @update:value="updateThemeValue('radius', $event)"
              />
            </label>
          </div>
        </div>
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

.theme-editor {
  width: min(680px, 100%);
}

.preset-row {
  display: flex;
  align-items: center;
  gap: var(--app-space-sm);
  margin-bottom: var(--app-space-lg);
}

.custom-color-picker {
  width: 30px;
  flex: 0 0 30px;
}

.theme-parameters {
  display: grid;
  grid-template-columns: repeat(2, 300px);
  gap: 40px;
  width: min(640px, 100%);
}

.theme-parameters label {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 80px;
  gap: var(--app-space-sm);
  align-items: center;
}

.theme-parameters label:last-child {
  grid-template-columns: 76px minmax(0, 1fr);
}

.color-trigger {
  display: block;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--app-border-default-color);
  border-radius: 50%;
  cursor: pointer;
}

.color-trigger:hover {
  border-color: var(--app-brand-color);
}

.color-trigger:focus-visible {
  outline: 2px solid var(--app-brand-color);
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .theme-parameters {
    grid-template-columns: 1fr;
  }
}
</style>
