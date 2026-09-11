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
  ipConfig: vi.fn(),
  dhcpConfig: vi.fn(),
  dialogWarning: vi.fn(),
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
vi.mock("@/api/service_ipconfig", () => ({
  get_iface_server_config: mocks.ipConfig,
}));
vi.mock("@/api/service_dhcp_v4", () => ({
  get_iface_dhcp_v4_config: mocks.dhcpConfig,
}));
vi.mock("naive-ui", async (original) => ({
  ...(await original<typeof import("naive-ui")>()),
  useDialog: () => ({ error: mocks.dialogWarning, warning: vi.fn() }),
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
  mocks.runtimeIps.mockResolvedValue({ wanA: "192.0.2.10" });
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

  it("groups LAN bridges with LAN instead of creating a bridge table", async () => {
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
    ).toEqual(["wan", "lan", "other"]);
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
  });

  it("uses embedded presentation for PPPD on the combined page", async () => {
    const vm = await mountPage();
    vm.openConfig(vm.devices[0]);
    await flushPromises();
    expect(vm.hasService("pppd")).toBe(true);
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
});
