import customInstance from "@landscape-router/types/mutator";
import { LandscapeStatus } from "@/lib/sys";
import type { LandscapeSystemInfo } from "@/lib/sys";
import {
  getBasicSysInfo,
  getIntervalFetchInfo,
  getCpuCount,
} from "@landscape-router/types/api/system-info/system-info";

export async function get_sysinfo(): Promise<LandscapeSystemInfo> {
  return await getBasicSysInfo();
}

export async function interval_fetch_info(): Promise<LandscapeStatus> {
  const data = await getIntervalFetchInfo();
  return new LandscapeStatus(data);
}

export async function get_cpu_count(): Promise<number> {
  return await getCpuCount();
}

export async function get_capabilities(): Promise<string[]> {
  return customInstance<{ data?: string[] }>(
    { url: "/api/v1/system/info/capabilities", method: "GET" },
    { silent: true },
  );
}
