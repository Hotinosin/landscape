<script setup lang="ts">
import {
  computed,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { NTag, useDialog, useMessage, type DataTableColumns } from "naive-ui";
import { useNeutralDialogButtonProps } from "@/composables/useNeutralDialogButtonProps";
import { Search } from "@vicons/carbon";
import EditButton from "@/components/common/EditButton.vue";
import type {
  GeoFileCacheKey,
  GeoSiteFileConfig,
  IpConfig,
  QueryGeoKey,
} from "@landscape-router/types/api/schemas";
import {
  get_geo_site_cache_detail,
  lookup_geo_site_domain,
  search_geo_site_cache,
  type GeoSiteLookupResult,
} from "@/api/geo/site";
import {
  get_geo_ip_cache_detail,
  lookup_geo_ip_address,
  search_geo_ip_cache,
  type GeoIpLookupResult,
} from "@/api/geo/ip";
import { sortGeoKeys } from "@/lib/geo_utils";
import GeoDatabaseDrawer from "@/components/geo/GeoDatabaseDrawer.vue";
import ConfigModal from "@/components/common/ConfigModal.vue";

type Source = "site" | "ip";
const { t } = useI18n();
const dialog = useDialog();
const message = useMessage();
const neutralButtonProps = useNeutralDialogButtonProps();
const source = ref<Source>("site");
const rules = ref<GeoFileCacheKey[]>([]);
const selected = ref<GeoFileCacheKey | null>(null);
const detail = ref<any>(null);
const search = ref("");
const showConfig = ref(false);
const lookupInput = ref("");
const lookupLoading = ref(false);
type GeoLookupResult = GeoSiteLookupResult | GeoIpLookupResult;
type GeoLookupValue = GeoSiteFileConfig | IpConfig;
type GeoLookupRow = {
  result: GeoLookupResult;
  value: GeoLookupValue;
};
const lookupResults = ref<GeoLookupResult[]>([]);
const showLookupResults = ref(false);
const highlightedValue = ref("");
const keyList = ref<{ scrollTo: (options: { index: number }) => void } | null>(
  null,
);
const valueList = ref<{
  scrollTo: (options: { index: number; behavior?: ScrollBehavior }) => void;
} | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | undefined;
const filter: QueryGeoKey = { name: null, key: null };

const sourceOptions = computed(() => [
  { label: t("geo.database.geosite_source"), value: "site" },
  { label: t("geo.database.geoip_source"), value: "ip" },
]);
const visibleKeys = computed(() => {
  const value = search.value.trim().toLowerCase();
  return value
    ? rules.value.filter((item) =>
        `${item.key} ${item.name}`.toLowerCase().includes(value),
      )
    : rules.value;
});
const values = computed<any[]>(() => detail.value?.values ?? []);
const lookupCount = computed(() => lookupResults.value.length);
const lookupRows = computed<GeoLookupRow[]>(() =>
  lookupResults.value.flatMap((result) =>
    result.values.map((value) => ({ result, value })),
  ),
);
const lookupColumns = computed<DataTableColumns<GeoLookupRow>>(() => [
  {
    title: t("geo.database.lookup_source"),
    key: "source",
    width: 110,
    render: ({ result }) => result.key.name,
  },
  {
    title: t("geo.database.lookup_group"),
    key: "group",
    render: ({ result }) => result.key.key,
  },
  {
    title: t("common.type"),
    key: "type",
    width: 100,
    render: ({ value }) =>
      h(NTag, { size: "small", bordered: false }, () =>
        "match_type" in value ? value.match_type : "CIDR",
      ),
  },
  {
    title: t("geo.database.lookup_value"),
    key: "value",
    render: ({ value }) =>
      "match_type" in value ? value.value : `${value.ip}/${value.prefix}`,
  },
]);

function valueKey(value: GeoLookupValue) {
  return "match_type" in value
    ? `${value.match_type}:${value.value}`
    : `${value.ip}/${value.prefix}`;
}

function lookupRowKey({ result, value }: GeoLookupRow) {
  return `${result.key.name}:${result.key.key}:${valueKey(value)}`;
}

function lookupRowProps({ result, value }: GeoLookupRow) {
  return {
    class: "geo-lookup-row",
    onClick: () => jumpToMatch(result, value),
  };
}

async function load() {
  const result =
    source.value === "site"
      ? await search_geo_site_cache(filter)
      : await search_geo_ip_cache(filter);
  rules.value = sortGeoKeys(result, "");
  if (rules.value.length) await selectKey(rules.value[0]);
  else {
    selected.value = null;
    detail.value = null;
  }
}
async function selectKey(item: GeoFileCacheKey) {
  selected.value = item;
  detail.value =
    source.value === "site"
      ? await get_geo_site_cache_detail(item)
      : await get_geo_ip_cache_detail(item);
}
function cleanDomainInput(raw: string): string {
  let val = raw.trim();
  val = val.replace(/^[a-zA-Z]+:\/\//, "");
  val = val.split(/[/?#]/)[0].trim();
  if (val.includes(":") && !val.includes("::") && !val.startsWith("[")) {
    val = val.split(":")[0];
  }
  return val.toLowerCase();
}

async function executeLookup(query: string) {
  lookupLoading.value = true;
  try {
    const results =
      source.value === "site"
        ? await lookup_geo_site_domain(query)
        : await lookup_geo_ip_address(query);
    lookupResults.value = results;
    if (results.length === 0) {
      message.info(
        t(
          source.value === "site"
            ? "geo.geo_site.lookup_empty"
            : "geo.geo_ip.lookup_empty",
        ),
      );
    }
    showLookupResults.value = true;
  } catch (error: any) {
    message.error(error?.message || t("common.error"));
  } finally {
    lookupLoading.value = false;
  }
}

const show_geo_drawer_modal = ref(false);
const show_lookup_modal = ref(false);
</script>

<template>
  <n-flex style="flex: 1; overflow: hidden; margin-bottom: 10px" vertical>
    <n-flex style="width: 100%" :wrap="false">
      <!-- {{ filter }} -->
      <n-button @click="show_geo_drawer_modal = true">
        {{ t("common.domain_rule_source_config") }}
      </n-button>
      <n-button @click="show_lookup_modal = true">
        {{ t("geo.lookup.site_action") }}
      </n-button>
      <n-popconfirm
        :positive-button-props="{ loading: loading }"
        @positive-click="refresh_cache"
      >
        <template #trigger>
          <n-button>{{ t("common.force_refresh") }}</n-button>
        </template>
        {{ t("common.force_refresh_confirm") }}
      </n-popconfirm>
      <GeoSiteKeySelect
        v-model:geo_key="filter.key"
        v-model:geo_name="filter.name"
        @refresh="refresh"
      ></GeoSiteKeySelect>
    </n-flex>

    <!-- <n-grid x-gap="12" y-gap="10" cols="1 600:2 900:3 1200:4 1600:5">
      <n-grid-item
        v-for="rule in rules"
        :key="rule.index"
        style="display: flex"
      >
        <GeoSiteCacheCard :geo_site="rule"></GeoSiteCacheCard>
      </n-grid-item>
    </n-grid> -->

    <n-virtual-list :item-size="52" :items="rules">
      <template #default="{ item }">
        <GeoSiteCacheCard :geo_site="item"></GeoSiteCacheCard>
      </template>
    </n-virtual-list>
    <GeoSiteDrawer @refresh:keys="refresh" v-model:show="show_geo_drawer_modal">
    </GeoSiteDrawer>
    <GeoLookupModal mode="site" v-model:show="show_lookup_modal" />
  </n-flex>
</template>

<style scoped>
.geo-page {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.geo-toolbar,
.geo-browser {
  display: grid;
  gap: var(--app-space-section);
}
.geo-toolbar {
  grid-template-columns:
    minmax(240px, 320px) minmax(280px, 680px)
    minmax(0, 1fr);
  align-items: center;
}
.geo-toolbar > :last-child {
  justify-self: end;
}
.geo-lookup {
  width: 100%;
}
.geo-lookup-input {
  min-width: 0;
  flex: 1;
}
.geo-source-select {
  width: 100%;
}
.geo-browser {
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  min-height: 0;
  flex: 1;
}
.geo-panel {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-section);
  min-height: 0;
  padding: 16px 16px 0;
  border-radius: var(--app-radius-control, 6px);
  background: var(--app-surface-color);
  box-shadow: 0 1px 4px var(--app-shadow-color);
}
.geo-list {
  min-height: 0;
  height: 100%;
  flex: 1;
  border-radius: 0 0 var(--app-radius-control) var(--app-radius-control);
}
.geo-key {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--app-space-sm);
  padding: 8px var(--app-space-section);
  border: 0;
  border-radius: var(--app-radius-control, 6px);
  color: var(--app-text-secondary-color);
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.geo-key:hover {
  background: var(--app-interactive-hover-color);
}
.geo-key.active {
  color: var(--app-text-inverse-color);
  background: var(--app-brand-color);
}
.geo-key small {
  color: inherit;
  opacity: 0.72;
}
.geo-value {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--app-space-section);
  margin-bottom: 4px;
  border-radius: var(--app-radius-control, 6px);
  background: var(--app-surface-subtle-color);
}
.geo-value.highlighted {
  color: var(--app-brand-color);
  background: var(--app-surface-interactive-color);
  box-shadow: inset 3px 0 var(--app-brand-color);
}
.geo-lookup-row {
  cursor: pointer;
}
@media (max-width: 800px) {
  .geo-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .geo-lookup,
  .geo-toolbar > div:nth-child(2) {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .geo-browser {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(220px, 38vh) minmax(320px, 1fr);
  }
}
</style>
