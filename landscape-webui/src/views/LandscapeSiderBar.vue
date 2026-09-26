<script setup lang="ts">
import type { MenuOption } from "naive-ui";
import type { Component } from "vue";
import { computed, h, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { NIcon, NTag } from "naive-ui";

import {
  Settings,
  Dashboard,
  Network3,
  Flow,
  ChartCombo,
  Certificate,
  ChevronLeft,
  ChevronRight,
  Firewall as Wall,
  Application,
  NetworkAdminControl,
  IbmCloudSubnets,
  Devices,
  FlowStream,
  DnsServices,
  Rule,
  Earth,
  SecurityServices,
  ConnectionTwoWay,
  DataConnected,
  CertificateCheck,
  Credentials,
  Activity,
  TimePlot,
  ChartLineData,
  Gateway,
  ContainerServices,
  Plug,
  Terminal,
} from "@vicons/carbon";

import CopyRight from "@/components/CopyRight.vue";
import { useCapabilityStore } from "@/stores/capability";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const capabilityStore = useCapabilityStore();

// Menu keys that require a backend capability to be usable.
const menu_capability: Record<string, string> = {
  gateway: "gateway",
  "metrics/conn/history": "metric_persistent",
  "metrics/dns": "metric_persistent",
};

function applyCapability(options: MenuOption[]): MenuOption[] {
  return options.map((option) => {
    const children = option.children
      ? applyCapability(option.children as MenuOption[])
      : undefined;
    const capability = menu_capability[String(option.key)];
    const disabled =
      (capability !== undefined && !capabilityStore.HAS(capability)) ||
      (children !== undefined &&
        children.length > 0 &&
        children.every((child) => child.disabled === true));
    return { ...option, children, disabled };
  });
}

const menu_active_key = ref<string>("");

const activeMenuByPath: Record<string, string> = {
  "/dns/upstream": "dns/config",
  "/network/dhcp-v4": "network/allocations",
  "/network/ipv6-ra": "network/allocations",
  "/network/ipv6-pd": "network/settings",
  "/firewall-nat/nat/v4": "firewall-nat/port-mapping",
  "/firewall-nat/nat/v6": "firewall-nat/port-mapping",
  "/metrics/conn/iface": "metrics/conn/live",
  "/metrics/conn/src": "metrics/conn/live",
  "/metrics/conn/dst": "metrics/conn/live",
  "/metrics/conn/history-src": "metrics/conn/history",
  "/metrics/conn/history-dst": "metrics/conn/history",
};

watch(
  () => route.path,
  (path) => {
    const menuPath = activeMenuByPath[path] ?? path;
    const key = menuPath.startsWith("/") ? menuPath.substring(1) : menuPath;
    menu_active_key.value = key;
  },
  { immediate: true },
);
const collapsed = computed({
  get: () => frontEndStore.sidebar_collapsed,
  set: (value: boolean) => {
    frontEndStore.sidebar_collapsed = value;
  },
});

function click_menu(key: string) {
  router.push({
    path: `/${key}`,
  });
}

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

const menuOptions = computed<MenuOption[]>(() =>
  applyCapability([
    {
      label: t("routes.dashboard"),
      key: "",
      icon: renderIcon(CicsSystemGroup),
    },
    {
      label: t("routes.flow"),
      key: "flow",
      icon: renderIcon(ModelBuilder),
    },
    {
      label: t("routes.mac-binding"),
      key: "mac-binding",
      icon: renderIcon(Devices),
    },
    {
      label: t("routes.network-status"),
      key: "network-status",
      icon: renderIcon(Dashboard),
      children: [
        {
          label: t("routes.dhcp-v4"),
          key: "network/dhcp-v4",
          disabled: false,
        },
        {
          label: t("routes.ipv6-pd"),
          key: "network/ipv6-pd",
        },
        {
          label: t("routes.ipv6-ra"),
          key: "network/ipv6-ra",
          disabled: false,
        },
      ],
    },
    {
      label: t("routes.firewall-nat"),
      key: "firewall-nat",
      icon: renderIcon(Wall),
      children: [
        {
          label: t("routes.firewall"),
          key: "firewall-nat/firewall",
        },
        {
          label: t("routes.nat-v4"),
          key: "firewall-nat/nat/v4",
        },
        {
          label: t("routes.nat-v6"),
          key: "firewall-nat/nat/v6",
        },
      ],
    },
    {
      label: t("routes.dns"),
      key: "dns",
      icon: renderIcon(ServerDns),
      children: [
        {
          label: t("routes.dns-upstream"),
          key: "dns/upstream",
        },
        {
          label: t("routes.dns-redirect"),
          key: "dns/redirect",
        },
      ],
    },
    {
      label: t("routes.geo"),
      key: "geo",
      icon: renderIcon(BookGlobe20Regular),
      children: [
        {
          label: t("routes.geo-domain"),
          key: "geo/domain",
        },
        {
          label: t("routes.geo-ip"),
          key: "geo/ip",
        },
      ],
    },
    {
      label: t("routes.domains"),
      key: "domains",
      icon: renderIcon(Certificate),
      children: [
        {
          label: t("routes.dns-provider-profiles"),
          key: "domains/dns-providers",
        },
        {
          label: t("routes.ddns"),
          key: "domains/ddns",
        },
        {
          label: t("routes.cert-accounts"),
          key: "domains/cert-accounts",
        },
        {
          label: t("routes.certs"),
          key: "domains/certs",
        },
      ],
    },
    {
      label: t("routes.gateway"),
      key: "gateway",
      icon: renderIcon(Gateway),
    },
    {
      label: t("routes.docker"),
      key: "docker",
      icon: renderIcon(Docker),
    },
    {
      label: t("routes.metric-group"),
      key: "metric-group",
      icon: renderIcon(ChartCombo),
      children: [
        {
          label: t("routes.dns-metric"),
          key: "metrics/dns",
        },
        {
          label: t("routes.connect-live"),
          key: "metrics/conn/live",
        },
        {
          label: t("routes.connect-iface"),
          key: "metrics/conn/iface",
        },
        {
          label: t("routes.connect-src"),
          key: "metrics/conn/src",
        },
        {
          label: t("routes.connect-dst"),
          key: "metrics/conn/dst",
        },
        {
          label: t("routes.connect-history"),
          key: "metrics/conn/history",
        },
      ],
    },
    {
      label: t("routes.config"),
      key: "config",
      icon: renderIcon(Settings),
    },
  ]),
);
</script>
<template>
  <n-layout-sider
    position="relative"
    :native-scrollbar="false"
    bordered
    collapse-mode="width"
    :collapsed-width="64"
    :width="220"
    :collapsed="collapsed"
    :show-trigger="false"
    class="landscape-sidebar"
  >
    <n-layout position="absolute">
      <n-layout-header
        v-if="!collapsed"
        style="height: 40px; display: flex"
        bordered
      >
        <n-flex justify="center" style="flex: 1" align="center">
          Landscape
        </n-flex>
      </n-layout-header>
      <n-layout
        :native-scrollbar="false"
        position="absolute"
        style="top: 40px; bottom: var(--sidebar-footer-height)"
      >
        <!-- {{ menu_active_key }} -->
        <n-menu
          v-model:value="menu_active_key"
          @update:value="click_menu"
          :node-props="nodeProps"
          :collapsed="collapsed"
          :collapsed-width="64"
          :root-indent="40"
          :indent="20"
          :icon-size="18"
          :collapsed-icon-size="18"
          :theme-overrides="menuThemeOverrides"
          :options="menuOptions"
        />
      </n-layout>
      <n-layout-footer
        bordered
        position="absolute"
        style="bottom: 0; height: var(--sidebar-footer-height)"
        content-style="display: flex; height: var(--sidebar-footer-height)"
      >
        <n-flex
          class="sidebar-footer-content"
          :class="{ 'sidebar-footer-content--collapsed': collapsed }"
          :justify="collapsed ? 'center' : 'space-between'"
          align="center"
          :wrap="false"
        >
          <CopyRight v-if="!collapsed" :icon="true"></CopyRight>
          <n-button
            class="sidebar-collapse-button"
            text
            circle
            :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="collapsed = !collapsed"
          >
            <template #icon>
              <n-icon size="20">
                <ChevronRight v-if="collapsed" />
                <ChevronLeft v-else />
              </n-icon>
            </template>
          </n-button>
        </n-flex>
      </n-layout-footer>
    </n-layout>
  </n-layout-sider>
</template>

<style scoped>
.landscape-sidebar {
  --sidebar-footer-height: calc(
    var(--app-control-height) + var(--app-space-lg) + var(--app-space-lg)
  );

  overflow: visible;
}

.landscape-sidebar :deep(.n-menu-item) {
  margin-top: 2px;
}

.landscape-sidebar :deep(.n-menu-item-content > .n-menu-item-content__arrow) {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 16px;
  grid-area: unset;
  height: 16px;
  margin: auto 0;
  transform: rotate(0deg) !important;
}

.landscape-sidebar
  :deep(.n-menu-item-content--collapsed > .n-menu-item-content__arrow) {
  transform: rotate(-90deg) !important;
}

.landscape-sidebar :deep(.n-submenu-children .n-menu-item) {
  --n-item-height: 30px;
}

.landscape-sidebar :deep(.n-submenu-children .n-menu-item-content-header) {
  font-size: var(--app-font-size-caption);
}

.landscape-sidebar :deep(.n-submenu-children .n-menu-item-content__icon) {
  font-size: var(--app-font-size-body);
}

.landscape-sidebar :deep(.n-submenu-children .n-menu-item-content::before) {
  left: 40px;
}

.landscape-sidebar
  :deep(.n-submenu-children .n-menu-item-content--selected::after) {
  left: 32px;
}

.sidebar-footer-content {
  flex: 1;
  height: 100%;
  padding: var(--app-space-lg) var(--app-space-sm);
  box-sizing: border-box;
}

.sidebar-footer-content--collapsed {
  padding: var(--app-space-lg);
}

.landscape-sidebar :deep(.n-menu-item-content--selected)::after {
  position: absolute;
  top: var(--app-space-sm);
  bottom: var(--app-space-sm);
  left: 0;
  width: var(--app-radius-indicator);
  content: "";
  background: var(--app-brand-color);
  border-radius: var(--app-radius-indicator);
}

.sidebar-collapse-button {
  flex: 0 0 var(--app-control-height);
  width: var(--app-control-height);
  height: var(--app-control-height);
  color: var(--app-text-muted-color);
  border: 1px solid var(--app-border-default-color);
  border-radius: var(--app-radius-control, 6px);
}

.sidebar-collapse-button:hover {
  color: var(--app-brand-color);
}

.landscape-sidebar :deep(.plugins-dev-tag) {
  transform-origin: left center;
}

.landscape-sidebar :deep(.sidebar-footer-link) {
  --n-font-size: var(--app-font-size-caption);
  --n-icon-size: var(--app-font-size-body);
  --n-icon-margin: 4px;
  --n-text-color: var(--app-text-secondary-color);
  --n-text-color-hover: var(--app-brand-active-color);
  --n-text-color-pressed: var(--app-brand-active-color);
  --n-text-color-focus: var(--app-brand-active-color);
  font-size: var(--app-font-size-caption);
  color: var(--app-text-secondary-color);
}

.landscape-sidebar :deep(.sidebar-footer-link .n-icon),
.landscape-sidebar :deep(.sidebar-footer-link .n-button__icon) {
  font-size: var(--app-font-size-body);
}

.landscape-sidebar :deep(.sidebar-footer-link .n-button__content),
.landscape-sidebar :deep(.sidebar-footer-link__text) {
  font-size: var(--app-font-size-caption);
}

.landscape-sidebar :deep(.sidebar-footer-link:hover) {
  color: var(--app-brand-active-color);
}
</style>
