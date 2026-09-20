<script setup lang="ts">
import { useDockerStore } from "@/stores/status_docker";
import DockerContainerListRow from "@/components/docker/DockerContainerListRow.vue";
import { useI18n } from "vue-i18n";
import { computed, h } from "vue";
import type { DataTableColumns } from "naive-ui";
import type { DockerContainerSummary } from "@/lib/docker";

const dockerStatus = useDockerStore();
const { t } = useI18n();
type ContainerCell =
  | "name"
  | "image"
  | "ip"
  | "ports"
  | "status"
  | "created"
  | "actions";
const columns = computed<DataTableColumns<DockerContainerSummary>>(() =>
  (
    [
      [`${t("common.status")} / ${t("common.name")}`, "name", 200],
      [t("common.image"), "image", 220],
      [t("common.ip_address"), "ip", 160],
      [t("common.port_mapping"), "ports", 200],
      [t("common.status"), "status", 110],
      [t("common.created_at"), "created", 170],
      [t("common.actions"), "actions", 160],
    ] satisfies Array<[string, ContainerCell, number]>
  ).map(([title, cell, width]) => ({
    title,
    key: cell,
    width,
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
    :scroll-x="1220"
    @retry="dockerStatus.retry"
  />
</template>
