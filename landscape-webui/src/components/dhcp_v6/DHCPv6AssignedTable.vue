<script lang="ts" setup>
import { computed, h } from "vue";
import type { DataTableColumns } from "naive-ui";
import { NCountdown, NTime } from "naive-ui";
import type { DHCPv6OfferInfo } from "@landscape-router/types/api/schemas";
import type {
  DHCPv6AddressItem,
  DHCPv6PrefixItem,
} from "@landscape-router/types/api/schemas";
import { useFrontEndStore } from "@/stores/front_end_config";
import { usePreferenceStore } from "@/stores/preference";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import { useI18n } from "vue-i18n";
import StandardDataTable from "@/components/common/StandardDataTable.vue";

const { t } = useI18n();
const prefStore = usePreferenceStore();
const frontEndStore = useFrontEndStore();
const enrolledDeviceStore = useEnrolledDeviceStore();

type Props = {
  info: DHCPv6OfferInfo;
  iface_name: string;
};

const props = defineProps<Props>();

function mac_as_string(mac: unknown): string {
  return mac as string;
}

function active_time(item: DHCPv6AddressItem | DHCPv6PrefixItem): number {
  return item.relative_active_time * 1000 + props.info.boot_time;
}

function expire_time(item: DHCPv6AddressItem | DHCPv6PrefixItem): number {
  const lifetime = "valid_lifetime" in item ? item.valid_lifetime : 0;
  return (item.relative_active_time + lifetime) * 1000 + props.info.boot_time;
}

function remaining_ms(item: DHCPv6AddressItem | DHCPv6PrefixItem): number {
  return expire_time(item) - new Date().getTime();
}

const show_addresses = computed(() => {
  return props.info.offered_addresses.map((item) => ({
    ...item,
    mac_str: item.mac ? mac_as_string(item.mac) : undefined,
    real_active_time: active_time(item),
    real_remaining: remaining_ms(item),
  }));
});

const show_prefixes = computed(() => {
  return props.info.delegated_prefixes.map((item) => ({
    ...item,
    real_active_time: active_time(item),
    real_remaining: remaining_ms(item),
  }));
});

type AddressRow = (typeof show_addresses.value)[number];
type PrefixRow = (typeof show_prefixes.value)[number];

const addressColumns = computed<DataTableColumns<AddressRow>>(() => [
  {
    title: t("dhcp_v6.hostname"),
    key: "hostname",
    render: (item) =>
      item.mac_str
        ? enrolledDeviceStore.GET_NAME_WITH_FALLBACK(
            item.mac_str,
            item.hostname,
          )
        : (item.hostname ?? "-"),
  },
  {
    title: t("dhcp_v6.mac"),
    key: "mac",
    render: (item) =>
      item.mac_str ? frontEndStore.MASK_INFO(item.mac_str) : "-",
  },
  {
    title: t("dhcp_v6.ipv6_address"),
    key: "ip",
    render: (item) => frontEndStore.MASK_INFO(item.ip),
  },
  {
    title: t("dhcp_v6.request_time"),
    key: "real_active_time",
    render: (item) =>
      h(NTime, {
        time: item.real_active_time,
        timeZone: prefStore.timezone,
      }),
  },
  {
    title: t("dhcp_v6.remaining_lease"),
    key: "real_remaining",
    render: (item) =>
      item.is_static
        ? t("dhcp_v6.static_allocation")
        : h(NCountdown, { duration: item.real_remaining, active: true }),
  },
]);

const prefixColumns = computed<DataTableColumns<PrefixRow>>(() => [
  {
    title: t("dhcp_v6.duid"),
    key: "duid",
    render: (item) => (item.duid ? `${item.duid.substring(0, 16)}...` : "-"),
  },
  {
    title: t("dhcp_v6.delegated_prefix"),
    key: "prefix",
    render: (item) => frontEndStore.MASK_INFO(item.prefix),
  },
  {
    title: t("dhcp_v6.prefix_length"),
    key: "prefix_len",
    render: (item) => `/${item.prefix_len}`,
  },
  {
    title: t("dhcp_v6.request_time"),
    key: "real_active_time",
    render: (item) =>
      h(NTime, {
        time: item.real_active_time,
        timeZone: prefStore.timezone,
      }),
  },
  {
    title: t("dhcp_v6.remaining_lease"),
    key: "real_remaining",
    render: (item) =>
      h(NCountdown, { duration: item.real_remaining, active: true }),
  },
]);
</script>

<template>
  <n-card size="small" :title="iface_name">
    <!-- IA_NA Addresses -->
    <template v-if="show_addresses.length > 0">
      <n-divider title-placement="left" class="section-divider">
        {{ t("dhcp_v6.ia_na_title") }}
      </n-divider>
      <StandardDataTable
        :columns="addressColumns"
        :data="show_addresses"
        size="small"
        :row-key="(row) => `${row.ip}-${row.real_active_time}`"
      />
    </template>

    <!-- IA_PD Prefixes -->
    <template v-if="show_prefixes.length > 0">
      <n-divider title-placement="left" class="section-divider">
        {{ t("dhcp_v6.ia_pd_title") }}
      </n-divider>
      <StandardDataTable
        :columns="prefixColumns"
        :data="show_prefixes"
        size="small"
        :row-key="(row) => `${row.duid}-${row.prefix}`"
      />
    </template>

    <n-empty
      v-if="show_addresses.length === 0 && show_prefixes.length === 0"
      :description="t('dhcp_v6.no_records')"
      class="empty-state"
    />
  </n-card>
</template>

<style scoped>
.section-divider {
  margin: var(--app-space-2xs) 0;
}

.empty-state {
  padding: var(--app-space-xl) 0;
}
</style>
