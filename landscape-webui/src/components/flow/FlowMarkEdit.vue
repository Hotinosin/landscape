<script setup lang="ts">
import { FlowMarkType } from "@/lib/default_value";
import type { FlowMark } from "@landscape-router/types/api/schemas";
import FlowSelect from "./FlowSelect.vue";
import { useI18n } from "vue-i18n";
import StandardEnableSwitch from "@/components/common/StandardEnableSwitch.vue";

const mark = defineModel<FlowMark>("mark", { required: true });
const { t } = useI18n();

const mark_type_option = [
  {
    label: t("flow.mark_edit.option_current_flow"),
    value: FlowMarkType.KeepGoing,
  },
  {
    label: t("flow.mark_edit.option_default_flow"),
    value: FlowMarkType.Direct,
  },
  {
    label: t("flow.mark_edit.option_block"),
    value: FlowMarkType.Drop,
  },
  {
    label: t("flow.mark_edit.option_redirect"),
    value: FlowMarkType.Redirect,
  },
];

function mark_action_update(value: FlowMarkType) {
  switch (value) {
    case FlowMarkType.KeepGoing:
    case FlowMarkType.Direct: {
      mark.value.flow_id = 0;
      break;
    }
    case FlowMarkType.Drop: {
      mark.value.flow_id = 0;
      mark.value.allow_reuse_port = false;
      break;
    }
    case FlowMarkType.Redirect: {
      break;
    }
  }
}
</script>

<template>
  <n-flex class="flow-mark-edit" align="center" :wrap="false">
    <n-select
      class="flow-mark-edit__action"
      v-model:value="mark.action.t"
      @update:value="mark_action_update"
      :options="mark_type_option"
      :placeholder="t('flow.mark_edit.select_match_type')"
    />

    <FlowSelect
      v-if="mark.action.t === FlowMarkType.Redirect"
      class="flow-mark-edit__flow"
      v-model="mark.flow_id"
      :include-all="false"
      :placeholder="t('flow.mark_edit.flow_id_placeholder')"
      width="auto"
    />

    <n-flex
      v-if="mark.action.t !== FlowMarkType.Drop"
      class="flow-mark-edit__nat1"
      align="center"
      :wrap="false"
    >
      <span>&nbsp;{{ t("flow.mark_edit.nat1_label") }}</span>
      <StandardEnableSwitch v-model:value="mark.allow_reuse_port" />
    </n-flex>
  </n-flex>
</template>

<style scoped>
.flow-mark-edit {
  width: 100%;
}

.flow-mark-edit__action {
  flex: 1;
  min-width: 180px;
}

.flow-mark-edit__flow {
  flex: 1;
  min-width: 160px;
}

.flow-mark-edit__nat1 {
  flex: none;
}
</style>
