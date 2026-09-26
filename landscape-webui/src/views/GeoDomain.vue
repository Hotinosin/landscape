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

async function lookup() {
  const raw = lookupInput.value.trim();
  if (!raw) return;

  if (source.value === "site") {
    const cleaned = cleanDomainInput(raw);
    if (!cleaned) return;
    lookupInput.value = cleaned;

    if (!cleaned.includes(".")) {
      const suggested = `${cleaned}.com`;
      dialog.info({
        autoFocus: false,
        title: t("geo.geo_site.lookup_confirm_title"),
        content: t("geo.geo_site.lookup_confirm_content", {
          example: "baidu.com",
          suggested,
        }),
        positiveText: t("geo.geo_site.lookup_confirm_positive", {
          domain: suggested,
        }),
        negativeText: t("common.cancel"),
        negativeButtonProps: neutralButtonProps.value,
        onPositiveClick: () => {
          lookupInput.value = suggested;
          void executeLookup(suggested);
        },
      });
      return;
    }

    await executeLookup(cleaned);
  } else {
    await executeLookup(raw);
  }
}
async function jumpToMatch(result: GeoLookupResult, value: GeoLookupValue) {
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
      <n-flex class="geo-lookup" :size="8" :wrap="false">
        <n-input
          v-model:value="lookupInput"
          class="geo-lookup-input"
          clearable
          :placeholder="
            t(
              source === 'site'
                ? 'geo.geo_site.lookup_placeholder'
                : 'geo.geo_ip.lookup_placeholder',
            )
          "
          @keyup.enter="lookup"
        />
        <n-button
          type="primary"
          :loading="lookupLoading"
          :disabled="!lookupInput.trim()"
          @click="lookup"
        >
          <template #icon
            ><n-icon><Search /></n-icon></template
          >{{ t("geo.geo_site.lookup_action") }}
        </n-button>
      </n-flex>
      <EditButton @click="showConfig = true" />
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
    <ConfigModal
      v-model:show="showLookupResults"
      :show-switch="false"
      width="var(--app-secondary-modal-width)"
      :title="
        t(
          source === 'site'
            ? 'geo.geo_site.lookup_results'
            : 'geo.geo_ip.lookup_results',
          { count: lookupCount },
        )
      "
    >
      <n-empty
        v-if="!lookupResults.length"
        :description="
          t(
            source === 'site'
              ? 'geo.geo_site.lookup_empty'
              : 'geo.geo_ip.lookup_empty',
          )
        "
      />
      <StandardDataTable
        v-else
        :columns="lookupColumns"
        :data="lookupRows"
        :row-key="lookupRowKey"
        :max-height="560"
        :row-props="lookupRowProps"
      />
    </ConfigModal>
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
