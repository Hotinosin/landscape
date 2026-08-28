<script setup lang="ts">
import { delete_static_nat_mapping_v4 } from "@/api/static_nat_mapping";
import type { StaticNatMappingV4Config } from "@landscape-router/types/api/schemas";
import { computed, ref } from "vue";
import { ArrowRight } from "@vicons/carbon";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useEnrolledDeviceStore } from "@/stores/enrolled_device";
import { usePreferenceStore } from "@/stores/preference";
import { useI18n } from "vue-i18n";

const enrolledDeviceStore = useEnrolledDeviceStore();
const prefStore = usePreferenceStore();
const frontEndStore = useFrontEndStore();
const { t } = useI18n();

const rule = defineModel<StaticNatMappingV4Config>("rule", { required: true });

const target = computed(
  () => rule.value.lan_target ?? { t: "address" as const, ipv4: "" },
);

function formatTarget(): string {
  if (target.value.t === "local") return t("nat.mapping.target_type_local");
  if (target.value.t === "device") {
    return enrolledDeviceStore.GET_DISPLAY_NAME_BY_ID(target.value.device_id);
  }
  return target.value.ipv4
    ? enrolledDeviceStore.GET_NAME_WITH_FALLBACK(target.value.ipv4)
    : "";
}

const show_edit_modal = ref(false);
const edit_focus_index = ref<number | undefined>(undefined);

const emit = defineEmits(["refresh"]);

function openEditModal(focusIndex?: number) {
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) return;
  edit_focus_index.value = focusIndex;
  show_edit_modal.value = true;
}

async function del() {
  if (rule.value.id) {
    await delete_static_nat_mapping_v4(rule.value.id);
    emit("refresh");
  }
}
</script>

<template>
  <div class="mapping-card-wrapper">
    <n-card
      size="small"
      class="mapping-card"
      :class="{ 'is-disabled': !rule.enable }"
      hoverable
      :bordered="false"
      embedded
      content-style="display: flex; flex-direction: column; height: 100%;"
      @click="openEditModal()"
    >
      <template #header>
        <StatusTitle :enable="rule.enable" :remark="rule.remark"></StatusTitle>
      </template>

      <template #header-extra>
        <n-flex size="small">
          <EditButton @click.stop="openEditModal()" />
          <n-popconfirm @positive-click="del()">
            <template #trigger>
              <n-button secondary size="small" type="error" @click.stop>
                {{ t("common.delete") }}
              </n-button>
            </template>
            {{ t("common.confirm_delete") }}
          </n-popconfirm>
        </n-flex>
      </template>

      <div class="target-section">
        <div class="stat-label">{{ t("common.ipv4_target") }}</div>
        <div class="stat-value-row">
          <div class="stat-value">{{ formatTarget() }}</div>
          <div class="stat-tags">
            <n-tag
              v-for="proto in rule.l4_protocols"
              :key="proto"
              size="tiny"
              :bordered="false"
              :type="proto === 6 ? 'success' : 'info'"
            >
              {{ proto === 6 ? "TCP" : "UDP" }}
            </n-tag>
          </div>
        </div>
      </div>

      <n-divider style="margin: 8px 0 var(--app-space-section) 0" />

      <div class="ports-container">
        <div class="section-label">
          {{ t("common.port_mapping") }} ({{ rule.mapping_pair_ports.length }})
        </div>
        <n-scrollbar style="height: 100px; padding-right: 4px">
          <div class="ports-grid">
            <div
              v-for="(pair, index) in rule.mapping_pair_ports"
              :key="index"
              class="port-box"
              @click.stop="openEditModal(index)"
            >
              <span class="wan-port">{{
                frontEndStore.MASK_PORT(pair.wan_port.toString())
              }}</span>
              <n-icon :component="ArrowRight" class="arrow-icon" />
              <span class="lan-port">{{
                frontEndStore.MASK_PORT(pair.lan_port.toString())
              }}</span>
            </div>
          </div>
        </n-scrollbar>
      </div>

      <div class="card-footer">
        <n-text depth="3" style="font-size: var(--app-font-size-caption)">
          {{ t("common.updated_at") }}
          <n-time
            :time="rule.update_at"
            format="yyyy-MM-dd HH:mm"
            :time-zone="prefStore.timezone"
          />
        </n-text>
      </div>
    </n-card>

    <MappingEditV4Modal
      @refresh="emit('refresh')"
      :rule_id="rule.id"
      v-model:show="show_edit_modal"
      :initial-focus-index="edit_focus_index"
    >
    </MappingEditV4Modal>
  </div>
</template>

<style scoped>
.mapping-card-wrapper {
  display: flex;
  flex: 1;
  min-width: 400px;
}

.mapping-card {
  flex: 1;
  border-radius: var(--app-radius-indicator);
  transition: all 0.2s ease-in-out;
  border: 1px solid transparent;
  cursor: pointer;
}

.mapping-card.is-disabled {
  opacity: 0.7;
  border-color: var(--n-error-color);
}

.target-section {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: var(--app-font-size-caption);
  color: var(--n-text-color-3);
  margin-bottom: 2px;
}

.stat-value-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--app-space-xs);
  min-height: 24px;
}

.stat-value {
  font-size: var(--app-font-size-heading);
  font-weight: 500;
  line-height: 1.2;
  font-family: var(--font-mono);
}

.stat-tags {
  display: flex;
  gap: var(--app-space-2xs);
}

.ports-container {
  display: flex;
  flex-direction: column;
}

.section-label {
  font-size: var(--app-font-size-caption);
  color: var(--n-text-color-3);
  margin-bottom: 8px;
}

.ports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
  gap: var(--app-space-sm);
  padding: 4px 2px;
}

.port-box {
  background-color: var(--app-surface-muted-color);
  border: 1px solid var(--app-border-muted-color);
  border-radius: var(--app-radius-indicator);
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--app-font-size-label);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
  user-select: none;
  cursor: pointer;
  white-space: nowrap;
}

.port-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px var(--app-shadow-color);
  border-color: var(--n-primary-color);
  z-index: 1;
}

.wan-port {
  color: var(--n-warning-color);
  font-weight: 600;
  font-family: var(--font-mono);
  user-select: text;
}

.lan-port {
  color: var(--n-info-color);
  font-weight: 600;
  font-family: var(--font-mono);
  user-select: text;
}

.arrow-icon {
  color: var(--n-text-color-3);
  font-size: var(--app-font-size-caption);
  margin: 0 6px;
}

.card-footer {
  margin-top: auto;
  padding-top: 12px;
  text-align: right;
}

:global(.n-config-provider--dark) .port-box {
  background-color: var(--app-surface-subtle-color);
  border-color: var(--app-border-muted-color);
}

:global(.n-config-provider--dark) .port-box:hover {
  border-color: var(--n-primary-color);
  box-shadow: 0 4px 12px var(--app-shadow-strong-color);
}
</style>
