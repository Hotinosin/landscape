<script setup lang="ts">
import { computed, h, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useMessage, type DataTableColumns } from "naive-ui";
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
import { copy_context_to_clipboard } from "@/lib/common";
import { Copy, Paste, Renew } from "@vicons/carbon";
import GeoSiteItemCard from "@/components/geo/site/config/GeoSiteItemCard.vue";
import GeoIpItemCard from "@/components/geo/ip/config/GeoIpItemCard.vue";
import ConfigModal from "@/components/common/ConfigModal.vue";

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
const showModel = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const { t } = useI18n();
const message = useMessage();
const activeTab = ref<Source>(props.initialTab);
const siteConfigs = ref<GeoSiteSourceConfig[]>([]);
const ipConfigs = ref<GeoIpSourceConfig[]>([]);
const showSiteModal = ref(false);
const showIpModal = ref(false);
const refreshing = ref<Source | null>(null);
const sourceCells = ["status", "type", "time", "actions"] as const;
const sourceTitles = computed(() => [
  t("common.name"),
  t("geo.item_card.source_type"),
  t("geo.item_card.next_update_time"),
  t("common.actions"),
]);
const siteColumns = computed<DataTableColumns<GeoSiteSourceConfig>>(() =>
  sourceCells.map((cell, index) => ({
    title: sourceTitles.value[index],
    key: cell,
    width:
      cell === "status"
        ? 110
        : cell === "type"
          ? 100
          : cell === "time"
            ? 180
            : 280,
    render: (rule) =>
      h(GeoSiteItemCard, {
        geo_site: rule,
        cell,
        onRefresh: refreshSite,
        "onRefresh:keys": () => emit("refresh"),
      }),
  })),
);
const ipColumns = computed<DataTableColumns<GeoIpSourceConfig>>(() =>
  sourceCells.map((cell, index) => ({
    title: sourceTitles.value[index],
    key: cell,
    width:
      cell === "status"
        ? 110
        : cell === "type"
          ? 100
          : cell === "time"
            ? 180
            : 200,
    render: (rule) =>
      h(GeoIpItemCard, {
        geo_ip_source: rule,
        cell,
        onRefresh: refreshIp,
        "onRefresh:keys": () => emit("refresh"),
      }),
  })),
);
const siteRowKey = (rule: GeoSiteSourceConfig) => rule.id ?? rule.name;
const ipRowKey = (rule: GeoIpSourceConfig) => rule.id ?? rule.name;

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

async function importConfigs(source: Source, configs: any[]) {
  try {
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
  <ConfigModal
    v-model:show="showModel"
    :show-switch="false"
    width="min(900px, calc(100vw - 32px))"
    :title="t('geo.database.config_title')"
  >
    <n-tabs v-model:value="activeTab" type="line">
      <n-tab-pane name="site" :tab="t('geo.database.geosite_data')">
        <n-flex vertical>
          <n-flex class="standard-list-align" :wrap="true" size="small">
            <n-button type="primary" @click="showSiteModal = true">
              {{ t("common.add_new") }}
            </n-button>
            <n-button @click="exportConfigs('site')">
              <template #icon
                ><n-icon><Copy /></n-icon
              ></template>
              {{ t("common.copy") }}
            </n-button>
            <ClipboardImportModal
              :on-confirm="(configs: any[]) => importConfigs('site', configs)"
            >
              <template #trigger>
                <n-button>
                  <template #icon
                    ><n-icon><Paste /></n-icon
                  ></template>
                  {{ t("common.paste") }}
                </n-button>
              </template>
              {{ t("geo.drawer.confirm_import") }}
            </ClipboardImportModal>
            <ConfirmModal @positive-click="forceRefresh('site')">
              <template #trigger>
                <n-button :loading="refreshing === 'site'">
                  <template #icon
                    ><n-icon><Renew /></n-icon
                  ></template>
                  {{ t("geo.database.refresh_all") }}
                </n-button>
              </template>
              {{ t("geo.database.update_all_confirm") }}
            </ConfirmModal>
          </n-flex>
          <n-scrollbar class="config-list">
            <StandardDataTable
              :columns="siteColumns"
              :data="siteConfigs"
              :row-key="siteRowKey"
              :scroll-x="790"
              size="small"
            />
          </n-scrollbar>
        </n-flex>
      </n-tab-pane>

      <n-tab-pane name="ip" :tab="t('geo.database.geoip_data')">
        <n-flex vertical>
          <n-flex class="standard-list-align" :wrap="true" size="small">
            <n-button type="primary" @click="showIpModal = true">
              {{ t("common.add_new") }}
            </n-button>
            <n-button @click="exportConfigs('ip')">
              <template #icon
                ><n-icon><Copy /></n-icon
              ></template>
              {{ t("common.copy") }}
            </n-button>
            <ClipboardImportModal
              :on-confirm="(configs: any[]) => importConfigs('ip', configs)"
            >
              <template #trigger>
                <n-button>
                  <template #icon
                    ><n-icon><Paste /></n-icon
                  ></template>
                  {{ t("common.paste") }}
                </n-button>
              </template>
              {{ t("geo.drawer.confirm_import") }}
            </ClipboardImportModal>
            <ConfirmModal @positive-click="forceRefresh('ip')">
              <template #trigger>
                <n-button :loading="refreshing === 'ip'">
                  <template #icon
                    ><n-icon><Renew /></n-icon
                  ></template>
                  {{ t("geo.database.refresh_all") }}
                </n-button>
              </template>
              {{ t("geo.database.update_all_confirm") }}
            </ConfirmModal>
          </n-flex>
          <n-scrollbar class="config-list">
            <StandardDataTable
              :columns="ipColumns"
              :data="ipConfigs"
              :row-key="ipRowKey"
              :scroll-x="710"
              size="small"
            />
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
  </ConfigModal>
</template>

<style scoped>
.config-list {
  max-height: calc(100vh - 250px);
  margin-top: var(--app-space-sm);
}
</style>
