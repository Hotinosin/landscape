<script setup lang="ts">
import { useDockerStore } from "@/stores/status_docker";
import DockerContainerListRow from "@/components/docker/DockerContainerListRow.vue";
import { useI18n } from "vue-i18n";
import { computed, h } from "vue";
import type { DataTableColumns } from "naive-ui";
import type { DockerContainerSummary } from "@/lib/docker";

const dockerStatus = useDockerStore();
const { t } = useI18n();
type ContainerCell = "name" | "image" | "status" | "created" | "actions";
const columns = computed<DataTableColumns<DockerContainerSummary>>(() =>
  (
    [
      [`${t("common.status")} / ${t("common.name")}`, "name"],
      [t("common.image"), "image"],
      [t("common.status"), "status"],
      [t("common.created_at"), "created"],
      [t("common.actions"), "actions"],
    ] satisfies Array<[string, ContainerCell]>
  ).map(([title, cell]) => ({
    title,
    key: cell,
    align: "left" as const,
    render: (container: DockerContainerSummary) =>
      h(DockerContainerListRow, { container, cell }),
  })),
);
function rowKey(row: DockerContainerSummary) {
  return row.Names?.[0] ?? `${row.Image}-${row.Created}`;
}
</script>
<template>
  <StandardDataTable
    :columns="columns"
    :data="dockerStatus.container_summarys"
    :loading="dockerStatus.loading"
    :error="dockerStatus.error"
    :row-key="rowKey"
    :scroll-x="800"
    @retry="dockerStatus.retry"
  />
</template>
