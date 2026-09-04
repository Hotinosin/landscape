<script setup lang="ts">
import { computed } from "vue";
import WanIpRulePanel from "./WanIpRulePanel.vue";
import { useI18n } from "vue-i18n";
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
    return t("flow.wan_rule_drawer.title_default");
  } else {
    return t("flow.wan_rule_drawer.title_flow", { flow_id: props.flow_id });
  }
});
</script>
<template>
  <n-drawer
    v-model:show="show"
    width="min(840px, 92vw)"
    placement="right"
  >
    <n-drawer-content
      :title="title"
      closable
      :native-scrollbar="false"
      body-content-style="height: 100%; padding: 14px 16px"
    >
      <WanIpRulePanel :flow_id="flow_id" />
    </n-drawer-content>
  </n-drawer>
</template>
