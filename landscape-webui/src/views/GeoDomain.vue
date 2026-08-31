<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Settings } from "@vicons/carbon";
import type {
  GeoFileCacheKey,
  QueryGeoKey,
} from "@landscape-router/types/api/schemas";
import {
  get_geo_site_cache_detail,
  search_geo_site_cache,
} from "@/api/geo/site";
import {
  get_geo_ip_cache_detail,
  search_geo_ip_cache,
} from "@/api/geo/ip";
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
watch(source, async () => {
  selected.value = null;
  detail.value = null;
  search.value = "";
  await load();
});
onMounted(load);
</script>

<template>
  <n-flex class="geo-page" vertical :size="12">
    <div class="geo-toolbar">
      <n-select
        v-model:value="source"
        :options="sourceOptions"
        class="geo-source-select"
      />
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
          :placeholder="t('geo.geo_site.search_tags')"
        />
        <n-virtual-list
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
          class="geo-list"
          :item-size="42"
          :items="values"
        >
          <template #default="{ item }">
            <div class="geo-value">
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
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  align-items: center;
}
.geo-toolbar > :last-child {
  justify-self: end;
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
@media (max-width: 800px) {
  .geo-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .geo-browser {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(220px, 38vh) minmax(320px, 1fr);
  }
}
</style>
