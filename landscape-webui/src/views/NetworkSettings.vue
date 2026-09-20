<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { Renew } from "@vicons/carbon";
import {
  NButton,
  NFlex,
  NTag,
  NTooltip,
  useDialog,
  useMessage,
  type DataTableColumns,
  type SelectRenderTag,
} from "naive-ui";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import { DevStateType, WifiMode, WLANTypeTag, type NetDev } from "@/lib/dev";
import {
  ServiceExhibitSwitch,
  get_service_status_tag_type,
  type ServiceStatus,
} from "@/lib/services";
import {
  buildInterfaceSources,
  configuredNetworkProjects,
  relatedInterfaces,
  resolveCategory,
} from "@/lib/network_settings";
import { getBridgeAttachIssue, type BridgeAttachIssue } from "@/lib/topology";
import { get_all_docker_networks } from "@/api/docker/network";
import { listPlugins } from "@/api/plugins";
import { get_iface_server_config } from "@/api/service_ipconfig";
import { get_iface_dhcp_v4_config } from "@/api/service_dhcp_v4";
import {
  add_controller,
  change_iface_boot_status,
  change_iface_status,
  change_wifi_mode,
  change_zone,
  create_bridge,
  delete_bridge,
  get_runtime_ip_addresses,
  type RuntimeIpAddress,
} from "@/api/network";
import { get_all_iface_pppd_config } from "@/api/service_pppd";
import { stop_and_del_iface_wifi } from "@/api/service_wifi";
import type { PPPDServiceConfig } from "@/lib/pppd";
import { useIfaceNodeStore } from "@/stores/iface_node";
import { useIpConfigStore } from "@/stores/status_ipconfig";
import { useDHCPv4ConfigStore } from "@/stores/status_dhcp_v4";
import { useIPv6PDStore } from "@/stores/status_ipv6pd";
import { useLanIPv6Store } from "@/stores/status_lan_ipv6";
import { useNATConfigStore } from "@/stores/status_nats";
import { useFirewallConfigStore } from "@/stores/status_firewall";
import { useMSSClampConfigStore } from "@/stores/status_mss_clamp";
import { useRouteLanConfigStore } from "@/stores/status_route_lan";
import { useRouteWanConfigStore } from "@/stores/status_route_wan";
import { useWifiConfigStore } from "@/stores/status_wifi";
import { useFrontEndStore } from "@/stores/front_end_config";
import { IfaceIpMode } from "@/lib/service_ipconfig";
import IfaceDisableGuardModal from "@/components/iface/IfaceDisableGuardModal.vue";
import NetFlow from "@/components/topology/NetFlow.vue";
import CarrierStatusDot from "@/components/topology/CarrierStatusDot.vue";

const IfaceCpuSoftBalance = defineAsyncComponent(
  () => import("@/components/iface/IfaceCpuSoftBalance.vue"),
);
const IpConfigModal = defineAsyncComponent(
  () => import("@/components/ipconfig/IpConfigModal.vue"),
);
const PPPDServiceListDrawer = defineAsyncComponent(
  () => import("@/components/pppd/PPPDServiceListDrawer.vue"),
);
const DHCPv4ServiceEditModal = defineAsyncComponent(
  () => import("@/components/dhcp_v4/DHCPv4ServiceEditModal.vue"),
);
const IPv6PDEditModal = defineAsyncComponent(
  () => import("@/components/ipv6pd/IPv6PDEditModal.vue"),
);
const LanIPv6EditModal = defineAsyncComponent(
  () => import("@/components/lan_ipv6/LanIPv6EditModal.vue"),
);
const NATEditModal = defineAsyncComponent(
  () => import("@/components/nat/NATEditModal.vue"),
);
const FirewallServiceEditModal = defineAsyncComponent(
  () => import("@/components/firewall/FirewallServiceEditModal.vue"),
);
const MSSClampServiceEditModal = defineAsyncComponent(
  () => import("@/components/mss_clamp/MSSClampServiceEditModal.vue"),
);
const RouteLanServiceEditModal = defineAsyncComponent(
  () => import("@/components/route/lan/RouteLanServiceEditModal.vue"),
);
const RouteWanServiceEditModal = defineAsyncComponent(
  () => import("@/components/route/wan/RouteWanServiceEditModal.vue"),
);
const WifiServiceEditModal = defineAsyncComponent(
  () => import("@/components/wifi/WifiServiceEditModal.vue"),
);
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";
import EditButton from "@/components/common/EditButton.vue";
import MacAddress from "@/components/common/MacAddress.vue";
import ConfigModal from "@/components/common/ConfigModal.vue";
import Notice from "@/components/common/Notice.vue";
import { useNeutralDialogButtonProps } from "@/composables/useNeutralDialogButtonProps";

type Editor =
  | "ip_config"
  | "pppd"
  | "dhcp_v4"
  | "ipv6pd"
  | "lan_ipv6"
  | "nat"
  | "firewall"
  | "mss_clamp"
  | "route_lan"
  | "route_wan"
  | "wifi";
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const neutralButtonProps = useNeutralDialogButtonProps();
const message = useMessage();
provide("app-modal-depth", 2);
const ifaceStore = useIfaceNodeStore();
const frontEndStore = useFrontEndStore();
const statusStores = {
  ip_config: useIpConfigStore(),
  dhcp_v4: useDHCPv4ConfigStore(),
  ipv6pd: useIPv6PDStore(),
  lan_ipv6: useLanIPv6Store(),
  nat: useNATConfigStore(),
  firewall: useFirewallConfigStore(),
  mss_clamp: useMSSClampConfigStore(),
  route_lan: useRouteLanConfigStore(),
  route_wan: useRouteWanConfigStore(),
  wifi: useWifiConfigStore(),
};
const loading = ref(false);
const loadError = ref<unknown>();
const dockerNetworks =
  ref<Awaited<ReturnType<typeof get_all_docker_networks>>>();
const plugins = ref<Awaited<ReturnType<typeof listPlugins>>>();
const sourceErrors = ref<string[]>([]);
const viewMode = ref<"network" | "interface">("network");
const selectedName = ref("");
const configOpen = ref(false);
const operationLoading = ref(false);
const activeConfigTab = ref("general");
const cpuEditor = ref<{ save: () => Promise<void> } | null>(null);
const cpuDirty = ref(false);
const createOpen = ref(false);
const networkCreateOpen = ref(false);
const networkCreateRole = ref<IfaceZoneType | null>(null);
const networkCreateIface = ref<number | null>(null);
const creatingNetwork = ref(false);
const firstWanPreset = ref(false);
const createName = ref("");
const createMembers = ref<number[]>([]);
const runtimeIpAddresses = ref<Record<string, RuntimeIpAddress[]>>({});
const pppdConfigs = ref<PPPDServiceConfig[]>([]);
let runtimeAddressRefreshRunning = false;
let runtimeAddressRefreshTimer: ReturnType<typeof setInterval> | undefined;
const projectDetails = ref<Record<string, { access: string }>>({});
const invalidLocation = ref(false);
const draftEnabled = ref(false);
const draftBoot = ref(false);
const draftRole = ref<IfaceZoneType>(IfaceZoneType.undefined);
const savedEnabled = ref(false);
const savedBoot = ref(false);
const savedRole = ref<IfaceZoneType>(IfaceZoneType.undefined);
const draftWifiMode = ref(WifiMode.Undefined);
const savedWifiMode = ref(WifiMode.Undefined);
type SummaryItem = { label: string; value: string };
type EmbeddedEditor = {
  save: () => Promise<void>;
  getSummary?: () => SummaryItem[];
};
const embeddedEditors = new Map<Editor, EmbeddedEditor>();
const dirtyEditors = ref<Editor[]>([]);
const editorRef = (key: Editor) => (instance: unknown) => {
  if (instance) embeddedEditors.set(key, instance as EmbeddedEditor);
  else embeddedEditors.delete(key);
};
function markEditorDirty(key: Editor) {
  if (!dirtyEditors.value.includes(key)) dirtyEditors.value.push(key);
}
const disableGuard = ref<InstanceType<typeof IfaceDisableGuardModal> | null>(
  null,
);
const sources = computed(() =>
  buildInterfaceSources(
    ifaceStore.net_devs,
    dockerNetworks.value,
    plugins.value,
  ),
);
const dockerIfaces = computed(
  () =>
    new Set(
      [...sources.value]
        .filter(([, source]) => source.kind === "docker")
        .map(([name]) => name),
    ),
);
const devices = computed(() =>
  ifaceStore.net_devs.filter((item) => item.dev_type !== "Loopback"),
);
const projects = computed(() =>
  viewMode.value === "network"
    ? configuredNetworkProjects(devices.value, sources.value)
    : devices.value.filter((item) => {
        const source = sources.value.get(item.name);
        return (
          source?.kind === "physical" ||
          (source?.kind === "system" && item.dev_kind === "bridge")
        );
      }),
);
const projectGroups = computed(() => {
  const types =
    viewMode.value === "network"
      ? (["wan", "lan"] as const)
      : (["bridge", "interface"] as const);
  return types.map((type) => ({
    type,
    label: t(`network.settings.project_${type}`),
    items: projects.value.filter((item) =>
      viewMode.value === "network"
        ? item.zone_type === type
        : type === "bridge"
          ? item.dev_kind === "bridge"
          : item.dev_kind !== "bridge",
    ),
  }));
});
const selected = computed(() =>
  devices.value.find((item) => item.name === selectedName.value),
);
function addressesFor(device: NetDev) {
  const ifaceNames = [
    device.name,
    ...pppdConfigs.value
      .filter((config) => config.attach_iface_name === device.name)
      .map((config) => config.iface_name),
  ];
  const seen = new Set<string>();
  return ifaceNames.flatMap((ifaceName) =>
    (runtimeIpAddresses.value[ifaceName] ?? []).flatMap((address) => {
      const value = `${address.address}/${address.prefix_length}`;
      if (seen.has(value)) return [];
      seen.add(value);
      return [{ ...address, ifaceName, value }];
    }),
  );
}
const serviceDevice = computed(() =>
  selected.value && creatingNetwork.value && networkCreateRole.value
    ? { ...selected.value, zone_type: networkCreateRole.value }
    : selected.value,
);
const selectedSource = computed(() =>
  selected.value ? sources.value.get(selected.value.name) : undefined,
);
const isManaged = computed(
  () =>
    selectedSource.value?.kind === "docker" ||
    selectedSource.value?.kind === "plugin",
);
const canWriteSelected = computed(() =>
  Boolean(
    selected.value && selectedSource.value?.available && !isManaged.value,
  ),
);
const childrenOf = (device: NetDev) =>
  devices.value.filter((item) => item.controller_id === device.index);
const services = computed(() => {
  const device = serviceDevice.value;
  if (!device) return [];
  const show = new ServiceExhibitSwitch(device);
  const items: Array<{ key: Editor; label: string }> = [];
  const add = (enabled: boolean, key: Editor, label: string) => {
    if (!enabled) return;
    items.push({ key, label });
  };
  add(show.ip_config, "ip_config", t("network.settings.ip_config"));
  add(show.pppd, "pppd", t("network.settings.pppd"));
  add(show.dhcp_v4, "dhcp_v4", t("network.settings.dhcp_v4"));
  add(show.ipv6pd, "ipv6pd", t("network.settings.ipv6pd"));
  add(show.lan_ipv6, "lan_ipv6", t("network.settings.lan_ipv6"));
  add(show.nat_config, "nat", t("network.settings.nat"));
  add(show.firewall, "firewall", t("network.settings.firewall"));
  add(show.mss_clamp, "mss_clamp", t("network.settings.mss_clamp"));
  add(show.route_lan, "route_lan", t("network.settings.route_lan"));
  add(show.route_wan, "route_wan", t("network.settings.route_wan"));
  add(show.wifi, "wifi", t("network.settings.wifi"));
  return items;
});
const hasService = (key: Editor) =>
  services.value.some((item) => item.key === key);
const basicDirty = computed(() =>
  Boolean(
    selected.value &&
    (draftEnabled.value !== savedEnabled.value ||
      draftBoot.value !== savedBoot.value ||
      draftRole.value !== savedRole.value),
  ),
);
const wifiModeDirty = computed(
  () =>
    Boolean(selected.value?.wifi_info) &&
    draftWifiMode.value !== savedWifiMode.value,
);
const dirty = computed(
  () =>
    basicDirty.value ||
    wifiModeDirty.value ||
    dirtyEditors.value.length > 0 ||
    cpuDirty.value,
);
const bridgeMemberOptions = computed(() =>
  !selected.value || selected.value.dev_kind !== "bridge"
    ? []
    : devices.value
        .filter(
          (item) =>
            item.dev_kind !== "bridge" &&
            (item.controller_id === undefined ||
              item.controller_id === selected.value?.index),
        )
        .map((item) => {
          const attached = item.controller_id === selected.value!.index;
          const issue = attached
            ? undefined
            : getBridgeAttachIssue(selected.value!, item);
          return {
            label: issue
              ? `${item.name} · ${bridgeIssueLabel(issue)}`
              : item.name,
            value: item.index,
            disabled: Boolean(issue),
          };
        }),
);
function interfaceStatusTagType(
  device?: NetDev,
): "success" | "error" | "default" {
  return device ? (device.carrier ? "success" : "error") : "default";
}
function renderInterfaceStatusTag(
  name: string,
  device?: NetDev,
  handleClose?: () => void,
) {
  return h(
    NTag,
    {
      key: name,
      class: handleClose
        ? "network-settings__interface-status-tag--truncate"
        : undefined,
      size: "small",
      bordered: false,
      closable: Boolean(handleClose),
      type: interfaceStatusTagType(device),
      title: device ? `${name} · ${carrierLabel(device)}` : name,
      onClose: handleClose,
    },
    { default: () => name },
  );
}
const renderBridgeMemberTag: SelectRenderTag = ({ option, handleClose }) => {
  const device = devices.value.find((item) => item.index === option.value);
  return renderInterfaceStatusTag(
    device?.name ?? String(option.label),
    device,
    handleClose,
  );
};
const createMemberOptions = computed(() =>
  devices.value.map((item) => {
    const issue: BridgeAttachIssue | "managed_interface" | undefined = [
      "docker",
      "plugin",
    ].includes(sources.value.get(item.name)?.kind ?? "")
      ? "managed_interface"
      : item.controller_id !== undefined
        ? "device_has_parent"
        : item.zone_type !== IfaceZoneType.undefined
          ? "connect_unavailable"
          : item.wifi_info && item.wifi_info.wifi_type.t !== WLANTypeTag.Ap
            ? "wifi_client_mode_warning"
            : undefined;
    return {
      label: issue ? `${item.name} · ${bridgeIssueLabel(issue)}` : item.name,
      value: item.index,
      disabled: Boolean(issue),
    };
  }),
);
function carrierLabel(node: NetDev) {
  return t(
    node.carrier
      ? "network.settings.carrier_connected"
      : "network.settings.carrier_disconnected",
  );
}
function bridgeIssueLabel(issue: BridgeAttachIssue | "managed_interface") {
  return t(`network.settings.bridge_issue_${issue}`);
}
function interfaceTypeLabel(device: NetDev) {
  if (device.dev_kind === "bridge") return "bridge";
  if (device.dev_kind && !["unknow", "unknown"].includes(device.dev_kind)) {
    return device.dev_kind;
  }
  return device.dev_type || "—";
}
function zoneLabel(zone: IfaceZoneType) {
  return zone === IfaceZoneType.wan
    ? "WAN"
    : zone === IfaceZoneType.lan
      ? "LAN"
      : t("topology.zone.unassigned");
}
function wifiModeLabel(mode: WifiMode) {
  return t(
    mode === WifiMode.AP
      ? "wifi.ap_mode"
      : mode === WifiMode.Client
        ? "wifi.client_mode"
        : "wifi.disabled_mode",
  );
}
function parentBridge(device: NetDev) {
  return devices.value.find((item) => item.index === device.controller_id);
}
const selectedParentBridge = computed(() =>
  selected.value ? parentBridge(selected.value) : undefined,
);
function effectiveZone(device: NetDev) {
  if (device.zone_type !== IfaceZoneType.undefined) return device.zone_type;
  return parentBridge(device)?.zone_type ?? IfaceZoneType.undefined;
}
function zoneTagType(zone: IfaceZoneType) {
  return zone === IfaceZoneType.wan
    ? "warning"
    : zone === IfaceZoneType.lan
      ? "info"
      : "default";
}
function serviceStatuses(device: NetDev) {
  const show = new ServiceExhibitSwitch(device);
  const items: Array<{
    key: keyof typeof statusStores;
    label: string;
    status?: ServiceStatus;
  }> = [];
  const add = (
    enabled: boolean,
    key: keyof typeof statusStores,
    label: string,
  ) => {
    if (enabled)
      items.push({
        key,
        label,
        status: statusStores[key].GET_STATUS_BY_IFACE_NAME(device.name),
      });
  };
  add(show.ip_config, "ip_config", "IP");
  add(show.dhcp_v4, "dhcp_v4", "DHCPv4");
  add(show.ipv6pd, "ipv6pd", "IPv6 PD");
  add(show.lan_ipv6, "lan_ipv6", "LAN IPv6");
  add(show.nat_config, "nat", "NAT");
  add(show.firewall, "firewall", t("network.settings.firewall"));
  add(show.mss_clamp, "mss_clamp", "MSS");
  add(show.route_lan, "route_lan", t("network.settings.route_lan"));
  add(show.route_wan, "route_wan", t("network.settings.route_wan"));
  add(show.wifi, "wifi", "Wi-Fi");
  return items;
}
const projectColumns = computed<DataTableColumns<NetDev>>(() => [
  {
    title: t("network.settings.name_iface"),
    key: "name",
    width: 120,
    render: (item) =>
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "var(--app-space-section)",
          },
        },
        [
          h(CarrierStatusDot, {
            active: item.carrier,
            title: carrierLabel(item),
          }),
          h("div", [
            h("strong", item.name),
            h("small", interfaceTypeLabel(item)),
          ]),
        ],
      ),
  },
  {
    title: "MAC",
    key: "mac",
    width: 170,
    render: (item) => h(MacAddress, { value: item.mac || item.perm_mac }),
  },
  {
    title: t("network.settings.role"),
    key: "zone_type",
    width: 110,
    render: (item) => {
      const zone = effectiveZone(item);
      const parent = parentBridge(item);
      const inherited =
        item.zone_type === IfaceZoneType.undefined &&
        zone !== IfaceZoneType.undefined &&
        parent;
      const tag = () =>
        h(
          NTag,
          { size: "small", bordered: false, type: zoneTagType(zone) },
          {
            default: () =>
              inherited
                ? `${zoneLabel(zone)} · ${t("network.settings.inherited")}`
                : zoneLabel(zone),
          },
        );
      return inherited
        ? h(NTooltip, null, {
            trigger: tag,
            default: () =>
              t("network.settings.inherited_zone_tip", {
                name: parent.name,
              }),
          })
        : tag();
    },
  },
  {
    title: t("network.settings.access_type"),
    key: "access",
    width: 140,
    render: (item) =>
      sources.value.get(item.name)?.kind === "docker"
        ? "—"
        : projectDetails.value[item.name]?.access ||
          t("network.settings.access_unconfigured"),
  },
  {
    title: t("network.settings.related_interfaces"),
    key: "related",
    width: 210,
    render: (item) => {
      const related = relatedInterfaces(item, devices.value);
      if (!related.length) return "—";
      return h(
        NFlex,
        { size: 4 },
        {
          default: () =>
            related.map((name) => {
              const device = devices.value.find((item) => item.name === name);
              return renderInterfaceStatusTag(name, device);
            }),
        },
      );
    },
  },
  {
    title: t("network.settings.ip_address"),
    key: "ip",
    width: 290,
    render: (item) => {
      const addresses = addressesFor(item);
      if (!addresses.length) return "—";
      return h(
        NFlex,
        { vertical: true, size: 2 },
        {
          default: () =>
            addresses.map((address) =>
              h(
                "span",
                { key: `${address.ifaceName}-${address.value}` },
                `${address.ifaceName === item.name ? "" : "PPPD · "}${
                  frontEndStore.MASK_INFO(address.value) || "—"
                }`,
              ),
            ),
        },
      );
    },
  },
  {
    title: t("common.status"),
    key: "service_status",
    width: 240,
    render: (item) => {
      if (sources.value.get(item.name)?.kind === "docker") return "—";
      const statuses = serviceStatuses(item);
      return statuses.length
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
              },
            },
            {
              default: () =>
                statuses.map(({ key, label, status }) =>
                  h(
                    NTag,
                    {
                      key,
                      size: "small",
                      type: get_service_status_tag_type(status),
                      bordered: false,
                    },
                    { default: () => label },
                  ),
                ),
            },
          )
        : "—";
    },
  },
  {
    title: t("common.actions"),
    key: "actions",
    width: 88,
    render: (item) =>
      sources.value.get(item.name)?.kind === "docker"
        ? "—"
        : h(EditButton, {
            disabled: !sources.value.get(item.name)?.available,
            onClick: () => openConfig(item),
          }),
  },
]);
const visibleColumns = computed(() =>
  viewMode.value === "network"
    ? projectColumns.value
    : projectColumns.value.filter((column) =>
        "key" in column
          ? ["name", "mac", "zone_type", "related", "actions"].includes(
              String(column.key),
            )
          : false,
      ),
);
async function loadProjectDetails() {
  const details: Record<string, { access: string }> = {};
  await Promise.all(
    projects.value.map(async (device) => {
      try {
        if (device.zone_type === IfaceZoneType.wan) {
          const config = await get_iface_server_config(device.name, true);
          details[device.name] = {
            access: t(`network.settings.access_${config.ip_model.t}`),
          };
        } else if (device.zone_type === IfaceZoneType.lan) {
          const config = await get_iface_dhcp_v4_config(device.name, true);
          details[device.name] = {
            access: t("network.settings.access_dhcp_server"),
          };
        }
      } catch {
        details[device.name] = {
          access: t("network.settings.access_unconfigured"),
        };
      }
    }),
  );
  projectDetails.value = details;
}
function syncDraft() {
  const device = selected.value;
  if (!device) return;
  draftEnabled.value = device.dev_status.t === DevStateType.Up;
  draftBoot.value = device.enable_in_boot;
  draftRole.value = device.zone_type;
  savedEnabled.value = draftEnabled.value;
  savedBoot.value = draftBoot.value;
  savedRole.value = draftRole.value;
  draftWifiMode.value = device.wifi_mode ?? WifiMode.Undefined;
  savedWifiMode.value = draftWifiMode.value;
  dirtyEditors.value = [];
  cpuDirty.value = false;
  activeConfigTab.value = viewMode.value === "interface" ? "general" : "ipv4";
}
function updateUrl(section?: Editor | null) {
  router.replace({
    path: "/network/settings",
    query: {
      view: viewMode.value,
      iface: selectedName.value || undefined,
      section: section || undefined,
    },
  });
}
function openConfig(device: NetDev) {
  creatingNetwork.value = false;
  networkCreateRole.value = null;
  selectedName.value = device.name;
  syncDraft();
  configOpen.value = true;
  invalidLocation.value = false;
  updateUrl();
}
function resetBridgeCreateForm() {
  createName.value = "";
  createMembers.value = [];
}
function startCreate(type: "wan" | "lan" | "bridge") {
  if (type === "bridge") {
    resetBridgeCreateForm();
    createOpen.value = true;
    return;
  }
  networkCreateRole.value =
    type === "wan" ? IfaceZoneType.wan : IfaceZoneType.lan;
  networkCreateIface.value = null;
  networkCreateOpen.value = true;
}
watch(createOpen, (open) => {
  if (!open) resetBridgeCreateForm();
});
async function continueCreateNetwork() {
  const device = devices.value.find(
    (item) => item.index === networkCreateIface.value,
  );
  if (!device || !networkCreateRole.value) return;
  if (device.zone_type === networkCreateRole.value) {
    networkCreateOpen.value = false;
    openConfig(device);
    return;
  }
  selectedName.value = device.name;
  syncDraft();
  creatingNetwork.value = true;
  draftRole.value = networkCreateRole.value;
  draftEnabled.value = true;
  draftBoot.value = true;
  firstWanPreset.value =
    networkCreateRole.value === IfaceZoneType.wan &&
    !devices.value.some((item) => item.zone_type === IfaceZoneType.wan);
  dirtyEditors.value =
    networkCreateRole.value === IfaceZoneType.wan
      ? ["ip_config", "nat", "firewall", "route_wan"]
      : ["dhcp_v4", "route_lan"];
  activeConfigTab.value = "ipv4";
  networkCreateOpen.value = false;
  configOpen.value = true;
  updateUrl();
  await nextTick();
}
function locateProject(device: NetDev) {
  selectedName.value = device.name;
  updateUrl();
  nextTick(() =>
    document
      .querySelector(`[data-project="${CSS.escape(device.name)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" }),
  );
}
function requestCloseConfig() {
  if (!dirty.value) {
    configOpen.value = false;
    updateUrl();
    return;
  }
  dialog.error({
    title: t("network.settings.unsaved_title"),
    content: t("network.settings.unsaved_content"),
    positiveText: t("network.settings.discard"),
    negativeText: t("common.cancel"),
    negativeButtonProps: neutralButtonProps.value,
    onPositiveClick: () => {
      configOpen.value = false;
      updateUrl();
    },
  });
}
async function guarded(action: () => Promise<void>) {
  if (disableGuard.value) await disableGuard.value.check_and_execute(action);
  else await action();
}
async function refreshRuntimeAddresses() {
  if (runtimeAddressRefreshRunning) return;
  runtimeAddressRefreshRunning = true;
  try {
    const [addresses, configs] = await Promise.all([
      get_runtime_ip_addresses(),
      get_all_iface_pppd_config(),
    ]);
    runtimeIpAddresses.value = addresses;
    pppdConfigs.value = configs;
  } catch {
    // Keep the last successful result; the global polling warning covers outages.
  } finally {
    runtimeAddressRefreshRunning = false;
  }
}
async function refresh() {
  loading.value = true;
  loadError.value = undefined;
  sourceErrors.value = [];
  try {
    await ifaceStore.UPDATE_INFO();
    const [docker, plugin] = await Promise.allSettled([
      get_all_docker_networks(),
      listPlugins(),
    ]);
    await refreshRuntimeAddresses();
    await Promise.allSettled(
      Object.values(statusStores).map((store) => store.UPDATE_INFO()),
    );
    dockerNetworks.value =
      docker.status === "fulfilled" ? docker.value : undefined;
    plugins.value = plugin.status === "fulfilled" ? plugin.value : undefined;
    if (docker.status === "rejected") sourceErrors.value.push("Docker");
    if (plugin.status === "rejected")
      sourceErrors.value.push(t("network.settings.plugin"));
    await loadProjectDetails();
    restoreUrl();
  } catch (error) {
    loadError.value = error;
  } finally {
    loading.value = false;
  }
}
function restoreUrl() {
  viewMode.value =
    route.query.view === "interface" ||
    resolveCategory(route.query.tab) === "bridge" ||
    route.query.tab === "interfaces"
      ? "interface"
      : "network";
  const requested =
    typeof route.query.iface === "string" ? route.query.iface : "";
  if (!requested) return;
  const device = devices.value.find((item) => item.name === requested);
  invalidLocation.value = !device;
  if (!device) return;
  selectedName.value = device.name;
  if (typeof route.query.section === "string") {
    const section = route.query.section as Editor;
    if (
      services.value.some((item) => item.key === section) &&
      sources.value.get(device.name)?.available &&
      !["docker", "plugin"].includes(sources.value.get(device.name)?.kind ?? "")
    ) {
      syncDraft();
      configOpen.value = true;
      configOpen.value = true;
    } else invalidLocation.value = true;
  }
}
async function saveBasic() {
  const device = selected.value;
  if (!device || !canWriteSelected.value || !basicDirty.value) return;
  const failures: string[] = [];
  const action = async () => {
    if (draftEnabled.value !== (device.dev_status.t === DevStateType.Up))
      try {
        await change_iface_status(device.name, draftEnabled.value);
        savedEnabled.value = draftEnabled.value;
      } catch {
        failures.push(t("network.settings.enabled_state"));
      }
    if (draftBoot.value !== device.enable_in_boot)
      try {
        await change_iface_boot_status(device.name, draftBoot.value);
        savedBoot.value = draftBoot.value;
      } catch {
        failures.push(t("network.settings.boot"));
      }
    if (draftRole.value !== device.zone_type)
      try {
        await change_zone({ iface_name: device.name, zone: draftRole.value });
        savedRole.value = draftRole.value;
      } catch {
        failures.push(t("network.settings.role"));
      }
    await refresh();
    if (failures.length)
      message.error(
        t("network.settings.partial_failed", { fields: failures.join(", ") }),
      );
    else message.success(t("network.settings.saved"));
  };
  if (!draftEnabled.value || draftRole.value !== device.zone_type)
    await guarded(action);
  else await action();
}
async function saveConfiguration() {
  operationLoading.value = true;
  try {
    await saveBasic();
    if (wifiModeDirty.value && selected.value) {
      await stop_and_del_iface_wifi(selected.value.name);
      await change_wifi_mode(selected.value.name, draftWifiMode.value);
      savedWifiMode.value = draftWifiMode.value;
    }
    for (const key of dirtyEditors.value)
      await embeddedEditors.get(key)?.save();
    if (cpuDirty.value) await cpuEditor.value?.save();
    dirtyEditors.value = [];
    cpuDirty.value = false;
    creatingNetwork.value = false;
    networkCreateRole.value = null;
  } finally {
    operationLoading.value = false;
  }
}
function requestSaveConfiguration() {
  const device = selected.value;
  if (!device) return;
  const yesNo = (value: boolean) =>
    t(value ? "network.settings.enabled" : "network.settings.disabled");
  const changed: SummaryItem[] = [
    { label: t("common.interface"), value: device.name },
    { label: t("network.settings.role"), value: zoneLabel(draftRole.value) },
    ...(basicDirty.value
      ? [
          {
            label: t("network.settings.enabled_state"),
            value: yesNo(draftEnabled.value),
          },
          { label: t("network.settings.boot"), value: yesNo(draftBoot.value) },
        ]
      : []),
  ];
  for (const key of dirtyEditors.value) {
    const label =
      services.value.find((service) => service.key === key)?.label ?? key;
    const summary = embeddedEditors.get(key)?.getSummary?.() ?? [];
    changed.push(
      ...(summary.length
        ? summary
        : [{ label, value: t("network.settings.configured") }]),
    );
  }
  if (cpuDirty.value)
    changed.push({
      label: t("network.settings.cpu_balance"),
      value: t("network.settings.configured"),
    });
  if (wifiModeDirty.value)
    changed.push({
      label: t("network.settings.wifi_mode"),
      value: wifiModeLabel(draftWifiMode.value),
    });
  dialog.info({
    title: t("network.settings.save_confirm_title"),
    content: () =>
      h("div", { class: "network-settings__save-summary" }, [
        h("div", t("network.settings.save_confirm_items")),
        h(
          "dl",
          changed.flatMap((item) => [h("dt", item.label), h("dd", item.value)]),
        ),
      ]),
    positiveText: t("common.confirm"),
    negativeText: t("common.cancel"),
    negativeButtonProps: neutralButtonProps.value,
    onPositiveClick: async () => {
      await saveConfiguration();
      configOpen.value = false;
      updateUrl();
    },
  });
}
async function afterSaved(key?: Editor) {
  await Promise.all([
    ifaceStore.UPDATE_INFO(),
    refreshRuntimeAddresses(),
    key && key !== "pppd"
      ? statusStores[key as keyof typeof statusStores]?.UPDATE_INFO()
      : Promise.resolve(),
  ]);
}
async function updateBridgeMembers(nextIndexes: number[]) {
  const bridge = selected.value;
  if (!bridge || bridge.dev_kind !== "bridge") return;
  const current = childrenOf(bridge);
  const currentIndexes = new Set(current.map((item) => item.index));
  const next = new Set(nextIndexes);
  const added = devices.value.filter(
    (item) => next.has(item.index) && !currentIndexes.has(item.index),
  );
  const removed = current.filter((item) => !next.has(item.index));
  operationLoading.value = true;
  try {
    await Promise.all([
      ...added.map((device) =>
        add_controller({
          link_name: device.name,
          link_ifindex: device.index,
          master_name: bridge.name,
          master_ifindex: bridge.index,
        }),
      ),
      ...removed.map((device) =>
        add_controller({
          link_name: device.name,
          link_ifindex: device.index,
          master_name: null,
          master_ifindex: null,
        }),
      ),
    ]);
    await refresh();
    syncDraft();
  } finally {
    operationLoading.value = false;
  }
}
function removeBridge() {
  const device = selected.value;
  if (!device) return;
  dialog.error({
    title: t("network.settings.delete_bridge_confirm"),
    content: t("network.settings.delete_bridge_content", {
      name: device.name,
    }),
    positiveText: t("common.delete"),
    negativeText: t("common.cancel"),
    positiveButtonProps: { type: "error" },
    negativeButtonProps: neutralButtonProps.value,
    onPositiveClick: async () => {
      await delete_bridge(device.name);
      configOpen.value = false;
      await refresh();
    },
  });
}
function removeNetworkProject() {
  const device = selected.value;
  if (
    !device ||
    (device.zone_type !== IfaceZoneType.wan &&
      device.zone_type !== IfaceZoneType.lan)
  )
    return;
  dialog.error({
    title: t("network.settings.delete_network_title"),
    content: t("network.settings.delete_network_content", {
      name: device.name,
      role: zoneLabel(device.zone_type),
    }),
    positiveText: t("common.delete"),
    negativeText: t("common.cancel"),
    positiveButtonProps: { type: "error" },
    negativeButtonProps: neutralButtonProps.value,
    onPositiveClick: () =>
      guarded(async () => {
        await change_zone({
          iface_name: device.name,
          zone: IfaceZoneType.undefined,
        });
        configOpen.value = false;
        selectedName.value = "";
        await refresh();
        updateUrl();
      }),
  });
}
async function createBridge() {
  if (!createName.value.trim()) return;
  operationLoading.value = true;
  const failed: string[] = [];
  try {
    await create_bridge(createName.value.trim());
    await ifaceStore.UPDATE_INFO();
    const bridge = ifaceStore.net_devs.find(
      (item) =>
        item.name === createName.value.trim() && item.dev_kind === "bridge",
    );
    if (bridge)
      for (const index of createMembers.value) {
        const member = ifaceStore.net_devs.find((item) => item.index === index);
        if (!member || getBridgeAttachIssue(bridge, member)) {
          if (member) failed.push(member.name);
          continue;
        }
        try {
          await add_controller({
            link_name: member.name,
            link_ifindex: member.index,
            master_name: bridge.name,
            master_ifindex: bridge.index,
          });
        } catch {
          failed.push(member.name);
        }
      }
    createOpen.value = false;
    createName.value = "";
    createMembers.value = [];
    await refresh();
    if (failed.length)
      message.warning(
        t("network.settings.bridge_partial_failed", {
          names: failed.join(", "),
        }),
      );
  } finally {
    operationLoading.value = false;
  }
}

watch(() => route.query, restoreUrl);
onMounted(() => {
  refresh();
  runtimeAddressRefreshTimer = setInterval(
    () => !document.hidden && void refreshRuntimeAddresses(),
    15_000,
  );
});
onUnmounted(() => {
  if (runtimeAddressRefreshTimer) clearInterval(runtimeAddressRefreshTimer);
});
</script>

<template>
  <div class="network-settings standard-content-page">
    <n-divider class="network-settings__divider" title-placement="left">
      {{ t("network.settings.title") }}
    </n-divider>
    <n-alert v-if="invalidLocation" type="warning" :show-icon="false">{{
      t("network.settings.invalid_location_safe")
    }}</n-alert>
    <n-alert v-if="loadError" type="error"
      ><n-flex justify="space-between"
        ><span>{{ t("network.settings.load_failed") }}</span
        ><n-button size="small" @click="refresh">{{
          t("common.retry")
        }}</n-button></n-flex
      ></n-alert
    >
    <n-alert v-if="sourceErrors.length" type="warning" :show-icon="false">{{
      t("network.settings.source_unavailable", {
        sources: sourceErrors.join(", "),
      })
    }}</n-alert>
    <NetFlow
      v-if="!loadError"
      class="network-settings__topology"
      data-testid="interface-map"
      summary
      :docker-ifaces="dockerIfaces"
    />

    <div
      v-if="!loadError"
      class="network-settings__toolbar standard-list-align"
    >
      <n-flex :wrap="false">
        <n-tabs
          v-model:value="viewMode"
          class="network-settings__view-tabs"
          type="segment"
          size="small"
          @update:value="() => updateUrl()"
        >
          <n-tab name="network">{{ t("network.settings.view_network") }}</n-tab>
          <n-tab name="interface">{{
            t("network.settings.view_interface")
          }}</n-tab>
        </n-tabs>
      </n-flex>
      <n-button :loading="loading" secondary @click="refresh">
        <template #icon
          ><n-icon><Renew /></n-icon
        ></template>
        {{ t("common.refresh") }}
      </n-button>
    </div>

    <section v-if="!loadError" class="network-settings__projects">
      <div
        v-for="group in projectGroups"
        :key="group.type"
        class="network-settings__project-group"
      >
        <div class="network-settings__group-heading standard-list-title">
          <strong>{{ group.label }}</strong>
          <n-button
            v-if="group.type !== 'interface'"
            size="small"
            type="primary"
            @click="
              startCreate(
                group.type === 'bridge'
                  ? 'bridge'
                  : group.type === 'wan'
                    ? 'wan'
                    : 'lan',
              )
            "
          >
            {{
              t(
                group.type === "bridge"
                  ? "network.settings.create_bridge"
                  : group.type === "wan"
                    ? "network.settings.create_wan"
                    : "network.settings.create_lan",
              )
            }}
          </n-button>
        </div>
        <StandardDataTable
          :columns="visibleColumns"
          :data="group.items"
          :loading="loading"
          :row-key="(item: NetDev) => item.index"
          :row-class-name="
            (item: NetDev) =>
              selectedName === item.name ? 'is-selected' : undefined
          "
          :row-props="(item: NetDev) => ({ 'data-project': item.name })"
          :scroll-x="viewMode === 'network' ? 1228 : 678"
          size="small"
          :empty-text="t('network.settings.no_group_projects')"
        />
      </div>
    </section>

    <ConfigModal
      v-if="selected"
      v-model:show="configOpen"
      :show-switch="false"
      width="var(--app-secondary-modal-width)"
      :dirty="dirty"
      :title="
        t(
          viewMode === 'network'
            ? 'network.settings.configure_network_title'
            : 'network.settings.configure_interface_title',
          { name: selected.name, role: zoneLabel(selected.zone_type) },
        )
      "
      @update:show="(show: boolean) => !show && updateUrl()"
    >
      <n-tabs
        v-model:value="activeConfigTab"
        type="line"
        :animated="false"
        pane-class="network-settings__tab-pane"
      >
        <n-tab-pane
          v-if="viewMode === 'interface'"
          name="general"
          :tab="t('network.settings.tab_general')"
        >
          <n-alert v-if="!canWriteSelected" type="warning" :show-icon="false">{{
            isManaged
              ? t("network.settings.managed_readonly")
              : t("network.settings.source_readonly")
          }}</n-alert>
          <StandardSettingRow
            :label="t('network.settings.enabled_state')"
            control-width="auto"
          >
            <n-switch
              v-model:value="draftEnabled"
              :disabled="!canWriteSelected"
              size="medium"
            />
          </StandardSettingRow>
          <StandardSettingRow
            :label="t('network.settings.boot')"
            control-width="auto"
          >
            <n-switch
              v-model:value="draftBoot"
              :disabled="!canWriteSelected"
              size="medium"
            />
          </StandardSettingRow>
          <StandardSettingRow
            v-if="selectedParentBridge"
            :label="t('network.settings.member_bridge')"
            control-width="auto"
          >
            <n-tag
              size="small"
              :type="interfaceStatusTagType(selectedParentBridge)"
              :bordered="false"
            >
              {{ selectedParentBridge.name }}
            </n-tag>
          </StandardSettingRow>
          <StandardSettingRow
            v-if="selectedParentBridge"
            :label="t('network.settings.role')"
            control-width="auto"
          >
            <n-tag
              size="small"
              :type="zoneTagType(effectiveZone(selected))"
              :bordered="false"
            >
              {{ zoneLabel(effectiveZone(selected)) }} ·
              {{ t("network.settings.inherited") }}
            </n-tag>
          </StandardSettingRow>
          <StandardSettingRow v-else :label="t('network.settings.role')">
            <n-select
              v-model:value="draftRole"
              :disabled="!canWriteSelected"
              :options="[
                { label: 'WAN', value: IfaceZoneType.wan },
                { label: 'LAN', value: IfaceZoneType.lan },
                {
                  label: t('network.settings.unassigned'),
                  value: IfaceZoneType.undefined,
                },
              ]"
            />
          </StandardSettingRow>
          <template v-if="selected.dev_kind === 'bridge'">
            <StandardSettingRow :label="t('network.settings.bridge_members')">
              <n-flex vertical size="small">
                <div class="network-settings__bridge-add">
                  <n-select
                    :value="childrenOf(selected).map((child) => child.index)"
                    multiple
                    filterable
                    max-tag-count="responsive"
                    :disabled="!canWriteSelected || operationLoading"
                    :placeholder="t('network.settings.attach_bridge')"
                    :options="bridgeMemberOptions"
                    :render-tag="renderBridgeMemberTag"
                    @update:value="updateBridgeMembers"
                  />
                </div>
              </n-flex>
            </StandardSettingRow>
          </template>
        </n-tab-pane>

        <n-tab-pane
          v-if="
            viewMode === 'network' &&
            (hasService('ip_config') ||
              hasService('dhcp_v4') ||
              hasService('pppd'))
          "
          name="ipv4"
          :tab="t('network.settings.tab_ipv4')"
          :display-directive="creatingNetwork ? 'show' : 'show:lazy'"
        >
          <IpConfigModal
            v-if="hasService('ip_config')"
            :show="true"
            embedded
            :ref="editorRef('ip_config')"
            :zone="serviceDevice!.zone_type"
            :iface_name="selected.name"
            :preset-mode="creatingNetwork ? IfaceIpMode.DHCPClient : undefined"
            :preset-default-router="creatingNetwork && firstWanPreset"
            @refresh="afterSaved('ip_config')"
            @dirty="markEditorDirty('ip_config')"
          />
          <DHCPv4ServiceEditModal
            v-if="hasService('dhcp_v4')"
            :show="true"
            embedded
            :ref="editorRef('dhcp_v4')"
            :zone="serviceDevice!.zone_type"
            :iface_name="selected.name"
            @refresh="afterSaved('dhcp_v4')"
            @dirty="markEditorDirty('dhcp_v4')"
          />
          <PPPDServiceListDrawer
            v-if="hasService('pppd')"
            :show="true"
            presentation="embedded"
            :attach_iface_name="selected.name"
            @refresh="afterSaved('pppd')"
          />
        </n-tab-pane>

        <n-tab-pane
          v-if="
            viewMode === 'network' &&
            (hasService('ipv6pd') || hasService('lan_ipv6'))
          "
          name="ipv6"
          :tab="t('network.settings.tab_ipv6')"
          display-directive="show"
        >
          <IPv6PDEditModal
            v-if="hasService('ipv6pd')"
            :show="true"
            embedded
            :ref="editorRef('ipv6pd')"
            :zone="serviceDevice!.zone_type"
            :iface_name="selected.name"
            :mac="selected.mac ?? null"
            @refresh="afterSaved('ipv6pd')"
            @dirty="markEditorDirty('ipv6pd')"
          />
          <LanIPv6EditModal
            v-if="hasService('lan_ipv6')"
            :show="true"
            embedded
            :ref="editorRef('lan_ipv6')"
            :zone="serviceDevice!.zone_type"
            :iface_name="selected.name"
            :mac="selected.mac"
            @refresh="afterSaved('lan_ipv6')"
            @dirty="markEditorDirty('lan_ipv6')"
          />
        </n-tab-pane>

        <n-tab-pane
          v-if="
            viewMode === 'network' &&
            (hasService('nat') ||
              hasService('mss_clamp') ||
              hasService('firewall') ||
              hasService('route_wan') ||
              hasService('route_lan'))
          "
          name="security"
          :tab="t('network.settings.tab_security')"
          :display-directive="creatingNetwork ? 'show' : 'show:lazy'"
        >
          <NATEditModal
            v-if="hasService('nat')"
            :show="true"
            embedded
            :ref="editorRef('nat')"
            :zone="serviceDevice!.zone_type"
            :iface_name="selected.name"
            @refresh="afterSaved('nat')"
            @dirty="markEditorDirty('nat')"
          />
          <MSSClampServiceEditModal
            v-if="hasService('mss_clamp')"
            :show="true"
            embedded
            :ref="editorRef('mss_clamp')"
            :iface_name="selected.name"
            @refresh="afterSaved('mss_clamp')"
            @dirty="markEditorDirty('mss_clamp')"
          />
          <FirewallServiceEditModal
            v-if="hasService('firewall')"
            :show="true"
            embedded
            :ref="editorRef('firewall')"
            :zone="serviceDevice!.zone_type"
            :iface_name="selected.name"
            @refresh="afterSaved('firewall')"
            @dirty="markEditorDirty('firewall')"
          />
          <RouteWanServiceEditModal
            v-if="hasService('route_wan')"
            :show="true"
            embedded
            :ref="editorRef('route_wan')"
            :zone="serviceDevice!.zone_type"
            :iface_name="selected.name"
            @refresh="afterSaved('route_wan')"
            @dirty="markEditorDirty('route_wan')"
          />
          <RouteLanServiceEditModal
            v-if="hasService('route_lan')"
            :show="true"
            embedded
            :ref="editorRef('route_lan')"
            :iface_name="selected.name"
            @refresh="afterSaved('route_lan')"
            @dirty="markEditorDirty('route_lan')"
          />
        </n-tab-pane>

        <n-tab-pane
          v-if="viewMode === 'interface'"
          name="cpu"
          :tab="t('network.settings.cpu_balance')"
        >
          <IfaceCpuSoftBalance
            ref="cpuEditor"
            :show="true"
            embedded
            :iface_name="selected.name"
            @dirty="cpuDirty = true"
          />
        </n-tab-pane>

        <n-tab-pane
          v-if="viewMode === 'interface' && selected.wifi_info"
          name="wifi"
          :tab="t('network.settings.wifi_mode')"
        >
          <StandardSettingRow
            :label="t('network.settings.current_wifi_mode')"
            control-width="auto"
          >
            <n-tag size="small" :bordered="false" type="info">
              {{ wifiModeLabel(savedWifiMode) }}
            </n-tag>
          </StandardSettingRow>
          <StandardSettingRow :label="t('network.settings.switch_wifi_mode')">
            <n-select
              v-model:value="draftWifiMode"
              :options="[
                { label: t('wifi.disabled_mode'), value: WifiMode.Undefined },
                { label: t('wifi.client_mode'), value: WifiMode.Client },
                { label: t('wifi.ap_mode'), value: WifiMode.AP },
              ]"
            />
          </StandardSettingRow>
        </n-tab-pane>

        <n-tab-pane
          v-if="viewMode === 'network' && hasService('wifi')"
          name="wifi"
          :tab="t('network.settings.wifi')"
        >
          <WifiServiceEditModal
            :show="true"
            embedded
            :ref="editorRef('wifi')"
            :zone="serviceDevice!.zone_type"
            :iface_name="selected.name"
            @refresh="afterSaved('wifi')"
            @dirty="markEditorDirty('wifi')"
          />
        </n-tab-pane>
      </n-tabs>
      <template #footer>
        <n-flex class="standard-modal-footer--split" justify="space-between">
          <n-button
            v-if="viewMode === 'interface' && selected.dev_kind === 'bridge'"
            type="error"
            :disabled="!canWriteSelected"
            @click="removeBridge"
            >{{ t("network.settings.delete_bridge") }}</n-button
          >
          <n-button
            v-else-if="
              viewMode === 'network' &&
              (selected.zone_type === IfaceZoneType.wan ||
                selected.zone_type === IfaceZoneType.lan)
            "
            type="error"
            :disabled="!canWriteSelected"
            @click="removeNetworkProject"
            >{{ t("common.delete") }}</n-button
          >
          <span v-else />
          <n-flex>
            <n-button @click="requestCloseConfig">{{
              t("common.cancel")
            }}</n-button>
            <n-button
              type="primary"
              :loading="operationLoading"
              :disabled="!canWriteSelected || !dirty"
              @click="requestSaveConfiguration"
              >{{ t("common.save") }}</n-button
            >
          </n-flex>
        </n-flex>
      </template>
    </ConfigModal>

    <ConfigModal
      v-model:show="networkCreateOpen"
      :show-switch="false"
      width="var(--app-compact-modal-width)"
      :title="
        t(
          networkCreateRole === IfaceZoneType.wan
            ? 'network.settings.create_wan'
            : 'network.settings.create_lan',
        )
      "
    >
      <StandardSettingRow :label="t('network.settings.select_interface')">
        <n-select
          v-model:value="networkCreateIface"
          filterable
          :options="createMemberOptions"
          :placeholder="t('network.settings.select_interface')"
        >
          <template #empty>
            <n-empty
              size="small"
              :description="t('network.settings.no_available_interface')"
            />
          </template>
        </n-select>
      </StandardSettingRow>
      <template #footer>
        <n-flex justify="space-between">
          <n-button @click="networkCreateOpen = false">{{
            t("common.cancel")
          }}</n-button>
          <n-button
            type="primary"
            :disabled="!networkCreateIface"
            @click="continueCreateNetwork"
            >{{ t("common.next") }}</n-button
          >
        </n-flex>
      </template>
    </ConfigModal>

    <ConfigModal
      v-model:show="createOpen"
      :show-switch="false"
      width="var(--app-compact-modal-width)"
      :title="t('network.settings.create_bridge')"
    >
      <n-form>
        <StandardSettingRow :label="t('network.settings.bridge_name')">
          <n-input v-model:value="createName" />
        </StandardSettingRow>
        <StandardSettingRow>
          <template #label>
            <Notice>
              {{ t("network.settings.bridge_members") }}
              <template #msg>
                {{ t("network.settings.bridge_member_hint") }}
              </template>
            </Notice>
          </template>
          <n-select
            v-model:value="createMembers"
            class="network-settings__bridge-add"
            multiple
            filterable
            max-tag-count="responsive"
            :options="createMemberOptions"
            :render-tag="renderBridgeMemberTag"
          />
        </StandardSettingRow>
      </n-form>
      <template #footer>
        <n-flex justify="space-between">
          <n-button @click="createOpen = false">
            {{ t("common.cancel") }}
          </n-button>
          <n-button
            type="primary"
            :loading="operationLoading"
            :disabled="!createName.trim()"
            @click="createBridge"
          >
            {{ t("common.create") }}
          </n-button>
        </n-flex>
      </template>
    </ConfigModal>

    <IfaceDisableGuardModal
      v-if="selected"
      ref="disableGuard"
      :iface_name="selected.name"
      @refresh="refresh"
    />
  </div>
</template>

<style scoped>
.network-settings {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--app-space-section);
  overflow: auto;
}
.network-settings__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.network-settings__view-tabs {
  width: fit-content;
  min-width: 240px;
  max-width: 100%;
}
.network-settings__divider {
  margin: 0;
}
.network-settings__projects {
  padding: 0;
}
.network-settings__topology {
  flex: none;
  width: calc(
    100% - var(--app-data-table-frame-inset) - var(--app-data-table-frame-inset)
  );
  margin-inline: var(--app-data-table-frame-inset);
  border-radius: var(--app-radius-surface);
  box-shadow: 0 1px 4px var(--app-shadow-color);
}
.network-settings__projects {
  height: max-content;
}
.network-settings__toolbar {
  flex: none;
}
.network-settings__project-group + .network-settings__project-group {
  margin-top: 18px;
}
.network-settings__project-group {
  width: 100%;
  box-sizing: border-box;
}
.network-settings__group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.network-settings__projects
  :deep(.n-data-table-tr.is-selected .n-data-table-td) {
  background: var(--app-interactive-active-color);
}
.network-settings__projects :deep(.n-data-table-td small) {
  display: block;
  color: var(--app-text-muted-color);
}
.network-settings__modal {
  display: flex;
  flex-direction: column;
  width: min(var(--app-secondary-modal-width), calc(100vw - 32px));
  max-height: var(--app-secondary-modal-max-height);
  overflow: visible;
}
.network-settings__modal :deep(.n-tabs) {
  display: flex;
  min-height: 0;
  flex-direction: column;
  height: 100%;
}
.network-settings__modal :deep(.n-tabs-nav) {
  flex: none;
}
.network-settings__modal :deep(.n-tabs-pane-wrapper) {
  min-height: 0;
}
.network-settings__modal :deep(.network-settings__tab-pane) {
  height: 100%;
  overflow: auto;
}
.network-settings__create-modal {
  width: min(var(--app-tertiary-modal-width), calc(100vw - 32px));
}
.network-settings__section-title {
  margin: 0 0 12px;
  font-size: var(--app-font-size-body);
}
.network-settings__bridge-add {
  width: 100%;
}
.network-settings__bridge-add :deep(.n-base-selection-tags) {
  --n-padding-multiple: 5px 26px 5px 5px !important;
  flex-wrap: nowrap;
  height: var(--n-height);
  overflow: hidden;
}
.network-settings__bridge-add :deep(.n-base-selection-tag-wrapper) {
  padding-bottom: 0;
}
.network-settings__bridge-add :deep(.n-base-selection-input-tag) {
  height: 24px;
  margin-bottom: 0;
  line-height: 24px;
}
.network-settings__interface-status-tag--truncate {
  max-width: 120px;
}
.network-settings__interface-status-tag--truncate :deep(.n-tag__content) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.network-settings__bridge-add
  :deep(
    .n-base-selection-tag-wrapper .n-tag:not(.n-tag--closable) .n-tag__content
  ) {
  font-size: 0;
}
.network-settings__bridge-add
  :deep(
    .n-base-selection-tag-wrapper
      .n-tag:not(.n-tag--closable)
      .n-tag__content::after
  ) {
  content: "…";
  font-size: var(--app-font-size-caption);
}
.network-settings__bridge-add
  :deep(.n-base-selection-tag-wrapper .n-tag:not(.n-tag--closable)) {
  --n-height: 24px !important;
}
@media (max-width: 760px) {
  .network-settings__header,
  .network-settings__toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .network-settings__header > div:last-child {
    width: 100%;
  }
  .network-settings__modal :deep(.n-form-item) {
    display: block;
  }
  .network-settings__modal :deep(.n-form-item-label) {
    width: auto !important;
  }
}
</style>
