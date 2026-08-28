<script setup lang="ts">
import { computed, ref } from "vue";
import {
  remove_container,
  start_container,
  stop_container,
} from "@/api/docker";
import { DockerContainerSummary, DockerBtnShow } from "@/lib/docker";
import { useDockerStore } from "@/stores/status_docker";
import { useFrontEndStore } from "@/stores/front_end_config";
import { usePreferenceStore } from "@/stores/preference";
import { useI18n } from "vue-i18n";
const props = defineProps<{
  container: DockerContainerSummary;
  cell: "name" | "image" | "status" | "created" | "actions";
}>();
const store = useDockerStore();
const front = useFrontEndStore();
const pref = usePreferenceStore();
const { t } = useI18n();
const busy = ref(false);
const title = computed(
  () => props.container.Names?.[0]?.replace(/^\/+/, "") ?? "",
);
const buttons = computed(() => new DockerBtnShow(props.container.State));
async function act(fn: (name: string) => Promise<unknown>) {
  if (!title.value) return;
  busy.value = true;
  try {
    await fn(title.value);
    await store.UPDATE_INFO();
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <template v-if="cell === 'name'">
    <StatusTitle
      :enable="container.State === 'running'"
      :remark="front.MASK_INFO(title)"
    /> </template
  ><template v-else-if="cell === 'image'">
    <n-ellipsis style="max-width: 320px">{{
      front.MASK_INFO(container.Image)
    }}</n-ellipsis> </template
  ><template v-else-if="cell === 'status'">{{ container.State }}</template>
  <template v-else-if="cell === 'created'">
    <n-time
      v-if="container.Created"
      :time="container.Created * 1000"
      :time-zone="pref.timezone"
    /><span v-else>—</span> </template
  ><template v-else>
    <n-flex justify="start" :wrap="false"
      ><n-button
        secondary
        size="small"
        :loading="busy"
        :disabled="!buttons.start"
        @click="act(start_container)"
        >{{ t("common.open") }}</n-button
      ><n-popconfirm @positive-click="act(stop_container)"
        ><template #trigger
          ><n-button secondary size="small" :disabled="!buttons.stop">{{
            t("common.close")
          }}</n-button></template
        >{{ t("common.confirm_stop") }}</n-popconfirm
      ><n-popconfirm @positive-click="act(remove_container)"
        ><template #trigger
          ><n-button
            secondary
            type="error"
            size="small"
            :disabled="!buttons.remove"
            >{{ t("common.delete") }}</n-button
          ></template
        >{{ t("common.confirm_delete") }}</n-popconfirm
      ></n-flex
    >
  </template>
</template>
