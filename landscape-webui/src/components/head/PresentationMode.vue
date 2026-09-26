<script setup lang="ts">
import { useFrontEndStore } from "@/stores/front_end_config";
import { View as IosEye, ViewOff as IosEyeOff } from "@vicons/carbon";
import { useI18n } from "vue-i18n";

const frontEndStore = useFrontEndStore();
const { t } = useI18n();
</script>
<template>
  <n-popover trigger="hover">
    <template #trigger>
      <n-button
        quaternary
        size="small"
        style="font-size: var(--app-font-size-caption)"
        @click="
          frontEndStore.presentation_mode = !frontEndStore.presentation_mode
        "
      >
        <template #icon>
          <n-icon
            :component="frontEndStore.presentation_mode ? IosEyeOff : IosEye"
          />
        </template>
        {{ t("common.privacy_mode") }}
      </n-button>
    </template>
    <span>
      {{ t("common.switch_current") }}
      <n-button
        style="cursor: default; pointer-events: none"
        @click.stop="() => {}"
        text
        target="_blank"
        type="primary"
      >
        {{ t("common.privacy_mode") }}
      </n-button>
      <br />
      {{ t("common.privacy_mode_desc") }}
    </span>
  </n-popover>
</template>
