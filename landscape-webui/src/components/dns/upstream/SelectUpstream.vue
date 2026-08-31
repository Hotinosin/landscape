<script setup lang="ts">
import { get_dns_upstreams } from "@/api/dns_rule/upstream";
import type { DnsUpstreamConfig } from "@landscape-router/types/api/schemas";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const upstream_id = defineModel<string>("upstream_id", { required: true });
const showCreate = ref(false);
const createOption = "__create_dns_upstream__";

onMounted(async () => {
  await search_upstreams();
});

const all_upstream = ref<DnsUpstreamConfig[]>([]);
const upstream_options = computed(() => {
  return [
    ...all_upstream.value
      .filter((e) => e.id)
      .map((e) => ({
        value: e.id,
        label: e.remark ? `${e.remark}` : e.id,
      })),
    { value: createOption, label: t("dns.select_upstream.create") },
  ];
});

async function search_upstreams() {
  all_upstream.value = await get_dns_upstreams();
}

function selectUpstream(value: string) {
  if (value === createOption) {
    showCreate.value = true;
    return;
  }
  upstream_id.value = value;
}

async function upstreamSaved(rule: DnsUpstreamConfig) {
  await search_upstreams();
  if (rule.id) upstream_id.value = rule.id;
}
</script>

<template>
  <n-select
    :value="upstream_id"
    filterable
    :placeholder="t('dns.select_upstream.redirect_flow_id')"
    :options="upstream_options"
    remote
    @search="search_upstreams"
    @update:value="selectUpstream"
  />
  <UpstreamEditModal
    v-model:show="showCreate"
    :rule_id="null"
    @saved="upstreamSaved"
  />
</template>
