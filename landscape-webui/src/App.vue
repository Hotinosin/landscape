<script setup lang="ts">
import { enUS, zhCN, dateZhCN, dateEnUS } from "naive-ui";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { usePreferenceStore } from "@/stores/preference";
import Env from "@/components/Env.vue";
import { LANDSCAPE_TOKEN_KEY } from "@/lib/common";
import {
  applyThemeToDocument,
  applyAccentColor,
  readAccentColorFromStorageEvent,
  readThemePreferenceFromStorageEvent,
  resolveThemeName,
  themeRegistry,
} from "@/themes";

const prefStore = usePreferenceStore();
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const systemPrefersDark = ref(systemThemeQuery.matches);

function updateSystemTheme(event: MediaQueryListEvent) {
  systemPrefersDark.value = event.matches;
}

function syncThemePreference(event: StorageEvent) {
  const preference = readThemePreferenceFromStorageEvent(event);
  if (preference) prefStore.theme = preference;
  const accent = readAccentColorFromStorageEvent(event);
  if (accent) prefStore.accent = accent;
}

onMounted(() => {
  systemThemeQuery.addEventListener("change", updateSystemTheme);
  window.addEventListener("storage", syncThemePreference);
  if (localStorage.getItem(LANDSCAPE_TOKEN_KEY)) {
    prefStore.loadPreference();
  }
});

onUnmounted(() => {
  systemThemeQuery.removeEventListener("change", updateSystemTheme);
  window.removeEventListener("storage", syncThemePreference);
});

const currentLocale = computed(() => {
  return prefStore.language?.startsWith("en") ? enUS : zhCN;
});

const currentDateLocale = computed(() => {
  return prefStore.language?.startsWith("en") ? dateEnUS : dateZhCN;
});

const resolvedThemeName = computed(() =>
  resolveThemeName(prefStore.theme, systemPrefersDark.value),
);
const activeTheme = computed(() =>
  applyAccentColor(themeRegistry[resolvedThemeName.value], prefStore.accent),
);
const currentTheme = computed(() => activeTheme.value.naiveTheme);
const themeOverrides = computed(() => activeTheme.value.overrides);

watch(activeTheme, (theme) => applyThemeToDocument(theme, prefStore.accent), {
  immediate: true,
});
</script>

<template>
  <n-config-provider
    :locale="currentLocale"
    :date-locale="currentDateLocale"
    :theme="currentTheme"
    style="display: flex; flex: 1"
    :theme-overrides="themeOverrides"
  >
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <Env></Env>
          <RouterView />
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>
