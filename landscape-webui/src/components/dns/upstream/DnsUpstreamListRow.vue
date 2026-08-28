<script setup lang="ts">
import { computed, ref } from "vue";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import { DnsUpstreamModeTsEnum, upstream_mode_exhibit_name } from "@/lib/dns";
import { delete_dns_upstream } from "@/api/dns_rule/upstream";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useI18n } from "vue-i18n";
const props = defineProps<{
  rule: DnsUpstreamConfig;
  cell: "ip" | "port" | "domain" | "mode" | "remark" | "actions";
}>();
const emit = defineEmits(["refresh"]);
const show = ref(false);
const front = useFrontEndStore();
const { t } = useI18n();
const domain = computed(() =>
  props.rule.mode.t === DnsUpstreamModeTsEnum.Plaintext
    ? t("dns.upstream_card.no_config")
    : front.MASK_INFO(
        `${props.rule.mode.domain}${props.rule.mode.t === DnsUpstreamModeTsEnum.Https ? (props.rule.mode.http_endpoint ?? "/dns-query") : ""}`,
      ),
);
async function remove() {
  if (props.rule.id) {
    await delete_dns_upstream(props.rule.id);
    emit("refresh");
  }
}
</script>
<template>
  <template v-if="cell === 'ip'">
    <n-flex size="small"
      ><n-tag v-for="ip in rule.ips" :key="ip" size="small" :bordered="false">{{
        front.MASK_INFO(ip)
      }}</n-tag></n-flex
    >
  </template>
  <template v-else-if="cell === 'port'">{{
    front.MASK_INFO(rule.port?.toString())
  }}</template>
  <template v-else-if="cell === 'domain'">{{ domain }}</template>
  <template v-else-if="cell === 'mode'">{{
    upstream_mode_exhibit_name(rule.mode.t)
  }}</template>
  <template v-else-if="cell === 'remark'">
    <n-text strong>{{
      rule.remark || t("dns.upstream_card.no_remark")
    }}</n-text>
  </template>
  <template v-else>
    <n-flex :wrap="false"
      ><EditButton @click="show = true" /><n-popconfirm @positive-click="remove"
        ><template #trigger
          ><n-button secondary type="error" size="small">{{
            t("common.delete")
          }}</n-button></template
        >{{ t("common.confirm_delete") }}</n-popconfirm
      ></n-flex
    >
    <UpstreamEditModal
      v-model:show="show"
      :rule_id="rule.id"
      @refresh="emit('refresh')"
    />
  </template>
</template>
