<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { HelpFilled } from "@vicons/carbon";
import type { IPV6PDPrefixStatus } from "@/api/service_ipv6pd";
import { useFrontEndStore } from "@/stores/front_end_config";
import { usePreferenceStore } from "@/stores/preference";
const prefStore = usePreferenceStore();
const { t } = useI18n();

const frontEndStore = useFrontEndStore();

interface Props {
  prefix_status: IPV6PDPrefixStatus;
  iface_name: string;
  cell:
    | "status"
    | "prefix"
    | "prefix_len_status"
    | "preferred_lifetime"
    | "valid_lifetime"
    | "last_update";
}

const props = defineProps<Props>();

const actualPrefix = computed(() => props.prefix_status.actual_prefix);
const validExpiry = computed(
  () =>
    actualPrefix.value.last_update_time +
    actualPrefix.value.valid_lifetime * 1000,
);

// WAN PD owns the acquired-prefix vs WAN-expectation verdict. LAN snapshot
// compatibility is intentionally reported by the LAN prefix-group UI instead.
const status = computed(() => {
  if (props.prefix_status.meets_expected_pd_len === true) {
    if (validExpiry.value > new Date().getTime()) {
      return true;
    }
  }

  return false;
});
</script>

<template>
  <StatusTitle
    v-if="cell === 'status'"
    :enable="status"
    :remark="props.iface_name"
  />
  <span v-else-if="cell === 'prefix'">
    {{ frontEndStore.MASK_INFO(actualPrefix.prefix_ip) }}/{{
      actualPrefix.prefix_len
    }}
  </span>
  <template v-else-if="cell === 'prefix_len_status'">
    <n-tag
      v-if="prefix_status.meets_expected_pd_len === true"
      :bordered="false"
      type="success"
    >
      {{ t("lan_ipv6.prefix_info.prefix_len_matches") }}
    </n-tag>
    <n-tag
      v-else-if="prefix_status.meets_expected_pd_len === false"
      :bordered="false"
      type="warning"
    >
      {{ t("lan_ipv6.prefix_info.prefix_len_mismatch") }}
    </n-tag>
  </template>
  <n-flex
    v-else-if="cell === 'preferred_lifetime'"
    align="center"
    :wrap="false"
  >
    <DurationTime :seconds="actualPrefix.preferred_lifetime" mode="detailed" />
    <n-popover trigger="hover">
      <template #trigger>
        <n-button text
          ><template #icon
            ><n-icon><HelpFilled /></n-icon></template
        ></n-button>
      </template>
      {{ t("lan_ipv6.prefix_info.ip_preferred_time_desc") }}
    </n-popover>
  </n-flex>
  <n-flex v-else-if="cell === 'valid_lifetime'" align="center" :wrap="false">
    <DurationTime :seconds="actualPrefix.valid_lifetime" mode="detailed" />
    <n-popover trigger="hover">
      <template #trigger>
        <n-button text
          ><template #icon
            ><n-icon><HelpFilled /></n-icon></template
        ></n-button>
      </template>
      {{ t("lan_ipv6.prefix_info.ip_valid_time_desc") }}
    </n-popover>
  </n-flex>
  <n-flex v-else align="center" :wrap="false">
    <n-time
      :time="actualPrefix.last_update_time"
      format="yyyy-MM-dd hh:mm:ss"
      :time-zone="prefStore.timezone"
    />
    <n-popover trigger="hover">
      <template #trigger>
        <n-button text
          ><template #icon
            ><n-icon><HelpFilled /></n-icon></template
        ></n-button>
      </template>
      {{ t("lan_ipv6.prefix_info.dhcpv6_client_prefix_time") }}
    </n-popover>
  </n-flex>
</template>
