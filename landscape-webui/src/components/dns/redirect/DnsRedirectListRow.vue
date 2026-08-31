<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { DNSRedirectRule } from "@landscape-router/types/api/schemas";
import { delete_dns_redirect } from "@/api/dns_rule/redirect";
import { useFrontEndStore } from "@/stores/front_end_config";

const props = defineProps<{
  rule: DNSRedirectRule;
  cell:
    "status" | "flows" | "rules" | "mode" | "response" | "metadata" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const { t } = useI18n();
const frontEndStore = useFrontEndStore();
const showEditModal = ref(false);

const answerModeText = computed(() =>
  props.rule.answer_mode === "all_local_ips"
    ? t("dns.redirect_card.answer_mode_all_local_ips")
    : t("dns.redirect_card.answer_mode_static_ips"),
);

const responseText = computed(() => {
  if (props.rule.answer_mode === "all_local_ips") {
    return t("dns.redirect_card.response_all_local_ips");
  }
  if (props.rule.result_info.length === 0) {
    return t("dns.redirect_card.response_block");
  }
  return "";
});

async function remove() {
  if (!props.rule.id) return;
  await delete_dns_redirect(props.rule.id);
  emit("refresh");
}
</script>

<template>
  <template v-if="cell === 'status'">
    <StatusTitle :enable="rule.enable" :remark="rule.remark" /> </template
  ><template v-else-if="cell === 'flows'">
    <n-flex v-if="rule.apply_flows.length" size="small">
      <n-tag
        v-for="flowId in rule.apply_flows"
        :key="flowId"
        size="small"
        :bordered="false"
      >
        {{
          flowId === 0 ? t("dns.redirect_card.default_flow") : `Flow ${flowId}`
        }}
      </n-tag>
    </n-flex>
    <span v-else>{{ t("dns.redirect_card.all_flows") }}</span> </template
  ><template v-else-if="cell === 'rules'">
    <n-flex size="small">
      <RuleSourceExhibit
        v-for="(source, index) in rule.match_rules"
        :key="index"
        :source="source"
      />
    </n-flex> </template
  ><template v-else-if="cell === 'mode'">{{ answerModeText }}</template>
  <template v-else-if="cell === 'response'">
    <span v-if="responseText">{{ responseText }}</span>
    <n-flex v-else size="small">
      <n-tag
        v-for="value in rule.result_info"
        :key="value"
        size="small"
        :bordered="false"
      >
        {{ frontEndStore.MASK_INFO(value) }}
      </n-tag>
    </n-flex> </template
  ><template v-else-if="cell === 'metadata'">
    {{
      rule.block_metadata_queries !== false
        ? t("dns.redirect_card.block_metadata_queries_on")
        : t("dns.redirect_card.block_metadata_queries_off")
    }} </template
  ><template v-else>
    <n-flex :wrap="false">
      <EditButton @click="showEditModal = true" />
      <n-popconfirm @positive-click="remove">
        <template #trigger>
          <n-button secondary type="error" size="small">
            {{ t("common.delete") }}
          </n-button>
        </template>
        {{ t("common.confirm_delete") }}
      </n-popconfirm>
    </n-flex>
    <DnsRedirectEditModal
      v-model:show="showEditModal"
      :rule_id="rule.id"
      @refresh="emit('refresh')"
    />
  </template>
</template>
