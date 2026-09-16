import { describe, expect, it } from "vitest";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import { NetDev } from "@/lib/dev";
import {
  buildInterfaceSources,
  configuredNetworkProjects,
  interfacesForCategory,
  interfacesForTab,
  resolveNetworkSettingsSelection,
} from "./network_settings";

const device = (name: string, zone: IfaceZoneType, state = "up") =>
  new NetDev({
    name,
    index: name.length,
    dev_type: "ethernet",
    dev_kind: "ether",
    dev_status: { t: state },
    carrier: state === "up",
    zone_type: zone,
    enable_in_boot: true,
  });

describe("network settings selection", () => {
  const devices = [
    device("wan0", IfaceZoneType.wan),
    device("lan0", IfaceZoneType.lan),
    device("spare0", IfaceZoneType.undefined, "down"),
  ];

  it("keeps disabled and unassigned interfaces in the all-interface tab", () => {
    expect(
      interfacesForTab(devices, "interfaces").map((item) => item.name),
    ).toEqual(["wan0", "lan0", "spare0"]);
  });

  it("does not substitute another interface for an invalid URL target", () => {
    const result = resolveNetworkSettingsSelection(devices, "lan", "wan0");
    expect(result.selected).toBeUndefined();
    expect(result.invalidIface).toBe(true);
  });

  it("uses only explicit Docker and plugin host interface mappings", () => {
    const sources = buildInterfaceSources(
      devices,
      [{ iface_name: "lan0", name: "docker-net" } as any],
      [
        {
          host_interface: "spare0",
          name: "plugin",
          network: { peer_interface: "wan0" },
        } as any,
      ],
    );
    expect(sources.get("lan0")?.kind).toBe("docker");
    expect(sources.get("spare0")?.kind).toBe("plugin");
    expect(sources.get("wan0")?.kind).toBe("physical");
    expect(
      interfacesForCategory(devices, "unassigned", sources).map(
        (item) => item.name,
      ),
    ).toEqual(["spare0"]);
  });

  it("recognizes ethernet devices as physical but not veth devices", () => {
    const ethernet = device("eno1", IfaceZoneType.wan);
    ethernet.dev_kind = "unknown";
    const veth = device("veth0", IfaceZoneType.undefined);
    veth.dev_kind = "veth";
    const sources = buildInterfaceSources([ethernet, veth], [], []);

    expect(sources.get("eno1")?.kind).toBe("physical");
    expect(sources.get("veth0")?.kind).toBe("unknown");
  });

  it("does not guess physical sources while either source request is unavailable", () => {
    expect(buildInterfaceSources(devices, [], undefined).get("wan0")).toEqual({
      kind: "unknown",
      available: false,
    });
  });

  it("keeps configured roots and Docker bridges but excludes other managed interfaces and bridge members", () => {
    const bridge = device("br0", IfaceZoneType.lan, "down");
    bridge.dev_kind = "bridge";
    const dockerBridge = device("docker0", IfaceZoneType.undefined);
    dockerBridge.dev_kind = "bridge";
    const member = device("member0", IfaceZoneType.undefined);
    member.controller_id = bridge.index;
    const all = [...devices, bridge, dockerBridge, member];
    const sources = buildInterfaceSources(
      all,
      [
        { iface_name: "lan0", name: "docker" } as any,
        { iface_name: "docker0", name: "docker" } as any,
      ],
      [],
    );
    expect(
      configuredNetworkProjects(all, sources).map((item) => item.name),
    ).toEqual(["wan0", "br0", "docker0"]);
  });
});
