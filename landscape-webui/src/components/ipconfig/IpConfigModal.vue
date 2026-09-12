<script setup lang="ts">
import {
  get_iface_server_config,
  update_iface_server_config,
} from "@/api/service_ipconfig";
import { IfaceIpServiceConfig, IfaceIpMode } from "@/lib/service_ipconfig";
import { computed, ref } from "vue";
import ConfigModal from "@/components/common/ConfigModal.vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";
import IpEdit from "../IpEdit.vue";
import { IfaceZoneType } from "@landscape-router/types/api/schemas";
import { useI18n } from "vue-i18n";

const show_model = defineModel<boolean>("show", { required: true });
const emit = defineEmits(["refresh"]);
const { t } = useI18n();

const iface_info = defineProps<{
  iface_name: string;
  zone: IfaceZoneType;
  presetMode?: IfaceIpMode;
  presetDefaultRouter?: boolean;
}>();

const iface_data = ref<IfaceIpServiceConfig>(
  new IfaceIpServiceConfig({ iface_name: iface_info.iface_name }),
);

const ip_config_options = computed(() => {
  let result = [
    {
      label: t("interface.mode_none"),
      value: IfaceIpMode.Nothing,
    },
    {
      label: t("interface.mode_static"),
      value: IfaceIpMode.Static,
    },
  ];
  if (iface_info.zone == IfaceZoneType.wan) {
    result.push({
      label: t("interface.mode_pppoe_native"),
      value: IfaceIpMode.PPPoE,
    });
    result.push({
      label: t("interface.mode_dhcp_client"),
      value: IfaceIpMode.DHCPClient,
    });
  }
  return result;
});

async function on_modal_enter() {
  try {
    let config = await get_iface_server_config(iface_info.iface_name, true);
    // console.log(config);
    // iface_service_type.value = config.t;
    iface_data.value = new IfaceIpServiceConfig(config);
  } catch (e) {
    iface_data.value = new IfaceIpServiceConfig({
      iface_name: iface_info.iface_name,
    });
  }
  if (
    iface_info.presetMode &&
    iface_data.value.ip_model.t === IfaceIpMode.Nothing
  ) {
    select_ip_model(iface_info.presetMode);
  }
}

async function update_mode() {
  if (iface_data.value !== undefined) {
    try {
      if (
        iface_data.value.ip_model.t === IfaceIpMode.PPPoE &&
        iface_data.value.ip_model.ac_name === ""
      ) {
        iface_data.value.ip_model.ac_name = null;
      }
      let config = await update_iface_server_config(iface_data.value);
      emit("refresh");
      show_model.value = false;
    } catch (error) {}
  }
}

function getSummary() {
  const model = iface_data.value.ip_model;
  const result = [
    {
      label: t("network.settings.internet_access_method"),
      value: t(`network.settings.access_${model.t}`),
    },
  ];
  if (model.t === IfaceIpMode.Static) {
    result.push(
      {
        label: t("interface.static_ip"),
        value: `${model.ipv4}/${model.ipv4_mask}`,
      },
      {
        label: t("interface.set_default_route"),
        value: t(
          model.default_router
            ? "network.settings.enabled"
            : "network.settings.disabled",
        ),
      },
      { label: t("interface.route_ip"), value: model.default_router_ip ?? "—" },
    );
  } else if (model.t === IfaceIpMode.PPPoE) {
    result.push(
      { label: t("interface.username"), value: model.username || "—" },
      { label: t("interface.mtu"), value: String(model.mtu) },
      {
        label: t("interface.set_default_route"),
        value: t(
          model.default_router
            ? "network.settings.enabled"
            : "network.settings.disabled",
        ),
      },
    );
  } else if (model.t === IfaceIpMode.DHCPClient) {
    result.push(
      {
        label: t("interface.set_default_route"),
        value: t(
          model.default_router
            ? "network.settings.enabled"
            : "network.settings.disabled",
        ),
      },
      { label: t("interface.dhcp_hostname"), value: model.hostname || "—" },
    );
  }
  return result;
}

defineExpose({ save: update_mode, getSummary });

function select_ip_model(value: IfaceIpMode) {
  iface_data.value.enable = value !== IfaceIpMode.Nothing;
  if (value === IfaceIpMode.Nothing) {
    iface_data.value.ip_model = { t: IfaceIpMode.Nothing };
  } else if (value === IfaceIpMode.Static) {
    iface_data.value.ip_model = {
      t: IfaceIpMode.Static,
      default_router_ip: "0.0.0.0",
      default_router: iface_info.presetDefaultRouter ?? false,
      ipv4: "0.0.0.0",
      ipv4_mask: 24,
      ipv6: null,
    };
  } else if (value === IfaceIpMode.PPPoE) {
    iface_data.value.ip_model = {
      t: IfaceIpMode.PPPoE,
      default_router: iface_info.presetDefaultRouter ?? false,
      username: "",
      password: "",
      mtu: 1492,
      ac_name: null,
    };
  } else if (value === IfaceIpMode.DHCPClient) {
    iface_data.value.ip_model = {
      t: IfaceIpMode.DHCPClient,
      default_router: iface_info.presetDefaultRouter ?? false,
      hostname: null,
      custome_opts: [],
    };
  }
}
</script>

<template>
  <ConfigModal
    v-model:show="show_model"
    v-model:enabled="iface_data.enable"
    :title="t('interface.title')"
    :show-switch="false"
    width="var(--app-secondary-modal-width)"
    @after-enter="on_modal_enter"
  >
    <n-flex style="flex: 1" vertical v-if="iface_data.ip_model !== undefined">
      <StandardSettingRow :label="t('interface.title')">
        <n-select
          :value="iface_data.ip_model.t"
          @update:value="select_ip_model"
          :options="ip_config_options"
        />
      </StandardSettingRow>

      <n-flex style="flex: 1">
        <n-flex
          style="flex: 1"
          v-if="iface_data.ip_model.t === IfaceIpMode.Static"
        >
          <n-form style="flex: 1" :model="iface_data.ip_model" :cols="5">
            <div>
              <StandardSettingRow :label="t('interface.static_ip')">
                <IpEdit
                  v-model:ip="iface_data.ip_model.ipv4"
                  v-model:mask="iface_data.ip_model.ipv4_mask"
                ></IpEdit>
              </StandardSettingRow>
              <StandardSettingRow
                v-if="iface_info.zone == IfaceZoneType.wan"
                :label="t('interface.route_ip')"
              >
                <IpEdit
                  v-model:ip="iface_data.ip_model.default_router_ip"
                ></IpEdit>
              </StandardSettingRow>
              <StandardSettingRow
                v-if="iface_info.zone == IfaceZoneType.wan"
                control-width="auto"
              >
                <template #label>
                  <Notice>
                    {{ t("interface.set_default_route") }}
                    <template #msg>{{
                      t("network.settings.default_route_tip")
                    }}</template>
                  </Notice>
                </template>
                <n-switch
                  v-model:value="iface_data.ip_model.default_router"
                  size="medium"
                />
              </StandardSettingRow>
            </div>
          </n-form>
        </n-flex>
        <n-flex
          vertical
          style="flex: 1"
          v-else-if="iface_data.ip_model.t === IfaceIpMode.PPPoE"
        >
          <n-form
            style="flex: 1"
            :model="iface_data.ip_model"
            :cols="5"
            autocomplete="off"
          >
            <div>
              <StandardSettingRow :label="t('interface.username')">
                <n-input
                  v-model:value="iface_data.ip_model.username"
                  :input-props="{
                    name: 'native-pppoe-username',
                    autocomplete: 'one-time-code',
                    'data-1p-ignore': 'true',
                    'data-lpignore': 'true',
                  }"
                  placeholder=""
                />
              </StandardSettingRow>
              <StandardSettingRow :label="t('interface.password')">
                <n-input
                  v-model:value="iface_data.ip_model.password"
                  type="password"
                  show-password-on="click"
                  :input-props="{
                    name: 'native-pppoe-password',
                    autocomplete: 'new-password',
                    'data-1p-ignore': 'true',
                    'data-lpignore': 'true',
                  }"
                  placeholder=""
                />
              </StandardSettingRow>
              <StandardSettingRow :label="t('interface.mtu')">
                <n-input-number
                  v-model:value="iface_data.ip_model.mtu"
                  :min="576"
                  :max="1492"
                  style="width: 100%"
                />
              </StandardSettingRow>
              <StandardSettingRow>
                <template #label>
                  <Notice>
                    {{ t("pppoe.editor.ac_name") }}
                    <template #msg>
                      {{ t("pppoe.editor.ac_name_tip") }}
                    </template>
                  </Notice>
                </template>
                <n-input
                  v-model:value="iface_data.ip_model.ac_name"
                  placeholder=""
                />
              </StandardSettingRow>
              <StandardSettingRow control-width="auto">
                <template #label>
                  <Notice>
                    {{ t("interface.set_default_route") }}
                    <template #msg>{{
                      t("network.settings.default_route_tip")
                    }}</template>
                  </Notice>
                </template>
                <n-switch
                  v-model:value="iface_data.ip_model.default_router"
                  size="medium"
                />
              </StandardSettingRow>
            </div>
          </n-form>
        </n-flex>

        <n-flex
          vertical
          style="flex: 1"
          v-else-if="iface_data.ip_model.t === IfaceIpMode.DHCPClient"
        >
          <n-alert type="warning">
            {{ t("interface.dhcp_warn") }}
          </n-alert>
          <n-form style="flex: 1" :model="iface_data.ip_model" :cols="5">
            <div>
              <StandardSettingRow :label="t('interface.dhcp_hostname')">
                <n-input v-model:value="iface_data.ip_model.hostname"></n-input>
              </StandardSettingRow>
              <StandardSettingRow control-width="auto">
                <template #label>
                  <Notice>
                    {{ t("interface.set_default_route") }}
                    <template #msg>{{
                      t("network.settings.default_route_tip")
                    }}</template>
                  </Notice>
                </template>
                <n-switch
                  v-model:value="iface_data.ip_model.default_router"
                  size="medium"
                />
              </StandardSettingRow>
            </div>
          </n-form>
        </n-flex>
      </n-flex>
    </n-flex>

    <template #footer>
      <n-flex justify="end">
        <n-button round type="primary" @click="update_mode">
          {{ t("interface.update") }}
        </n-button>
      </n-flex>
    </template>
  </ConfigModal>
</template>
