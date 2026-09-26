<script setup lang="ts">
import { WarningFilled } from "@vicons/carbon";
import { useI18n } from "vue-i18n";
import { computed, h, ref } from "vue";
import type { DataTableColumns } from "naive-ui";
import StandardDataTable from "@/components/common/StandardDataTable.vue";
import ConfigModal from "@/components/common/ConfigModal.vue";

const { t } = useI18n();
const show = ref(false);

const sup = (k: string) => t("geo.geo_site.adguard_rule_info." + k);
const desc = (k: string) => sup(k + "_desc");
const noticeText = computed(() => t("geo.geo_site.adguard_limit_notice"));

interface RuleRow {
  rule: string;
  reason: string;
}

const supportedRules = computed<RuleRow[]>(() => [
  { rule: "||domain^", reason: desc("supported_1") },
  { rule: "||domain^$important", reason: desc("supported_2") },
  {
    rule: "0.0.0.0 domain / 127.0.0.1 domain / :: domain / ::1 domain",
    reason: desc("supported_3"),
  },
  { rule: "domain.com / domain.com$important", reason: desc("supported_4") },
]);

const skippedRules = computed<RuleRow[]>(() => [
  { rule: "@@... / $badfilter", reason: desc("skipped_1") },
  {
    rule: "$third-party / $3p / $domain= / $denyallow= / $to= / $client= / $dnstype= / $document / $image / $script / $dnsrewrite",
    reason: desc("skipped_2"),
  },
  { rule: "||domain.com/path^ / |https://domain|", reason: desc("skipped_3") },
  { rule: "## / #@# / #?#", reason: desc("skipped_4") },
  { rule: "/pattern/", reason: desc("skipped_5") },
  { rule: "! / #", reason: desc("skipped_6") },
]);

const supportedColumns = computed<DataTableColumns<RuleRow>>(() => [
  {
    title: sup("col_rule"),
    key: "rule",
    width: 200,
    render: (row) => h("code", row.rule),
  },
  { title: sup("col_mapping"), key: "reason" },
]);

const skippedColumns = computed<DataTableColumns<RuleRow>>(() => [
  {
    title: sup("col_rule"),
    key: "rule",
    width: 200,
    render: (row) => h("code", row.rule),
  },
  { title: sup("col_reason"), key: "reason" },
]);
</script>

<template>
  <n-popover trigger="hover">
    <template #trigger>
      <n-button text :title="sup('title')" @click.stop="show = true">
        <template #icon>
          <n-icon size="18" color="var(--app-status-warning-color)">
            <WarningFilled />
          </n-icon>
        </template>
      </n-button>
    </template>
    <div class="rule-popover" @click="show = true">
      <n-text depth="2">{{ noticeText }}</n-text>
      <n-text type="info" depth="3" style="display: block; margin-top: 4px">{{
        sup("click_hint")
      }}</n-text>
    </div>
  </n-popover>
  <ConfigModal
    v-model:show="show"
    :show-switch="false"
    width="var(--app-compact-modal-width)"
    :title="sup('title')"
  >
    <n-flex vertical :size="10">
      <n-flex vertical :size="4">
        <n-text
          type="success"
          strong
          class="section-title standard-list-title--small"
          >{{ sup("supported_title") }}</n-text
        >
        <StandardDataTable
          :columns="supportedColumns"
          :data="supportedRules"
          size="small"
          :row-key="(row) => row.rule"
        />
      </n-flex>

      <n-flex vertical :size="4">
        <n-text
          type="error"
          strong
          class="section-title standard-list-title--small"
          >{{ sup("skipped_title") }}</n-text
        >
        <StandardDataTable
          :columns="skippedColumns"
          :data="skippedRules"
          size="small"
          :row-key="(row) => row.rule"
        />
      </n-flex>

      <n-alert type="info" :show-icon="false" class="rule-note">
        {{ sup("reason") }}
      </n-alert>
    </n-flex>
  </ConfigModal>
</template>

<style scoped>
.rule-popover {
  max-width: 340px;
  font-size: var(--app-font-size-caption);
  cursor: pointer;
}

.section-title {
  font-size: var(--app-font-size-label);
}

.rule-note {
  font-size: var(--app-font-size-caption);
}
</style>
