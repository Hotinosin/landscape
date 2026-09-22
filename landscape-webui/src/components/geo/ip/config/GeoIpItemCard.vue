<script setup lang="ts">
import {
  delete_geo_ip_config,
  refresh_geo_ip_by_name,
  update_geo_ip_by_upload,
} from "@/api/geo/ip";
import type { GeoIpSourceConfig } from "@landscape-router/types/api/schemas";
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
  geo_ip_source: GeoIpSourceConfig;
  cell: "status" | "type" | "time" | "actions";
}
const props = defineProps<Prop>();
const show_edit_modal = ref(false);

async function del() {
  if (props.geo_ip_source.id) {
    await delete_geo_ip_config(props.geo_ip_source.id);
    emit("refresh");
  }
}

const title = computed(() => {
  return frontEndStore.presentation_mode
    ? mask_string(props.geo_ip_source.name || "undefined")
    : props.geo_ip_source.name || "undefined";
});

const show_upload = ref(false);
const onGeoUpload = async (formData: FormData) => {
  await update_geo_ip_by_upload(props.geo_ip_source.name, formData);
};
const refreshing = ref(false);
async function refresh() {
  refreshing.value = true;
  try {
    await refresh_geo_ip_by_name(props.geo_ip_source.name);
    emit("refresh");
    emit("refresh:keys");
  } finally {
    refreshing.value = false;
  }
}
</script>
<template>
  <StatusTitle
    v-if="cell === 'status'"
    :enable="geo_ip_source.enable"
    :name="title"
  />
  <n-flex v-else-if="cell === 'type'" :wrap="false" size="small">
    <n-tag :bordered="false" size="small">{{
      geo_ip_source.source.t === "url" ? "URL" : "Direct"
    }}</n-tag>
    <n-tag
      v-if="geo_ip_source.source.t === 'url'"
      :bordered="false"
      size="small"
    >
      {{ (geo_ip_source.source.format || "dat").toUpperCase() }}
    </n-tag>
  </n-flex>
  <template v-else-if="cell === 'time'">
    <n-time
      v-if="geo_ip_source.source.t === 'url'"
      :time="geo_ip_source.source.next_update_at"
      format="yyyy-MM-dd HH:mm:ss"
      :time-zone="prefStore.timezone"
    />
    <span v-else>—</span>
  </template>
  <n-flex v-else-if="cell === 'actions'" :wrap="false" size="small">
    <n-button
      v-if="geo_ip_source.source.t === 'url'"
      size="small"
      @click="show_upload = true"
    >
      {{ t("geo.item_card.upload") }}
    </n-button>
    <ConfirmModal
      v-if="geo_ip_source.source.t === 'url'"
      :positive-button-props="{ loading: refreshing }"
      @positive-click="refresh"
    >
      <template #trigger>
        <n-button size="small">{{
          t("geo.item_card.refresh_source")
        }}</n-button>
      </template>
      {{ t("geo.item_card.force_refresh_confirm") }}
    </ConfirmModal>
    <EditButton @click="show_edit_modal = true" />
    <DeleteButton :item="geo_ip_source.name" :on-confirm="del" />
  </n-flex>
  <template v-if="cell === 'actions'">
    <GeoIpEditModal
      :id="geo_ip_source.id"
      @refresh="emit('refresh')"
      v-model:show="show_edit_modal"
    ></GeoIpEditModal>

    <GeoUploadFile
      v-model:show="show_upload"
      :upload="onGeoUpload"
      @refresh="emit('refresh:keys')"
    ></GeoUploadFile>
  </template>
</template>
