import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { LANDSCAPE_TOKEN_KEY } from "@/lib/common";

import service_status_route from "./service_status";
import metric_route from "./metric";

const inner_zone: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "routes.dashboard",
    component: () => import("@/views/Landscape.vue"),
  },
  {
    path: "/dns/redirect",
    name: "routes.dns-redirect",
    component: () => import("@/views/dns/DnsRedirect.vue"),
  },
  ...service_status_route,
  {
    path: "/dns/upstream",
    name: "routes.dns-upstream",
    component: () => import("@/views/dns/DnsUpstream.vue"),
  },
  {
    path: "/firewall-nat/nat/v4",
    name: "routes.nat-v4",
    component: () => import("@/views/StaticNatMappingV4.vue"),
  },
  {
    path: "/firewall-nat/nat/v6",
    name: "routes.nat-v6",
    component: () => import("@/views/StaticNatMappingV6.vue"),
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
    name: "routes.dns-provider-profiles",
    component: () => import("@/views/domain/DnsProviderProfiles.vue"),
  },
  {
    path: "/domains/ddns",
    name: "routes.ddns",
    component: () => import("@/views/domain/DdnsJobs.vue"),
  },
  {
    path: "/domains/cert-accounts",
    name: "routes.cert-accounts",
    component: () => import("@/views/cert/CertAccounts.vue"),
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

router.beforeEach((to) => {
  if (to.path !== "/login" && !localStorage.getItem(LANDSCAPE_TOKEN_KEY)) {
    return { path: "/login", state: { redirect: to.fullPath } };
  }
});

export default router;
