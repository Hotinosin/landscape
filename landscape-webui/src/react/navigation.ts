export type NavigationItem = {
  key: string;
  label: string;
  icon: string;
  path?: string;
  children?: Omit<NavigationItem, "icon" | "children">[];
};

export const navigation: NavigationItem[] = [
  { key: "dashboard", label: "routes.dashboard", icon: "⌂", path: "/" },
  { key: "flow", label: "routes.flow", icon: "⇄", path: "/flow" },
  {
    key: "devices",
    label: "routes.mac-binding",
    icon: "▣",
    path: "/mac-binding",
  },
  {
    key: "network-status",
    label: "routes.network-status",
    icon: "◉",
    children: [
      { key: "dhcp-v4", label: "routes.dhcp-v4", path: "/network/dhcp-v4" },
      { key: "ipv6-pd", label: "routes.ipv6-pd", path: "/network/ipv6-pd" },
      { key: "ipv6-ra", label: "routes.ipv6-ra", path: "/network/ipv6-ra" },
    ],
  },
  {
    key: "firewall-nat",
    label: "routes.firewall-nat",
    icon: "⬡",
    children: [
      {
        key: "firewall",
        label: "routes.firewall",
        path: "/firewall-nat/firewall",
      },
      { key: "nat-v4", label: "routes.nat-v4", path: "/firewall-nat/nat/v4" },
      { key: "nat-v6", label: "routes.nat-v6", path: "/firewall-nat/nat/v6" },
    ],
  },
  {
    key: "dns",
    label: "routes.dns",
    icon: "◎",
    children: [
      {
        key: "dns-upstream",
        label: "routes.dns-upstream",
        path: "/dns/upstream",
      },
      {
        key: "dns-redirect",
        label: "routes.dns-redirect",
        path: "/dns/redirect",
      },
    ],
  },
  { key: "geo", label: "routes.geo", icon: "◍", path: "/geo/domain" },
  {
    key: "domains",
    label: "routes.domains",
    icon: "◇",
    children: [
      {
        key: "dns-providers",
        label: "routes.dns-provider-profiles",
        path: "/domains/dns-providers",
      },
      { key: "ddns", label: "routes.ddns", path: "/domains/ddns" },
      {
        key: "cert-accounts",
        label: "routes.cert-accounts",
        path: "/domains/cert-accounts",
      },
      { key: "certs", label: "routes.certs", path: "/domains/certs" },
    ],
  },
  { key: "gateway", label: "routes.gateway", icon: "⇥", path: "/gateway" },
  { key: "docker", label: "routes.docker", icon: "▤", path: "/docker" },
  { key: "plugins", label: "routes.plugins", icon: "◆", path: "/plugins" },
  {
    key: "metrics",
    label: "routes.metric-group",
    icon: "▥",
    children: [
      { key: "dns-metric", label: "routes.dns-metric", path: "/metrics/dns" },
      {
        key: "connect-live",
        label: "routes.connect-live",
        path: "/metrics/conn/live",
      },
      {
        key: "connect-iface",
        label: "routes.connect-iface",
        path: "/metrics/conn/iface",
      },
      {
        key: "connect-src",
        label: "routes.connect-src",
        path: "/metrics/conn/src",
      },
      {
        key: "connect-dst",
        label: "routes.connect-dst",
        path: "/metrics/conn/dst",
      },
      {
        key: "connect-history",
        label: "routes.connect-history",
        path: "/metrics/conn/history",
      },
    ],
  },
  { key: "webshell", label: "routes.webshell", icon: ">_", path: "/webshell" },
  { key: "config", label: "routes.config", icon: "⚙", path: "/config" },
];

export const pendingRoutes = [
  ...navigation.flatMap((item) =>
    item.children
      ? item.children.map(({ path, label }) => [path!.slice(1), label] as const)
      : item.path === "/" || !item.path
        ? []
        : [[item.path.slice(1), item.label] as const],
  ),
  ["metrics/conn/history-src", "routes.connect-history-src"],
  ["metrics/conn/history-dst", "routes.connect-history-dst"],
].filter(
  ([path]) => path !== "dns/upstream" && path !== "dns/redirect",
) as ReadonlyArray<readonly [string, string]>;

export function menuPath(pathname: string) {
  if (
    pathname === "/metrics/conn/history-src" ||
    pathname === "/metrics/conn/history-dst"
  ) {
    return "/metrics/conn/history";
  }
  return pathname;
}

export function activeGroup(pathname: string) {
  const active = menuPath(pathname);
  return navigation.find((item) =>
    item.children?.some(({ path }) => path === active),
  )?.key;
}
