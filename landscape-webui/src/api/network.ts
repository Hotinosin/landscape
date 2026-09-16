import { NetDev } from "@/lib/dev";
import axios from "axios";
import {
  getIfacesOld,
  setController as add_controller,
  createBridge,
  deleteBridge as delete_bridge,
  changeZone as change_zone,
  changeDevStatus as change_iface_status,
  changeWifiMode as change_wifi_mode,
} from "@landscape-router/types/api/interfaces/interfaces";
import { applyInterceptors } from "@/api";

const networkAxios = applyInterceptors(
  axios.create({ baseURL: "/api/v1/interfaces", timeout: 30000 }),
);
const servicesAxios = applyInterceptors(
  axios.create({ baseURL: "/api/v1/services", timeout: 30000 }),
);

export {
  add_controller,
  delete_bridge,
  change_zone,
  change_iface_status,
  change_wifi_mode,
};

export async function ifaces(): Promise<NetDev[]> {
  let data = await getIfacesOld();
  return data.map((e: any) => new NetDev(e));
}

export async function create_bridge(name: string) {
  return createBridge({ name });
}

export async function change_iface_boot_status(
  iface_name: string,
  enable_in_boot: boolean,
) {
  return networkAxios.post(
    `/${encodeURIComponent(iface_name)}/boot/${enable_in_boot}`,
  );
}

export interface RuntimeIpAddress {
  address: string;
  prefix_length: number;
  is_permanent: boolean;
}

export async function get_runtime_ip_addresses(): Promise<
  Record<string, RuntimeIpAddress[]>
> {
  const response = (await servicesAxios.get("/ip/runtime-addresses", {
    silent: true,
  } as any)) as unknown as { data: Record<string, RuntimeIpAddress[]> };
  return response.data;
}
