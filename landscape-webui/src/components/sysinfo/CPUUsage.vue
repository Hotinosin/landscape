<script setup lang="ts">
import { computed } from "vue";
import { useThemeVars } from "naive-ui";
import { useSysInfo } from "@/stores/systeminfo";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useI18n } from "vue-i18n";
import { overviewCardStyles } from "@/components/overviewCardStyle";

const { t } = useI18n({ useScope: "global" });
const themeVars = useThemeVars();
const sysinfo = useSysInfo();
const frontEndStore = useFrontEndStore();

const cpus = computed(() => sysinfo.router_status.cpus);

const cpuCount = computed(() => cpus.value.length);

const cpuModel = computed(() => {
  const cpu = cpus.value[0];
  if (!cpu) return "";
  const brand = cpu.brand;
  if (frontEndStore.presentation_mode) {
    const firstSpace = brand.indexOf(" ");
    return firstSpace > 0 ? brand.substring(0, firstSpace) + " ***" : brand;
  }
  return brand;
});

const load_avg = computed(() => sysinfo.router_status.load_avg);

const globalUsage = computed(() => sysinfo.router_status.global_cpu_info);

const globalTemp = computed(() => sysinfo.router_status.global_cpu_temp);

// Helper to get color based on usage percentage (0-100)
const getUsageColor = (usage: number) => {
  if (usage >= 80) return themeVars.value.errorColor;
  if (usage >= 50) return themeVars.value.warningColor;
  return themeVars.value.primaryColor;
};

// Helper to get color based on temperature (Celsius)
const getTempColor = (temp: number) => {
  if (temp >= 80) return themeVars.value.errorColor;
  if (temp >= 60) return themeVars.value.warningColor;
  return themeVars.value.primaryColor;
};

// Dynamic sizing based on CPU count
const layoutMode = computed(() => {
  const count = cpuCount.value;
  if (count <= 4) return "large"; // Show labels, big bars
  if (count <= 8) return "medium"; // Medium bars, no labels
  if (count <= 16) return "small"; // Small bars
  return "compact"; // Tiny heatmap cells for 16+
});

// Box dimensions (numbers for grid calculation)
const boxDimensions = computed(() => {
  switch (layoutMode.value) {
    case "large":
      return { width: 56, height: 72, gap: 12 };
    case "medium":
      return { width: 40, height: 56, gap: 8 };
    case "small":
      return { width: 28, height: 40, gap: 6 };
    case "compact":
    default:
      return { width: 20, height: 28, gap: 4 };
  }
});

// Flex CSS styles - single row, auto-fit width
const flexStyle = computed(() => {
  const { gap } = boxDimensions.value;
  return {
    display: "flex" as const,
    flexWrap: "nowrap" as const,
    gap: `${gap}px`,
    alignItems: "flex-end" as const,
    width: "100%",
  };
});

// Format CPU index for display
const getCpuIndex = (name: string, index: number) => {
  // Try to extract number from name like "CPU 0", "cpu1", etc.
  const match = name.match(/\d+/);
  return match ? match[0] : String(index);
};
</script>

<template>
  <n-card
    class="overview-card"
    :style="overviewCardStyles.card"
    :header-style="overviewCardStyles.header"
    :content-style="overviewCardStyles.content"
  >
    <!-- Header -->
    <template #header>
      <n-flex align="center" justify="space-between">
        <span>CPU</span>
        <n-tag size="small" :bordered="false"> {{ cpuCount }} Cores </n-tag>
      </n-flex>
    </template>

    <div
      class="cpu-summary overview-card__primary"
      :style="overviewCardStyles.primary"
    >
      <!-- CPU Model -->
      <n-flex v-if="cpuModel" style="margin-bottom: 12px">
        <n-text depth="3" style="font-size: var(--app-font-size-caption)">
          <n-ellipsis :tooltip="{ width: 300 }">{{ cpuModel }}</n-ellipsis>
        </n-text>
      </n-flex>

      <!-- Global Stats -->
      <n-flex :size="4">
        <n-flex vertical class="cpu-stat">
          <n-statistic :label="t('sysinfo.total_cpu_usage')">
            <template #default>
              <n-text :style="{ color: getUsageColor(globalUsage) }">
                {{ globalUsage.toFixed(1) }}%
              </n-text>
            </template>
          </n-statistic>
        </n-flex>
        <n-flex vertical class="cpu-stat">
          <n-statistic :label="t('sysinfo.cpu_temp')">
            <template #default>
              <n-text
                v-if="globalTemp"
                :style="{ color: getTempColor(globalTemp) }"
              >
                {{ globalTemp.toFixed(1) }}°C
              </n-text>
              <n-tooltip v-else trigger="hover">
                <template #trigger>
                  <span
                    style="
                      color: var(--n-text-color-3);
                      font-size: 0.9em;
                      cursor: help;
                    "
                  >
                    N/A
                  </span>
                </template>
                {{ t("sysinfo.no_sensor") }}
              </n-tooltip>
            </template>
          </n-statistic>
        </n-flex>
        <div class="load-stat">
          <n-text depth="3" class="load-title">{{
            t("sysinfo.average_load")
          }}</n-text>
          <div class="load-values">
            <div class="load-value">
              <n-text depth="3" class="load-value-label">{{
                t("sysinfo.load_one_minute")
              }}</n-text>
              <n-text class="load-value-number">{{ load_avg.one }}</n-text>
            </div>
            <div class="load-value">
              <n-text depth="3" class="load-value-label">{{
                t("sysinfo.load_five_minutes")
              }}</n-text>
              <n-text class="load-value-number">{{ load_avg.five }}</n-text>
            </div>
            <div class="load-value">
              <n-text depth="3" class="load-value-label">{{
                t("sysinfo.load_fifteen_minutes")
              }}</n-text>
              <n-text class="load-value-number">{{ load_avg.fifteen }}</n-text>
            </div>
          </div>
        </div>
      </n-flex>
    </div>

    <n-divider
      class="overview-card__divider"
      :style="overviewCardStyles.divider"
    />

    <!-- CPU Cores Visualization -->
    <div
      class="cpu-cores-wrapper overview-card__secondary"
      :style="overviewCardStyles.secondary"
    >
      <!-- Extra padding wrapper to prevent hover clipping -->
      <div class="cpu-cores-inner">
        <div :style="flexStyle">
          <n-tooltip
            v-for="(cpu, index) in cpus"
            :key="cpu.name"
            trigger="hover"
            placement="top"
          >
            <template #trigger>
              <div
                class="cpu-core-box"
                :class="[`mode-${layoutMode}`]"
                :style="{
                  height: `${boxDimensions.height}px`,
                  flex: '1 1 0',
                  minWidth: '0',
                }"
              >
                <!-- Fill bar -->
                <div
                  class="cpu-core-fill"
                  :style="{
                    height: `${cpu.usage}%`,
                    backgroundColor: getUsageColor(cpu.usage),
                  }"
                ></div>
                <!-- Label overlay (only for large/medium modes) -->
                <div
                  v-if="layoutMode === 'large' || layoutMode === 'medium'"
                  class="cpu-core-label"
                >
                  <span class="cpu-index">{{
                    getCpuIndex(cpu.name, index)
                  }}</span>
                  <span v-if="layoutMode === 'large'" class="cpu-usage"
                    >{{ Math.round(cpu.usage) }}%</span
                  >
                </div>
              </div>
            </template>
            <!-- Tooltip Content -->
            <div style="text-align: center">
              <div style="font-weight: 600; margin-bottom: 4px">
                {{ cpu.name }}
              </div>
              <div style="font-size: 1.1em">{{ cpu.usage.toFixed(1) }}%</div>
              <div
                v-if="cpu.temperature"
                style="font-size: 1em; margin-top: 2px"
                :style="{ color: getTempColor(cpu.temperature) }"
              >
                {{ cpu.temperature.toFixed(1) }}°C
              </div>
              <div style="font-size: 0.85em; opacity: 0.7; margin-top: 2px">
                {{ cpu.frequency }} MHz
              </div>
            </div>
          </n-tooltip>
        </div>
      </div>
    </div>
  </n-card>
</template>

<style scoped>
.load-stat {
  flex: 1;
  min-width: 0;
  align-self: stretch;
}

.cpu-stat {
  flex: 1;
  min-width: 0;
}

.load-title {
  font-size: var(--app-font-size-label);
}

.load-values {
  display: grid;
  gap: 0;
  margin-top: 4px;
  font-size: var(--app-font-size-caption);
}

.load-value {
  display: flex;
  justify-content: space-between;
  gap: var(--app-space-2xs);
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.load-value-label,
.load-value-number {
  white-space: nowrap;
}

.load-value-number {
  flex: none;
  font-size: var(--app-font-size-body);
  font-weight: 600;
}

.cpu-cores-wrapper {
  overflow: hidden;
}

.cpu-cores-inner {
  padding: 0;
}

.cpu-core-box {
  background-color: var(--app-surface-muted-color);
  border: 1px solid var(--app-border-muted-color);
  border-radius: var(--app-radius-indicator);
  position: relative;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.cpu-core-box:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px var(--app-shadow-color);
  border-color: var(--app-border-default-color);
  z-index: 10;
}

.cpu-core-fill {
  width: 100%;
  transition:
    height 0.3s ease,
    background-color 0.3s ease;
  min-height: 2px;
  border-radius: 0 0 3px 3px;
}

.cpu-core-label {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1;
}

.cpu-index {
  font-weight: 600;
  opacity: 0.7;
  font-size: inherit;
  line-height: 1.2;
  text-shadow: 0 1px 2px var(--app-text-inverse-color);
}

.cpu-usage {
  font-size: 0.85em;
  opacity: 0.6;
  line-height: 1.2;
  text-shadow: 0 1px 2px var(--app-text-inverse-color);
}

/* Mode-specific adjustments */
.mode-large {
  border-radius: var(--app-radius-control, 6px);
}

.mode-large .cpu-core-fill {
  border-radius: 0 0 5px 5px;
}

.mode-large .cpu-index {
  font-size: var(--app-font-size-label);
}

.mode-medium .cpu-index {
  font-size: var(--app-font-size-detail);
}

.mode-small {
  border-radius: var(--app-radius-indicator);
}

.mode-small .cpu-core-fill {
  border-radius: 0 0 2px 2px;
}

.mode-compact {
  border-radius: var(--app-radius-hairline);
}

.mode-compact .cpu-core-fill {
  border-radius: 0 0 1px 1px;
}

/* Dark mode support */
:global(.n-config-provider--dark) .cpu-core-box {
  background-color: var(--app-surface-subtle-color);
  border-color: var(--app-border-muted-color);
}

:global(.n-config-provider--dark) .cpu-core-box:hover {
  border-color: var(--app-border-default-color);
  box-shadow: 0 4px 12px var(--app-shadow-strong-color);
}

:global(.n-config-provider--dark) .cpu-index,
:global(.n-config-provider--dark) .cpu-usage {
  text-shadow: 0 1px 2px var(--app-shadow-strong-color);
}
</style>
