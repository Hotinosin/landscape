import type { RouteRecordRaw } from "vue-router";

const service_status_route: Array<RouteRecordRaw> = [
  {
    path: "/network/ipv6-pd",
    name: "routes.ipv6-pd",
    component: () => import("@/views/status/IPv6PD.vue"),
  },
  {
    path: "/network/dhcp-v4",
    name: "routes.dhcp-v4",
    component: () => import("@/views/status/DHCPv4Server.vue"),
  },
  {
    path: "/network/ipv6-ra",
    name: "routes.ipv6-ra",
    component: () => import("@/views/status/IPv6RA.vue"),
  },
];

export default service_status_route;
