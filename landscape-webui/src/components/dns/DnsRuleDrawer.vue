<script setup lang="ts">
import { computed } from "vue";
import DnsRulePanel from "@/components/dns/DnsRulePanel.vue";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";
const { t } = useI18n();
interface Props {
  flow_id?: number;
}

const props = withDefaults(defineProps<Props>(), {
  flow_id: 0,
});

const show = defineModel<boolean>("show", { required: true });
const title = computed(() => {
  if (props.flow_id === 0) {
    return t("dns.rule_drawer.title_default");
  } else {
    return t("dns.rule_drawer.title_flow", { flow_id: props.flow_id });
  }
});
</script>
<template>
  <ConfigModal v-model:show="show" :show-switch="false" :title="title">
    <DnsRulePanel :flow_id="flow_id" />
  </ConfigModal>
</template>
