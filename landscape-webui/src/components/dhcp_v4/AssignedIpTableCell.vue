<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import { useFrontEndStore } from "@/stores/front_end_config";
import { usePreferenceStore } from "@/stores/preference";

export type AssignedIpRow =
  | {
      kind: "lease";
      ip: string;
      mac: string;
      hostname?: string | null;
      real_request_time: number;
      real_expire_time: number;
      is_static: boolean;
      ip_status?: boolean[];
      macs?: Set<string>;
    }
  | {
      kind: "observed";
      ip: string;
      mac?: string;
      ip_status: boolean[];
      macs: Set<string>;
    };

const props = defineProps<{
  row: AssignedIpRow;
  ifaceName: string;
  cell: "hostname" | "mac" | "ip" | "request" | "lease" | "online" | "actions";
}>();
const emit = defineEmits<{
  finish: [];
  quickBind: [ip: string, mac?: string, hostname?: string | null];
}>();

const { t } = useI18n();
const enrolledDeviceStore = useEnrolledDeviceStore();
const frontEndStore = useFrontEndStore();
const prefStore = usePreferenceStore();

const binding = computed(() => {
  const found = enrolledDeviceStore.GET_BINDING(props.row.mac);
  return found && (!found.iface_name || found.iface_name === props.ifaceName)
    ? found
    : undefined;
});
const hasMismatch = computed(
  () => !!binding.value?.ipv4 && binding.value.ipv4 !== props.row.ip,
);
</script>

<template>
  <template v-if="cell === 'hostname'">
    {{
      enrolledDeviceStore.GET_NAME_WITH_FALLBACK(
        row.mac,
        row.kind === "lease" ? row.hostname : t("dhcp_v4.assigned.unknown"),
      )
    }}
  </template>

  <DHCPMacExhibit v-else-if="cell === 'mac'" :mac="row.mac" :macs="row.macs" />

  <n-flex v-else-if="cell === 'ip'" align="center" size="small">
    <span>{{ frontEndStore.MASK_INFO(row.ip) }}</span>
    <n-tooltip v-if="hasMismatch" trigger="hover">
      <template #trigger>
        <n-tag size="small" type="warning" :bordered="false">IP</n-tag>
      </template>
      <div>{{ t("device.lease_ip_mismatch") }}</div>
      <div>
        {{ t("device.observed_ip") }}: {{ frontEndStore.MASK_INFO(row.ip) }}
      </div>
      <div>
        {{ t("device.configured_ip") }}:
        {{ frontEndStore.MASK_INFO(binding?.ipv4 || "") }}
      </div>
    </n-tooltip>
  </n-flex>

  <template v-else-if="cell === 'request'">
    <n-time
      v-if="row.kind === 'lease'"
      :time="row.real_request_time"
      :time-zone="prefStore.timezone"
    />
    <span v-else class="observed-value">{{
      t("dhcp_v4.assigned.unknown")
    }}</span>
  </template>

  <template v-else-if="cell === 'lease'">
    <span v-if="row.kind === 'observed'" class="observed-value">
      {{ t("dhcp_v4.assigned.unknown") }}
    </span>
    <span v-else-if="row.is_static">{{
      t("dhcp_v4.assigned.static_assigned")
    }}</span>
    <n-countdown
      v-else
      :key="row.real_expire_time"
      :duration="row.real_expire_time"
      :active="true"
      @finish="emit('finish')"
    />
  </template>

  <OnlineStatus v-else-if="cell === 'online'" :ip_status="row.ip_status" />

  <EditButton
    v-else-if="cell === 'actions'"
    :disabled="row.kind === 'observed' && !row.macs.size"
    @click="
      emit(
        'quickBind',
        row.ip,
        row.mac,
        row.kind === 'lease' ? row.hostname : undefined,
      )
    "
  />
</template>

<style scoped>
.observed-value {
  color: var(--app-status-warning-color);
}
</style>
