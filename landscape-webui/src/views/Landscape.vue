<script setup lang="ts">
import CPUUsage from "@/components/sysinfo/CPUUsage.vue";
import MemUsage from "@/components/sysinfo/MemUsage.vue";
import DnsStatusCard from "@/components/dns/DnsStatusCard.vue";
import SystemInfo from "@/components/sysinfo/SystemInfo.vue";
import RealtimeNetwork from "@/components/sysinfo/RealtimeNetwork.vue";
import DhcpLeaseSummary from "@/components/sysinfo/DhcpLeaseSummary.vue";
</script>

<template>
  <n-flex vertical style="width: 100%">
    <n-grid x-gap="12" y-gap="12" cols="1 600:2 1200:4 1900:5">
      <n-gi style="display: flex; height: 280px" :span="1">
        <SystemInfo></SystemInfo>
      </n-gi>
      <n-gi style="display: flex; height: 280px" :span="1">
        <CPUUsage></CPUUsage>
      </n-gi>
      <n-gi style="display: flex; height: 280px" :span="1">
        <MemUsage></MemUsage>
      </n-gi>
      <n-gi style="display: flex; height: 280px" :span="1">
        <DnsStatusCard></DnsStatusCard>
      </n-gi>
      <n-gi style="display: flex; height: 280px" :span="1">
        <RealtimeNetwork />
      </n-gi>
      <n-gi style="display: flex; height: 280px" :span="1">
        <DhcpLeaseSummary />
      </n-gi>
    </n-grid>
  </n-flex>
</template>
