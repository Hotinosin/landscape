<script setup lang="ts">
import { ref } from "vue";
import { ModelBuilder } from "@vicons/carbon";
import DnsRuleDrawer from "@/components/dns/DnsRuleDrawer.vue";
import RouteTraceDrawer from "@/components/flow/RouteTraceDrawer.vue";
import { reset_cache } from "@/api/route/cache";
import { useI18n } from "vue-i18n";

const emit = defineEmits(["create-flow"]);
const { t } = useI18n();

const show_dns_rule = ref(false);
const show_ip_rule = ref(false);
const show_route_trace = ref(false);

withDefaults(defineProps<{ display_style?: "card" | "list" }>(), {
  display_style: "card",
});

async function create_flow() {
  emit("create-flow");
}

async function clear_route_cache() {
  reset_cache();
}
</script>

<template>
  <n-card
    :class="{ 'default-flow-card--list': display_style === 'list' }"
    :style="display_style === 'card' ? 'min-height: 224px' : undefined"
    size="small"
    :title="t('flow.default_card.title')"
    :hoverable="true"
  >
    <template #header-extra>
      <n-flex>
        <n-button secondary @click="show_dns_rule = true" size="small">
          DNS
        </n-button>
        <n-button secondary @click="show_ip_rule = true" size="small">
          {{ t("flow.default_card.target_ip") }}
        </n-button>
      </n-flex>
    </template>

    <n-empty>
      <n-flex vertical align="center">
        <n-flex>{{ t("flow.default_card.unmatched_traffic") }}</n-flex>
        <n-flex>{{ t("flow.default_card.process_by_default") }}</n-flex>
      </n-flex>

      <template #icon>
        <n-icon>
          <ModelBuilder />
        </n-icon>
      </template>
      <template #extra>
        <n-flex>
          <n-button @click="create_flow" size="small">
            {{ t("flow.default_card.create_new") }}
          </n-button>
          <n-button @click="clear_route_cache" size="small">
            {{ t("flow.default_card.clear_route_cache") }}
          </n-button>
          <n-button @click="show_route_trace = true" size="small">
            {{ t("flow.default_card.trace") }}
          </n-button>
        </n-flex>
      </template>
    </n-empty>

    <DnsRuleDrawer v-model:show="show_dns_rule" :flow_id="0"> </DnsRuleDrawer>
    <WanIpRuleDrawer v-model:show="show_ip_rule" :flow_id="0" />
    <RouteTraceDrawer v-model:show="show_route_trace" />
  </n-card>
</template>

<style scoped>
.default-flow-card--list :deep(.n-card-header),
.default-flow-card--list :deep(.n-card__content) {
  padding: 10px var(--app-space-section);
}

.default-flow-card--list :deep(.n-empty) {
  flex-direction: row;
  justify-content: space-between;
  gap: var(--app-space-lg);
}

.default-flow-card--list :deep(.n-empty__icon) {
  margin: 0;
}
</style>
