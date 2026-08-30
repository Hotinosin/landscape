<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { Search, Settings } from "@vicons/carbon";
import type {
  GeoFileCacheKey,
  GeoSiteFileConfig,
  QueryGeoKey,
} from "@landscape-router/types/api/schemas";
import {
  get_geo_site_cache_detail,
  lookup_geo_site_domain,
  search_geo_site_cache,
  type GeoSiteLookupResult,
} from "@/api/geo/site";
import { get_geo_ip_cache_detail, search_geo_ip_cache } from "@/api/geo/ip";
import { sortGeoKeys } from "@/lib/geo_utils";
import GeoDatabaseDrawer from "@/components/geo/GeoDatabaseDrawer.vue";

type Source = "site" | "ip";
const { t } = useI18n();
const source = ref<Source>("site");
const rules = ref<GeoFileCacheKey[]>([]);
const selected = ref<GeoFileCacheKey | null>(null);
const detail = ref<any>(null);
const search = ref("");
const showConfig = ref(false);
const lookupInput = ref("");
const lookupLoading = ref(false);
const lookupResults = ref<GeoSiteLookupResult[]>([]);
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

function valueKey(value: GeoSiteFileConfig) {
  return `${value.match_type}:${value.value}`;
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
async function lookupDomain() {
  const domain = lookupInput.value.trim();
  if (!domain) return;
  lookupLoading.value = true;
  try {
    lookupResults.value = await lookup_geo_site_domain(domain);
    showLookupResults.value = true;
  } finally {
    lookupLoading.value = false;
  }
}
async function jumpToMatch(
  result: GeoSiteLookupResult,
  value: GeoSiteFileConfig,
) {
  showLookupResults.value = false;
  search.value = "";
  await nextTick();
  const keyIndex = rules.value.findIndex(
    (item) => item.name === result.key.name && item.key === result.key.key,
  );
  if (keyIndex >= 0) keyList.value?.scrollTo({ index: keyIndex });
  await selectKey(result.key);
  highlightedValue.value = valueKey(value);
  await nextTick();
  const valueIndex = values.value.findIndex(
    (item) => valueKey(item) === highlightedValue.value,
  );
  if (valueIndex >= 0) {
    valueList.value?.scrollTo({ index: valueIndex, behavior: "smooth" });
  }
  clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => (highlightedValue.value = ""), 2400);
}
watch(source, async () => {
  selected.value = null;
  detail.value = null;
  search.value = "";
  showLookupResults.value = false;
  await load();
});
onMounted(load);
onBeforeUnmount(() => clearTimeout(highlightTimer));
</script>

<template>
  <n-flex class="geo-page" vertical :size="12">
    <div class="geo-toolbar">
      <n-select
        v-model:value="source"
        :options="sourceOptions"
        class="geo-source-select"
      />
      <n-input-group v-if="source === 'site'" class="geo-lookup">
        <n-input
          v-model:value="lookupInput"
          clearable
          :placeholder="t('geo.site.lookup_placeholder')"
          @keyup.enter="lookupDomain"
        />
        <n-button
          type="primary"
          :loading="lookupLoading"
          :disabled="!lookupInput.trim()"
          @click="lookupDomain"
        >
          <template #icon
            ><n-icon><Search /></n-icon></template
          >{{ t("geo.site.lookup_action") }}
        </n-button>
      </n-input-group>
      <div v-else />
      <n-button secondary @click="showConfig = true">
        <template #icon
          ><n-icon><Settings /></n-icon></template
        >{{ t("common.config") }}
      </n-button>
    </div>

    <div class="geo-browser">
      <aside class="geo-panel">
        <n-flex justify="space-between"
          ><n-text strong>{{ source === "site" ? "GeoSite" : "GeoIP" }}</n-text
          ><n-tag size="small" :bordered="false">{{
            visibleKeys.length
          }}</n-tag></n-flex
        >
        <n-input
          v-model:value="search"
          clearable
          :placeholder="t('geo.site.search_tags')"
        />
        <n-virtual-list
          ref="keyList"
          class="geo-list"
          :item-size="42"
          :items="visibleKeys"
        >
          <template #default="{ item }">
            <button
              class="geo-key"
              :class="{
                active:
                  selected?.name === item.name && selected?.key === item.key,
              }"
              @click="selectKey(item)"
            >
              <span>{{ item.key }}</span
              ><small>{{ item.name }}</small>
            </button>
          </template>
        </n-virtual-list>
      </aside>
      <section class="geo-panel">
        <n-flex justify="space-between"
          ><n-text strong>{{ selected?.key || "—" }}</n-text
          ><n-tag v-if="detail" size="small" :bordered="false">{{
            values.length
          }}</n-tag></n-flex
        >
        <n-virtual-list
          v-if="detail"
          ref="valueList"
          class="geo-list"
          :item-size="42"
          :items="values"
        >
          <template #default="{ item }">
            <div
              class="geo-value"
              :class="{ highlighted: highlightedValue === valueKey(item) }"
            >
              <span>{{
                source === "site" ? item.value : `${item.ip}/${item.prefix}`
              }}</span
              ><n-tag v-if="source === 'site'" size="tiny" :bordered="false">{{
                item.match_type
              }}</n-tag>
            </div>
          </template>
        </n-virtual-list>
      </section>
    </div>
    <GeoDatabaseDrawer
      v-model:show="showConfig"
      :initial-tab="source"
      @refresh="load"
    />
    <n-modal
      v-model:show="showLookupResults"
      preset="card"
      class="geo-lookup-modal"
      :title="t('geo.site.lookup_results', { count: lookupCount })"
    >
      <n-empty
        v-if="!lookupResults.length"
        :description="t('geo.site.lookup_empty')"
      />
      <div v-else class="geo-lookup-results">
        <template
          v-for="result in lookupResults"
          :key="`${result.key.name}:${result.key.key}`"
        >
          <button
            v-for="value in result.values"
            :key="`${result.key.name}:${result.key.key}:${valueKey(value)}`"
            class="geo-lookup-result"
            @click="jumpToMatch(result, value)"
          >
            <span>
              <strong>{{ result.key.key }}</strong>
              <small>{{ result.key.name }}</small>
            </span>
            <span class="geo-lookup-rule">
              {{ value.value }}
              <n-tag size="tiny" :bordered="false">{{
                value.match_type
              }}</n-tag>
            </span>
          </button>
        </template>
      </div>
    </n-modal>
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
  border-radius: 0 0 6px 6px;
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
.geo-lookup-modal {
  width: min(680px, calc(100vw - 32px));
}
.geo-lookup-results {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-sm);
  max-height: min(560px, 70vh);
  overflow: auto;
}
.geo-lookup-result {
  display: grid;
  grid-template-columns: minmax(120px, 0.35fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--app-space-section);
  width: 100%;
  padding: var(--app-space-section);
  border: 0;
  border-radius: var(--app-radius-control);
  color: var(--app-text-primary-color);
  background: var(--app-surface-subtle-color);
  cursor: pointer;
  text-align: left;
}
.geo-lookup-result:hover {
  background: var(--app-interactive-hover-color);
}
.geo-lookup-result > span,
.geo-lookup-rule {
  display: flex;
  align-items: center;
  gap: var(--app-space-sm);
  min-width: 0;
}
.geo-lookup-result small {
  color: var(--app-text-secondary-color);
}
.geo-lookup-rule {
  justify-content: space-between;
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
