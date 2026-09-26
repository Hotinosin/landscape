<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import DHCPv4Server from "@/components/dhcp_v4/DHCPv4Server.vue";
import IPv6RA from "@/components/dhcp_v6/IPv6RA.vue";
import { Renew } from "@vicons/carbon";
import { useI18n } from "vue-i18n";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const ipv4View = ref<InstanceType<typeof DHCPv4Server>>();
const ipv6View = ref<InstanceType<typeof IPv6RA>>();
const activeTab = computed({
  get: () => (route.query.tab === "ipv6" ? "ipv6" : "ipv4"),
  set: (tab: string) => router.replace({ query: { ...route.query, tab } }),
});

function refresh() {
  return activeTab.value === "ipv4"
    ? ipv4View.value?.refresh()
    : ipv6View.value?.refresh();
}

const refreshing = computed(() =>
  activeTab.value === "ipv4"
    ? ipv4View.value?.refreshing
    : ipv6View.value?.refreshing,
);
</script>

<template>
  <n-flex vertical class="standard-content-page">
    <n-flex justify="space-between" align="center">
      <n-tabs
        v-model:value="activeTab"
        type="segment"
        size="small"
        style="width: 240px"
      >
        <n-tab name="ipv4">IPv4</n-tab>
        <n-tab name="ipv6">IPv6</n-tab>
      </n-tabs>
      <n-button secondary :loading="refreshing" @click="refresh">
        <template #icon><n-icon><Renew /></n-icon></template>
        {{ t("common.refresh") }}
      </n-button>
    </n-flex>
    <DHCPv4Server
      v-if="activeTab === 'ipv4'"
      ref="ipv4View"
      :show-refresh="false"
    />
    <IPv6RA v-else ref="ipv6View" :show-refresh="false" />
  </n-flex>
</template>
