<script setup lang="ts">
import { useDockerStore } from "@/stores/status_docker";
import DockerContainerListRow from "@/components/docker/DockerContainerListRow.vue";
import { useI18n } from "vue-i18n";
import { computed, h } from "vue";
import type { DataTableColumns } from "naive-ui";
import type { DockerContainerSummary } from "@/lib/docker";

const dockerStatus = useDockerStore();
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
    :columns="columns"
    :data="dockerStatus.container_summarys"
    :loading="dockerStatus.loading"
    :error="dockerStatus.error"
    :row-key="rowKey"
    @retry="dockerStatus.retry"
  />
</template>
