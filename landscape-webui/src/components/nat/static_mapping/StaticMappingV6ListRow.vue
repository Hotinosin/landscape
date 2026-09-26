<script setup lang="ts">
import { computed, ref } from "vue";
import type { StaticNatMappingV6Config } from "@landscape-router/types/api/schemas";
import {
  delete_static_nat_mapping_v6,
  push_static_nat_mapping_v6,
} from "@/api/static_nat_mapping";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useI18n } from "vue-i18n";
const props = defineProps<{
  rule: StaticNatMappingV6Config;
  cell:
    "name" | "remark" | "enable" | "target" | "protocol" | "ports" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const show = ref(false);
const devices = useEnrolledDeviceStore();
const front = useFrontEndStore();
const { t } = useI18n();
const enableLoading = ref(false);
const target = computed(() => {
  const x = props.rule.lan_target;
  if (!x || x.t === "local") return t("nat.mapping.target_type_local");
  if (x.t === "device")
    return (x.device_ids ?? [])
      .map((id) => devices.GET_DISPLAY_NAME_BY_ID(id))
      .join(", ");
  return devices.GET_NAME_WITH_FALLBACK(x.ipv6 ?? "");
});
const ports = computed(() =>
  props.rule.port_config?.mode === "all"
    ? [t("nat.mapping.port_mode_all")]
    : (props.rule.port_config?.ports ?? []),
);
async function remove() {
  if (props.rule.id) {
    await delete_static_nat_mapping_v6(props.rule.id);
    emit("refresh");
  }
}
async function updateEnabled(enable: boolean) {
  enableLoading.value = true;
  try {
    await push_static_nat_mapping_v6({ ...props.rule, enable });
    emit("refresh");
  } finally {
    enableLoading.value = false;
  }
}
</script>
<template>
  <template v-if="cell === 'name'">
    <StatusTitle :enable="rule.enable" :name="rule.name" />
  </template>
  <n-ellipsis v-else-if="cell === 'remark'">{{
    rule.remark || "—"
  }}</n-ellipsis>
  <template v-else-if="cell === 'enable'">
    <StandardEnableSwitch
      :value="rule.enable"
      :loading="enableLoading"
      @update:value="updateEnabled"
    />
  </template>
  <template v-else-if="cell === 'target'">{{ target }}</template>
  <template v-else-if="cell === 'protocol'">
    <n-flex size="small"
      ><n-tag
        v-for="p in rule.l4_protocols"
        :key="p"
        size="small"
        :bordered="false"
        >{{ p === 6 ? "TCP" : "UDP" }}</n-tag
      ></n-flex
    >
  </template>
  <template v-else-if="cell === 'ports'">
    <n-flex size="small"
      ><n-tag v-for="(p, i) in ports" :key="i" size="small" :bordered="false">{{
        typeof p === "number" ? front.MASK_PORT(p) : p
      }}</n-tag></n-flex
    >
  </template>
  <template v-else>
    <n-flex justify="start" :wrap="false">
      <EditButton @click="show = true" />
      <DeleteButton
        :item="rule.name || t('common.unnamed')"
        :on-confirm="remove"
      />
    </n-flex>
    <MappingEditV6Modal
      v-model:show="show"
      :rule_id="rule.id"
      :show-switch="false"
      @refresh="emit('refresh')"
    />
  </template>
</template>
