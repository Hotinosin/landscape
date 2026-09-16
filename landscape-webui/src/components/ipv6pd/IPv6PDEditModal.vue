<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";
import { IPV6PDConfig, IPV6PDServiceConfig } from "@/lib/ipv6pd";
import {
  get_iface_ipv6pd_config,
  get_all_ipv6pd_prefix_status,
  type IPV6PDPrefixStatus,
  update_ipv6pd_config,
} from "@/api/service_ipv6pd";
import { useIPv6PDStore } from "@/stores/status_ipv6pd";
import { generateValidMAC, formatMacAddress } from "@/lib/util";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import { Renew } from "@vicons/carbon";
import IAPrefixInfoCard from "@/components/ipv6pd/IAPrefixInfoCard.vue";
import StandardStatusCard from "@/components/common/StandardStatusCard.vue";

let ipv6PDStore = useIPv6PDStore();
const message = useMessage();
const { t } = useI18n();

const show_model = defineModel<boolean>("show", { required: true });
const emit = defineEmits(["refresh"]);

const iface_info = defineProps<{
  iface_name: string;
  mac: string | null;
  zone: IfaceZoneType;
}>();

const service_config = ref<IPV6PDServiceConfig>(
  new IPV6PDServiceConfig({
    iface_name: iface_info.iface_name,
    config: new IPV6PDConfig({
      mac: iface_info.mac ?? generateValidMAC(),
    }),
  }),
);
const prefixStatus = ref<IPV6PDPrefixStatus>();
const statusLoading = ref(false);
let statusTimer: ReturnType<typeof setInterval> | undefined;

async function refreshPrefixStatus() {
  statusLoading.value = true;
  try {
    prefixStatus.value = (await get_all_ipv6pd_prefix_status()).get(
      iface_info.iface_name,
    );
  } catch {
    prefixStatus.value = undefined;
  } finally {
    statusLoading.value = false;
  }
}

function startStatusRefresh() {
  if (statusTimer) return;
  void refreshPrefixStatus();
  statusTimer = setInterval(refreshPrefixStatus, 10_000);
}

function stopStatusRefresh() {
  if (statusTimer) clearInterval(statusTimer);
  statusTimer = undefined;
}

async function on_modal_enter() {
  startStatusRefresh();
  try {
    let config = await get_iface_ipv6pd_config(iface_info.iface_name);
    service_config.value = config;
  } catch (e) {
    service_config.value = new IPV6PDServiceConfig({
      iface_name: iface_info.iface_name,
      config: new IPV6PDConfig({
        mac: iface_info.mac ?? generateValidMAC(),
      }),
    });
  }
}

watch(show_model, (show) => !show && stopStatusRefresh());
onBeforeUnmount(stopStatusRefresh);

async function save_config() {
  if (
    service_config.value.config.mac === "" ||
    service_config.value.config.mac === undefined
  ) {
    message.warning(t("lan_ipv6.mac_required"));
  } else if (
    !Number.isInteger(service_config.value.config.expected_pd_len) ||
    service_config.value.config.expected_pd_len < 56 ||
    service_config.value.config.expected_pd_len > 64
  ) {
    message.warning(t("lan_ipv6.expected_pd_len_invalid"));
  } else {
    let config = await update_ipv6pd_config(service_config.value);
    await ipv6PDStore.UPDATE_INFO();
    show_model.value = false;
  }
}

defineExpose({ save: save_config });
</script>

<template>
  <ConfigModal
    v-model:show="show_model"
    v-model:enabled="service_config.enable"
    :title="t('lan_ipv6.ipv6_pd_config')"
    width="var(--app-secondary-modal-width)"
    @after-enter="on_modal_enter"
  >
    <!-- {{ service_config }} -->
    <n-form :model="service_config">
      <StandardSettingRow>
        <template #label>
          <Notice>
            {{ t("lan_ipv6.mac_hint") }}
            <template #msg>{{ t("lan_ipv6.mac_hint_desc") }}</template>
          </Notice>
        </template>
        <n-input
          :value="service_config.config.mac"
          @update:value="
            (v: string) => (service_config.config.mac = formatMacAddress(v))
          "
        ></n-input>
      </StandardSettingRow>
      <StandardSettingRow>
        <template #label>
          <Notice>
            {{ t("lan_ipv6.expected_pd_len") }}
            <template #msg>{{ t("lan_ipv6.expected_pd_len_desc") }}</template>
          </Notice>
        </template>
        <n-input-number
          v-model:value="service_config.config.expected_pd_len"
          style="flex: 1"
          :min="56"
          :max="64"
          :step="1"
          :precision="0"
        />
      </StandardSettingRow>
    </n-form>

    <StandardStatusCard>
      <template #title>
        <n-flex align="center" :wrap="false">
          <n-text strong>{{ t("lan_ipv6.pd_runtime_status") }}</n-text>
          <IAPrefixInfoCard
            v-if="prefixStatus"
            :prefix_status="prefixStatus"
            cell="status"
          />
        </n-flex>
      </template>
      <template #actions>
        <n-button
          size="small"
          secondary
          :loading="statusLoading"
          @click="refreshPrefixStatus"
        >
          <template #icon
            ><n-icon><Renew /></n-icon
          ></template>
          {{ t("common.refresh") }}
        </n-button>
      </template>
      <n-spin :show="statusLoading">
        <div v-if="prefixStatus" class="pd-status-card__grid">
          <div class="pd-status-card__item">
            <n-text>{{ t("lan_ipv6.prefix_info.prefix") }}</n-text>
            <IAPrefixInfoCard :prefix_status="prefixStatus" cell="prefix" />
          </div>
          <div class="pd-status-card__item">
            <n-text>{{ t("lan_ipv6.prefix_info.prefix_len_status") }}</n-text>
            <IAPrefixInfoCard
              :prefix_status="prefixStatus"
              cell="prefix_len_status"
            />
          </div>
          <div class="pd-status-card__item">
            <Notice>
              {{ t("lan_ipv6.prefix_info.ip_preferred_time") }}
              <template #msg>{{
                t("lan_ipv6.prefix_info.ip_preferred_time_desc")
              }}</template>
            </Notice>
            <IAPrefixInfoCard
              :prefix_status="prefixStatus"
              cell="preferred_lifetime"
            />
          </div>
          <div class="pd-status-card__item">
            <Notice>
              {{ t("lan_ipv6.prefix_info.ip_valid_time") }}
              <template #msg>{{
                t("lan_ipv6.prefix_info.ip_valid_time_desc")
              }}</template>
            </Notice>
            <IAPrefixInfoCard
              :prefix_status="prefixStatus"
              cell="valid_lifetime"
            />
          </div>
          <div class="pd-status-card__item">
            <Notice>
              {{ t("lan_ipv6.prefix_info.last_update") }}
              <template #msg>{{
                t("lan_ipv6.prefix_info.dhcpv6_client_prefix_time")
              }}</template>
            </Notice>
            <IAPrefixInfoCard
              :prefix_status="prefixStatus"
              cell="last_update"
            />
          </div>
        </div>
        <n-empty v-else size="small" />
      </n-spin>
    </StandardStatusCard>

    <template #footer>
      <n-flex justify="end">
        <n-button type="primary" @click="save_config">
          {{ t("common.update") }}
        </n-button>
      </n-flex>
    </template>
  </ConfigModal>
</template>

<style scoped>
.pd-status-card__grid {
  display: grid;
  gap: var(--app-space-section);
  padding-inline: var(--app-space-lg);
}

.pd-status-card__item {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    calc(var(--app-setting-control-width) - var(--app-space-lg));
  gap: var(--app-space-lg);
  align-items: center;
  min-width: 0;
}

.pd-status-card__item > :last-child {
  justify-self: start;
}
</style>
