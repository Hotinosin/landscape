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
import { useFrontEndStore } from "@/stores/front_end_config";
import { prefetchRoute } from "@/router/prefetch";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const frontEndStore = useFrontEndStore();

function nodeProps(option: MenuOption) {
  return {
    onMouseenter() {
      if (typeof option.key === "string") {
        prefetchRoute(option.key);
      }
    },
  };
}

const menuThemeOverrides = {
  itemHeight: "var(--app-control-height)",
  borderRadius: "var(--app-radius-panel)",
  itemColorActive:
    "color-mix(in srgb, var(--app-brand-color) 28%, transparent)",
  itemColorActiveHover:
    "color-mix(in srgb, var(--app-brand-color) 34%, transparent)",
  itemColorActiveCollapsed:
    "color-mix(in srgb, var(--app-brand-color) 28%, transparent)",
  itemTextColorActive: "var(--app-brand-active-color)",
  itemTextColorActiveHover: "var(--app-brand-active-color)",
  itemIconColorActive: "var(--app-brand-active-color)",
  itemIconColorActiveHover: "var(--app-brand-active-color)",
  arrowColorActive: "var(--app-brand-active-color)",
  arrowColorActiveHover: "var(--app-brand-active-color)",
};

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

const menuOptions = computed<MenuOption[]>(() => [
  {
    label: t("routes.dashboard"),
    key: "",
    icon: renderIcon(Dashboard),
  },
  {
    label: t("routes.network"),
    key: "network",
    icon: renderIcon(Network3),
    children: [
      {
        label: t("routes.interface-config"),
        key: "network/settings",
        icon: renderIcon(NetworkAdminControl),
      },
      {
        label: t("routes.address-allocation"),
        key: "network/allocations",
        icon: renderIcon(IbmCloudSubnets),
      },
      {
        label: t("routes.mac-binding"),
        key: "mac-binding",
        icon: renderIcon(Devices),
      },
    ],
  },
  {
    label: t("routes.traffic-policy"),
    key: "traffic-policy",
    icon: renderIcon(Flow),
    children: [
      {
        label: t("routes.flow"),
        key: "flow",
        icon: renderIcon(FlowStream),
      },
      {
        label: t("routes.dns-config"),
        key: "dns/config",
        icon: renderIcon(DnsServices),
      },
      {
        label: t("routes.dns-redirect"),
        key: "dns/redirect",
        icon: renderIcon(Rule),
      },
      {
        label: t("routes.geo"),
        key: "geo/domain",
        icon: renderIcon(Earth),
      },
    ],
  },
  {
    label: t("routes.security-forwarding"),
    key: "security-forwarding",
    icon: renderIcon(Wall),
    children: [
      {
        label: t("routes.firewall"),
        key: "firewall-nat/firewall",
        icon: renderIcon(SecurityServices),
      },
      {
        label: t("routes.port-mapping"),
        key: "firewall-nat/port-mapping",
        icon: renderIcon(ConnectionTwoWay),
      },
    ],
  },
  {
    label: t("routes.domains"),
    key: "domains",
    icon: renderIcon(Certificate),
    children: [
      {
        label: t("routes.ddns"),
        key: "domains/ddns",
        icon: renderIcon(DataConnected),
      },
      {
        label: t("routes.certs"),
        key: "domains/certs",
        icon: renderIcon(CertificateCheck),
      },
      {
        label: t("routes.credentials"),
        key: "domains/credentials",
        icon: renderIcon(Credentials),
      },
    ],
  },
  {
    label: t("routes.metric-group"),
    key: "metric-group",
    icon: renderIcon(ChartCombo),
    children: [
      {
        label: t("routes.connect-live"),
        key: "metrics/conn/live",
        icon: renderIcon(Activity),
      },
      {
        label: t("routes.connect-history"),
        key: "metrics/conn/history",
        icon: renderIcon(TimePlot),
      },
      {
        label: t("routes.dns-metric"),
        key: "metrics/dns",
        icon: renderIcon(ChartLineData),
      },
    ],
  },
  {
    label: t("routes.apps-tools"),
    key: "apps-tools",
    icon: renderIcon(Application),
    children: [
      {
        label: t("routes.gateway"),
        key: "gateway",
        icon: renderIcon(Gateway),
      },
      {
        label: t("routes.docker"),
        key: "docker",
        icon: renderIcon(ContainerServices),
      },
      {
        label: () =>
          h("span", { style: "display:flex;align-items:center;gap:6px" }, [
            t("routes.plugins"),
            h(
              NTag,
              { size: "tiny", bordered: false, class: "plugins-dev-tag" },
              () => "dev",
            ),
          ]),
        key: "plugins",
        icon: renderIcon(Plug),
      },
      {
        label: t("routes.webshell"),
        key: "webshell",
        icon: renderIcon(Terminal),
      },
    ],
  },
  {
    label: t("routes.config"),
    key: "config",
    icon: renderIcon(Settings),
  },
]);
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
</style>
