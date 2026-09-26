import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { clearLandscapeSession, LANDSCAPE_TOKEN_KEY } from "@/lib/common";

import service_status_route from "./service_status";
import metric_route from "./metric";

const inner_zone: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "routes.dashboard",
    component: () => import("@/views/Landscape.vue"),
  },
  {
    path: "/network/allocations",
    name: "routes.address-allocation",
    component: () => import("@/views/NetworkAllocations.vue"),
  },
  {
    path: "/network/settings",
    name: "routes.network-settings",
    component: () => import("@/views/NetworkSettings.vue"),
  },
  ...service_status_route,
  {
    path: "/dns/config",
    name: "routes.dns-config",
    component: () => import("@/views/dns/DnsUpstream.vue"),
  },
  {
    path: "/dns/upstream",
    redirect: "/dns/config",
  },
  {
    path: "/dns/redirect",
    name: "routes.dns-redirect",
    component: () => import("@/views/dns/DnsRedirect.vue"),
  },
  {
    path: "/firewall-nat/port-mapping",
    name: "routes.port-mapping",
    component: () => import("@/views/PortMappings.vue"),
  },
  {
    path: "/firewall-nat/nat/v4",
    redirect: { path: "/firewall-nat/port-mapping", query: { tab: "ipv4" } },
  },
  {
    path: "/firewall-nat/nat/v6",
    redirect: { path: "/firewall-nat/port-mapping", query: { tab: "ipv6" } },
  },
  {
    path: "/flow",
    name: "routes.flow",
    component: () => import("@/views/Flow.vue"),
  },
  {
    path: "/docker",
    name: "routes.docker",
    component: () => import("@/views/Docker.vue"),
  },
  {
    path: "/plugins",
    name: "routes.plugins",
    component: () => import("@/views/Plugins.vue"),
  },
  {
    path: "/webshell",
    name: "routes.webshell",
    component: () => import("@/views/WebShell.vue"),
  },
  {
    path: "/firewall-nat/firewall",
    name: "routes.firewall",
    component: () => import("@/views/Firewall.vue"),
  },
  ...metric_route,
  {
    path: "/geo/domain",
    name: "routes.geo-domain",
    component: () => import("@/views/GeoDomain.vue"),
  },
  {
    path: "/geo/ip",
    redirect: "/geo/domain",
  },
  {
    path: "/config",
    name: "routes.config",
    component: () => import("@/views/Config.vue"),
  },
  {
    path: "/mac-binding",
    name: "routes.mac-binding",
    component: () => import("@/views/EnrolledDevice.vue"),
  },
  {
    path: "/domains/dns-providers",
    redirect: "/domains/credentials",
  },
  {
    path: "/domains/ddns",
    name: "routes.ddns",
    component: () => import("@/views/domain/DdnsJobs.vue"),
  },
  {
    path: "/domains/cert-accounts",
    redirect: "/domains/credentials",
  },
  {
    path: "/domains/credentials",
    name: "routes.credentials",
    component: () => import("@/views/domain/Credentials.vue"),
  },
  {
    path: "/domains/certs",
    name: "routes.certs",
    component: () => import("@/views/cert/CertOrders.vue"),
  },
  {
    path: "/gateway",
    name: "routes.gateway",
    component: () => import("@/views/Gateway.vue"),
  },
  {
    path: "/about",
    name: "routes.about",
    component: () => import("@/views/About.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/error/NotFound.vue"),
  },
];

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "MainLayout",
    component: () => import("@/views/MainLayout.vue"),
    children: [...inner_zone],
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
  },
];

const router = createRouter({ history: createWebHistory(), routes });

export function isExpiredToken(token: string, now = Date.now()): boolean {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    );
    return typeof exp !== "number" || exp * 1000 <= now;
  } catch {
    return true;
  }
}

router.beforeEach((to) => {
  const token = localStorage.getItem(LANDSCAPE_TOKEN_KEY);
  if (to.path !== "/login" && (!token || isExpiredToken(token))) {
    if (token) clearLandscapeSession();
    return { path: "/login", state: { redirect: to.fullPath } };
  }
});

export default router;
