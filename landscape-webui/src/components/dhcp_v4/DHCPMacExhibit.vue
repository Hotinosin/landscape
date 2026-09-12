<script lang="ts" setup>
import { useThemeVars } from "naive-ui";
import { HelpFilled } from "@vicons/carbon";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
interface Props {
  mac?: string;
  macs?: Set<string>;
}

const props = defineProps<Props>();
const show_mac = computed(() => {
  if (props.mac) {
    return props.mac;
  }

  let first = props.macs?.values().next().value;
  if (first) {
    return first;
  }

  return t("common.unknown");
});

const show_other_macs = computed(() => {
  let result = Array.from(props.macs ?? []);

  return result.filter((m) => m != show_mac.value);
});
</script>
<template>
  <n-flex justify="start" v-if="show_other_macs.length > 0" :size="[5, 0]">
    <MacAddress :value="show_mac" />
    <n-popover trigger="hover">
      <template #trigger>
        <n-flex justify="center" align="center">
          <n-button text>
            <template #icon>
              <n-icon><HelpFilled /></n-icon>
            </template>
          </n-button>
        </n-flex>
      </template>
      <n-flex justify="center" align="center" style="max-width: 280px">
        <n-tag v-for="m in show_other_macs" :key="m" :bordered="false">
          <MacAddress :value="m" />
        </n-tag>
      </n-flex>
    </n-popover>
  </n-flex>
  <n-flex justify="start" v-else>
    <MacAddress :value="show_mac" />
  </n-flex>
</template>
