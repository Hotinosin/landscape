<script setup lang="ts">
import { useDockerStore } from "@/stores/status_docker";
import DockerContainerCard from "@/components/docker/DockerContainerCard.vue";
import DockerContainerListRow from "@/components/docker/DockerContainerListRow.vue";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useI18n } from "vue-i18n";
import { computed, h } from "vue";
import type { DataTableColumns } from "naive-ui";
import type { DockerContainerSummary } from "@/lib/docker";

const dockerStatus = useDockerStore();
const frontEndStore = useFrontEndStore();
const { t } = useI18n();
const columns = computed<DataTableColumns<DockerContainerSummary>>(() =>
  [
    [`${t("common.status")} / ${t("common.name")}`, "name"],
    [t("common.image"), "image"],
    [t("common.status"), "status"],
    [t("common.created_at"), "created"],
    [t("common.actions"), "actions"],
  ].map(([title, cell]) => ({
    title,
    key: cell,
    align: "left" as const,
    render: (container: DockerContainerSummary) =>
      h(DockerContainerListRow, { container, cell: cell as any }),
  })),
);
function rowKey(row: DockerContainerSummary) {
  return row.Names?.[0] ?? `${row.Image}-${row.Created}`;
}
</script>
<template>
  <StandardDataTable
    v-if="frontEndStore.display_style === 'list'"
    :columns="columns"
    :data="dockerStatus.container_summarys"
    :loading="dockerStatus.loading"
    :error="dockerStatus.error"
    :row-key="rowKey"
    @retry="dockerStatus.retry"
  />
  <StandardPageState
    v-else
    :state="dockerStatus.state"
    @retry="dockerStatus.retry"
  >
    <n-grid x-gap="12" y-gap="12" cols="1 600:3 1200:4 1900:6">
      <n-gi :span="1" v-for="container in dockerStatus.container_summarys">
        <DockerContainerCard :container="container" />
      </n-gi>
    </n-grid>
  </StandardPageState>
</template>
