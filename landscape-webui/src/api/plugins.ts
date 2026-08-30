import axios from "axios";
import { applyInterceptors } from "@/api";

const client = applyInterceptors(axios.create({ baseURL: "/api/v1/plugins" }));

export interface PluginInfo {
  protocol_version: number;
  id: string;
  name: string;
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
}

export async function listPlugins(): Promise<PluginInfo[]> {
  return client.get("/");
}

export async function importPlugin(file: File): Promise<PluginInfo> {
  const body = new FormData();
  body.append("file", file);
  return client.post("/import", body);
}

export async function removePlugin(id: string): Promise<void> {
  await client.delete(`/${encodeURIComponent(id)}`);
}
