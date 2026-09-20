<script setup lang="ts">
import { onMounted, ref } from "vue";
import { usePreferenceStore } from "@/stores/preference";
import { useMetricConfigStore } from "@/stores/metric_config";
import { useDnsConfigStore } from "@/stores/dns_config";
import { useLanHostnameConfigStore } from "@/stores/lan_hostname_config";
import { useMessage } from "naive-ui";
import { useI18n } from "vue-i18n";

import UIConfigCard from "@/views/config_parts/UIConfigCard.vue";
import DNSConfigCard from "@/views/config_parts/DNSConfigCard.vue";
import LanHostnameConfigCard from "@/views/config_parts/LanHostnameConfigCard.vue";
import MetricConfigCard from "@/views/config_parts/MetricConfigCard.vue";
import BackupConfigCard from "@/views/config_parts/BackupConfigCard.vue";
import PasswordConfigCard from "@/views/config_parts/PasswordConfigCard.vue";

const { t } = useI18n();
const prefStore = usePreferenceStore();
const metricStore = useMetricConfigStore();
const dnsStore = useDnsConfigStore();
const lanHostnameStore = useLanHostnameConfigStore();
const message = useMessage();
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([
      prefStore.loadPreferenceForEdit(),
      metricStore.loadMetricConfig(),
      dnsStore.loadDnsConfig(),
      lanHostnameStore.loadLanHostnameConfig(),
    ]);
  } catch (e) {
    message.error(t("config.load_failed"));
    console.error(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="config-container">
    <div class="config-waterfall">
      <div class="config-column">
        <UIConfigCard class="card-item--ui" />
        <DNSConfigCard class="card-item--dns" />
        <LanHostnameConfigCard class="card-item--lan-hostname" />
        <PasswordConfigCard class="card-item--password" />
        <BackupConfigCard class="card-item--backup" />
      </div>
      <div class="config-column">
        <MetricConfigCard class="card-item--metric" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-container {
  padding: var(--app-data-table-frame-inset);
  width: 100%;
  box-sizing: border-box;
}

.config-waterfall {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--app-space-lg, 16px);
  align-items: start;
}

.config-column {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-lg, 16px);
  min-width: 0;
}

@media (max-width: 992px) {
  .config-waterfall {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-lg, 16px);
  }

  .config-column {
    display: contents;
  }

  .card-item--ui {
    order: 1;
  }

  .card-item--metric {
    order: 2;
  }

  .card-item--dns {
    order: 3;
  }

  .card-item--lan-hostname {
    order: 4;
  }

  .card-item--password {
    order: 5;
  }

  .card-item--backup {
    order: 6;
  }
}
</style>
