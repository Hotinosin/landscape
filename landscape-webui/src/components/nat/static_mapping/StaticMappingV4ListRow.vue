<script setup lang="ts">
import { computed, ref } from "vue";
import type { StaticNatMappingV4Config } from "@landscape-router/types/api/schemas";
import { delete_static_nat_mapping_v4 } from "@/api/static_nat_mapping";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useI18n } from "vue-i18n";
const props = defineProps<{
  rule: StaticNatMappingV4Config;
  cell: "status" | "target" | "protocol" | "ports" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const show = ref(false);
const devices = useEnrolledDeviceStore();
const front = useFrontEndStore();
const { t } = useI18n();
const target = computed(() => {
  const x = props.rule.lan_target;
  if (!x || x.t === "local") return t("nat.mapping.target_type_local");
  if (x.t === "device") return devices.GET_DISPLAY_NAME_BY_ID(x.device_id);
  return devices.GET_NAME_WITH_FALLBACK(x.ipv4);
});
async function remove() {
  if (props.rule.id) {
    await delete_static_nat_mapping_v4(props.rule.id);
    emit("refresh");
  }
}
</script>
<template>
  <template v-if="cell === 'status'">
    <StatusTitle
      :enable="rule.enable"
      :remark="rule.remark || t('common.no_remark')"
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
      ><n-tag
        v-for="(p, i) in rule.mapping_pair_ports"
        :key="i"
        size="small"
        :bordered="false"
        >{{ front.MASK_PORT(p.wan_port) }} →
        {{ front.MASK_PORT(p.lan_port) }}</n-tag
      ></n-flex
    >
  </template>
  <template v-else>
    <n-flex justify="start" :wrap="false"
      ><EditButton @click="show = true" /><n-popconfirm @positive-click="remove"
        ><template #trigger
          ><n-button secondary type="error" size="small">{{
            t("common.delete")
          }}</n-button></template
        >{{ t("common.confirm_delete") }}</n-popconfirm
      ></n-flex
    >
    <MappingEditV4Modal
      v-model:show="show"
      :rule_id="rule.id"
      @refresh="emit('refresh')"
    />
  </template>
</template>
