import axios from "axios";
import { applyInterceptors } from "@/api";

const client = applyInterceptors(axios.create({ baseURL: "/api/v1/plugins" }));

export interface PluginInfo {
  protocol_version: number;
  id: string;
  name: string;
  version?: string;
  host_interface: string;
  controller_socket: string;
  ui_path: string;
  network: {
    namespace?: string;
    peer_interface: string;
    tproxy_port: number;
  };
  interface_ready: boolean;
  tproxy_ready: boolean;
  controller_ready: boolean;
  service_running: boolean;
  trust: "UNVERIFIED_SOURCE";
}

export async function listPlugins(): Promise<PluginInfo[]> {
  return client.get("", { silent: true } as any);
}

export async function importPlugin(file: File): Promise<PluginInfo> {
  const body = new FormData();
  body.append("file", file);
  return client.post("/import", body);
}

export async function removePlugin(id: string): Promise<void> {
  await client.delete(`/${encodeURIComponent(id)}`);
}

export async function startPlugin(id: string): Promise<void> {
  await client.post(`/${encodeURIComponent(id)}/start`);
}

export async function stopPlugin(id: string): Promise<void> {
  await client.post(`/${encodeURIComponent(id)}/stop`);
}

export async function pluginLogs(id: string): Promise<string> {
  return client.get(`/${encodeURIComponent(id)}/logs`, {
    responseType: "text",
  });
}

export async function pluginConfig(id: string): Promise<string> {
  return client.get(`/${encodeURIComponent(id)}/config`, {
    responseType: "text",
  });
}

export async function savePluginConfig(
  id: string,
  config: string,
): Promise<void> {
  await client.put(`/${encodeURIComponent(id)}/config`, config, {
    headers: { "Content-Type": "text/plain" },
  });
}
