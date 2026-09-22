<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import StaticNatMappingV4 from "@/components/nat/static_mapping/StaticNatMappingV4.vue";
import StaticNatMappingV6 from "@/components/nat/static_mapping/StaticNatMappingV6.vue";

const route = useRoute();
const router = useRouter();
const activeTab = computed({
  get: () => (route.query.tab === "ipv6" ? "ipv6" : "ipv4"),
  set: (tab: string) => router.replace({ query: { ...route.query, tab } }),
});
</script>

<template>
  <n-flex vertical class="standard-content-page">
    <n-tabs
      v-model:value="activeTab"
      type="segment"
      size="small"
      style="width: 240px"
    >
      <n-tab name="ipv4">IPv4</n-tab>
      <n-tab name="ipv6">IPv6</n-tab>
    </n-tabs>
    <StaticNatMappingV4 v-if="activeTab === 'ipv4'" />
    <StaticNatMappingV6 v-else />
  </n-flex>
</template>
