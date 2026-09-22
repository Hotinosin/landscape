import type { RouteRecordRaw } from "vue-router";

const service_status_route: Array<RouteRecordRaw> = [
  {
    path: "/network/ipv6-pd",
    redirect: "/network/settings",
  },
  {
    path: "/network/dhcp-v4",
    redirect: { path: "/network/allocations", query: { tab: "ipv4" } },
  },
  {
    path: "/network/ipv6-ra",
    redirect: { path: "/network/allocations", query: { tab: "ipv6" } },
  },
];

export default service_status_route;
