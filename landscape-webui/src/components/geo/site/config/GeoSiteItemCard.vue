<script setup lang="ts">
import {
  delete_geo_site_config,
  refresh_geo_site_by_name,
  update_geo_site_by_upload,
} from "@/api/geo/site";
import type { GeoSiteSourceConfig } from "@landscape-router/types/api/schemas";
import { computed, ref } from "vue";
import { useFrontEndStore } from "@/stores/front_end_config";
import { mask_string } from "@/lib/common";
import { usePreferenceStore } from "@/stores/preference";
import { useI18n } from "vue-i18n";
const prefStore = usePreferenceStore();

const frontEndStore = useFrontEndStore();
const { t } = useI18n();
const emit = defineEmits(["refresh", "refresh:keys"]);

interface Prop {
  geo_site: GeoSiteSourceConfig;
  cell: "status" | "type" | "time" | "actions";
}
const props = defineProps<Prop>();
const show_edit_modal = ref(false);

async function del() {
  if (props.geo_site.id) {
    await delete_geo_site_config(props.geo_site.id);
    emit("refresh");
  }
}

const title = computed(() => {
  return frontEndStore.presentation_mode
    ? mask_string(props.geo_site.name || "undefined")
    : props.geo_site.name || "undefined";
});

const show_upload = ref(false);
const onGeoUpload = async (formData: FormData) => {
  await update_geo_site_by_upload(props.geo_site.name, formData);
};

const refreshing = ref(false);
async function force_refresh() {
  refreshing.value = true;
  try {
    await refresh_geo_site_by_name(props.geo_site.name);
    emit("refresh");
    emit("refresh:keys");
  } finally {
    refreshing.value = false;
  }
}
</script>
<template>
  <StatusTitle v-if="cell === 'status'" :enable="geo_site.enable" :remark="title" />
  <n-tag v-else-if="cell === 'type'" :bordered="false" size="small">
      {{ geo_site.source.t === "url" ? "URL" : geo_site.source.t === "adguard_home" ? "AdGuard" : "Direct" }}
  </n-tag>
  <template v-else-if="cell === 'time'">
    <n-time
      v-if="geo_site.source.t !== 'direct'"
      :time="geo_site.source.next_update_at"
      format="yyyy-MM-dd HH:mm:ss"
      :time-zone="prefStore.timezone"
    />
    <span v-else>—</span>
  </template>
    <n-flex v-else-if="cell === 'actions'" :wrap="false" size="small">
      <n-button v-if="geo_site.source.t === 'url'" size="small" @click="show_upload = true">
        {{ t("geo.item_card.upload") }}
      </n-button>
      <ConfirmModal
        v-if="geo_site.source.t !== 'direct'"
        :positive-button-props="{ loading: refreshing }"
        @positive-click="force_refresh"
      >
        <template #trigger>
          <n-button size="small">
            {{ t("geo.item_card.refresh_source") }}
          </n-button>
        </template>
        {{ t("geo.item_card.force_refresh_confirm") }}
      </ConfirmModal>
      <EditButton @click="show_edit_modal = true" />
      <DeleteButton :item="geo_site.name" :on-confirm="del" />
    </n-flex>
  <template v-if="cell === 'actions'">
    <GeoSiteEditModal
      :id="geo_site.id"
      @refresh="emit('refresh')"
      v-model:show="show_edit_modal"
    ></GeoSiteEditModal>
    <GeoUploadFile
      v-model:show="show_upload"
      :upload="onGeoUpload"
      @refresh="emit('refresh:keys')"
    ></GeoUploadFile>
  </template>
</template>
