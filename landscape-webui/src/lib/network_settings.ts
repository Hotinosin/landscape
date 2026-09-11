import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import type { LandscapeDockerNetwork } from "@/lib/docker/network";
import type { NetDev } from "@/lib/dev";

export type NetworkSettingsCategory =
  "all" | "wan" | "lan" | "bridge" | "docker" | "unassigned";
export type NetworkSettingsDetailTab = "info" | "config";
export type InterfaceSource = {
  kind: "physical" | "system" | "docker" | "unknown";
  owner?: string;
  available: boolean;
};
export type NetworkProjectFilter = "all" | "wan" | "lan" | "bridge";

export const networkSettingsCategories: NetworkSettingsCategory[] = [
  "all",
  "wan",
  "lan",
  "bridge",
  "docker",
  "unassigned",
];

export function resolveCategory(value: unknown): NetworkSettingsCategory {
  if (value === "interfaces") return "all";
  return networkSettingsCategories.includes(value as NetworkSettingsCategory)
    ? (value as NetworkSettingsCategory)
    : "all";
}

export function buildInterfaceSources(
  devices: NetDev[],
  dockerNetworks: LandscapeDockerNetwork[] | undefined,
) {
  const dockerByIface = new Map(
    dockerNetworks?.map((item) => [item.iface_name, item.name]),
  );
  const sourcesReady = dockerNetworks !== undefined;
  return new Map<string, InterfaceSource>(
    devices.map((device) => {
      const docker = dockerByIface.get(device.name);
      if (docker)
        return [
          device.name,
          { kind: "docker", owner: docker, available: true },
        ];
      if (device.dev_kind === "bridge")
        return [device.name, { kind: "system", available: true }];
      return [
        device.name,
        {
          kind:
            sourcesReady && device.dev_kind === "ether"
              ? "physical"
              : "unknown",
          available: sourcesReady,
        },
      ];
    }),
  );
}

export function interfacesForCategory(
  devices: NetDev[],
  category: NetworkSettingsCategory,
  sources = new Map<string, InterfaceSource>(),
) {
  const items = devices.filter((device) => device.dev_type !== "Loopback");
  if (category === "all") return items;
  if (category === "wan")
    return items.filter((device) => device.zone_type === IfaceZoneType.wan);
  if (category === "lan")
    return items.filter((device) => device.zone_type === IfaceZoneType.lan);
  if (category === "bridge")
    return items.filter((device) => device.dev_kind === "bridge");
  if (category === "unassigned")
    return items.filter(
      (device) => device.zone_type === IfaceZoneType.undefined,
    );
  return items.filter((device) => sources.get(device.name)?.kind === category);
}

export function configuredNetworkProjects(
  devices: NetDev[],
  sources: Map<string, InterfaceSource>,
  filter: NetworkProjectFilter = "all",
) {
  return devices.filter((device) => {
    const source = sources.get(device.name);
    if (device.dev_type === "Loopback" || device.controller_id !== undefined)
      return false;
    if (source?.kind === "docker" && device.dev_kind !== "bridge") return false;
    if (
      device.zone_type === IfaceZoneType.undefined &&
      device.dev_kind !== "bridge"
    )
      return false;
    if (filter === "wan") return device.zone_type === IfaceZoneType.wan;
    if (filter === "lan") return device.zone_type === IfaceZoneType.lan;
    if (filter === "bridge") return device.dev_kind === "bridge";
    return true;
  });
}

export function relatedInterfaces(device: NetDev, devices: NetDev[]) {
  if (device.dev_kind === "bridge") {
    return devices
      .filter((item) => item.controller_id === device.index)
      .map((item) => item.name);
  }
  if (device.controller_id !== undefined) {
    return devices
      .filter((item) => item.index === device.controller_id)
      .map((item) => item.name);
  }
  return [];
}

export function resolveNetworkSettingsSelection(
  devices: NetDev[],
  requestedCategory: unknown,
  requestedIface: unknown,
  sources = new Map<string, InterfaceSource>(),
) {
  const category = resolveCategory(requestedCategory);
  const candidates = interfacesForCategory(devices, category, sources);
  const requested = typeof requestedIface === "string" ? requestedIface : "";
  const selected = candidates.find((device) => device.name === requested);
  const invalidIface = Boolean(requested && !selected);
  return {
    category,
    candidates,
    selected: invalidIface ? undefined : (selected ?? candidates[0]),
    invalidIface,
  };
}

export type NetworkSettingsTab = "wan" | "lan" | "interfaces";
export const networkSettingsTabs: NetworkSettingsTab[] = [
  "wan",
  "lan",
  "interfaces",
];
export const interfacesForTab = (devices: NetDev[], tab: NetworkSettingsTab) =>
  interfacesForCategory(devices, resolveCategory(tab));
