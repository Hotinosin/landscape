import { useCapabilityStore } from "@/stores/capability";
import {
  listPlugins as listPluginsApi,
  importPlugin as importPluginApi,
  removePlugin as removePluginApi,
  startPlugin as startPluginApi,
  stopPlugin as stopPluginApi,
  restartPlugin as restartPluginApi,
  pluginLogs as pluginLogsApi,
  pluginConfig as pluginConfigApi,
  savePluginConfig as savePluginConfigApi,
} from "@landscape-router/types/api/plugins/plugins";
import type {
  PluginInfo,
  PluginNetwork,
} from "@landscape-router/types/api/schemas";

export type { PluginInfo, PluginNetwork };

export async function listPlugins(): Promise<PluginInfo[]> {
  const capabilities = useCapabilityStore();
  await capabilities.LOAD();
  if (!capabilities.HAS("plugins")) return [];
  return listPluginsApi({ silent: true });
}

export async function importPlugin(file: File): Promise<PluginInfo> {
  await useCapabilityStore().REQUIRE("plugins");
  const formData = new FormData();
  formData.append("file", file);
  return importPluginApi({
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  } as any);
}

export async function removePlugin(id: string): Promise<void> {
  await useCapabilityStore().REQUIRE("plugins");
  await removePluginApi(id);
}

export async function startPlugin(id: string): Promise<void> {
  await useCapabilityStore().REQUIRE("plugins");
  await startPluginApi(id);
}

export async function stopPlugin(id: string, force = false): Promise<void> {
  await useCapabilityStore().REQUIRE("plugins");
  await stopPluginApi(id, force ? { force } : undefined);
}

export async function restartPlugin(id: string): Promise<void> {
  await useCapabilityStore().REQUIRE("plugins");
  await restartPluginApi(id);
}

export async function pluginLogs(id: string): Promise<string> {
  await useCapabilityStore().REQUIRE("plugins");
  return pluginLogsApi(id);
}

export type PluginConfigLayer = "base" | "override" | "effective";

export async function pluginConfig(
  id: string,
  layer?: PluginConfigLayer,
): Promise<string> {
  await useCapabilityStore().REQUIRE("plugins");
  return pluginConfigApi(id, layer ? { layer } : undefined);
}

export async function savePluginConfig(
  id: string,
  config: string,
  layer?: PluginConfigLayer,
  check = true,
): Promise<void> {
  await useCapabilityStore().REQUIRE("plugins");
  await savePluginConfigApi(id, config, {
    layer,
    check,
  } as any);
}
