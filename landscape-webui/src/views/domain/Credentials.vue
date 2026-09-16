<script setup lang="ts">
import { useI18n } from "vue-i18n";
import CertAccounts from "@/views/cert/CertAccounts.vue";
import DnsProviderProfiles from "@/views/domain/DnsProviderProfiles.vue";

const { t } = useI18n();
</script>

<template>
  <n-flex vertical :size="24" class="standard-content-page">
    <section class="credential-section">
      <n-divider class="network-settings__divider" title-placement="left">
        {{ t("cert.account_title") }}
      </n-divider>
      <CertAccounts />
    </section>
    <section class="credential-section">
      <n-divider class="network-settings__divider" title-placement="left">
        {{ t("dns_provider.provider_profiles") }}
      </n-divider>
      <DnsProviderProfiles />
    </section>
  </n-flex>
</template>

<style scoped>
.credential-section {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-section);
}

.network-settings__divider {
  margin: 0;
}
</style>
