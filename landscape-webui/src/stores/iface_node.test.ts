import { DevStateType, NetDev } from "@/lib/dev";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import { describe, expect, it } from "vitest";

import { get_visible_devices } from "./iface_node";

function device(name: string, state: DevStateType, controller_id?: number) {
  return new NetDev({
    name,
    index: name.length,
    dev_type: "ethernet",
    dev_kind: name === "mi-br0" ? "bridge" : "ethernet",
    dev_status: { t: state },
    controller_id,
    carrier: state === DevStateType.Up,
    zone_type: IfaceZoneType.undefined,
    enable_in_boot: true,
  });
}

describe("topology connected filter", () => {
  it("keeps an up bridge and its up child while excluding unknown devices", () => {
    const visible = get_visible_devices(
      [
        device("mi-br0", DevStateType.Up),
        device("veth0", DevStateType.Up, 6),
        device("wwp0", DevStateType.Unknown),
      ],
      true,
    );

    expect(visible.map(({ name }) => name)).toEqual(["mi-br0", "veth0"]);
  });
});
