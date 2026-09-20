import { flushPromises, shallowMount, type VueWrapper } from "@vue/test-utils";
import { createPinia, disposePinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import { NetDev } from "@/lib/dev";
import { useIfaceNodeStore } from "@/stores/iface_node";
import { useNATConfigStore } from "@/stores/status_nats";
import NetworkSettings from "./NetworkSettings.vue";

const mocks = vi.hoisted(() => ({
  ifaces: vi.fn(),
  replace: vi.fn(),
  query: {} as Record<string, string>,
  dockerNetworks: vi.fn(),
  plugins: vi.fn(),
  push: vi.fn(),
  changeBoot: vi.fn(),
  changeStatus: vi.fn(),
  changeZone: vi.fn(),
  runtimeIps: vi.fn(),
  pppdConfigs: vi.fn(),
  ipConfig: vi.fn(),
  dhcpConfig: vi.fn(),
  dialogWarning: vi.fn(),
  dialogInfo: vi.fn(),
}));

vi.mock("@/api/network", async (original) => ({
  ...(await original<typeof import("@/api/network")>()),
  ifaces: mocks.ifaces,
  change_iface_boot_status: mocks.changeBoot,
  change_iface_status: mocks.changeStatus,
  change_zone: mocks.changeZone,
  get_runtime_ip_addresses: mocks.runtimeIps,
}));
vi.mock("@/api/docker/network", () => ({
  get_all_docker_networks: mocks.dockerNetworks,
}));
vi.mock("@/api/plugins", () => ({ listPlugins: mocks.plugins }));
vi.mock("@/api/service_pppd", () => ({
  get_all_iface_pppd_config: mocks.pppdConfigs,
}));
vi.mock("@/api/service_ipconfig", () => ({
  get_iface_server_config: mocks.ipConfig,
}));
vi.mock("@/api/service_dhcp_v4", () => ({
  get_iface_dhcp_v4_config: mocks.dhcpConfig,
}));
vi.mock("naive-ui", async (original) => ({
  ...(await original<typeof import("naive-ui")>()),
  useDialog: () => ({
    error: mocks.dialogWarning,
    warning: vi.fn(),
    info: mocks.dialogInfo,
  }),
  useMessage: () => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));
vi.mock("vue-router", async (original) => ({
  ...(await original<typeof import("vue-router")>()),
  useRoute: () => ({ query: mocks.query }),
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));
vi.mock("vue-i18n", async (original) => ({
  ...(await original<typeof import("vue-i18n")>()),
  useI18n: () => ({ t: (key: string) => key }),
}));

const device = (name: string, zone: IfaceZoneType = IfaceZoneType.wan) =>
  new NetDev({
    name,
    index: name === "wanA" ? 1 : 2,
    dev_type: "ethernet",
    dev_kind: "ether",
    dev_status: { t: "up" },
    carrier: true,
    zone_type: zone,
    enable_in_boot: true,
  });

let pinia: ReturnType<typeof createPinia>;
let wrapper: VueWrapper;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  mocks.query = {};
  mocks.ifaces.mockResolvedValue([device("wanA"), device("wanB")]);
  mocks.dockerNetworks.mockResolvedValue([]);
  mocks.plugins.mockResolvedValue([]);
  mocks.runtimeIps.mockResolvedValue({
    wanA: [
      {
        address: "192.0.2.10",
        prefix_length: 24,
        is_permanent: false,
      },
    ],
  });
  mocks.pppdConfigs.mockResolvedValue([]);
  mocks.ipConfig.mockImplementation(async (name: string) => ({
    iface_name: name,
    ip_model: { t: "dhcpclient" },
  }));
  mocks.dhcpConfig.mockResolvedValue({
    config: { server_ip_addr: "192.168.1.1" },
  });
  mocks.changeBoot.mockResolvedValue(undefined);
  mocks.changeStatus.mockResolvedValue(undefined);
  mocks.changeZone.mockResolvedValue(undefined);
  vi.clearAllMocks();
});

afterEach(() => {
  wrapper?.unmount();
  disposePinia(pinia);
});

async function mountPage() {
  wrapper = shallowMount(NetworkSettings, {
    global: {
      stubs: {
        NAlert: { template: "<div><slot /></div>" },
        NButton: { template: "<button><slot /></button>" },
        NH2: { template: "<h2><slot /></h2>" },
      },
    },
  });
  await flushPromises();
  return wrapper.vm as any;
}

describe("NetworkSettings", () => {
  it("opens a valid URL target but never substitutes an invalid interface", async () => {
    mocks.query = { tab: "wan", iface: "wanB", section: "ip_config" };
    const vm = await mountPage();
    expect(vm.selected.name).toBe("wanB");
    expect(vm.configOpen).toBe(true);

    wrapper.unmount();
    mocks.query = { tab: "wan", iface: "missing", section: "ip_config" };
    await mountPage();
    expect((wrapper.vm as any).selected).toBeUndefined();
    expect(wrapper.find("ip-config-modal-stub").exists()).toBe(false);
    expect((wrapper.vm as any).invalidLocation).toBe(true);
  });

  it("switches the combined configuration page to the selected interface", async () => {
    mocks.query = { tab: "wan", iface: "wanA", section: "ip_config" };
    const vm = await mountPage();
    expect(vm.selected.name).toBe("wanA");
    vm.openConfig(vm.devices.find((item: NetDev) => item.name === "wanB"));
    await flushPromises();
    expect(vm.selected.name).toBe("wanB");
    expect(vm.configOpen).toBe(true);
  });

  it("renders the relationship map and configured-project table without the old topology panel", async () => {
    await mountPage();
    expect(wrapper.find('[data-testid="interface-map"]').exists()).toBe(true);
    expect(wrapper.find("topology-detail-panel-stub").exists()).toBe(false);
    expect(wrapper.find("standard-data-table-stub").exists()).toBe(true);
  });

  it("groups LAN bridges with LAN in the WAN / LAN view", async () => {
    const bridge = new NetDev({
      name: "br-lan",
      index: 3,
      dev_type: "bridge",
      dev_kind: "bridge",
      dev_status: { t: "up" },
      carrier: true,
      zone_type: IfaceZoneType.lan,
      enable_in_boot: true,
    });
    mocks.ifaces.mockResolvedValueOnce([device("wanA"), bridge]);
    const vm = await mountPage();
    expect(
      vm.projectGroups.map((group: { type: string }) => group.type),
    ).toEqual(["wan", "lan"]);
    expect(
      vm.projectGroups
        .find((group: { type: string }) => group.type === "lan")
        .items.map((item: NetDev) => item.name),
    ).toContain("br-lan");
  });

  it("shows managed and unassigned interfaces only in the map", async () => {
    const unassigned = device("spare0", IfaceZoneType.undefined);
    const managed = device("docker-host", IfaceZoneType.lan);
    mocks.ifaces.mockResolvedValueOnce([device("wanA"), unassigned, managed]);
    mocks.dockerNetworks.mockResolvedValueOnce([
      { iface_name: "docker-host", name: "app-net" },
    ]);
    const vm = await mountPage();
    expect(vm.devices.map((item: NetDev) => item.name)).toEqual(
      expect.arrayContaining(["spare0", "docker-host"]),
    );
    expect(wrapper.get("net-flow-stub").attributes("summary")).toBeDefined();
    expect(wrapper.get(".network-settings__projects").text()).not.toContain(
      "spare0",
    );
    expect(wrapper.get(".network-settings__projects").text()).not.toContain(
      "docker-host",
    );

    vm.viewMode = "interface";
    await flushPromises();
    expect(
      vm.projectGroups.map((group: { type: string }) => group.type),
    ).toEqual(["bridge", "interface"]);
    expect(
      vm.projectGroups.flatMap((group: { items: NetDev[] }) =>
        group.items.map((item) => item.name),
      ),
    ).toContain("spare0");
    expect(
      vm.projectGroups.flatMap((group: { items: NetDev[] }) =>
        group.items.map((item) => item.name),
      ),
    ).not.toContain("docker-host");
  });

  it("shows a bridge member with its inherited effective zone", async () => {
    const bridge = new NetDev({
      name: "br-lan",
      index: 3,
      dev_type: "bridge",
      dev_kind: "bridge",
      dev_status: { t: "up" },
      carrier: true,
      zone_type: IfaceZoneType.lan,
      enable_in_boot: true,
    });
    const member = device("member0", IfaceZoneType.undefined);
    member.controller_id = bridge.index;
    mocks.ifaces.mockResolvedValueOnce([bridge, member]);
    const vm = await mountPage();

    expect(vm.effectiveZone(member)).toBe(IfaceZoneType.lan);
    expect(vm.parentBridge(member).name).toBe("br-lan");

    vm.viewMode = "interface";
    vm.openConfig(member);
    await flushPromises();
    expect(vm.selectedParentBridge.name).toBe("br-lan");
  });

  it("separates network service tabs from interface setting tabs", async () => {
    const vm = await mountPage();
    vm.openConfig(vm.devices[0]);
    await flushPromises();
    expect(vm.activeConfigTab).toBe("ipv4");
    expect(vm.visibleColumns).toHaveLength(vm.projectColumns.length);

    vm.configOpen = false;
    vm.viewMode = "interface";
    vm.openConfig(vm.devices[0]);
    await flushPromises();
    expect(vm.activeConfigTab).toBe("general");
    expect(
      vm.visibleColumns.map((column: { key: string }) => column.key),
    ).toEqual(["name", "mac", "zone_type", "related", "actions"]);
  });

  it("starts a first WAN with the existing configuration editors and safe defaults", async () => {
    const spare = device("spare0", IfaceZoneType.undefined);
    mocks.ifaces.mockResolvedValueOnce([spare]);
    const vm = await mountPage();

    vm.startCreate("wan");
    vm.networkCreateIface = spare.index;
    await vm.continueCreateNetwork();

    expect(vm.selected.name).toBe("spare0");
    expect(vm.draftRole).toBe(IfaceZoneType.wan);
    expect(vm.firstWanPreset).toBe(true);
    expect(vm.activeConfigTab).toBe("ipv4");
    expect(vm.dirtyEditors).toEqual(
      expect.arrayContaining(["ip_config", "nat", "firewall", "route_wan"]),
    );
  });

  it("reuses the bridge-member options for WAN and LAN creation", async () => {
    const vm = await mountPage();
    vm.startCreate("wan");

    expect(vm.createMemberOptions).toHaveLength(2);
    expect(
      vm.createMemberOptions.every(
        (item: { disabled: boolean }) => item.disabled,
      ),
    ).toBe(true);
  });

  it("allows an unassigned bridge to become a LAN", async () => {
    const bridge = new NetDev({
      name: "br-new",
      index: 3,
      dev_type: "bridge",
      dev_kind: "bridge",
      dev_status: { t: "up" },
      carrier: true,
      zone_type: IfaceZoneType.undefined,
      enable_in_boot: true,
    });
    mocks.ifaces.mockResolvedValueOnce([bridge]);
    const vm = await mountPage();

    expect(vm.createMemberOptions).toContainEqual({
      label: "br-new",
      value: 3,
      disabled: false,
    });
  });

  it("uses embedded presentation for PPPD on the combined page", async () => {
    const vm = await mountPage();
    vm.openConfig(vm.devices[0]);
    await flushPromises();
    expect(vm.hasService("pppd")).toBe(true);
  });

  it("associates PPPD runtime addresses with its attached interface", async () => {
    mocks.runtimeIps.mockResolvedValueOnce({
      "ppp-wanA": [
        {
          address: "198.51.100.8",
          prefix_length: 32,
          is_permanent: false,
        },
      ],
    });
    mocks.pppdConfigs.mockResolvedValueOnce([
      { attach_iface_name: "wanA", iface_name: "ppp-wanA" },
    ]);
    const vm = await mountPage();

    expect(vm.addressesFor(vm.devices[0])).toMatchObject([
      {
        address: "198.51.100.8",
        prefix_length: 32,
        ifaceName: "ppp-wanA",
      },
    ]);
  });

  it("warns before closing dirty basic settings and refreshes after save", async () => {
    const vm = await mountPage();
    vm.openConfig(vm.devices[0]);
    vm.draftBoot = false;
    vm.requestCloseConfig();
    expect(mocks.dialogWarning).toHaveBeenCalledOnce();
    await vm.saveBasic();
    expect(mocks.changeBoot).toHaveBeenCalledWith("wanA", false);
    expect(mocks.ifaces).toHaveBeenCalledTimes(2);
    mocks.dialogWarning.mockClear();
    vm.requestCloseConfig();
    expect(mocks.dialogWarning).not.toHaveBeenCalled();
  });

  it("removes a WAN project by returning its interface to unassigned", async () => {
    const vm = await mountPage();
    vm.openConfig(vm.devices[0]);
    vm.removeNetworkProject();

    const confirmation = mocks.dialogWarning.mock.calls[0][0];
    await confirmation.onPositiveClick();

    expect(mocks.changeZone).toHaveBeenCalledWith({
      iface_name: "wanA",
      zone: IfaceZoneType.undefined,
    });
    expect(vm.configOpen).toBe(false);
  });

  it("confirms the changed modules and closes after saving", async () => {
    const vm = await mountPage();
    vm.openConfig(vm.devices[0]);
    vm.draftBoot = false;

    vm.requestSaveConfiguration();
    expect(mocks.dialogInfo).toHaveBeenCalledOnce();
    const options = mocks.dialogInfo.mock.calls[0][0];
    const summary = JSON.stringify(options.content());
    expect(summary).toContain("network.settings.boot");
    expect(summary).toContain("network.settings.disabled");

    await options.onPositiveClick();
    expect(mocks.changeBoot).toHaveBeenCalledWith("wanA", false);
    expect(vm.configOpen).toBe(false);
  });

  it("refreshes only the saved service status and interfaces", async () => {
    const vm = await mountPage();
    const ifaceStore = useIfaceNodeStore();
    const natStore = useNATConfigStore();
    const ifaceRefresh = vi
      .spyOn(ifaceStore, "UPDATE_INFO")
      .mockResolvedValue();
    const natRefresh = vi.spyOn(natStore, "UPDATE_INFO").mockResolvedValue();
    await vm.afterSaved("nat");
    expect(ifaceRefresh).toHaveBeenCalledOnce();
    expect(natRefresh).toHaveBeenCalledOnce();
  });

  it("shows retry when the interface request fails", async () => {
    mocks.ifaces.mockRejectedValueOnce(new Error("offline"));
    const vm = await mountPage();
    expect(vm.loadError).toBeInstanceOf(Error);
    mocks.ifaces.mockResolvedValueOnce([device("wanA")]);
    await vm.refresh();
    expect(vm.loadError).toBeUndefined();
    expect(mocks.ifaces).toHaveBeenCalledTimes(2);
  });

  it("keeps physical interfaces visible in interface view even when docker or plugins request rejects", async () => {
    mocks.query = { view: "interface" };
    mocks.dockerNetworks.mockRejectedValueOnce(new Error("Docker daemon down"));
    mocks.plugins.mockRejectedValueOnce(new Error("Plugins not supported"));
    const vm = await mountPage();
    const interfaceGroup = vm.projectGroups.find(
      (group: any) => group.type === "interface",
    );
    expect(interfaceGroup?.items.map((item: any) => item.name)).toEqual([
      "wanA",
      "wanB",
    ]);
  });
});
