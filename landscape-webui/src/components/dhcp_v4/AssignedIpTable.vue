<script lang="ts" setup>
import type { ArpScanInfo, DHCPv4OfferInfo } from "@/api/service_dhcp_v4";
import type { DHCPv4OfferInfoItem } from "@landscape-router/types/api/schemas";
import type { DataTableColumns } from "naive-ui";
import { computed, h, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import EnrolledDeviceEditModal from "@/components/device/EnrolledDeviceEditModal.vue";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import AssignedIpTableCell, {
  type AssignedIpRow,
} from "./AssignedIpTableCell.vue";
import Notice from "@/components/common/Notice.vue";

const enrolledDeviceStore = useEnrolledDeviceStore();
const { t } = useI18n();
const emit = defineEmits(["refresh"]);
type Props = {
  arp_info: ArpScanInfo[];
  info: DHCPv4OfferInfo;
  iface_name: string;
};

interface ArpInfo {
  macs: Set<string>;
  ip_status: boolean[];
}

const props = withDefaults(defineProps<Props>(), {});

// MacAddr is typed as string[] in ORVAL schema but serialized as string at runtime
function mac_as_string(mac: unknown): string {
  return mac as string;
}

function caculate_time(item: DHCPv4OfferInfoItem): number {
  const expire_time =
    (item.relative_active_time + item.expire_time) * 1000 +
    props.info.boot_time;
  return expire_time - new Date().getTime();
}

function request_time(item: DHCPv4OfferInfoItem): number {
  return item.relative_active_time * 1000 + props.info.boot_time;
}

function ipv4_to_number(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    parts[0] * 256 * 256 * 256 +
    parts[1] * 256 * 256 +
    parts[2] * 256 +
    parts[3]
  );
}

function compare_ipv4(a: string, b: string): number {
  const aNum = ipv4_to_number(a);
  const bNum = ipv4_to_number(b);

  if (aNum === bNum) {
    return a.localeCompare(b);
  }

  return aNum - bNum;
}

const show_item = computed(() => {
  let reuslt = [];
  for (const each of props.info.offered_ips) {
    reuslt.push({
      real_request_time: request_time(each),
      real_expire_time: caculate_time(each),
      ...each,
      mac: mac_as_string(each.mac),
    });
  }
  reuslt.sort((a, b) => compare_ipv4(a.ip, b.ip));
  return reuslt;
});

const not_current_round_ips = computed(() => {
  let ips = new Set(show_item.value.map((e) => e.ip));
  let not_current_round_ips = [];
  for (const [key, value] of arp_ip_map.value) {
    if (!ips.has(key)) {
      not_current_round_ips.push({
        ip: key,
        ip_status: value,
      });
    }
  }
  not_current_round_ips.sort((a, b) => compare_ipv4(a.ip, b.ip));
  return not_current_round_ips;
});

let refreshTimer: number | null = null;
onUnmounted(() => {
  if (refreshTimer) clearTimeout(refreshTimer);
});
async function finish() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  refreshTimer = window.setTimeout(async () => {
    emit("refresh");
    refreshTimer = null;
  }, 3000);
}

const arp_ip_map = computed(() => {
  return build_ip_map(props.arp_info);
});

function build_ip_map(data: ArpScanInfo[]): Map<string, ArpInfo> {
  const map: Map<string, ArpInfo> = new Map();

  if (data) {
    data.forEach((scan, idx) => {
      scan.infos.forEach((item) => {
        if (!map.has(item.ip)) {
          map.set(item.ip, {
            macs: new Set(),
            ip_status: Array(data.length).fill(false),
          });
        }
        const arr = map.get(item.ip)!;
        arr.ip_status[idx] = true;
        arr.macs.add(mac_as_string(item.mac));
      });
    });
  }

  return map;
}

const showQuickBind = ref(false);
const initialValues = ref<{
  mac?: string;
  ipv4?: string;
  name?: string;
  iface_name?: string;
}>({});
const bindRuleId = ref<string | null>(null);

function quickBind(ip: string, mac?: string, hostname?: string | null) {
  const targetMac = mac || Array.from(arp_ip_map.value.get(ip)?.macs || [])[0];
  if (!targetMac) return;

  const existingId = enrolledDeviceStore.GET_BINDING_ID(targetMac);
  bindRuleId.value = existingId;
  initialValues.value = {
    mac: targetMac,
    ipv4: ip,
    name: hostname || "",
    iface_name: props.iface_name,
  };
  showQuickBind.value = true;
}

const tableRows = computed<AssignedIpRow[]>(() => [
  ...show_item.value.map((item) => ({
    kind: "lease" as const,
    ...item,
    ip_status: arp_ip_map.value.get(item.ip)?.ip_status,
    macs: arp_ip_map.value.get(item.ip)?.macs,
  })),
  ...not_current_round_ips.value.map((item) => {
    const macs = arp_ip_map.value.get(item.ip)?.macs ?? new Set<string>();
    return {
      kind: "observed" as const,
      ip: item.ip,
      ip_status: item.ip_status.ip_status,
      macs,
      mac: Array.from(macs)[0],
    };
  }),
]);

const renderCell = (
  row: AssignedIpRow,
  cell: InstanceType<typeof AssignedIpTableCell>["$props"]["cell"],
) =>
  h(AssignedIpTableCell, {
    row,
    ifaceName: props.iface_name,
    cell,
    onFinish: finish,
    onQuickBind: quickBind,
  });

const noticeTitle = (label: string, message: string, secondLine?: string) =>
  h(Notice, null, {
    default: () => label,
    msg: () => [message, secondLine ? h("br") : null, secondLine],
  });

const columns = computed<DataTableColumns<AssignedIpRow>>(() => [
  {
    title: t("dhcp_v4.assigned.hostname"),
    key: "hostname",
    width: "20%",
    render: (row) => renderCell(row, "hostname"),
  },
  {
    title: () =>
      noticeTitle(
        t("dhcp_v4.assigned.mac_addr"),
        t("dhcp_v4.assigned.mac_tip_1"),
      ),
    key: "mac",
    render: (row) => renderCell(row, "mac"),
  },
  {
    title: t("dhcp_v4.assigned.assigned_ip"),
    key: "ip",
    render: (row) => renderCell(row, "ip"),
  },
  {
    title: t("dhcp_v4.assigned.latest_request"),
    key: "request",
    render: (row) => renderCell(row, "request"),
  },
  {
    title: () =>
      noticeTitle(
        t("dhcp_v4.assigned.lease_left"),
        t("dhcp_v4.assigned.expire_time"),
      ),
    key: "lease",
    render: (row) => renderCell(row, "lease"),
  },
  {
    title: () =>
      noticeTitle(
        t("dhcp_v4.assigned.online_24h"),
        t("dhcp_v4.assigned.online_24h_tip_1"),
        t("dhcp_v4.assigned.online_24h_tip_2"),
      ),
    key: "online",
    width: 168,
    render: (row) => renderCell(row, "online"),
  },
  {
    title: t("dhcp_v4.assigned.actions"),
    key: "actions",
    width: 80,
    align: "left",
    render: (row) => renderCell(row, "actions"),
  },
]);
</script>

<template>
  <!-- {{ info }} -->
  <!-- {{ arp_ip_map }} -->
  <!-- {{ not_current_round_ips }} -->
  <section class="assigned-list-section">
    <n-text strong class="assigned-list-title">{{ iface_name }}</n-text>
    <StandardDataTable
      v-if="info"
      :columns="columns"
      :data="tableRows"
      :row-key="(row) => `${row.kind}-${row.ip}-${row.mac ?? ''}`"
      :scroll-x="1100"
    />
  </section>

  <EnrolledDeviceEditModal
    v-model:show="showQuickBind"
    :rule_id="bindRuleId"
    :initial-values="initialValues"
    @refresh="emit('refresh')"
  />
</template>
<style scoped>
.assigned-list-section {
  width: 100%;
}

.assigned-list-title {
  display: block;
  margin-bottom: 8px;
}
</style>
