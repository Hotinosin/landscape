<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useMessage } from "naive-ui";
import type {
  GeoIpSourceConfig,
  GeoSiteSourceConfig,
} from "@landscape-router/types/api/schemas";
import {
  get_geo_site_configs,
  push_many_geo_site_rule,
  refresh_geo_cache_key as refreshSiteCache,
} from "@/api/geo/site";
import {
  get_geo_ip_configs,
  push_many_geo_ip_rule,
  refresh_geo_cache_key as refreshIpCache,
} from "@/api/geo/ip";
import {
  copy_context_to_clipboard,
  read_context_from_clipboard,
} from "@/lib/common";

type Source = "site" | "ip";

const props = withDefaults(
  defineProps<{
    show: boolean;
    initialTab?: Source;
  }>(),
  { initialTab: "site" },
);
const emit = defineEmits<{
  "update:show": [value: boolean];
  refresh: [];
}>();

const { t } = useI18n();
const message = useMessage();
const activeTab = ref<Source>(props.initialTab);
const siteConfigs = ref<GeoSiteSourceConfig[]>([]);
const ipConfigs = ref<GeoIpSourceConfig[]>([]);
const showSiteModal = ref(false);
const showIpModal = ref(false);
const refreshing = ref<Source | null>(null);

watch(
  () => props.show,
  async (show) => {
    if (!show) return;
    activeTab.value = props.initialTab;
    await refreshAll();
  },
);

async function refreshAll() {
  [siteConfigs.value, ipConfigs.value] = await Promise.all([
    get_geo_site_configs(),
    get_geo_ip_configs(),
  ]);
}

async function refreshSite() {
  siteConfigs.value = await get_geo_site_configs();
  emit("refresh");
}

async function refreshIp() {
  ipConfigs.value = await get_geo_ip_configs();
  emit("refresh");
}

async function exportConfigs(source: Source) {
  const configs =
    source === "site"
      ? await get_geo_site_configs()
      : await get_geo_ip_configs();
  await copy_context_to_clipboard(
    message,
    JSON.stringify(
      configs,
      (key, value) => (key === "id" ? undefined : value),
      2,
    ),
  );
}

async function importConfigs(source: Source) {
  try {
    const configs = JSON.parse(await read_context_from_clipboard());
    if (source === "site") {
      await push_many_geo_site_rule(configs);
      await refreshSite();
    } else {
      await push_many_geo_ip_rule(configs);
      await refreshIp();
    }
    message.success(t("geo.drawer.import_success"));
  } catch {
    message.error(t("geo.drawer.import_failed"));
  }
}

async function forceRefresh(source: Source) {
  refreshing.value = source;
  try {
    await (source === "site" ? refreshSiteCache() : refreshIpCache());
    emit("refresh");
  } finally {
    refreshing.value = null;
  }
}
</script>

<template>
  <n-drawer
    :show="show"
    width="560px"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <n-drawer-content :title="t('geo.database.config_title')" closable>
      <n-tabs v-model:value="activeTab" type="line" animated>
        <n-tab-pane name="site" :tab="t('geo.database.geosite_data')">
          <n-flex vertical>
            <n-flex :wrap="false">
              <n-button style="flex: 1" @click="showSiteModal = true">
                {{ t("geo.drawer.add_rule") }}
              </n-button>
              <n-button style="flex: 1" @click="exportConfigs('site')">
                {{ t("geo.drawer.export_clipboard") }}
              </n-button>
              <n-popconfirm @positive-click="importConfigs('site')">
                <template #trigger>
                  <n-button style="flex: 1">
                    {{ t("geo.drawer.import_clipboard") }}
                  </n-button>
                </template>
                {{ t("geo.drawer.confirm_import") }}
              </n-popconfirm>
              <n-popconfirm @positive-click="forceRefresh('site')">
                <template #trigger>
                  <n-button :loading="refreshing === 'site'" style="flex: 1">
                    {{ t("common.force_refresh_all") }}
                  </n-button>
                </template>
                {{ t("common.force_refresh_confirm_long") }}
              </n-popconfirm>
            </n-flex>
            <n-scrollbar class="config-list">
              <n-flex vertical>
                <GeoSiteItemCard
                  v-for="rule in siteConfigs"
                  :key="rule.id ?? rule.name"
                  :geo_site="rule"
                  @refresh="refreshSite"
                  @refresh:keys="emit('refresh')"
                />
              </n-flex>
            </n-scrollbar>
          </n-flex>
        </n-tab-pane>

        <n-tab-pane name="ip" :tab="t('geo.database.geoip_data')">
          <n-flex vertical>
            <n-flex :wrap="false">
              <n-button style="flex: 1" @click="showIpModal = true">
                {{ t("geo.drawer.add_rule") }}
              </n-button>
              <n-button style="flex: 1" @click="exportConfigs('ip')">
                {{ t("geo.drawer.export_clipboard") }}
              </n-button>
              <n-popconfirm @positive-click="importConfigs('ip')">
                <template #trigger>
                  <n-button style="flex: 1">
                    {{ t("geo.drawer.import_clipboard") }}
                  </n-button>
                </template>
                {{ t("geo.drawer.confirm_import") }}
              </n-popconfirm>
              <n-popconfirm @positive-click="forceRefresh('ip')">
                <template #trigger>
                  <n-button :loading="refreshing === 'ip'" style="flex: 1">
                    {{ t("common.force_refresh_all") }}
                  </n-button>
                </template>
                {{ t("common.force_refresh_confirm_long") }}
              </n-popconfirm>
            </n-flex>
            <n-scrollbar class="config-list">
              <n-flex vertical>
                <GeoIpItemCard
                  v-for="rule in ipConfigs"
                  :key="rule.id ?? rule.name"
                  :geo_ip_source="rule"
                  @refresh="refreshIp"
                  @refresh:keys="emit('refresh')"
                />
              </n-flex>
            </n-scrollbar>
          </n-flex>
        </n-tab-pane>
      </n-tabs>

      <GeoSiteEditModal
        :id="null"
        v-model:show="showSiteModal"
        @refresh="refreshSite"
      />
      <GeoIpEditModal
        :id="null"
        v-model:show="showIpModal"
        @refresh="refreshIp"
      />
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.config-list {
  max-height: calc(100vh - 180px);
}
</style>
