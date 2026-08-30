<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { HttpUpstreamRuleConfig } from "@landscape-router/types/api/schemas";
import { delete_gateway_rule } from "@/api/gateway";
import { useFrontEndStore } from "@/stores/front_end_config";

const props = defineProps<{
  rule: HttpUpstreamRuleConfig;
  cell: "name" | "type" | "domains" | "upstream" | "paths" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const { t } = useI18n();
const front = useFrontEndStore();
const showEdit = ref(false);

const matchType = computed(() => {
  if (props.rule.match_rule.t === "host") return t("gateway.type_host");
  if (props.rule.match_rule.t === "sni_proxy")
    return t("gateway.type_sni_proxy");
  return t("gateway.type_legacy_path_prefix");
});
const upstream = computed(() => {
  const targets = props.rule.upstream.targets;
  if (!targets.length) return "—";
  if (targets.length > 1) return `${targets.length} targets`;
  const target = targets[0];
  return `${front.MASK_INFO(target.address)}:${target.port}${target.tls ? " (TLS)" : ""}`;
});
const paths = computed(() => {
  if (props.rule.match_rule.t === "host") {
    return props.rule.match_rule.path_groups?.length ?? 0;
  }
  if (props.rule.match_rule.t === "legacy_path_prefix") {
    return front.MASK_INFO(props.rule.match_rule.prefix);
  }
  return "—";
});

async function remove() {
  if (!props.rule.id) return;
  await delete_gateway_rule(props.rule.id);
  emit("refresh");
}
</script>

<template>
  <template v-if="cell === 'name'">
    <StatusTitle :enable="rule.enable" :remark="front.MASK_INFO(rule.name)" />
  </template>
  <template v-else-if="cell === 'type'">
    <n-tag :bordered="false">{{ matchType }}</n-tag>
  </template>
  <template v-else-if="cell === 'domains'">
    <n-flex size="small">
      <n-tag
        v-for="domain in rule.domains ?? []"
        :key="domain"
        :bordered="false"
      >
        {{ front.MASK_INFO(domain) }}
      </n-tag>
      <n-text v-if="!(rule.domains ?? []).length" depth="3">—</n-text>
    </n-flex>
  </template>
  <template v-else-if="cell === 'upstream'">{{ upstream }}</template>
  <template v-else-if="cell === 'paths'">{{ paths }}</template>
  <template v-else>
    <n-flex :wrap="false" size="small">
      <EditButton
        v-if="rule.match_rule.t !== 'legacy_path_prefix'"
        @click="showEdit = true"
      />
      <n-popconfirm @positive-click="remove">
        <template #trigger>
          <n-button secondary size="small" type="error">
            {{ t("common.delete") }}
          </n-button>
        </template>
        {{ t("common.confirm_delete") }}
      </n-popconfirm>
    </n-flex>
    <GatewayRuleEditModal
      v-model:show="showEdit"
      :rule_id="rule.id"
      @refresh="emit('refresh')"
    />
  </template>
</template>
