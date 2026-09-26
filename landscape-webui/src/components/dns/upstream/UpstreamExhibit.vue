<script lang="ts" setup>
import { get_dns_upstream } from "@/api/dns_rule/upstream";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import { onMounted, watch, ref } from "vue";
import { useI18n } from "vue-i18n";
import { upstream_mode_exhibit_name } from "@/lib/dns";
import { useFrontEndStore } from "@/stores/front_end_config";

const { t } = useI18n();
const front = useFrontEndStore();

type Props = {
  rule_id: string;
};

const props = defineProps<Props>();

onMounted(async () => {
  await refresh();
});

watch(
  () => props.rule_id,
  async () => {
    await refresh();
  },
);

const rule = ref<DnsUpstreamConfig>();
async function refresh() {
  rule.value = await get_dns_upstream(props.rule_id);
}
</script>
<template>
  <n-popover v-if="rule" trigger="hover">
    <template #trigger>
      <n-tag class="semantic-tag--upstream" :bordered="false">
        {{ rule.name || t("common.unnamed") }}
      </n-tag>
    </template>
    <n-descriptions
      :column="1"
      label-placement="left"
      size="small"
      style="max-width: 420px; overflow-wrap: anywhere"
    >
      <n-descriptions-item v-if="rule.remark" :label="t('common.remark')">
        {{ rule.remark }}
      </n-descriptions-item>
      <n-descriptions-item :label="t('dns.upstream_card.request_mode')">
        {{ upstream_mode_exhibit_name(rule.mode.t) }}
      </n-descriptions-item>
      <n-descriptions-item :label="t('dns.upstream_card.request_port')">
        {{ front.MASK_INFO(rule.port?.toString()) }}
      </n-descriptions-item>
      <n-descriptions-item
        v-if="'domain' in rule.mode"
        :label="t('dns.upstream_card.domain_addr')"
      >
        {{
          front.MASK_INFO(
            rule.mode.domain +
              ("http_endpoint" in rule.mode
                ? (rule.mode.http_endpoint ?? "/dns-query")
                : ""),
          )
        }}
      </n-descriptions-item>
      <n-descriptions-item :label="t('dns.upstream_card.upstream_ip')">
        <div v-for="ip in rule.ips" :key="ip">{{ front.MASK_INFO(ip) }}</div>
      </n-descriptions-item>
    </n-descriptions>
  </n-popover>
  <n-skeleton v-else text width="80px" height="24px" />
</template>
