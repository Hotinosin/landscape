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
  try {
    const res = await listPluginsApi({ silent: true });
    if (Array.isArray(res)) return res;
    if (
      res &&
      typeof res === "object" &&
      "data" in res &&
      Array.isArray((res as any).data)
    ) {
      return (res as any).data;
    }
    return [];
  } catch {
    return [];
  }
}

export async function importPlugin(file: File): Promise<PluginInfo> {
  const formData = new FormData();
  formData.append("file", file);
  return importPluginApi({
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  } as any);
}

export async function removePlugin(id: string): Promise<void> {
  await removePluginApi(id);
}

export async function startPlugin(id: string): Promise<void> {
  await startPluginApi(id);
}

export async function stopPlugin(id: string, force = false): Promise<void> {
  await stopPluginApi(id, force ? { force } : undefined);
}

export async function restartPlugin(id: string): Promise<void> {
  await restartPluginApi(id);
}

export async function pluginLogs(id: string): Promise<string> {
  return pluginLogsApi(id);
}

export async function pluginConfig(id: string): Promise<string> {
  return pluginConfigApi(id);
}

export async function savePluginConfig(
  id: string,
  config: string,
): Promise<void> {
  await savePluginConfigApi(id, config);
}
