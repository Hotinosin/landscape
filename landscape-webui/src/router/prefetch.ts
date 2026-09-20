const prefetched = new Set<string>();

const routeLoaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/views/Landscape.vue"),
  "/network/settings": () => import("@/views/NetworkSettings.vue"),
  "/network/allocations": () => import("@/views/NetworkAllocations.vue"),
  "/mac-binding": () => import("@/views/EnrolledDevice.vue"),
  "/flow": () => import("@/views/Flow.vue"),
  "/dns/config": () => import("@/views/dns/DnsUpstream.vue"),
  "/dns/redirect": () => import("@/views/dns/DnsRedirect.vue"),
  "/geo/domain": () => import("@/views/GeoDomain.vue"),
  "/firewall-nat/firewall": () => import("@/views/Firewall.vue"),
  "/firewall-nat/port-mapping": () => import("@/views/PortMappings.vue"),
  "/gateway": () => import("@/views/Gateway.vue"),
  "/docker": () => import("@/views/Docker.vue"),
  "/plugins": () => import("@/views/Plugins.vue"),
  "/webshell": () => import("@/views/WebShell.vue"),
  "/config": () => import("@/views/Config.vue"),
  "/metrics/conn/live": () => import("@/views/metric/conn/LiveMetric.vue"),
  "/metrics/conn/history": () => import("@/views/metric/conn/HistoryMetric.vue"),
  "/metrics/dns": () => import("@/views/metric/DNSMetric.vue"),
  "/domains/ddns": () => import("@/views/domain/DdnsJobs.vue"),
  "/domains/credentials": () => import("@/views/domain/Credentials.vue"),
  "/domains/certs": () => import("@/views/cert/CertOrders.vue"),
};

export function prefetchRoute(path: string): void {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (prefetched.has(normalized)) return;
  const loader = routeLoaders[normalized];
  if (loader) {
    prefetched.add(normalized);
    void loader().catch(() => {
      prefetched.delete(normalized);
    });
  }
}
