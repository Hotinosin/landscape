import type { RouteRecordRaw } from "vue-router";
export default [
  { path: "/network/ipv6-pd", redirect: "/network/settings" },
  ...["lan-devices", "dhcp-v4", "ipv6-ra"].map((name) => ({
    path: `/network/${name}`,
    redirect: "/network/allocations",
  })),
] satisfies RouteRecordRaw[];
