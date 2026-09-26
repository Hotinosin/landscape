import type { RouteRecordRaw } from "vue-router";

const metric_route: Array<RouteRecordRaw> = [
  {
    path: "/metrics/conn/live",
    name: "routes.connect-live",
    component: () => import("@/views/metric/conn/LiveMetric.vue"),
  },
  {
    path: "/metrics/conn/history",
    name: "routes.connect-history",
    component: HistoryMetric,
    meta: { capability: "metric_persistent" },
  },
  {
    path: "/metrics/conn/iface",
    name: "routes.connect-iface",
    component: () => import("@/views/metric/conn/IfaceMetric.vue"),
  },
  {
    path: "/metrics/conn/src",
    name: "routes.connect-src",
    component: () => import("@/views/metric/conn/SrcIpMetric.vue"),
  },
  {
    path: "/metrics/conn/dst",
    name: "routes.connect-dst",
    component: () => import("@/views/metric/conn/DstIpMetric.vue"),
  },
  {
    path: "/metrics/conn/history-src",
    name: "routes.connect-history-src",
    component: HistorySrcIpMetric,
    meta: { capability: "metric_persistent" },
  },
  {
    path: "/metrics/conn/history-dst",
    name: "routes.connect-history-dst",
    component: HistoryDstIpMetric,
    meta: { capability: "metric_persistent" },
  },
  {
    path: "/metrics/dns",
    name: "routes.dns-metric",
    component: DNSMetric,
    meta: { capability: "metric_persistent" },
  },
];

export default metric_route;
