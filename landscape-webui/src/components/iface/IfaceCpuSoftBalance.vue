<script setup lang="ts">
import { get_iface_cpu_balance, set_iface_cpu_balance } from "@/api/iface";
import { get_cpu_count } from "@/api/sys";
import type { IfaceCpuSoftBalance } from "@landscape-router/types/api/schemas";
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";

const show_model = defineModel<boolean>("show", { required: true });
const { t } = useI18n();
const loading = ref(false);
const props = defineProps<{
  iface_name: string;
  embedded?: boolean;
}>();
const emit = defineEmits(["dirty"]);
const enabled = ref(true);

const balance_config = ref<IfaceCpuSoftBalance>({
  xps: "",
  rps: "",
});

const cpu_count = ref(0);
const xps_selected_cores = ref<Set<number>>(new Set());
const rps_selected_cores = ref<Set<number>>(new Set());

// 计算 CPU 核心选择数组
const available_cores = computed(() => {
  return Array.from({ length: cpu_count.value }, (_, i) => i);
});

// 将选中核心转换为位掩码数值
function coresToBitmask(selected_cores: Set<number>): string {
  if (selected_cores.size === 0) return "0";

  let bitmask = BigInt(0);
  selected_cores.forEach((core) => {
    bitmask |= BigInt(1) << BigInt(core);
  });
  return bitmask.toString(16);
}

// 将位掩码数值转换为选中核心
function bitmaskToCores(bitmask_str: string): Set<number> {
  const cores = new Set<number>();
  if (!bitmask_str) return cores;

  try {
    // 兼容可能带有 0x 前缀或纯 16 进制字符串
    const hex_str = bitmask_str.startsWith("0x")
      ? bitmask_str
      : "0x" + bitmask_str;
    const bitmask = BigInt(hex_str);

    if (bitmask === BigInt(0)) return cores;

    for (let i = 0; i < cpu_count.value; i++) {
      if (bitmask & (BigInt(1) << BigInt(i))) {
        cores.add(i);
      }
    }
  } catch (e) {
    console.error(t("interface.console_parse_bitmask_failed"), e);
  }
  return cores;
}

// 切换核心选择状态
function toggleCore(core: number, type: "xps" | "rps") {
  const selected_cores =
    type === "xps" ? xps_selected_cores : rps_selected_cores;
  if (selected_cores.value.has(core)) {
    selected_cores.value.delete(core);
  } else {
    selected_cores.value.add(core);
  }
  emit("dirty");
}

async function get_current_config() {
  try {
    // 获取 CPU 核心数
    cpu_count.value = await get_cpu_count();

    // 获取当前配置
    let data = await get_iface_cpu_balance(props.iface_name);
    if (data) {
      balance_config.value = data;

      // 解析当前配置到核心选择
      xps_selected_cores.value = bitmaskToCores(data.xps);
      rps_selected_cores.value = bitmaskToCores(data.rps);
    }
  } catch (error) {
    console.error(t("interface.console_get_config_failed"), error);
  }
}

async function save_config() {
  try {
    loading.value = true;
    show_model.value = false;

    // 计算新的位掩码值
    const new_xps = coresToBitmask(xps_selected_cores.value);
    const new_rps = coresToBitmask(rps_selected_cores.value);

    const new_config = {
      xps: new_xps,
      rps: new_rps,
    };
    await set_iface_cpu_balance(props.iface_name, new_config);
  } catch (error) {
    console.error(t("interface.console_save_config_failed"), error);
  } finally {
    loading.value = false;
  }
}

defineExpose({ save: save_config });

// 重置配置
function reset_config() {
  if (!xps_selected_cores.value.size && !rps_selected_cores.value.size) return;
  xps_selected_cores.value.clear();
  rps_selected_cores.value.clear();
  emit("dirty");
}

// 设置 XPS 为 0
function setXpsToZero() {
  if (!xps_selected_cores.value.size) return;
  xps_selected_cores.value.clear();
  emit("dirty");
}

// 设置 RPS 为 0
function setRpsToZero() {
  if (!rps_selected_cores.value.size) return;
  rps_selected_cores.value.clear();
  emit("dirty");
}
</script>

<template>
  <ConfigModal
    v-model:show="show_model"
    v-model:enabled="enabled"
    :embedded="props.embedded"
    :show-switch="false"
    :title="t('network.iface_cpu_balance.title')"
    @after-enter="get_current_config"
  >
    <n-flex vertical>
      <n-alert type="info">
        {{ t("network.iface_cpu_balance.intro") }}
        <br />
        <strong>{{ t("network.iface_cpu_balance.hint_prefix") }}</strong>
        {{ t("network.iface_cpu_balance.hint_suffix") }}
      </n-alert>

      <template v-if="cpu_count > 0">
        <StandardSettingRow>
          <template #label>
            <div>
              <div>{{ t("network.iface_cpu_balance.tx_title") }}</div>
              <n-text depth="3" class="selection-summary">
                {{ t("network.iface_cpu_balance.selected") }}:
                {{
                  Array.from(xps_selected_cores)
                    .sort((a, b) => a - b)
                    .join(", ") || t("network.iface_cpu_balance.none")
                }}
                ({{ t("network.iface_cpu_balance.bitmask") }}: 0x{{
                  coresToBitmask(xps_selected_cores)
                }})
              </n-text>
            </div>
          </template>
          <n-space justify="end" wrap>
            <n-button
              :type="xps_selected_cores.size === 0 ? 'primary' : 'default'"
              @click="setXpsToZero"
            >
              {{ t("network.iface_cpu_balance.set_zero") }}
            </n-button>
            <n-button
              v-for="core in available_cores"
              :key="`xps-${core}`"
              :type="xps_selected_cores.has(core) ? 'primary' : 'default'"
              @click="toggleCore(core, 'xps')"
            >
              CPU {{ core }}
            </n-button>
          </n-space>
        </StandardSettingRow>

        <StandardSettingRow>
          <template #label>
            <div>
              <div>{{ t("network.iface_cpu_balance.rx_title") }}</div>
              <n-text depth="3" class="selection-summary">
                {{ t("network.iface_cpu_balance.selected") }}:
                {{
                  Array.from(rps_selected_cores)
                    .sort((a, b) => a - b)
                    .join(", ") || t("network.iface_cpu_balance.none")
                }}
                ({{ t("network.iface_cpu_balance.bitmask") }}: 0x{{
                  coresToBitmask(rps_selected_cores)
                }})
              </n-text>
            </div>
          </template>
          <n-space justify="end" wrap>
            <n-button
              :type="rps_selected_cores.size === 0 ? 'primary' : 'default'"
              @click="setRpsToZero"
            >
              {{ t("network.iface_cpu_balance.set_zero") }}
            </n-button>
            <n-button
              v-for="core in available_cores"
              :key="`rps-${core}`"
              :type="rps_selected_cores.has(core) ? 'primary' : 'default'"
              @click="toggleCore(core, 'rps')"
            >
              CPU {{ core }}
            </n-button>
          </n-space>
        </StandardSettingRow>
      </template>

      <div v-else>
        <n-spin size="small" />
        {{ t("network.iface_cpu_balance.loading_cpu") }}
      </div>
    </n-flex>

    <template v-if="!props.embedded" #footer>
      <n-flex justify="space-between" style="width: 100%">
        <n-button @click="reset_config">
          {{ t("network.iface_cpu_balance.reset") }}
        </n-button>
        <n-space>
          <n-button @click="show_model = false">
            {{ t("network.iface_cpu_balance.cancel") }}
          </n-button>
          <n-button :loading="loading" type="primary" @click="save_config">
            {{ t("network.iface_cpu_balance.save") }}
          </n-button>
        </n-space>
      </n-flex>
    </template>
  </ConfigModal>
</template>

<style scoped>
.selection-summary {
  display: block;
  font-size: var(--app-font-size-caption);
  font-weight: 400;
}
</style>
